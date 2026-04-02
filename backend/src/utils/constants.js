export const USER_TIERS = {
    FREE: 'free',
    PRO: 'pro',
};

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    CANCELED: 'canceled',
    PAST_DUE: 'past_due',
    INCOMPLETE: 'incomplete',
};

export const RESUME_TEMPLATES = {
    MODERN: 'modern',
    CLASSIC: 'classic',
    MINIMAL: 'minimal',
    EXECUTIVE: 'executive',
};

export const ATS_SCORE_THRESHOLDS = {
    EXCELLENT: 80,
    GOOD: 60,
    NEEDS_IMPROVEMENT: 40,
};

export const AI_STYLES = {
    ATS: 'ats',
    LEADERSHIP: 'leadership',
    TECHNICAL: 'technical',
    ACHIEVEMENT: 'achievement',
};

export const SKILL_LEVELS = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    EXPERT: 'expert',
};

export const EXPERIENCE_LEVELS = {
    ENTRY: 'entry',
    JUNIOR: 'junior',
    MID: 'mid',
    SENIOR: 'senior',
    LEAD: 'lead',
    EXECUTIVE: 'executive',
};

export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'You are not authorized to perform this action',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error',
    RATE_LIMIT: 'Too many requests, please try again later',
    AI_LIMIT: 'You have reached your AI usage limit. Upgrade to Pro for unlimited access',
    RESUME_LIMIT: 'Free users can only create 1 resume. Upgrade to Pro for unlimited',
};

export const SUCCESS_MESSAGES = {
    CREATED: 'Successfully created',
    UPDATED: 'Successfully updated',
    DELETED: 'Successfully deleted',
    ANALYZED: 'Successfully analyzed',
    OPTIMIZED: 'Successfully optimized',
    EXPORTED: 'Successfully exported',
};