import { GoogleGenAI } from "@google/genai";

export function geminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/** Gemini's `-latest` model aliases occasionally return a transient 503 (backend overload) — retry a couple of times before giving up. */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  attempts = 3
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (status !== 503 && status !== 429) throw err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw lastError;
}
