import { callAI } from "../services/aiService.js";

export const generateAIQuestions = async (req, res) => {
  try {
    const {
      className,
      subjectName,
      chapterName,
      topicName,
      questionTypes,
      numberOfQuestions,
      difficulty,
      topicNames,
    } = req.body;

    const topicLine = topicNames?.length
      ? `Topics: ${topicNames.join(", ")}`
      : `Topic: Entire chapter (cover all topics)`;

    const prompt = `
You are a school teacher.

Generate ${numberOfQuestions} questions.

Class: ${className}
Subject: ${subjectName}
Chapter: ${chapterName}
Topic: ${topicName}
Difficulty: ${difficulty}
${topicLine}

Question types: ${questionTypes.join(", ")}

Return ONLY JSON:
{
  "questions": [
    {
      "text": "",
      "type": "mcq | short | long",
      "options": [
        { "text": "", "isCorrect": true }
      ],
      "marks": 1
    }
  ]
}
`;

    const aiResponse = await callAI(prompt);

    let jsonString = aiResponse;

    // remove markdown ```json ```
    jsonString = jsonString.replace(/```json|```/g, "").trim();

    // extract JSON block
    const match = jsonString.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        success: false,
        message: "AI did not return valid JSON format",
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      console.log("RAW AI:", aiResponse);
      return res.status(500).json({
        success: false,
        message: "AI JSON parsing failed",
      });
    }

    const cleanedQuestions = (parsed.questions || []).map((q) => {
      let options = [];

      if (q.type === "mcq") {
        options = (q.options || []).map((o) => ({
          text: o.text || "",
          isCorrect: !!o.isCorrect,
        }));

        // ensure at least 1 correct answer
        if (!options.some((o) => o.isCorrect) && options.length > 0) {
          options[0].isCorrect = true;
        }
      }

      return {
        text: q.text || "",
        type: ["mcq", "short", "long"].includes(q.type) ? q.type : "short",
        options,
        marks: Number(q.marks) || 1,
      };
    });

    if (!parsed.questions || parsed.questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: "AI returned no questions",
      });
    }

    res.json({
      success: true,
      data: cleanedQuestions,
    });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
