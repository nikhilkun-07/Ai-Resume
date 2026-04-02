import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 60000,
});

export const OPENAI_MODELS = {
    GPT_3_5_TURBO: 'gpt-3.5-turbo',
    GPT_4: 'gpt-4',
    GPT_4_TURBO: 'gpt-4-turbo-preview',
};

export const DEFAULT_MODEL = OPENAI_MODELS.GPT_3_5_TURBO;

export const AI_CONFIG = {
    temperature: {
        analysis: 0.3,
        optimization: 0.7,
        creative: 0.8,
    },
    maxTokens: {
        analysis: 2000,
        optimization: 500,
        coverLetter: 1000,
    },
};