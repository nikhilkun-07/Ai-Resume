import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { validateEmail, validatePassword, validateName } from '../utils/validators.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../jobs/emailJob.js';
import { createCustomer } from '../config/stripe.js';

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

const setRefreshTokenCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide all required fields'
            });
        }

        if (!validateName(name)) {
            return res.status(400).json({
                success: false,
                error: 'Name must be at least 2 characters long'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }

        let stripeCustomerId = null;
        try {
            const customer = await createCustomer(email, name);
            stripeCustomerId = customer.id;
        } catch (error) {
            console.error('Stripe customer creation failed:', error);
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = await User.create({
            name,
            email,
            password,
            stripeCustomerId,
            verificationToken,
            aiUsageLimit: 100,
            resumeLimit: 20,
            aiUsageCount: 0,
        });

        const { accessToken, refreshToken } = generateTokens(user._id);
        setRefreshTokenCookie(res, refreshToken);

        res.status(201).json({
            success: true,
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                tier: user.tier,
                aiUsageCount: user.aiUsageCount,
                aiUsageLimit: user.aiUsageLimit,
                resumeLimit: user.resumeLimit,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        await User.findByIdAndUpdate(user._id, {
            lastLogin: Date.now()
        });

        const { accessToken, refreshToken } = generateTokens(user._id);
        setRefreshTokenCookie(res, refreshToken);

        res.json({
            success: true,
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                tier: user.tier,
                aiUsageCount: user.aiUsageCount,
                aiUsageLimit: user.aiUsageLimit,
                resumeLimit: user.resumeLimit,
                emailVerified: user.emailVerified,
                subscriptionStatus: user.subscriptionStatus
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'No refresh token provided'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const { accessToken } = generateTokens(user._id);

        res.json({
            success: true,
            accessToken
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
};

export const logout = async (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                tier: user.tier,
                aiUsageCount: user.aiUsageCount,
                aiUsageLimit: user.aiUsageLimit,
                resumeLimit: user.resumeLimit,
                emailVerified: user.emailVerified,
                subscriptionStatus: user.subscriptionStatus,
                preferences: user.preferences
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, preferences } = req.body;
        const user = await User.findById(req.user.id);

        if (name && validateName(name)) {
            user.name = name;
        }

        if (preferences) {
            user.preferences = { ...user.preferences, ...preferences };
        }

        await user.save();

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Please provide current and new password'
            });
        }

        const user = await User.findById(req.user.id).select('+password');

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'No user found with that email'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 3600000;
        await user.save();

        await sendPasswordResetEmail(email, resetToken);

        res.json({
            success: true,
            message: 'Password reset email sent'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification token'
            });
        }

        user.emailVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export const resetAIUsage = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.aiUsageCount = 0;
        await user.save();

        res.json({
            success: true,
            message: 'AI usage reset successfully',
            aiUsageCount: user.aiUsageCount,
            aiUsageLimit: user.aiUsageLimit
        });
    } catch (error) {
        console.error('Reset AI usage error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};