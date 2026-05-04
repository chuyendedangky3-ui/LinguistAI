import { Flashcard, ApiKey, WordType } from '../types';
import * as db from './db';

/**
 * Gemini AI Integration with API Key Rotation.
 * Models: gemini-1.5-flash-latest
 */

const MODEL_NAME = 'gemini-1.5-flash-latest';

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

/**
 * Strips markdown code blocks from a string.
 */
function cleanJsonResponse(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

/**
 * Fetches an active API key from the database or environment.
 */
async function getNextApiKey(): Promise<ApiKey | { api_key: string; id: -1 }> {
  const keys = await db.getApiKeys();
  const activeKeys = keys.filter(k => k.is_active);

  if (activeKeys.length > 0) {
    return activeKeys[0];
  }

  // Fallback to environment variable if no DB keys
  const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!envKey) {
    throw new Error('No Gemini API key available. Please add one in Settings.');
  }

  return { api_key: envKey, id: -1 };
}

/**
 * Executes a prompt with automatic key rotation on failure.
 */
async function generateContent(prompt: string, attempt = 0): Promise<string> {
  const keyObj = await getNextApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${keyObj.api_key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        // Rate limit or server error - record failure and rotate
        if (keyObj.id !== -1) {
          await db.recordApiKeyFailure(keyObj.id);
        }
        
        if (attempt < 3) {
          return await generateContent(prompt, attempt + 1);
        }
      }
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    if (attempt < 3) {
      return await generateContent(prompt, attempt + 1);
    }
    throw error;
  }
}

/**
 * Analyzes a word/phrase and returns structured flashcard data.
 */
export async function analyzeWord(input: string): Promise<Partial<Flashcard>> {
  const prompt = `
    Analyze the English word or phrase: "${input}"
    
    Return a JSON object with these exact fields:
    - english: the word/phrase as given
    - vietnamese: Vietnamese translation
    - phonetic: IPA pronunciation
    - word_type: one of [noun, verb, adjective, adverb, phrase, idiom]
    - grammar_note: a brief grammar tip in English (1 sentence max)
    - example_en: a natural example sentence in English
    - example_vi: the Vietnamese translation of that example sentence
    
    Return ONLY the JSON object. No explanation.
  `;

  const raw = await generateContent(prompt);
  const jsonStr = cleanJsonResponse(raw);
  return JSON.parse(jsonStr);
}

/**
 * General tutor chat prompt.
 */
export async function tutorChat(message: string, context?: string): Promise<string> {
  const prompt = `
    You are an English language tutor helping a Vietnamese learner.
    Always respond in English. Keep explanations simple and practical.
    When giving examples, also provide their Vietnamese translations.
    
    ${context ? `Context: ${context}` : ''}
    User: ${message}
  `;

  return await generateContent(prompt);
}
