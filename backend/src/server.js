import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { limiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔧 Environment Check:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ MISSING'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ MISSING'}`);

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            console.error('❌ MONGODB_URI is not defined in .env file');
            console.log('💡 Please add MONGODB_URI to your .env file');
            console.log('💡 Example for local MongoDB: MONGODB_URI=mongodb://localhost:27017/careerforge');
            console.log('💡 Example for MongoDB Atlas: MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/careerforge');
            return false;
        }

        console.log('🔍 Connecting to MongoDB...');

        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ MongoDB Connected');
        console.log(`📚 Database: ${mongoose.connection.name}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.log('⚠️ Server will continue without database connection...');
        return false;
    }
};

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(morgan('dev'));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(limiter);

app.use((req, res, next) => {
    res.setTimeout(30000);
    req.setTimeout(30000);
    next();
});

app.get('/api/health', (req, res) => {
    const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: {
            status: dbStates[mongoose.connection.readyState] || 'unknown',
            name: mongoose.connection.name || 'Not connected',
            readyState: mongoose.connection.readyState
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payment', paymentRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.url} not found`,
        availableRoutes: [
            'GET /api/health',
            'GET /api/test',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/auth/me',
            'GET /api/resumes',
            'POST /api/resumes'
        ]
    });
});

app.use(errorHandler);

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test\n`);
    });
};

startServer();