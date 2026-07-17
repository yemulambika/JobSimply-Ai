// Shared Gemini client used by the tailor, cover-letter and email generators.
// Centralizes model selection, JSON parsing and graceful fallback so every
// AI feature behaves consistently when AI_PROVIDER=gemini.

import { GoogleGenerativeAI } from '@google/generative-ai';

// Ordered list of models to try. Override the primary with GEMINI_MODEL.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
].filter(Boolean);

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Run a prompt through Gemini and return raw text.
 * Tries each candidate model until one succeeds.
 */
export async function geminiText(prompt, { json = false } = {}) {
  const genAI = getClient();
  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(json
          ? { generationConfig: { responseMimeType: 'application/json' } }
          : {}),
      });
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      if (text) return text;
    } catch (error) {
      lastError = error;
      console.error(`[gemini] model ${modelName} failed:`, error.message);
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Run a prompt and parse the response as JSON.
 * Strips markdown code fences if the model wraps the JSON.
 */
export async function geminiJSON(prompt) {
  const raw = await geminiText(prompt, { json: true });
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}
