import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const MODELS = [
  "google/gemma-3-4b-it:free",
  "google/gemma-4-31b-it:free",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "meta-llama/llama-3-8b-instruct:free",
];

export const callAI = async (prompt) => {
  for (let model of MODELS) {
    try {
      console.log("Trying:", model);

      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0].message.content;
    } catch (err) {
      if (err.status === 429 || err.status === 404) {
        console.log(`Model failed: ${model}`);
        await sleep(1000);
        continue;
      }

      throw err;
    }
  }

  throw new Error("All AI models failed");
};
