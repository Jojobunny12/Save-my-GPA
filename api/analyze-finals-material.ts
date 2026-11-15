import { GoogleGenAI, Type } from "@google/genai";

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

    const fullPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums.
Generate a complete, high-yield finals preparation study deck for "${activeSchool}" — Course: "${courseCode}" (${activeCourseName}).

RULES:
- DO NOT use raw LaTeX (no $$ or \\frac). Write all math in clean plain unicode text (e.g. "m = (y2 - y1) / (x2 - x1)").
- Keep the tone focused, encouraging, and 100% textbook accurate.
- EVERY quiz question MUST test real subject content (no generic study-habit filler questions).
- Metadata: Department: ${department || "Deduce from code"}, Focus: ${curriculumDetails || "Standard"}, Format: ${examFocus || "Cumulative exam"}, Strategy: ${studyStrategy || "Active recall"}.
- Student Notes: ${additionalNotes || "None"}.

TASK:
Create a study companion deck for course code: ${courseCode}. Generate EXACTLY 25 concise, high-value multiple choice questions inside "quiz".
${pastedText ? `Reference notes:\n"""\n${pastedText}\n"""` : ""}`;

    const contents: any[] = [];
    if (fileBase64 && fileMimeType) {
      const cleanBase64 = fileBase64.replace(/^data:.*;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: fileMimeType,
          data: cleanBase64,
        },
      });
    }
    contents.push({ text: fullPrompt });

    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "timeline", "flashcards", "quiz"],
          properties: {
            summary: {
              type: Type.OBJECT,
              required: [
                "title",
                "curriculumExplanation",
                "topTipsForFinal",
                "synthesizedNotesParagraph",
                "coreCheatSheetMarkdown",
              ],
              properties: {
                title: { type: Type.STRING },
                curriculumExplanation: { type: Type.STRING },
                topTipsForFinal: { type: Type.ARRAY, items: { type: Type.STRING } },
                synthesizedNotesParagraph: { type: Type.STRING },
                coreCheatSheetMarkdown: { type: Type.STRING },
              },
            },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["dayName", "activityTitle", "activityDescription"],
                properties: {
                  dayName: { type: Type.STRING },
                  activityTitle: { type: Type.STRING },
                  activityDescription: { type: Type.STRING },
                },
              },
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["question", "answer"],
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
              },
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["question", "options", "correctIndex", "explanation"],
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    if (!response?.text) {
      throw new Error("Empty response from Gemini API.");
    }

    return Response.json(parseGeminiJson(response.text));
  } catch (error: any) {
    console.error("API Error:", error);
    return Response.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
