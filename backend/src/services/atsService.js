export class ATSService {
    static calculateScore(resume, jobAnalysis) {
        const keywordMatch = this.calculateKeywordMatch(resume, jobAnalysis.keywords);

        const formatting = this.calculateFormattingScore(resume);

        const contentStrength = this.calculateContentStrength(resume);

        const score = Math.round(
            keywordMatch * 0.5 +
            formatting * 0.2 +
            contentStrength * 0.3
        );

        const { missing, matched } = this.identifyKeywords(resume, jobAnalysis.keywords);

        const suggestions = this.generateSuggestions(resume, missing, contentStrength);

        return {
            score,
            keywordMatch,
            formatting,
            contentStrength,
            missingKeywords: missing,
            matchedKeywords: matched,
            suggestions
        };
    }

    static calculateKeywordMatch(resume, keywords) {
        if (!keywords || keywords.length === 0) return 0;

        const resumeText = this.extractResumeText(resume).toLowerCase();
        let matches = 0;

        for (const keyword of keywords) {
            if (resumeText.includes(keyword.toLowerCase())) {
                matches++;
            }
        }

        return Math.round((matches / keywords.length) * 100);
    }

    static calculateFormattingScore(resume) {
        let score = 100;

        if (!resume.personalInfo?.summary || resume.personalInfo.summary.length < 50) {
            score -= 15;
        }

        const hasQuantifiable = this.checkQuantifiable(resume);
        if (!hasQuantifiable) {
            score -= 20;
        }

        const hasActionVerbs = this.checkActionVerbs(resume);
        if (!hasActionVerbs) {
            score -= 10;
        }

        if (resume.experience?.length > 0) {
            const hasConsistentDates = this.checkDateConsistency(resume);
            if (!hasConsistentDates) {
                score -= 10;
            }
        }

        return Math.max(0, score);
    }

    static calculateContentStrength(resume) {
        let score = 0;

        if (resume.experience?.length >= 3) score += 25;
        else if (resume.experience?.length >= 1) score += 15;

        if (resume.education?.length > 0) score += 15;

        if (resume.skills?.length >= 10) score += 20;
        else if (resume.skills?.length >= 5) score += 15;
        else if (resume.skills?.length >= 1) score += 10;

        if (resume.projects?.length >= 2) score += 15;
        else if (resume.projects?.length >= 1) score += 10;

        if (resume.certifications?.length > 0) score += 10;

        if (resume.personalInfo?.summary && resume.personalInfo.summary.length > 100) {
            score += 15;
        }

        return Math.min(100, score);
    }

    static extractResumeText(resume) {
        let text = '';

        text += resume.personalInfo?.summary || '';
        text += ' ' + (resume.experience?.map(e =>
            `${e.title} ${e.company} ${e.description?.join(' ')}`
        ).join(' ') || '');
        text += ' ' + (resume.skills?.map(s => s.name).join(' ') || '');
        text += ' ' + (resume.education?.map(e => `${e.degree} ${e.institution}`).join(' ') || '');
        text += ' ' + (resume.projects?.map(p => `${p.name} ${p.description}`).join(' ') || '');

        return text;
    }

    static identifyKeywords(resume, keywords) {
        const resumeText = this.extractResumeText(resume).toLowerCase();
        const missing = [];
        const matched = [];

        for (const keyword of keywords) {
            if (resumeText.includes(keyword.toLowerCase())) {
                matched.push(keyword);
            } else {
                missing.push(keyword);
            }
        }

        return { missing, matched };
    }

    static checkQuantifiable(resume) {
        const quantifiablePatterns = [
            /\d+%/,
            /\d+\s*(?:million|billion|k|thousand)/i,
            /\d+\s*(?:years?|months?)/i,
            /\d+\s*(?:teams?|members?|people)/i,
            /\$\d+/
        ];

        const text = this.extractResumeText(resume);

        for (const pattern of quantifiablePatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }

        return false;
    }

    static checkActionVerbs(resume) {
        const actionVerbs = [
            'led', 'managed', 'developed', 'created', 'implemented',
            'designed', 'achieved', 'improved', 'increased', 'reduced',
            'saved', 'grew', 'launched', 'built', 'directed', 'coordinated'
        ];

        const text = this.extractResumeText(resume).toLowerCase();

        for (const verb of actionVerbs) {
            if (text.includes(verb)) {
                return true;
            }
        }

        return false;
    }

    static checkDateConsistency(resume) {
        if (!resume.experience) return true;

        for (const exp of resume.experience) {
            if (exp.startDate && !exp.endDate && !exp.current) {
                return false;
            }
        }

        return true;
    }

    static generateSuggestions(resume, missingKeywords, contentStrength) {
        const suggestions = [];

        if (missingKeywords.length > 0) {
            suggestions.push({
                type: 'keywords',
                text: `Add these keywords to your resume: ${missingKeywords.slice(0, 5).join(', ')}`,
                priority: 'high'
            });
        }

        if (contentStrength < 60) {
            if (!resume.personalInfo?.summary || resume.personalInfo.summary.length < 50) {
                suggestions.push({
                    type: 'summary',
                    text: 'Add a strong professional summary highlighting your key achievements',
                    priority: 'high'
                });
            }

            if (!this.checkQuantifiable(resume)) {
                suggestions.push({
                    type: 'achievements',
                    text: 'Add quantifiable achievements with numbers, percentages, and specific results',
                    priority: 'high'
                });
            }

            if (resume.skills?.length < 10) {
                suggestions.push({
                    type: 'skills',
                    text: 'Add more relevant technical and soft skills to your skills section',
                    priority: 'medium'
                });
            }
        }

        if (!this.checkActionVerbs(resume)) {
            suggestions.push({
                type: 'verbs',
                text: 'Start bullet points with strong action verbs like "Led", "Managed", "Developed"',
                priority: 'medium'
            });
        }

        return suggestions;
    }
}