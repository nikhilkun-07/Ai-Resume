import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => Date.now().toString()
    },
    title: {
        type: String,
        required: true
    },
    company: String,
    location: String,
    startDate: String,
    endDate: String,
    current: {
        type: Boolean,
        default: false
    },
    description: [String]
});

const educationSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => Date.now().toString()
    },
    degree: {
        type: String,
        required: true
    },
    institution: {
        type: String,
        required: true
    },
    location: String,
    graduationYear: String,
    gpa: String
});

const skillSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => Date.now().toString()
    },
    name: {
        type: String,
        required: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    }
});

const projectSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => Date.now().toString()
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    technologies: [String],
    link: String,
    startDate: String,
    endDate: String
});

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Please add a resume name'],
        trim: true
    },
    version: {
        type: Number,
        default: 1
    },
    template: {
        type: String,
        enum: ['modern', 'classic', 'minimal', 'executive'],
        default: 'modern'
    },
    personalInfo: {
        name: String,
        email: String,
        phone: String,
        location: String,
        linkedin: String,
        website: String,
        github: String,
        title: String,
        summary: String
    },
    experience: [experienceSchema],
    education: [educationSchema],
    skills: [skillSchema],
    projects: [projectSchema],
    certifications: [{
        id: String,
        name: String,
        issuer: String,
        date: String
    }],
    languages: [{
        id: String,
        name: String,
        proficiency: String
    }],
    atsScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastAnalysis: {
        jobDescription: String,
        keywords: [String],
        missingKeywords: [String],
        suggestions: [String],
        analyzedAt: Date
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    viewCount: {
        type: Number,
        default: 0
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

resumeSchema.index({ name: 'text', 'personalInfo.name': 'text' });

resumeSchema.virtual('fullName').get(function () {
    return this.personalInfo?.name || 'Unnamed Resume';
});

resumeSchema.methods.incrementViews = async function () {
    this.viewCount += 1;
    await this.save();
};

export const Resume = mongoose.model('Resume', resumeSchema);