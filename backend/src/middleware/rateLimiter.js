import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV !== 'production';
    }
});

export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
    },
    skip: (req) => {
        return process.env.NODE_ENV !== 'production';
    }
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: {
        success: false,
        error: 'Too many AI requests, please slow down.'
    },
    skip: (req) => {
        return process.env.NODE_ENV !== 'production';
    }
});