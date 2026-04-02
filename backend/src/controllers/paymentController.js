import { stripe, PRICE_IDS, createCheckoutSession } from '../config/stripe.js';
import { User } from '../models/User.js';

export const createCheckoutSessionController = async (req, res) => {
    try {
        const { priceId, successUrl, cancelUrl } = req.body;

        if (!priceId || !successUrl || !cancelUrl) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const user = await User.findById(req.user.id);

        if (!user.stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: user._id.toString() }
            });
            user.stripeCustomerId = customer.id;
            await user.save();
        }

        const session = await createCheckoutSession(
            user.stripeCustomerId,
            priceId,
            successUrl,
            cancelUrl,
            { userId: user._id.toString() }
        );

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Create checkout session error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const webhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event.data.object);
            break;
        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;
        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object);
            break;
        case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};

const handleCheckoutSessionCompleted = async (session) => {
    try {
        const { userId } = session.metadata;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await User.findByIdAndUpdate(userId, {
            tier: 'pro',
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionEndDate: new Date(subscription.current_period_end * 1000),
            aiUsageLimit: null
        });

        console.log(`User ${userId} upgraded to Pro`);
    } catch (error) {
        console.error('Handle checkout completed error:', error);
    }
};

const handleSubscriptionUpdated = async (subscription) => {
    try {
        const user = await User.findOne({ subscriptionId: subscription.id });
        if (user) {
            user.subscriptionStatus = subscription.status;
            user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
            await user.save();
        }
    } catch (error) {
        console.error('Handle subscription updated error:', error);
    }
};

const handleSubscriptionDeleted = async (subscription) => {
    try {
        const user = await User.findOne({ subscriptionId: subscription.id });
        if (user) {
            user.tier = 'free';
            user.subscriptionId = null;
            user.subscriptionStatus = null;
            user.subscriptionEndDate = null;
            user.aiUsageLimit = 5;
            await user.save();
        }
    } catch (error) {
        console.error('Handle subscription deleted error:', error);
    }
};

const handlePaymentFailed = async (invoice) => {
    try {
        const user = await User.findOne({ stripeCustomerId: invoice.customer });
        if (user) {
            user.subscriptionStatus = 'past_due';
            await user.save();
        }
    } catch (error) {
        console.error('Handle payment failed error:', error);
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.subscriptionId) {
            return res.json({
                success: true,
                subscription: null,
                tier: user.tier
            });
        }

        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);

        res.json({
            success: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                items: subscription.items.data
            },
            tier: user.tier
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.subscriptionId) {
            return res.status(400).json({ success: false, error: 'No active subscription' });
        }

        await stripe.subscriptions.update(user.subscriptionId, {
            cancel_at_period_end: true
        });

        res.json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period'
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createPortalSession = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.stripeCustomerId) {
            return res.status(400).json({ success: false, error: 'No customer found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/settings`,
        });

        res.json({ success: true, url: session.url });
    } catch (error) {
        console.error('Create portal session error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};