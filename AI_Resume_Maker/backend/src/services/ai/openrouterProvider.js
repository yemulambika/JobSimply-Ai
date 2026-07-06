import axios from 'axios';
import { RESUME_EXTRACTION_PROMPT } from './prompts.js';

/**
 * OpenRouter Provider for Resume Extraction
 * Uses OpenRouter API to parse resume text into structured JSON.
 */
export async function extractResume(resumeText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing');
  }

  // Truncate text to 10,000 characters for token optimization
  const truncatedText = resumeText.substring(0, 10000);
  const prompt = `${RESUME_EXTRACTION_PROMPT}\n\nResume Text:\n${truncatedText}`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen3-32b',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('OpenRouter Provider Error:', error.response?.data || error.message);
    throw error;
  }
}