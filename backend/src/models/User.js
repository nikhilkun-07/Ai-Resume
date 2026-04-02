import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true,
        maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    tier: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free'
    },
    stripeCustomerId: {
        type: String,
        sparse: true
    },
    subscriptionId: {
        type: String,
        sparse: true
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'canceled', 'past_due', 'incomplete', null],
        default: null
    },
    subscriptionEndDate: {
        type: Date
    },
    aiUsageCount: {
        type: Number,
        default: 0
    },
    aiUsageLimit: {
        type: Number,
        default: 50
    },
    resumeLimit: {
        type: Number,
        default: 10
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    preferences: {
        theme: {
            type: String,
            enum: ['dark', 'light'],
            default: 'dark'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.virtual('resumes', {
    ref: 'Resume',
    localField: '_id',
    foreignField: 'userId',
    justOne: false
});

export const User = mongoose.model('User', userSchema);