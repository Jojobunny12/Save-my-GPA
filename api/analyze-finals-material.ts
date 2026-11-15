export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

function parseGeminiJson(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel Environment Variables.",
      });
    }
    const key = rawKey.trim();

    const {
      schoolName,
      courseCode,
      courseName,
      department,
      curriculumDetails,
      examFocus,
      studyStrategy,
      pastedText,
      additionalNotes,
      fileBase64,
      fileMimeType,
    } = req.body || {};

    if (!courseCode) {
      return res.status(400).json({ error: "courseCode is required." });
    }

    const activeSchool = schoolName || "D'Evelyn High School";
    const activeCourseName = courseName || `Course ${courseCode}`;

    const systemPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums.
Generate a complete, high-yield finals preparation study deck for "${activeSchool}" — Course: "${courseCode}" (${activeCourseName}).

RULES:
- DO NOT use raw LaTeX (no $$ or \\frac). Write all math in clean plain unicode text (e.g. "m = (y2 - y1) / (x2 - x1)").
- Keep the tone focused, encouraging, and 100% textbook accurate.
- EVERY quiz question MUST test real subject content (no generic study-habit filler questions).
- Metadata: Department: ${department || "Deduce from code"}, Focus: ${curriculumDetails || "Standard"}, Format: ${examFocus || "Cumulative exam"}, Strategy: ${studyStrategy || "Active recall"}.
- Student Notes: ${additionalNotes || "None"}.`;

    const promptMessage = `Create a study companion deck for course code: ${courseCode}. Generate EXACTLY 25 concise, high-value multiple choice questions inside "quiz".
${pastedText ? `Reference notes:\n"""\n${pastedText}\n"""` : ""}`;

    const parts: any[] = [];
    if (fileBase64 && fileMimeType) {
      const cleanBase64 = fileBase64.replace(/^data:.*;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: fileMimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: promptMessage });

    const payload = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          required: ["summary", "timeline", "flashcards", "quiz"],
          properties: {
            summary: {
              type: "OBJECT",
              required: [
                "title",
                "curriculumExplanation",
                "topTipsForFinal",
                "synthesizedNotesParagraph",
                "coreCheatSheetMarkdown",
              ],
              properties: {
                title: { type: "STRING" },
                curriculumExplanation: { type: "STRING" },
                topTipsForFinal: { type: "ARRAY", items: { type: "STRING" } },
                synthesizedNotesParagraph: { type: "STRING" },
                coreCheatSheetMarkdown: { type: "STRING" },
              },
            },
            timeline: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["dayName", "activityTitle", "activityDescription"],
                properties: {
                  dayName: { type: "STRING" },
                  activityTitle: { type: "STRING" },
                  activityDescription: { type: "STRING" },
                },
              },
            },
            flashcards: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["question", "answer"],
                properties: {
                  question: { type: "STRING" },
                  answer: { type: "STRING" },
                },
              },
            },
            quiz: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["question", "options", "correctIndex", "explanation"],
                properties: {
                  question: { type: "STRING" },
                  options: { type: "ARRAY", items: { type: "STRING" } },
                  correctIndex: { type: "INTEGER" },
                  explanation: { type: "STRING" },
                },
              },
            },
          },
        },
      },
    });

    const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    let lastError: any = null;

    for (const model of models) {
      const url = `https://googleapis.com{model}:generateContent?key=${encodeURIComponent(key)}`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const data = await geminiRes.json();
      if (!geminiRes.ok) {
        lastError = data;
        continue;
      }

      const candidates = data && Array.isArray(data.candidates) ? data.candidates : [];
      const firstCand = candidates.length > 0 ? candidates.at(0) : null;
      const respParts =
        firstCand && firstCand.content && Array.isArray(firstCand.content.parts)
          ? firstCand.content.parts
          : [];
      const firstPart = respParts.length > 0 ? respParts.at(0) : null;
      const replyText = firstPart ? firstPart.text : null;

      if (replyText) {
        return res.status(200).json(parseGeminiJson(replyText));
      }
    }

    return res.status(500).json(lastError || { error: "Gemini API did not return content." });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Unexpected server error",
    });
  }
}
