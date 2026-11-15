import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { generateAcademicFallbackDeck, generateFallbackQuiz } from "./src/utils/academicFallback";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limits to support base64 study files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is missing. Academic fallback generator will be utilized.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const MODEL_PIPELINE: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
  { model: "gemini-4-hydrogen", thinkingLevel: ThinkingLevel.LOW },
  { model: "gemini-3.1-flash-lite", thinkingLevel: ThinkingLevel.MINIMAL },
];

const ATTEMPT_TIMEOUT_MS = 20_000;
const TOTAL_DEADLINE_MS = 35_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT after ${ms}ms (${label})`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function parseGeminiJson(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

async function executeGeminiWithRetry(
  callFn: (ai: GoogleGenAI, modelName: string, thinkingLevel: ThinkingLevel) => Promise<any>
): Promise<any> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("NO_API_KEY");
  }

  const startedAt = Date.now();
  let lastError: any = null;

  for (const { model, thinkingLevel } of MODEL_PIPELINE) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const elapsed = Date.now() - startedAt;
      const remaining = TOTAL_DEADLINE_MS - elapsed;
      if (remaining <= 2000) {
        throw lastError || new Error("Gemini request exceeded total time budget.");
      }

      const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
      try {
        const result = await withTimeout(
          callFn(ai, model, thinkingLevel),
          timeoutMs,
          `${model}#${attempt + 1}`
        );
        return result;
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || "").toLowerCase();
        const isTimeout = msg.includes("timeout");
        const isUnavailableOrRateLimited =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.code === 503 ||
          err?.code === 429 ||
          msg.includes("503") ||
          msg.includes("unavailable") ||
          msg.includes("high demand") ||
          msg.includes("resource_exhausted") ||
          msg.includes("rate");

        console.warn(`Gemini ${model} attempt ${attempt + 1} failed (${err?.status || err?.code || "ERR"}): ${err?.message}`);

        if (isTimeout) {
          // Move straight to the faster fallback model on timeout
          break;
        }

        if (isUnavailableOrRateLimited && attempt === 0) {
          const backoffMs = Math.min(800, Math.max(0, TOTAL_DEADLINE_MS - (Date.now() - startedAt) - 2000));
          if (backoffMs > 100) {
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
          continue;
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini models temporarily unavailable.");
}

// REST API endpoint to analyze study materials and map to dynamic high school curriculums
app.post("/api/analyze-finals-material", async (req, res) => {
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
    } = req.body;

    if (!courseCode) {
      res.status(400).json({ error: "courseCode is required." });
      return;
    }

    const ai = getGeminiClient();
    const activeSchool = schoolName || "D'Evelyn High School";
    const activeCourseName = courseName || `Course ${courseCode}`;

    // Prepare contents array for Gemini
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
- This keeps the study cards, notes, and cheat sheets completely clean and readable!

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

Please extract the core technical vocabulary, formulas, equations, texts, themes, key figures, or rules, and project how they will be tested on cumulative high school finals.

You must reply with a valid JSON object matching the exact structure requested, with no markdown code blocks surrounding it (return pure JSON text directly) with the following schema:
{
  "summary": {
    "title": string (A clear, professional custom study companion title specific to this course and materials, e.g., 'AP Chemistry: Equilibrium & Stoichiometry Final Review' or 'Western Civilization: Medieval to Modern Synthesis Guide'),
    "curriculumExplanation": string (A clear academic overview mapping how this set of study concepts aligns with the course's syllabus and final exam expectations),
    "topTipsForFinal": [string] (Exactly 3-4 tactical, subject-specific exam preparation tips, e.g., 'Verify your stoichiometric unit cancellations on every step to prevent sign or factor errors' or 'Review Caesar\'s Indirect Statements and subjunctive triggers before translating sight passages'),
    "synthesizedNotesParagraph": string (A thorough, academically authoritative narrative summary of the core study concepts for this course, serving as a rapid refresher),
    "coreCheatSheetMarkdown": string (A dense, well-structured Markdown-formatted review sheet representing the foundational knowledge, equations, dates, declensions, or code patterns for this specific Course Code)
  },
  "timeline": [
    {
      "dayName": string (e.g., 'Day 1: Core Foundations', 'Day 2: Problem Sets & Proofs', 'Day 5: Final Review & Rest'),
      "activityTitle": string,
      "activityDescription": string
    }
  ] (Plan a 5-day study countdown leading to their final),
  "flashcards": [
    {
      "question": string,
      "answer": string
    }
  ] (Provide 8 to 12 active-recall flashcards for key vocabulary, names, theorems, conjugations, or equations),
  "quiz": [
    {
      "question": string (A rigorous and specific quiz question. For math/science/CS, include realistic values or short code traces. Keep it concise and punchy. Must be a genuine academic test question),
      "options": [string] (Provide exactly 4 distinct options, e.g. ["A) ...", "B) ...", "C) ...", "D) ..."]),
      "correctIndex": number (0 to 3),
      "explanation": string (A clear, step-by-step explanation of why this choice is correct and why common distractors are wrong.)
    }
  ] (Provide exactly 25 high-quality multiple-choice questions. Be concise and crisp to guarantee swift parsing!)
}`;

    const promptMessage = `Create a comprehensive study companion deck for my course code: ${courseCode}. You MUST generate EXACTLY 25 multiple choice questions inside the "quiz" array. Keep each question's text and options clear, concise, and academically accurate with exact equations, historical arguments, literary concepts, or code traces.
${pastedText ? `My additional notes/study guide reference:
"""
${pastedText}
"""` : ""}`;

    const contents: any[] = [];

    // If a base64 file is attached, add it as a part
    if (fileBase64 && fileMimeType) {
      try {
        const cleanBase64 = fileBase64.replace(/^data:.*;base64,/, "");
        contents.push({
          inlineData: {
            mimeType: fileMimeType,
            data: cleanBase64,
          },
        });
      } catch (fileErr) {
        console.error("Error setting inlineData for Gemini:", fileErr);
      }
    }

    contents.push({ text: promptMessage });

    try {
      const response = await executeGeminiWithRetry(async (aiInstance, modelName, thinkingLevel) => {
        return await aiInstance.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel },
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
                    topTipsForFinal: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
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
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        });
      });

      const replyText = response?.text;
      if (!replyText) {
        throw new Error("Empty response from Gemini API.");
      }

      const payload = parseGeminiJson(replyText);
      res.json(payload);
    } catch (apiErr: any) {
      console.warn("Gemini API unavailable or experienced rate/503 limits. Generating academic fallback deck:", apiErr?.message);
      const fallbackDeck = generateAcademicFallbackDeck({
        schoolName: activeSchool,
        courseCode: courseCode,
        courseName: activeCourseName,
        department: department,
        curriculumDetails: curriculumDetails,
        examFocus: examFocus,
        studyStrategy: studyStrategy,
      });
      res.json(fallbackDeck);
    }
  } catch (error: any) {
    console.error("General study helper endpoint failure:", error);
    // Last-resort fallback
    const targetCode = req.body?.courseCode || "GEN101";
    const fallbackDeck = generateAcademicFallbackDeck({
      schoolName: req.body?.schoolName,
      courseCode: targetCode,
      courseName: req.body?.courseName,
      department: req.body?.department,
    });
    res.json(fallbackDeck);
  }
});

// REST API endpoint to generate 25 more questions on demand
app.post("/api/generate-more-questions", async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      department,
      existingQuestions,
    } = req.body;

    if (!courseCode) {
      res.status(400).json({ error: "courseCode is required." });
      return;
    }

    const activeCourseName = courseName || `Course ${courseCode}`;

    const systemPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums, with a clear, encouraging, and academically rigorous instruction style.

Your goal is to generate 25 MORE completely custom, academically rigorous multiple-choice questions for Course Code: "${courseCode}" (official name: "${activeCourseName}").

CRITICAL FORMULA & MATH RENDERING GUIDELINES:
- DO NOT USE RAW LATEX SYMBOLS OR MATH BLOCKS (such as \\frac{a}{b}, \\sqrt{x}, \\bar{x}, \\hat{p}, \\pm, or $$...$$ / $...$) in your output.
- INSTEAD, write ALL mathematical formulas, fractions, limits, integrals, statistics terms, or balances in clean, readable plain unicode text.
- Examples of how to write formulas cleanly in your output:
  - Write standard error as "SE_x̅ = s / √n" or "SE(_x-bar) = s / sqrt(n)"
  - Write standard error of proportion as "SE_p̂ = √(p̂(1 - p̂) / n)"
  - Write confidence interval as "Statistic ± (Critical Value) * (Standard Error)"
  - Write slope formula as "m = (y2 - y1) / (x2 - x1)"
  - Write limits as "lim (x -> c) f(x) = L"

TONE & QUALITY GUIDELINES:
- Keep the tone focused, encouraging, clear, and student-friendly—completely free of internet slang, memes, or distracting filler jokes.
- Maintain 100% textbook accuracy for all formulas, dates, proofs, code snippets, and explanations.

CRITICAL QUIZ CONTENT REQUIREMENT:
- EVERY single quiz question MUST be a real, high-value academic study question directly testing core facts, formulas, theorems, dates, grammar patterns, historical figures, code traces, or problems from this course curriculum.
- Under NO circumstances generate filler questions about study habits or generic test-taking advice as the actual question. Every question must test real subject facts.

DO NOT duplicate any of the following questions that are already in the student's study deck:
${(existingQuestions || []).map((q: any) => `- ${q.question}`).slice(0, 50).join("\n")}

Please respond with a valid JSON object matching the exact structure requested, with no markdown code blocks surrounding it (return pure JSON text directly) with the following schema:
{
  "quiz": [
    {
      "question": string (A rigorous and specific quiz question. For math/science/CS, include realistic values or short code traces. Keep it concise and punchy. Must be a genuine academic test question),
      "options": [string] (Provide exactly 4 distinct options, e.g. ["A) ...", "B) ...", "C) ...", "D) ..."]),
      "correctIndex": number (0 to 3),
      "explanation": string (A clear, step-by-step explanation of why this choice is correct and why common distractors are wrong.)
    }
  ]
} (Provide exactly 25 high-quality multiple-choice questions. Be concise and crisp to guarantee swift parsing!)`;

    const promptMessage = `Generate 25 MORE unique multiple choice questions inside the "quiz" array for my course code: ${courseCode}. Keep all subject details fully accurate with master equations, historical arguments, literary concepts, or code traces, and keep explanations clear and helpful.`;

    try {
      const response = await executeGeminiWithRetry(async (aiInstance, modelName, thinkingLevel) => {
        return await aiInstance.models.generateContent({
          model: modelName,
          contents: promptMessage,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel },
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
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        });
      });

      const replyText = response?.text;
      if (!replyText) {
        throw new Error("Empty response from Gemini API.");
      }

      const payload = parseGeminiJson(replyText);
      res.json(payload);
    } catch (apiErr: any) {
      console.warn("Gemini API unavailable for extra questions. Generating academic fallback questions:", apiErr?.message);
      const fallbackQuestions = generateFallbackQuiz(activeCourseName, courseCode, department || "General", 25);
      res.json({ quiz: fallbackQuestions });
    }
  } catch (error: any) {
    console.error("General more questions endpoint failure:", error);
    const fallbackQuestions = generateFallbackQuiz(req.body?.courseName || "General Course", req.body?.courseCode || "GEN101", req.body?.department || "General", 25);
    res.json({ quiz: fallbackQuestions });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
