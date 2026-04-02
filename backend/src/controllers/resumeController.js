import { Resume } from '../models/Resume.js';
import { PDFService } from '../services/pdfService.js';

export const getAllResumes = async (req, res) => {
    try {
        const { search, sort, filter, page = 1, limit = 10 } = req.query;

        let query = { userId: req.user.id, isArchived: false };

        if (search) {
            query.$text = { $search: search };
        }

        if (filter === 'highScore') {
            query.atsScore = { $gte: 70 };
        } else if (filter === 'lowScore') {
            query.atsScore = { $lt: 70 };
        }

        let sortOption = { updatedAt: -1 };
        if (sort === 'name') sortOption = { name: 1 };
        if (sort === 'score') sortOption = { atsScore: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };

        const resumes = await Resume.find(query)
            .sort(sortOption)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Resume.countDocuments(query);

        res.json({
            success: true,
            resumes,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all resumes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getResume = async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id });

        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        resume.viewCount = (resume.viewCount || 0) + 1;
        await resume.save();

        res.json({ success: true, resume });
    } catch (error) {
        console.error('Get resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createResume = async (req, res) => {
    try {
        const { name, template } = req.body;

        const userResumes = await Resume.countDocuments({ userId: req.user.id, isArchived: false });
        const userLimit = req.user.resumeLimit || (req.user.tier === 'free' ? 20 : Infinity);

        if (userResumes >= userLimit) {
            return res.status(403).json({
                success: false,
                error: `Free users can create up to ${userLimit} resumes. Upgrade to Pro for unlimited resumes.`,
                limit: userLimit,
                current: userResumes
            });
        }

        const resume = new Resume({
            userId: req.user.id,
            name: name || 'Untitled Resume',
            template: template || 'modern',
            personalInfo: {},
            experience: [],
            education: [],
            skills: [],
            projects: [],
        });

        await resume.save();

        res.json({ success: true, resume });
    } catch (error) {
        console.error('Create resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateResume = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const resume = await Resume.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { ...updates, updatedAt: Date.now() },
            { returnDocument: 'after', runValidators: true }
        );

        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        res.json({ success: true, resume });
    } catch (error) {
        console.error('Update resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOneAndDelete({ _id: id, userId: req.user.id });

        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        res.json({ success: true, message: 'Resume deleted successfully' });
    } catch (error) {
        console.error('Delete resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const archiveResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isArchived: true, updatedAt: Date.now() },
            { returnDocument: 'after' }
        );

        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        res.json({ success: true, resume, message: 'Resume archived successfully' });
    } catch (error) {
        console.error('Archive resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const unarchiveResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isArchived: false, updatedAt: Date.now() },
            { returnDocument: 'after' }
        );

        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        res.json({ success: true, resume, message: 'Resume unarchived successfully' });
    } catch (error) {
        console.error('Unarchive resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const duplicateResume = async (req, res) => {
    try {
        const { id } = req.params;
        const original = await Resume.findOne({ _id: id, userId: req.user.id });

        if (!original) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        const userResumes = await Resume.countDocuments({ userId: req.user.id, isArchived: false });
        const userLimit = req.user.resumeLimit || (req.user.tier === 'free' ? 20 : Infinity);

        if (userResumes >= userLimit) {
            return res.status(403).json({
                success: false,
                error: `Free users can have up to ${userLimit} resumes. Upgrade to Pro to create more.`,
                limit: userLimit,
                current: userResumes
            });
        }

        const duplicate = new Resume({
            userId: req.user.id,
            name: `${original.name} (Copy)`,
            template: original.template,
            personalInfo: original.personalInfo,
            experience: original.experience,
            education: original.education,
            skills: original.skills,
            projects: original.projects,
            certifications: original.certifications,
            languages: original.languages,
            version: (original.version || 0) + 1,
        });

        await duplicate.save();

        res.json({ success: true, resume: duplicate });
    } catch (error) {
        console.error('Duplicate resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getResumeVersions = async (req, res) => {
    try {
        const { id } = req.params;
        const currentResume = await Resume.findOne({ _id: id, userId: req.user.id });

        if (!currentResume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        const baseName = currentResume.name.replace(/\s*\(Copy.*\)/, '').trim();
        const versions = await Resume.find({
            userId: req.user.id,
            name: { $regex: new RegExp(`^${baseName}`, 'i') }
        }).sort({ version: -1, createdAt: -1 });

        res.json({ success: true, versions });
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const exportToPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const { template } = req.query;

        const resume = await Resume.findOne({ _id: id, userId: req.user.id });
        if (!resume) {
            return res.status(404).json({ success: false, error: 'Resume not found' });
        }

        resume.downloadCount = (resume.downloadCount || 0) + 1;
        await resume.save();

        let finalTemplate = template || resume.template;
        if (req.user.tier !== 'pro' && ['executive'].includes(finalTemplate)) {
            finalTemplate = 'modern';
        }

        const html = PDFService.getResumeHTML(resume, finalTemplate);
        const pdf = await PDFService.generatePDF(html, finalTemplate);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resume.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
        res.setHeader('Content-Length', pdf.length);
        res.send(pdf);
    } catch (error) {
        console.error('Export PDF error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate PDF' });
    }
};

export const getArchivedResumes = async (req, res) => {
    try {
        const resumes = await Resume.find({
            userId: req.user.id,
            isArchived: true
        }).sort({ updatedAt: -1 });

        res.json({ success: true, resumes });
    } catch (error) {
        console.error('Get archived resumes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};