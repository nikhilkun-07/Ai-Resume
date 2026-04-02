import { Resume } from '../models/Resume.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { OpenAIService } from '../services/openaiService.js';
import { ATSService } from '../services/atsService.js';

export const analyzeJob = async (req, res) => {
    try {
        const { jobDescription, resumeId } = req.body;

        if (!jobDescription) {
            return res.status(400).json({ success: false, error: 'Job description is required' });
        }

        if (req.user.tier === 'free' && req.user.aiUsageCount >= req.user.aiUsageLimit) {
            return res.status(403).json({
                success: false,
                error: `Free users have ${req.user.aiUsageLimit} AI analyses. Upgrade to Pro for unlimited analyses.`
            });
        }

        let resume = null;
        if (resumeId) {
            resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
        }

        const jobAnalysis = await OpenAIService.analyzeJobDescription(jobDescription);

        let atsScore = null;
        let careerTips = null;

        if (resume) {
            atsScore = await ATSService.calculateScore(resume, jobAnalysis);
            careerTips = await OpenAIService.getCareerTips(resume, jobAnalysis);
        }

        const analysis = new JobAnalysis({
            userId: req.user.id,
            resumeId: resume?._id,
            jobDescription,
            analysis: jobAnalysis,
            atsScore: atsScore || {},
            careerTips: careerTips?.tips || []
        });

        await analysis.save();

        if (resume) {
            resume.atsScore = atsScore?.score || 0;
            resume.lastAnalysis = {
                jobDescription: jobDescription.substring(0, 500),
                keywords: jobAnalysis.keywords,
                missingKeywords: atsScore?.missingKeywords || [],
                suggestions: atsScore?.suggestions || [],
                analyzedAt: new Date()
            };
            await resume.save();
        }

        if (req.user.tier === 'free') {
            req.user.aiUsageCount += 1;
            await req.user.save();
        }

        res.json({
            success: true,
            analysis: jobAnalysis,
            atsScore,
            careerTips: careerTips?.tips || [],
            analysisId: analysis._id
        });
    } catch (error) {
        console.error('Analyze job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const optimizeBullet = async (req, res) => {
    try {
        const { bullet, keywords, style, resumeId } = req.body;

        if (!bullet) {
            return res.status(400).json({ success: false, error: 'Bullet point is required' });
        }

        if (req.user.tier === 'free' && req.user.aiUsageCount >= req.user.aiUsageLimit) {
            return res.status(403).json({
                success: false,
                error: `Free users have ${req.user.aiUsageLimit} AI optimizations. Upgrade to Pro for unlimited.`
            });
        }

        const optimized = await OpenAIService.optimizeResumeBullet(bullet, keywords || [], style);

        if (req.user.tier === 'free') {
            req.user.aiUsageCount += 1;
            await req.user.save();
        }

        res.json({ success: true, optimized });
    } catch (error) {
        console.error('Optimize bullet error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const generateCoverLetter = async (req, res) => {
    try {
        const { jobDescription, companyName, resumeId } = req.body;

        if (req.user.tier !== 'pro') {
            return res.status(403).json({
                success: false,
                error: 'Cover letters are a Pro feature. Upgrade to Pro to unlock.'
            });
        }

        if (!jobDescription) {
            return res.status(400).json({ success: false, error: 'Job description is required' });
        }

        let resume = null;
        if (resumeId) {
            resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
        }

        const coverLetter = await OpenAIService.generateCoverLetter(resume, jobDescription, companyName);

        if (resumeId) {
            await JobAnalysis.findOneAndUpdate(
                { resumeId, userId: req.user.id },
                { 'coverLetter.content': coverLetter, 'coverLetter.generatedAt': new Date() },
                { upsert: true, returnDocument: 'after' }
            );
        }

        res.json({ success: true, coverLetter });
    } catch (error) {
        console.error('Generate cover letter error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getAnalyses = async (req, res) => {
    try {
        const { limit = 10, resumeId } = req.query;

        const query = { userId: req.user.id };
        if (resumeId) query.resumeId = resumeId;

        const analyses = await JobAnalysis.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, analyses });
    } catch (error) {
        console.error('Get analyses error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getAnalysis = async (req, res) => {
    try {
        const analysis = await JobAnalysis.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!analysis) {
            return res.status(404).json({ success: false, error: 'Analysis not found' });
        }

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const shareAnalysis = async (req, res) => {
    try {
        const analysis = await JobAnalysis.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!analysis) {
            return res.status(404).json({ success: false, error: 'Analysis not found' });
        }

        const shareToken = Math.random().toString(36).substring(2, 15);
        analysis.shareToken = shareToken;
        analysis.isShared = true;
        await analysis.save();

        const shareUrl = `${process.env.FRONTEND_URL}/shared-analysis/${shareToken}`;

        res.json({ success: true, shareUrl });
    } catch (error) {
        console.error('Share analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getSharedAnalysis = async (req, res) => {
    try {
        const { token } = req.params;

        const analysis = await JobAnalysis.findOne({
            shareToken: token,
            isShared: true
        }).populate('userId', 'name');

        if (!analysis) {
            return res.status(404).json({ success: false, error: 'Shared analysis not found' });
        }

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Get shared analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};