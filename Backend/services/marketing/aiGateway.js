import OpenAI from "openai";

/**
 * Provider-agnostic AI gateway. Phase 1 uses the OpenAI SDK pointed at
 * OPENROUTER_API_KEY (already wired in server.js) or a real OPENAI_API_KEY.
 * Swapping to Gemini later = a new provider in this file only.
 */

let client = null;

/** server.js aliases OPENAI_API_KEY to OPENROUTER; prefer OR base in that case. */
const usingOpenRouter = () =>
  !process.env.OPENAI_BASE_URL && Boolean(process.env.OPENROUTER_API_KEY);

const getClient = () => {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
      baseURL:
        process.env.OPENAI_BASE_URL ||
        (usingOpenRouter() ? "https://openrouter.ai/api/v1" : undefined),
    });
  }
  return client;
};

export const isAiConfigured = () =>
  Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);

const DEFAULT_MODEL = () =>
  usingOpenRouter() ? "openai/gpt-4o-mini" : "gpt-4o-mini";

/** Ask the model to fill the {text,hashtags,cta,imagePrompt} JSON shape. */
export async function generateTextSuggestion({ prompt, model }) {
  if (!isAiConfigured()) {
    throw new Error(
      "AI generation is not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.",
    );
  }
  const llm = getClient();
  const completion = await llm.chat.completions.create({
    model: model || process.env.MARKETING_AI_MODEL || DEFAULT_MODEL(),
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert school-marketing copywriter. Respond ONLY with JSON matching: {\"text\":string,\"hashtags\":string[],\"cta\":string,\"imagePrompt\":string}. Keep the post engaging and appropriate for a school. Never invent phone numbers, emails or URLs.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
    return {
      text: String(parsed.text || "").trim(),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h) => String(h).replace(/^#/, "")).slice(0, 8)
        : [],
      cta: String(parsed.cta || "").trim(),
      imagePrompt: String(parsed.imagePrompt || "").trim(),
    };
  } catch (err) {
    throw new Error(`AI returned non-JSON: ${raw.slice(0, 200)}`);
  }
}

const DEFAULT_IMAGE_MODEL = "openai/gpt-image-1-mini";

export const isImageConfigured = () =>
  Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);

/**
 * Generate a poster/creative image for a post. Phase 1 uses the OpenRouter
 * images endpoint (OpenAI gpt-image-1-mini compatible). Returns the remote
 * image URL, or null when image generation is not configured/unavailable —
 * callers keep going and simply post without media.
 */
export async function generateImage({ prompt, model }) {
  if (!isImageConfigured()) return null;
  const key = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const base =
    process.env.OPENAI_BASE_URL ||
    (process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1");

  try {
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || process.env.MARKETING_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1024x1024",
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[marketing] image gen failed:", data?.error?.message || res.status);
      return null;
    }
    const item = data?.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return item.b64_json; // caller decides how to handle
    return null;
  } catch (err) {
    console.error("[marketing] image gen error:", err.message);
    return null;
  }
}