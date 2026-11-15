import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { generateFallbackQuiz } from "../src/utils/academicFallback";

function parseGeminiJson(rawText: string): any {
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

  const { courseCode, courseName, department, existingQuestions } = req.body || {};
  if (!courseCode) {
    return res.status(400).json({ error: "courseCode is required." });
  }

  const activeCourseName = courseName || `Course ${courseCode}`;

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("NO_API_KEY");

const ai = new GoogleGenAI({
  apiKey: key,
  httpOptions: { apiVersion: "v1beta" },
});

    const systemPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums.
Generate 25 brand-new multiple choice questions for "${activeCourseName}" (${courseCode}, Department: ${department || "General"}).

CRITICAL FORMULA & MATH RENDERING GUIDELINES:
- DO NOT USE RAW LATEX SYMBOLS OR MATH BLOCKS (such as \\frac{a}{b}, \\sqrt{x}, or $$...$$ / $...$).
- Write ALL formulas in clean plain unicode text (e.g., "m = (y2 - y1) / (x2 - x1)", "lim (x -> c) f(x) = L").

TONE & QUALITY GUIDELINES:
- Keep the tone focused, encouraging, clear, and student-friendly—100% textbook accuracy.
- EVERY single quiz question MUST test real subject content (no filler questions about study habits).

DO NOT duplicate any of the following questions already in the student's study deck:
${(existingQuestions || []).map((q: any) => `- ${q.question}`).slice(0, 50).join("\n")}

Reply with a valid JSON object matching the schema with no markdown blocks.`;

    const promptMessage = `Generate 25 MORE unique multiple choice questions inside the "quiz" array for my course code: ${courseCode}. Keep all subject details fully accurate with master equations, historical arguments, literary concepts, or code traces, and keep explanations clear and helpful.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

    if (response?.text) {
      return res.status(200).json(parseGeminiJson(response.text));
    }
    throw new Error("Empty response from Gemini API.");
  } catch (err: any) {
    console.warn("Gemini API unavailable for extra questions. Using fallback:", err?.message);
    const fallbackQuestions = generateFallbackQuiz(
      activeCourseName,
      courseCode,
      department || "General",
      25
    );
    return res.status(200).json({ quiz: fallbackQuestions });
  }
}
