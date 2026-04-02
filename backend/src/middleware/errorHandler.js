export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    console.error('Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = { message, statusCode: 404 };
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const message = `${field} already exists`;
        error = { message, statusCode: 400 };
    }

    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        const message = messages.join(', ');
        error = { message, statusCode: 400 };
    }

    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { message, statusCode: 401 };
    }

    if (err.type && err.type.startsWith('Stripe')) {
        const message = err.message || 'Payment processing error';
        error = { message, statusCode: 400 };
    }

    if (err.response?.status === 429) {
        const message = 'AI service is currently busy. Please try again in a moment.';
        error = { message, statusCode: 429 };
    }

    if (err.code === 'insufficient_quota') {
        const message = 'AI usage limit reached. Please try again later or upgrade your plan.';
        error = { message, statusCode: 403 };
    }

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};