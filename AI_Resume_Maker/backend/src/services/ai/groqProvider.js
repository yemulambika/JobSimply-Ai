import Groq from 'groq-sdk';
import { RESUME_EXTRACTION_PROMPT } from './prompts.js';

/**
 * Groq Provider for Resume Extraction
 * Uses Groq's SDK to parse resume text into structured JSON.
 */
export async function extractResume(resumeText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing');
  }

  const groq = new Groq({ apiKey });

  // Initial truncation to 10,000 characters for token optimization
  let currentText = resumeText.substring(0, 10000);
  
  const callGroq = async (text) => {
    const prompt = `${RESUME_EXTRACTION_PROMPT}\n\nResume Text:\n${text}`;
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    return JSON.parse(content);
  };

  try {
    return await callGroq(currentText);
  } catch (error) {
    // If Groq returns 413 Request too large, we truncate further and retry
    if (error.status === 413 || error.message?.includes('413')) {
      console.log('Groq 413 error: Request too large. Truncating further and retrying...');
      // The requirement says maximum 10,000 characters, but we already did that.
      // If it still fails with 413, we'll try a more aggressive truncation (e.g., 5000) 
      // as a safety measure, though 10k is the target.
      currentText = resumeText.substring(0, 5000);
      return await callGroq(currentText);
    }
    
    console.error('Groq Provider Error:', error.message);
    throw error;
  }
}