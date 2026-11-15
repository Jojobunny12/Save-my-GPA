export const maxDuration = 60;

function parseGeminiJson(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return Response.json(
        { error: "GEMINI_API_KEY is missing in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
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
    } = body || {};

    if (!courseCode) {
      return Response.json({ error: "courseCode is required." }, { status: 400 });
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

    const geminiRes = await fetch(
      `https://googleapis.com{encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return Response.json(data, { status: geminiRes.status });
    }

    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error("Empty response from Gemini API.");
    }

    return Response.json(parseGeminiJson(replyText));
  } catch (error: any) {
    console.error("API Error:", error);
    return Response.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
