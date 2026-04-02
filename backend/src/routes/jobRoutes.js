import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    analyzeJob,
    optimizeBullet,
    generateCoverLetter,
    getAnalyses,
    getAnalysis,
    shareAnalysis,
    getSharedAnalysis
} from '../controllers/jobController.js';

const router = express.Router();

router.use(protect);

router.post('/analyze', analyzeJob);
router.post('/optimize-bullet', optimizeBullet);
router.post('/generate-cover-letter', generateCoverLetter);
router.get('/analyses', getAnalyses);
router.get('/analyses/:id', getAnalysis);
router.post('/analyses/:id/share', shareAnalysis);

router.get('/shared/:token', getSharedAnalysis);

export default router;