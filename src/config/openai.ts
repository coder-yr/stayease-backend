import OpenAI from "openai";
import { env } from "./env.js";

const aiApiKey = env.XAI_API_KEY || env.OPENAI_API_KEY;
const isGroqKey = typeof aiApiKey === "string" && aiApiKey.startsWith("gsk_");

export const aiProvider = isGroqKey ? "groq" : "xai";
export const aiDefaultModel = isGroqKey ? "llama-3.3-70b-versatile" : "grok-3-mini";
export const aiBaseUrl = isGroqKey ? "https://api.groq.com/openai/v1" : env.XAI_BASE_URL;

export const xaiClient = aiApiKey
  ? new OpenAI({
      apiKey: aiApiKey,
      baseURL: aiBaseUrl
    })
  : null;

// Backward-compatible export so existing imports do not break.
export const openaiClient = xaiClient;
