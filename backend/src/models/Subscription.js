import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    stripeSubscriptionId: {
        type: String,
        required: true,
        unique: true,
    },
    stripeCustomerId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
        default: 'incomplete',
    },
    plan: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true,
    },
    currentPeriodStart: {
        type: Date,
        required: true,
    },
    currentPeriodEnd: {
        type: Date,
        required: true,
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
    },
    canceledAt: Date,
    trialStart: Date,
    trialEnd: Date,
    metadata: {
        type: Map,
        of: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

subscriptionSchema.virtual('isActive').get(function () {
    return this.status === 'active' && this.currentPeriodEnd > new Date();
});

subscriptionSchema.methods.isExpiringSoon = function (days = 7) {
    const daysUntilExpiry = (this.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= days;
};

export const Subscription = mongoose.model('Subscription', subscriptionSchema);