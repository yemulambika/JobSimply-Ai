import { GoogleGenerativeAI } from '@google/generative-ai';
import { RESUME_EXTRACTION_PROMPT } from './prompts.js';

/**
 * Gemini Provider for Resume Extraction
 * Uses Google's Generative AI to parse resume text into structured JSON.
 */
export async function extractResume(resumeText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash-latest',
    generationConfig: { responseMimeType: 'application/json' }
  });

  // Truncate text to 10,000 characters for token optimization
  const truncatedText = resumeText.substring(0, 10000);
  const prompt = `${RESUME_EXTRACTION_PROMPT}\n\nResume Text:\n${truncatedText}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Provider Error:', error.message);
    throw error;
  }
}