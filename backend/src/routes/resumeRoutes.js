import express from 'express';
import { protect, checkResumeLimit } from '../middleware/auth.js';
import {
    getAllResumes,
    getResume,
    createResume,
    updateResume,
    deleteResume,
    duplicateResume,
    archiveResume,
    unarchiveResume,
    getResumeVersions,
    exportToPDF,
    getArchivedResumes
} from '../controllers/resumeController.js';

const router = express.Router();

router.use(protect);

router.get('/archived', getArchivedResumes);

router.route('/')
    .get(getAllResumes)
    .post(checkResumeLimit, createResume);

router.route('/:id')
    .get(getResume)
    .put(updateResume)
    .delete(deleteResume);

router.post('/:id/duplicate', duplicateResume);
router.put('/:id/archive', archiveResume);
router.put('/:id/unarchive', unarchiveResume);
router.get('/:id/versions', getResumeVersions);
router.get('/:id/export', exportToPDF);

export default router;