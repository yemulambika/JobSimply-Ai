import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import { AtsResumeParser } from './ats/AtsResumeParser.js';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const atsParser = new AtsResumeParser();

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the environment variables.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class GeminiResumeParser {
  async parseResume(resumeText) {
    const prompt = `Given the following resume text, extract the following information and return it as a JSON object. If a field is not found, return null for that field. Do not include any additional text or formatting outside of the JSON object.

Extracted Fields:
- Name
- Email
- Phone
- Location
- LinkedIn Profile URL
- GitHub Profile URL
- Portfolio URL
- Summary
- Skills (list of strings)
- Technical Skills (list of strings)
- Soft Skills (list of strings)
- Experience (array of objects with 'title', 'company', 'location', 'dates', 'description')
- Projects (array of objects with 'title', 'description', 'technologies', 'link')
- Education (array of objects with 'degree', 'university', 'dates', 'description')
- Certifications (list of strings)
- Languages (list of strings)

Resume Text:
"""${resumeText}"""

Example JSON format for Experience:
[{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "location": "San Francisco, CA",
  "dates": "Jan 2020 - Dec 2023",
  "description": "Developed and maintained web applications."
}]

Example JSON format for Projects:
[{
  "title": "My Portfolio",
  "description": "A personal portfolio website.",
  "technologies": ["React", "Node.js"],
  "link": "https://myportfolio.com"
}]

Example JSON format for Education:
[{
  "degree": "B.S. in Computer Science",
  "university": "University of Example",
  "dates": "Sep 2016 - May 2020",
  "description": "GPA: 3.8/4.0"
}]

Return ONLY the JSON object.`;

    let lastError = null;

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from markdown code blocks or raw text
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        let parsed;
        if (jsonMatch && jsonMatch[1]) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          try {
            parsed = JSON.parse(text);
          } catch (parseError) {
            throw new Error(`Invalid JSON from ${modelName}: ${parseError.message}`);
          }
        }

        // Normalize field names (handle case variations from Gemini)
        const fieldMap = {
          name: 'name', Name: 'name', NAME: 'name',
          email: 'email', Email: 'email', EMAIL: 'email',
          phone: 'phone', Phone: 'phone', PHONE: 'phone',
          location: 'location', Location: 'location', LOCATION: 'location',
          linkedin: 'LinkedIn', 'linkedin profile url': 'LinkedIn', LinkedIn: 'LinkedIn',
          github: 'GitHub', 'github profile url': 'GitHub', GitHub: 'GitHub',
          portfolio: 'Portfolio', 'portfolio url': 'Portfolio', Portfolio: 'Portfolio',
          summary: 'summary', Summary: 'summary', SUMMARY: 'summary',
          skills: 'skills', Skills: 'skills', SKILLS: 'skills',
          'technical skills': 'technicalSkills', 'technicalskills': 'technicalSkills', TechnicalSkills: 'technicalSkills',
          'soft skills': 'softSkills', 'softskills': 'softSkills', SoftSkills: 'softSkills',
          experience: 'experience', Experience: 'experience', EXPERIENCE: 'experience',
          projects: 'projects', Projects: 'projects', PROJECTS: 'projects',
          education: 'education', Education: 'education', EDUCATION: 'education',
          certifications: 'certifications', Certifications: 'certifications', CERTIFICATIONS: 'certifications',
          languages: 'languages', Languages: 'languages', LANGUAGES: 'languages',
        };

        const normalized = {};
        for (const [key, value] of Object.entries(parsed)) {
          const normalizedKey = fieldMap[key] || key;
          normalized[normalizedKey] = value;
        }
        
        // Store full parsed structure
        normalized.parsedData = normalized;

        return normalized;
      } catch (error) {
        lastError = error;
        console.warn(`Model ${modelName} failed:`, error.message);

        // If hit rate limit, extract retry delay and wait
        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
          const retryMatch = error.message?.match(/retryDelay:\s*"(\d+)s"/);
          const retrySeconds = retryMatch ? parseInt(retryMatch[1], 10) : 10;
          console.warn(`Quota exceeded. Retrying in ${retrySeconds}s...`);
          await sleep(retrySeconds * 1000);
          continue; // Retry with same model after wait
        }

        // For non-quota errors, try next model
        if (!error.message?.includes('not found')) {
          break;
        }
      }
    }

    // If all models exhausted, use ATS regex parser
    console.warn('Gemini API unavailable. Using ATS regex extraction.');
    return this.fallbackExtract(resumeText);
  }

  fallbackExtract(text) {
    if (!text) {
      const empty = atsParser.getEmptyResult();
      return {
        name: empty.personal?.name,
        email: empty.personal?.email,
        phone: empty.personal?.phone,
        location: empty.personal?.location,
        LinkedIn: empty.personal?.linkedin,
        GitHub: empty.personal?.github,
        summary: empty.summary,
        skills: [],
        technicalSkills: [],
        softSkills: [],
        experience: [],
        projects: [],
        education: [],
        certifications: [],
        languages: [],
        parsedData: empty,
      };
    }

    // Use ATS parser for structured extraction
    const parsed = atsParser.parse(text);
    
    return {
      name: parsed.personal?.name,
      email: parsed.personal?.email,
      phone: parsed.personal?.phone,
      location: parsed.personal?.location,
      LinkedIn: parsed.personal?.linkedin,
      GitHub: parsed.personal?.github,
      summary: parsed.summary,
      skills: flattenSkills(parsed.skills),
      experience: parsed.experience,
      projects: parsed.projects,
      education: parsed.education,
      certifications: parsed.certifications,
      languages: parsed.languages || [],
      parsedData: parsed,
    };
  }
}

/**
 * Flatten categorized skills into a single array
 */
function flattenSkills(categorized) {
  if (!categorized) return [];
  const all = [];
  for (const category of Object.values(categorized)) {
    if (Array.isArray(category)) {
      all.push(...category);
    }
  }
  return [...new Set(all)];
}

export const geminiResumeParser = new GeminiResumeParser();