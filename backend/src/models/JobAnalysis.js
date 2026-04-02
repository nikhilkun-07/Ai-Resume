import mongoose from 'mongoose';

const jobAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        index: true
    },
    jobDescription: {
        type: String,
        required: true
    },
    jobTitle: String,
    companyName: String,
    analysis: {
        keywords: [String],
        requiredSkills: [String],
        preferredSkills: [String],
        experienceLevel: {
            type: String,
            enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive']
        },
        responsibilities: [String],
        softSkills: [String],
        industry: String,
        educationRequirements: [String],
        certifications: [String]
    },
    atsScore: {
        score: {
            type: Number,
            min: 0,
            max: 100
        },
        keywordMatch: {
            type: Number,
            min: 0,
            max: 100
        },
        formatting: {
            type: Number,
            min: 0,
            max: 100
        },
        contentStrength: {
            type: Number,
            min: 0,
            max: 100
        },
        missingKeywords: [String],
        matchedKeywords: [String],
        suggestions: [String],
        improvementTips: [String]
    },
    coverLetter: {
        content: String,
        generatedAt: Date
    },
    careerTips: [{
        title: String,
        description: String,
        priority: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        actionItems: [String]
    }],
    isShared: {
        type: Boolean,
        default: false
    },
    shareToken: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

jobAnalysisSchema.index({ userId: 1, createdAt: -1 });
jobAnalysisSchema.index({ shareToken: 1 }, { sparse: true });

export const JobAnalysis = mongoose.model('JobAnalysis', jobAnalysisSchema);