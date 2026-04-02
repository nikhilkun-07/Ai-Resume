import { openai, DEFAULT_MODEL, AI_CONFIG } from '../config/openai.js';

export class OpenAIService {
  static async analyzeJobDescription(jobDescription) {
    try {
      const prompt = `
        Analyze the following job description and extract structured information:

        JOB DESCRIPTION:
        ${jobDescription}

        Return a JSON object with EXACTLY this structure:
        {
          "keywords": ["list of 10-15 most important keywords"],
          "requiredSkills": ["must-have technical skills"],
          "preferredSkills": ["nice-to-have skills"],
          "experienceLevel": "entry|junior|mid|senior|lead|executive",
          "responsibilities": ["key responsibilities"],
          "softSkills": ["soft skills mentioned"],
          "industry": "industry sector",
          "educationRequirements": ["degree requirements"],
          "certifications": ["certifications"]
        }
      `;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: AI_CONFIG.temperature.analysis,
        max_tokens: AI_CONFIG.maxTokens.analysis,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error.message);

      if (error.status === 429 || error.message.includes('quota')) {
        console.log('⚠️ OpenAI quota exceeded. Using mock response for testing.');

        return {
          keywords: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'MongoDB', 'Leadership', 'Agile', 'Team Management', 'Problem Solving'],
          requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
          preferredSkills: ['TypeScript', 'GraphQL', 'AWS', 'Docker'],
          experienceLevel: 'senior',
          responsibilities: ['Lead development teams', 'Architect scalable solutions', 'Code reviews', 'Mentor junior developers'],
          softSkills: ['Communication', 'Leadership', 'Problem Solving', 'Teamwork'],
          industry: 'Technology',
          educationRequirements: ['Bachelor\'s degree in Computer Science or equivalent'],
          certifications: ['AWS Certified', 'Scrum Master']
        };
      }

      throw error;
    }
  }

  static async optimizeResumeBullet(bullet, keywords, style = 'ats') {
    try {
      const stylePrompts = {
        ats: `Rewrite this bullet point to be ATS-friendly. Incorporate these keywords: ${keywords.join(', ')}. Use strong action verbs and quantify achievements.`,
        leadership: `Rewrite this bullet point to emphasize leadership and management skills.`,
        technical: `Enhance this bullet point with technical depth and specific technologies.`,
        achievement: `Rewrite this bullet point to focus on measurable achievements and results.`
      };

      const systemPrompt = stylePrompts[style] || stylePrompts.ats;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: bullet }
        ],
        temperature: AI_CONFIG.temperature.optimization,
        max_tokens: AI_CONFIG.maxTokens.optimization,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error.message);

      if (error.status === 429 || error.message.includes('quota')) {
        return `${bullet} [MOCK OPTIMIZATION] - Led initiative resulting in 30% improvement, implemented best practices, and mentored 3 junior developers.`;
      }

      throw error;
    }
  }

  static async generateCoverLetter(resume, jobDescription, companyName) {
    try {
      const prompt = `
        Write a professional cover letter based on:
        Resume: ${JSON.stringify(resume?.personalInfo)}
        Job: ${jobDescription.substring(0, 500)}
        Company: ${companyName || 'the company'}
      `;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: AI_CONFIG.temperature.creative,
        max_tokens: AI_CONFIG.maxTokens.coverLetter,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error.message);

      if (error.status === 429 || error.message.includes('quota')) {
        return `Dear Hiring Manager,\n\nI am writing to express my interest in the position at ${companyName || 'your company'}. Based on my experience and skills, I believe I would be a great fit for this role.\n\n[MOCK COVER LETTER - OpenAI quota exceeded. Please add credits to your OpenAI account to generate real cover letters.]\n\nSincerely,\n${resume?.personalInfo?.name || 'Candidate'}`;
      }

      throw error;
    }
  }

  static async getCareerTips(resume, jobAnalysis) {
    try {
      const prompt = `
        Provide career tips based on:
        Resume: ${JSON.stringify(resume?.personalInfo)}
        Analysis: ${JSON.stringify(jobAnalysis)}
      `;

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: AI_CONFIG.temperature.analysis,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error.message);

      if (error.status === 429 || error.message.includes('quota')) {
        return {
          tips: [
            {
              title: "Add More Keywords",
              description: "Incorporate more industry-specific keywords from the job description into your resume.",
              priority: "high",
              actionItems: ["Review job description", "Add missing keywords to skills section"]
            },
            {
              title: "Quantify Achievements",
              description: "Add numbers and metrics to your experience bullet points.",
              priority: "medium",
              actionItems: ["Add percentages", "Include dollar amounts", "Mention team sizes"]
            },
            {
              title: "Update Skills Section",
              description: "Add more relevant technical and soft skills to your resume.",
              priority: "medium",
              actionItems: ["List current technologies", "Add soft skills"]
            }
          ]
        };
      }

      throw error;
    }
  }
}