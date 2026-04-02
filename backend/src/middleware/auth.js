import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        } else if (req.cookies?.refreshToken) {
            token = req.cookies.refreshToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route',
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                try {
                    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
                } catch (refreshError) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid token',
                    });
                }
            } else {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                });
            }
        }

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
            });
        }

        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                error: 'Account has been deactivated',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route',
        });
    }
};

export const authorize = (...tiers) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized',
            });
        }

        if (!tiers.includes(req.user.tier)) {
            return res.status(403).json({
                success: false,
                error: `User role ${req.user.tier} is not authorized to access this route`,
            });
        }
        next();
    };
};

export const isPro = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized',
        });
    }

    if (req.user.tier !== 'pro') {
        return res.status(403).json({
            success: false,
            error: 'This feature requires a Pro subscription. Please upgrade to continue.',
        });
    }
    next();
};

export const checkAILimit = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized',
        });
    }

    if (req.user.tier === 'pro') {
        return next();
    }

    if (req.user.aiUsageCount >= req.user.aiUsageLimit) {
        return res.status(403).json({
            success: false,
            error: `You have reached your AI usage limit (${req.user.aiUsageLimit} analyses). Upgrade to Pro for unlimited access.`,
            limitReached: true,
            currentUsage: req.user.aiUsageCount,
            limit: req.user.aiUsageLimit,
        });
    }

    next();
};

export const checkResumeLimit = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized',
        });
    }

    if (req.user.tier === 'pro') {
        return next();
    }

    const { Resume } = await import('../models/Resume.js');
    const resumeCount = await Resume.countDocuments({
        userId: req.user.id,
        isArchived: false
    });

    if (resumeCount >= 1) {
        return res.status(403).json({
            success: false,
            error: 'Free users can only create 1 resume. Please delete your existing resume or upgrade to Pro.',
            limitReached: true,
            currentCount: resumeCount,
            limit: 1,
        });
    }

    next();
};

export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
            }
        }
        next();
    } catch (error) {
        next();
    }
};

export const apiLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return async (req, res, next) => {
        if (req.user && req.user.tier === 'pro') {
            return next();
        }
        const { limiter } = await import('./rateLimiter.js');
        return limiter(req, res, next);
    };
};