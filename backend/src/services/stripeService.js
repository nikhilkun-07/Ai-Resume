import Stripe from 'stripe';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: false,
});

export class StripeService {
    static async createCustomer(user) {
        try {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user._id.toString(),
                    tier: user.tier,
                },
            });

            return customer;
        } catch (error) {
            console.error('Stripe create customer error:', error);
            throw new Error('Failed to create Stripe customer');
        }
    }

    static async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
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
                metadata: {
                    ...metadata,
                    userId: metadata.userId,
                },
                subscription_data: {
                    metadata: {
                        userId: metadata.userId,
                    },
                },
            });

            return session;
        } catch (error) {
            console.error('Stripe create checkout session error:', error);
            throw new Error('Failed to create checkout session');
        }
    }

    static async getSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['customer', 'latest_invoice'],
            });
            return subscription;
        } catch (error) {
            console.error('Stripe get subscription error:', error);
            throw new Error('Failed to retrieve subscription');
        }
    }

    static async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        try {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: cancelAtPeriodEnd,
            });
            return subscription;
        } catch (error) {
            console.error('Stripe cancel subscription error:', error);
            throw new Error('Failed to cancel subscription');
        }
    }

    static async reactivateSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
            });
            return subscription;
        } catch (error) {
            console.error('Stripe reactivate subscription error:', error);
            throw new Error('Failed to reactivate subscription');
        }
    }

    static async updateSubscription(subscriptionId, newPriceId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                items: [
                    {
                        id: subscription.items.data[0].id,
                        price: newPriceId,
                    },
                ],
                proration_behavior: 'create_prorations',
            });

            return updatedSubscription;
        } catch (error) {
            console.error('Stripe update subscription error:', error);
            throw new Error('Failed to update subscription');
        }
    }

    static async createPortalSession(customerId, returnUrl) {
        try {
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });
            return session;
        } catch (error) {
            console.error('Stripe create portal session error:', error);
            throw new Error('Failed to create portal session');
        }
    }

    static async getUpcomingInvoice(customerId) {
        try {
            const invoice = await stripe.invoices.retrieveUpcoming({
                customer: customerId,
            });
            return invoice;
        } catch (error) {
            console.error('Stripe get upcoming invoice error:', error);
            return null;
        }
    }

    static async getPaymentMethods(customerId) {
        try {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });
            return paymentMethods.data;
        } catch (error) {
            console.error('Stripe get payment methods error:', error);
            return [];
        }
    }

    static async createSetupIntent(customerId) {
        try {
            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ['card'],
            });
            return setupIntent;
        } catch (error) {
            console.error('Stripe create setup intent error:', error);
            throw new Error('Failed to create setup intent');
        }
    }

    static async handleWebhookEvent(event) {
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.created':
                await this.handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await this.handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.handleInvoicePaymentFailed(event.data.object);
                break;
            case 'customer.updated':
                await this.handleCustomerUpdated(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }

    static async handleCheckoutCompleted(session) {
        try {
            const { userId } = session.metadata;
            const subscriptionId = session.subscription;

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            await User.findByIdAndUpdate(userId, {
                tier: 'pro',
                stripeCustomerId: session.customer,
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                subscriptionEndDate: new Date(subscription.current_period_end * 1000),
                aiUsageLimit: null,
            });

            await Subscription.create({
                userId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: session.customer,
                status: subscription.status,
                plan: subscription.items.data[0].price.recurring.interval,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                metadata: subscription.metadata,
            });

            console.log(`User ${userId} upgraded to Pro successfully`);
        } catch (error) {
            console.error('Handle checkout completed error:', error);
        }
    }

    static async handleSubscriptionCreated(subscription) {
        try {
            const userId = subscription.metadata.userId;
            if (!userId) return;

            await Subscription.findOneAndUpdate(
                { stripeSubscriptionId: subscription.id },
                {
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('Handle subscription created error:', error);
        }
    }

    static async handleSubscriptionUpdated(subscription) {
        try {
            const user = await User.findOne({ subscriptionId: subscription.id });
            if (user) {
                user.subscriptionStatus = subscription.status;
                user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
                await user.save();
            }

            await Subscription.findOneAndUpdate(
                { stripeSubscriptionId: subscription.id },
                {
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                }
            );
        } catch (error) {
            console.error('Handle subscription updated error:', error);
        }
    }

    static async handleSubscriptionDeleted(subscription) {
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

            await Subscription.findOneAndUpdate(
                { stripeSubscriptionId: subscription.id },
                { status: 'canceled', canceledAt: new Date() }
            );
        } catch (error) {
            console.error('Handle subscription deleted error:', error);
        }
    }

    static async handleInvoicePaymentSucceeded(invoice) {
        try {
            const user = await User.findOne({ stripeCustomerId: invoice.customer });
            if (user && invoice.subscription) {
                console.log(`Payment succeeded for user ${user.email}`);
            }
        } catch (error) {
            console.error('Handle invoice payment succeeded error:', error);
        }
    }

    static async handleInvoicePaymentFailed(invoice) {
        try {
            const user = await User.findOne({ stripeCustomerId: invoice.customer });
            if (user) {
                user.subscriptionStatus = 'past_due';
                await user.save();

                const { sendPaymentFailedEmail } = await import('../jobs/emailJob.js');
                await sendPaymentFailedEmail(user.email);

                console.log(`Payment failed for user ${user.email}`);
            }
        } catch (error) {
            console.error('Handle invoice payment failed error:', error);
        }
    }

    static async handleCustomerUpdated(customer) {
        try {
            const user = await User.findOne({ stripeCustomerId: customer.id });
            if (user && user.email !== customer.email) {
                user.email = customer.email;
                await user.save();
            }
        } catch (error) {
            console.error('Handle customer updated error:', error);
        }
    }
}

export default StripeService;