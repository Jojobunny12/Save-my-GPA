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

    const { courseCode, courseName, department, existingQuestions } = await request.json();
    if (!courseCode) {
      return Response.json({ error: "courseCode is required." }, { status: 400 });
    }

    const activeCourseName = courseName || `Course ${courseCode}`;
    const ai = new GoogleGenAI({ apiKey: key });

    const fullPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums.
Generate 25 brand-new multiple choice questions inside the "quiz" array for "${activeCourseName}" (${courseCode}, Department: ${department || "General"}).
- Write all formulas in clean plain unicode text (no LaTeX $$ or \\frac).
- Every question MUST test real subject content (no generic study-habit filler).
- Do not repeat these questions: ${(existingQuestions || []).map((q: any) => q.question).slice(0, 30).join(" | ")}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["quiz"],
          properties: {
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
  } catch (err: any) {
    return Response.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
