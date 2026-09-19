import OpenAI from "openai";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Live free models (re-checked Sep 2026).
 * OpenRouter retired most ":free" slugs → they now 404 permanently.
 * Only "openrouter/free" (auto-routes to a live free provider) is reliable;
 * keep gemma-4 as a second chance since it sometimes recovers from 429.
 */
const MODELS = ["openrouter/free", "google/gemma-4-31b-it:free"];

const VISION_MODELS = ["openrouter/free", "google/gemma-4-31b-it:free"];

/** transient — retry across rounds with backoff */
const RETRYABLE = new Set([400, 401, 402, 408, 429, 500, 502, 503, 529]);
/** permanent — skip this model for the rest of the request */
const PERMANENT = new Set([404, 406, 410, 413]);

const MAX_ROUNDS = 3;

const client = () =>
  new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "https://eduaitor.local",
      "X-Title": "Eduaitor Daily Learning",
    },
  });

const errInfo = (err) => {
  const status = err?.status || err?.response?.status || "?";
  const msg =
    err?.error?.message ||
    err?.message ||
    (typeof err === "string" ? err : "unknown error");
  return { status, msg: String(msg).slice(0, 200) };
};

/** Shared resilient model loop: retries transient failures in rounds,
 *  permanently skips dead models (404 “unavailable for free”), and
 *  applies backoff so rate-limited free providers get time to recover. */
const tryModels = async ({ openai, models, content, maxTokens, temperature = 0.4, label = "" }) => {
  const errors = [];
  const dead = new Set();

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (const model of models) {
      if (dead.has(model)) continue;
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content }],
          max_tokens: maxTokens,
          temperature,
        });
        const text = response.choices?.[0]?.message?.content?.trim() || "";
        if (!text) {
          errors.push(`${model}: empty response`);
          console.log(`AI empty response: ${label} ${model}`);
          continue;
        }
        return text;
      } catch (err) {
        const { status, msg } = errInfo(err);
        const num = Number(status);
        errors.push(`${model}: ${status} ${msg}`);
        console.log(`AI model failed (round ${round}/${label}): ${model} (${status}) ${msg}`);
        if (PERMANENT.has(num)) {
          dead.add(model);
        } else if (RETRYABLE.has(num) || status === "?") {
          await sleep(800 * round);
        }
      }
    }
    if (round < MAX_ROUNDS) await sleep(900 * round);
  }

  throw new Error(
    `All AI models failed. ${[...new Set(errors)].slice(-3).join(" | ") || "No details"}`,
  );
};

export const callAI = async (prompt) => {
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing in Backend/.env");
  }
  const openai = client();
  return tryModels({
    openai,
    models: MODELS,
    content: prompt,
    maxTokens: 4096,
    label: "text",
  });
};

/**
 * Multimodal call for handwritten grading.
 * @param {{ prompt: string, imageUrls: string[] }}
 */
export const callAIVision = async ({ prompt, imageUrls = [] }) => {
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing in Backend/.env");
  }

  const content = [
    { type: "text", text: prompt },
    ...imageUrls.filter(Boolean).map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
  ];

  return tryModels({
    openai: client(),
    models: VISION_MODELS,
    content,
    maxTokens: 2048,
    temperature: 0.2,
    label: "vision",
  });
};

const parseJsonBlock = (raw) => {
  let jsonString = String(raw || "")
    .replace(/```json|```/g, "")
    .trim();
  const match = jsonString.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return valid JSON");
  return JSON.parse(match[0]);
};

/**
 * Generate MCQ or descriptive questions from textbook page text.
 */
export const generateDailyLearningQuestions = async ({
  type,
  numberOfQuestions = 5,
  className,
  subjectName,
  chapterName,
  pageFrom,
  pageTo,
  pageText,
}) => {
  const count = Math.min(10, Math.max(1, Number(numberOfQuestions) || 5));
  const isMcq = type === "mcq";
  // Keep prompt smaller — free models reject / truncate huge inputs
  const excerpt = String(pageText || "").slice(0, 6000);

  const prompt = `
You are a school teacher creating a practice assignment from textbook pages the student studied today.

Class: ${className || "—"}
Subject: ${subjectName || "—"}
Chapter: ${chapterName || "—"}
Pages: ${pageFrom || "?"}–${pageTo || "?"}

Textbook content from those pages:
"""
${excerpt || `(No page text available. Create ${count} age-appropriate ${isMcq ? "MCQ" : "descriptive"} questions about the chapter "${chapterName || "topic"}" for class ${className || ""}.)`}
"""

Generate exactly ${count} ${isMcq ? "MCQ" : "descriptive (short answer)"} questions based on the content above.

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "text": "question text",
      "type": "${isMcq ? "mcq" : "descriptive"}",
      "options": ${
        isMcq
          ? '[{"text":"A","isCorrect":false},{"text":"B","isCorrect":true},{"text":"C","isCorrect":false},{"text":"D","isCorrect":false}]'
          : "[]"
      },
      "marks": ${isMcq ? 1 : 2},
      "pageHint": ""
    }
  ]
}
${isMcq ? "Each MCQ must have exactly 4 options and exactly one isCorrect:true." : "Leave options as []."}
`;

  const aiResponse = await callAI(prompt);
  const parsed = parseJsonBlock(aiResponse);
  const questions = (parsed.questions || []).map((q) => {
    if (isMcq) {
      let options = Array.isArray(q.options) ? q.options : [];
      if (!options.some((o) => o.isCorrect) && options.length) {
        options = options.map((o, i) => ({
          text: o.text || String(o),
          isCorrect: i === 0,
        }));
      }
      while (options.length < 4) {
        options.push({
          text: `Option ${options.length + 1}`,
          isCorrect: false,
        });
      }
      return {
        text: q.text || "Question",
        type: "mcq",
        options: options.slice(0, 4).map((o) => ({
          text: o.text || "",
          isCorrect: Boolean(o.isCorrect),
        })),
        marks: Number(q.marks) || 1,
        pageHint: q.pageHint || "",
      };
    }
    return {
      text: q.text || "Question",
      type: "descriptive",
      options: [],
      marks: Number(q.marks) || 2,
      pageHint: q.pageHint || "",
    };
  });

  if (!questions.length) {
    throw new Error("AI returned no questions");
  }
  return questions;
};

/**
 * Grade handwritten answer image against questions.
 */
export const gradeHandwrittenSubmission = async ({
  questions,
  imageUrl,
  studentName,
}) => {
  const qList = questions
    .map((q, i) => `${i + 1}. (${q.marks || 2} marks) ${q.text}`)
    .join("\n");

  const prompt = `
You are a kind school teacher grading a student's handwritten answers from a photo.

Student: ${studentName || "Student"}
Questions:
${qList}

Look at the handwritten answer sheet image. Score fairly for a school child.
Return ONLY JSON:
{
  "score": 0,
  "maxScore": 0,
  "feedback": "overall feedback for parent",
  "strengths": "what went well",
  "improvements": "what to practise",
  "perQuestionFeedback": [
    { "questionIndex": 0, "correct": true, "comment": "short note" }
  ]
}
maxScore should equal sum of question marks.
`;

  const aiResponse = await callAIVision({
    prompt,
    imageUrls: [imageUrl],
  });
  const parsed = parseJsonBlock(aiResponse);
  const maxScore =
    Number(parsed.maxScore) ||
    questions.reduce((s, q) => s + (Number(q.marks) || 2), 0);
  return {
    score: Math.max(0, Number(parsed.score) || 0),
    maxScore,
    feedback: parsed.feedback || "",
    strengths: parsed.strengths || "",
    improvements: parsed.improvements || "",
    perQuestionFeedback: Array.isArray(parsed.perQuestionFeedback)
      ? parsed.perQuestionFeedback
      : [],
  };
};
