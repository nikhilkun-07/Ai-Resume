import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    createCheckoutSessionController,
    webhook,
    getSubscriptionStatus,
    cancelSubscription,
    createPortalSession
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/webhook', webhook);

router.use(protect);

router.post('/create-checkout-session', createCheckoutSessionController);
router.get('/subscription', getSubscriptionStatus);
router.post('/cancel-subscription', cancelSubscription);
router.post('/create-portal-session', createPortalSession);

export default router;