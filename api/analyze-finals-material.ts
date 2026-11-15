import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { generateAcademicFallbackDeck } from "../src/utils/academicFallback";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is missing.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const MODEL_PIPELINE: Array<{ model: string; thinkingLevel?: ThinkingLevel }> = [
  { model: "gemini-2.5-flash", thinkingLevel: ThinkingLevel.LOW },
  { model: "gemini-2.5-flash-lite" },
];

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

  try {
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

    const systemPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums, with a clear, encouraging, and academically rigorous instruction style.
This study platform helps students preparing for final exams at "${activeSchool}" based on their Course Code: "${courseCode}" (and course name if specified: "${activeCourseName}").

No study notes or PDF files are required! Your goal is to:
1. Deconstruct the Course Code "${courseCode}" to determine the level, subject, and department (e.g. "SCI_CHEM" -> Chemistry, "ENG09" -> Literature & Composition 9, "MATH_AP_CALC_AB" -> AP Calculus AB, etc.).
2. Generate a complete, high-yield finals preparation study deck based on this subject's official academic syllabus.

CRITICAL FORMULA & MATH RENDERING GUIDELINES:
- DO NOT USE RAW LATEX SYMBOLS OR MATH BLOCKS (such as \\frac{a}{b}, \\sqrt{x}, \\bar{x}, \\hat{p}, \\pm, or $$...$$ / $...$) in your output, as standard browsers cannot render them without complex compilation packages.
- INSTEAD, write ALL mathematical formulas, fractions, limits, integrals, statistics terms, or balances in clean, readable plain unicode text.
- Examples of how to write formulas cleanly in your markdown or output:
  - Write standard error as "SE_x̅ = s / √n" or "SE(_x-bar) = s / sqrt(n)"
  - Write standard error of proportion as "SE_p̂ = √(p̂(1 - p̂) / n)"
  - Write confidence interval as "Statistic ± (Critical Value) * (Standard Error)"
  - Write t-statistic as "t = (x̅ - μ0) / (s / √n) with df = n - 1"
  - Write slope formula as "m = (y2 - y1) / (x2 - x1)"
  - Write chemical equations as "2H2 + O2 --> 2H2O" with simple subscript style.
  - Write limits as "lim (x -> c) f(x) = L"

TONE & QUALITY GUIDELINES:
- Keep the tone focused, encouraging, clear, and student-friendly—completely free of internet slang, memes, or distracting filler jokes.
- Maintain 100% textbook accuracy for all formulas, dates, proofs, code snippets, and explanations! Keep math unicode clean and LaTeX-free!

CRITICAL QUIZ CONTENT REQUIREMENT:
- EVERY single quiz question MUST be a real, high-value academic study question directly testing core facts, formulas, theorems, dates, grammar patterns, historical figures, code traces, or problems from this course curriculum.
- Under NO circumstances generate filler questions about study habits or generic test-taking advice as the actual question. Every question must test real subject content.

The Course metadata we compiled:
- Course Code: ${courseCode}
- High School: ${activeSchool}
- Provided Course Name: ${activeCourseName}
- Department: ${department || "Deduce from code"}
- Typical Curriculum Focus: ${curriculumDetails || "Deduce from code standards"}
- Typical Finals Exam Format: ${examFocus || "Traditional honors cumulative exam"}
- Core Recommended Strategy: ${studyStrategy || "Deduce optimal approach"}

Student's Added Notes or Target Focus: ${additionalNotes || "None"}

You must reply with a valid JSON object matching the exact structure requested, with no markdown code blocks surrounding it (return pure JSON text directly).`;

    const promptMessage = `Create a comprehensive study companion deck for my course code: ${courseCode}. You MUST generate EXACTLY 25 multiple choice questions inside the "quiz" array. Keep each question's text and options clear, concise, and academically accurate with exact equations, historical arguments, literary concepts, or code traces.
${pastedText ? `My additional notes/study guide reference:\n"""\n${pastedText}\n"""` : ""}`;

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
    contents.push({ text: promptMessage });

    const ai = getGeminiClient();
    if (!ai) {
      throw new Error("NO_API_KEY");
    }

    let lastError: any = null;
    for (const { model, thinkingLevel } of MODEL_PIPELINE) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
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

        if (response?.text) {
          return res.status(200).json(parseGeminiJson(response.text));
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err);
      }
    }

    throw lastError || new Error("All Gemini models failed.");
  } catch (error: any) {
    console.warn("Falling back to local academic generator:", error?.message);
    const fallbackDeck = generateAcademicFallbackDeck({
      schoolName: req.body?.schoolName || "D'Evelyn High School",
      courseCode: req.body?.courseCode || "GEN101",
      courseName: req.body?.courseName,
      department: req.body?.department,
      curriculumDetails: req.body?.curriculumDetails,
      examFocus: req.body?.examFocus,
      studyStrategy: req.body?.studyStrategy,
    });
    return res.status(200).json(fallbackDeck);
  }
}
