import express from 'express';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
    register,
    login,
    logout,
    getMe,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateProfile,
    changePassword,
    resetAIUsage
} from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);

router.use(protect);
router.post('/logout', logout);
router.get('/me', getMe);
router.put('/update-profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/reset-ai-usage', resetAIUsage);

export default router;