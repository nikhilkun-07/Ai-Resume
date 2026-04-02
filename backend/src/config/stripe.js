import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: false,
    maxNetworkRetries: 2,
});

export const PRICE_IDS = {
    PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
};

export const SUBSCRIPTION_PLANS = {
    MONTHLY: {
        name: 'Pro Monthly',
        priceId: PRICE_IDS.PRO_MONTHLY,
        interval: 'month',
        amount: 12,
        currency: 'usd',
    },
    YEARLY: {
        name: 'Pro Yearly',
        priceId: PRICE_IDS.PRO_YEARLY,
        interval: 'year',
        amount: 120,
        currency: 'usd',
        discount: 'Save 17%',
    },
};

export const createCustomer = async (email, name, metadata = {}) => {
    try {
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
                ...metadata,
                source: 'careerforge',
                createdAt: new Date().toISOString(),
            },
        });
        return customer;
    } catch (error) {
        console.error('Stripe create customer error:', error);
        throw new Error('Failed to create Stripe customer');
    }
};

export const createCheckoutSession = async (customerId, priceId, successUrl, cancelUrl, metadata = {}) => {
    try {
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata,
            subscription_data: {
                metadata,
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            customer_update: {
                address: 'auto',
                name: 'auto',
            },
        });
        return session;
    } catch (error) {
        console.error('Stripe create checkout session error:', error);
        throw new Error('Failed to create checkout session');
    }
};

export const constructWebhookEvent = (payload, signature, webhookSecret) => {
    try {
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
        console.error('Stripe webhook signature verification failed:', error);
        throw new Error('Webhook signature verification failed');
    }
};

export default {
    stripe,
    PRICE_IDS,
    SUBSCRIPTION_PLANS,
    createCustomer,
    createCheckoutSession,
    constructWebhookEvent,
};