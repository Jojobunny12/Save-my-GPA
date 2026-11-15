import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limits to support base64 study files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
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

interface ModelPipelineEntry {
  model: string;
  thinkingLevel: ThinkingLevel;
  firstByteTimeoutMs: number;
  stallTimeoutMs: number;
  totalTimeoutMs: number;
}

const MODEL_PIPELINE: ModelPipelineEntry[] = [
  {
    model: "gemini-4-hydrogen",
    thinkingLevel: ThinkingLevel.LOW,
    firstByteTimeoutMs: 25_000,
    stallTimeoutMs: 18_000,
    totalTimeoutMs: 50_000,
  },
  {
    model: "gemini-3.1-flash-lite",
    thinkingLevel: ThinkingLevel.MINIMAL,
    firstByteTimeoutMs: 22_000,
    stallTimeoutMs: 16_000,
    totalTimeoutMs: 38_000,
  },
];

// Overall server budget across retries/failover (safe with NDJSON keepalive streaming)
const TOTAL_DEADLINE_MS = 85_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err: any = new Error(`TIMEOUT after ${ms}ms (${label})`);
      err.status = 504;
      reject(err);
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

async function collectStreamedText(
  streamPromise: Promise<AsyncIterable<any>>,
  budget: Pick<ModelPipelineEntry, "firstByteTimeoutMs" | "stallTimeoutMs" | "totalTimeoutMs">,
  label: string,
  onAccumulated?: (accumulatedText: string) => void
): Promise<string> {
  const overallDeadline = Date.now() + budget.totalTimeoutMs;
  const stream = await withTimeout(
    streamPromise,
    Math.min(budget.firstByteTimeoutMs, budget.totalTimeoutMs),
    `${label}:connect`
  );
  const iterator = stream[Symbol.asyncIterator]();
  let fullText = "";
  let gotFirstByte = false;

  try {
    while (true) {
      const remaining = overallDeadline - Date.now();
      if (remaining <= 0) {
        const err: any = new Error(`TIMEOUT after ${budget.totalTimeoutMs}ms (${label})`);
        err.status = 504;
        throw err;
      }

      const stepWait = Math.min(
        gotFirstByte ? budget.stallTimeoutMs : budget.firstByteTimeoutMs,
        remaining
      );
      const nextResult = await withTimeout(
        iterator.next(),
        stepWait,
        `${label}:${gotFirstByte ? "stall" : "first-byte"}`
      );
      if (nextResult.done) {
        break;
      }

      const chunkText = typeof nextResult.value?.text === "string" ? nextResult.value.text : "";
      if (chunkText) {
        gotFirstByte = true;
        fullText += chunkText;
        onAccumulated?.(fullText);
      }
    }
    return fullText;
  } catch (err) {
    await iterator.return?.().catch(() => {});
    throw err;
  }
}

function parseGeminiJson(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

interface NormalizedQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function normalizeQuizItems(rawQuiz: any[], targetCount = 25): NormalizedQuizItem[] {
  if (!Array.isArray(rawQuiz)) {
    throw new Error("Invalid quiz payload from AI.");
  }

  const letters = ["A", "B", "C", "D"];
  const cleaned: NormalizedQuizItem[] = [];
  const seenQuestions = new Set<string>();

  for (const item of rawQuiz) {
    const qText = typeof item?.question === "string" ? item.question.trim() : "";
    const rawOpts = Array.isArray(item?.options)
      ? item.options.map((o: any) => String(o ?? "").trim()).filter(Boolean)
      : [];
    const expText = typeof item?.explanation === "string" ? item.explanation.trim() : "";

    if (!qText || rawOpts.length < 4) continue;

    const qKey = qText.toLowerCase().replace(/\s+/g, " ");
    if (seenQuestions.has(qKey)) continue;
    seenQuestions.add(qKey);

    const opts = rawOpts.slice(0, 4).map((opt: string, idx: number) => {
      const stripped = opt.replace(/^[A-D]\)\s*/i, "").trim();
      return `${letters[idx]}) ${stripped}`;
    });

    const rawIdx = Number(item?.correctIndex);
    const correctIndex = Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < 4 ? rawIdx : 0;

    cleaned.push({
      question: qText,
      options: opts,
      correctIndex,
      explanation: expText || "Review the corresponding unit principle and verify your work step by step.",
    });

    if (cleaned.length >= targetCount) break;
  }

  // Ensure every 10-question Matching Set has 100% distinct correct answer cards
  for (let start = 0; start < cleaned.length; start += 10) {
    const end = Math.min(start + 10, cleaned.length);
    const seenAnswersInSet = new Set<string>();

    for (let i = start; i < end; i++) {
      const q = cleaned[i];
      const currentCorrect = q.options[q.correctIndex];
      const canonical = currentCorrect.replace(/^[A-D]\)\s*/i, "").trim().toLowerCase();

      if (seenAnswersInSet.has(currentCorrect.toLowerCase()) || seenAnswersInSet.has(canonical)) {
        const stripped = currentCorrect.replace(/^[A-D]\)\s*/i, "").trim();
        const disambiguated = `${letters[q.correctIndex]}) ${stripped} [Item ${i + 1}]`;
        q.options[q.correctIndex] = disambiguated;
        seenAnswersInSet.add(disambiguated.toLowerCase());
      } else {
        seenAnswersInSet.add(currentCorrect.toLowerCase());
        seenAnswersInSet.add(canonical);
      }
    }
  }

  return cleaned;
}

function validateAndNormalizeDeck(payload: any) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Empty or malformed study deck from AI.");
  }

  const summary = payload.summary;
  if (!summary || typeof summary.title !== "string" || typeof summary.coreCheatSheetMarkdown !== "string") {
    throw new Error("Incomplete study summary returned by AI.");
  }

  const timeline = Array.isArray(payload.timeline) ? payload.timeline.slice(0, 5) : [];
  if (timeline.length === 0) {
    throw new Error("Incomplete 5-day study timeline returned by AI.");
  }

  const flashcards = Array.isArray(payload.flashcards)
    ? payload.flashcards
        .filter((f: any) => typeof f?.question === "string" && typeof f?.answer === "string" && f.question.trim() && f.answer.trim())
        .map((f: any) => ({ question: f.question.trim(), answer: f.answer.trim() }))
    : [];

  if (flashcards.length < 8) {
    throw new Error("Insufficient curriculum flashcards returned by AI.");
  }

  const quiz = normalizeQuizItems(payload.quiz, 25);
  if (quiz.length < 15) {
    throw new Error(`AI returned too few valid quiz questions (${quiz.length}).`);
  }

  return {
    summary: {
      title: summary.title.trim(),
      curriculumExplanation: String(summary.curriculumExplanation || "").trim(),
      topTipsForFinal: Array.isArray(summary.topTipsForFinal)
        ? summary.topTipsForFinal.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 5)
        : [],
      synthesizedNotesParagraph: String(summary.synthesizedNotesParagraph || "").trim(),
      coreCheatSheetMarkdown: summary.coreCheatSheetMarkdown.trim(),
    },
    timeline,
    flashcards,
    quiz,
  };
}

function extractErrorStatusAndMessage(err: any): { status: number; message: string } {
  const rawMsg = String(err?.message || "Unexpected Gemini API error.");
  const lower = rawMsg.toLowerCase();
  const code = Number(err?.status || err?.code || 0);

  if (rawMsg === "NO_API_KEY") {
    return {
      status: 500,
      message: "GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets and try again.",
    };
  }
  if (code === 400 || code === 403 || lower.includes("api_key_invalid") || lower.includes("permission_denied")) {
    return {
      status: code === 403 ? 403 : 400,
      message: "Gemini API key was rejected or lacks permission. Verify GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (code === 404 || lower.includes("not_found")) {
    return {
      status: 404,
      message: `Requested Gemini model was not found: ${rawMsg}`,
    };
  }
  if (code === 504 || lower.includes("timeout") || lower.includes("time budget")) {
    return {
      status: 504,
      message: "Live AI generation timed out while building your D'Evelyn exam deck. Please click Try Again.",
    };
  }
  if (code === 503 || code === 429 || lower.includes("high demand") || lower.includes("unavailable") || lower.includes("resource_exhausted")) {
    return {
      status: 503,
      message: "Gemini AI is temporarily experiencing high demand. Please wait a moment and click Try Again.",
    };
  }
  return {
    status: 502,
    message: `Live AI generation failed: ${rawMsg}`,
  };
}

async function executeGeminiWithRetry<T>(
  callFn: (
    ai: GoogleGenAI,
    entry: ModelPipelineEntry,
    attemptLabel: string
  ) => Promise<T>,
  onModelSwitch?: (msg: string) => void
): Promise<T> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("NO_API_KEY");
  }

  const startedAt = Date.now();
  let lastError: any = null;

  for (let mIdx = 0; mIdx < MODEL_PIPELINE.length; mIdx++) {
    const entry = MODEL_PIPELINE[mIdx];
    for (let attempt = 0; attempt < 2; attempt++) {
      const elapsed = Date.now() - startedAt;
      const remaining = TOTAL_DEADLINE_MS - elapsed;
      if (remaining <= 4000) {
        throw lastError || new Error("Gemini request exceeded total time budget.");
      }

      const cappedEntry: ModelPipelineEntry = {
        ...entry,
        firstByteTimeoutMs: Math.min(entry.firstByteTimeoutMs, remaining),
        stallTimeoutMs: Math.min(entry.stallTimeoutMs, remaining),
        totalTimeoutMs: Math.min(entry.totalTimeoutMs, remaining),
      };

      try {
        return await callFn(ai, cappedEntry, `${entry.model}#${attempt + 1}`);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "").toLowerCase();
        const code = Number(err?.status || err?.code || 0);

        console.warn(`Gemini ${entry.model} attempt ${attempt + 1} failed (${code || "ERR"}): ${err?.message}`);

        // Do not retry bad auth/model errors
        if (code === 400 || code === 403 || code === 404 || msg.includes("api_key_invalid") || msg.includes("permission_denied")) {
          throw err;
        }

        const isTimeout = code === 504 || msg.includes("timeout");
        if (isTimeout) {
          if (mIdx < MODEL_PIPELINE.length - 1) {
            onModelSwitch?.("Primary model slow — switching to fast live Gemini model...");
          }
          break;
        }

        const isTransient =
          code === 503 ||
          code === 429 ||
          code === 500 ||
          msg.includes("503") ||
          msg.includes("429") ||
          msg.includes("unavailable") ||
          msg.includes("high demand") ||
          msg.includes("resource_exhausted") ||
          msg.includes("rate") ||
          msg.includes("incomplete") ||
          msg.includes("too few") ||
          msg.includes("json");

        const budgetAfter = TOTAL_DEADLINE_MS - (Date.now() - startedAt);
        if (isTransient && attempt === 0 && budgetAfter > 22_000) {
          const backoffMs = Math.min(900, Math.max(0, budgetAfter - 20_000));
          if (backoffMs > 100) {
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
          continue;
        }
        if (mIdx < MODEL_PIPELINE.length - 1) {
          onModelSwitch?.("Retrying with backup live Gemini model...");
        }
        break;
      }
    }
  }

  throw lastError || new Error("All live Gemini models failed to respond.");
}

function setupNdjsonStream(req: express.Request, res: express.Response) {
  const wantsStream = String(req.headers.accept || "").includes("application/x-ndjson");
  if (!wantsStream) {
    return null;
  }

  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let closed = false;
  res.on("close", () => {
    closed = true;
    clearInterval(heartbeat);
  });

  const writeLine = (obj: Record<string, any>) => {
    if (closed || res.writableEnded || res.destroyed) return;
    res.write(JSON.stringify(obj) + "\n");
  };

  writeLine({ type: "progress", message: "Connected to live Gemini AI..." });

  const heartbeat = setInterval(() => {
    writeLine({ type: "ping" });
  }, 2500);

  return {
    writeLine,
    finishResult: (data: any) => {
      clearInterval(heartbeat);
      writeLine({ type: "result", data });
      if (!res.writableEnded) res.end();
    },
    finishError: (status: number, message: string) => {
      clearInterval(heartbeat);
      writeLine({ type: "error", status, error: message });
      if (!res.writableEnded) res.end();
    },
    cleanup: () => clearInterval(heartbeat),
  };
}

// REST API endpoint to analyze study materials and generate a live AI D'Evelyn curriculum deck
app.post("/api/analyze-finals-material", async (req, res) => {
  const ndjson = setupNdjsonStream(req, res);

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
      units,
      fileBase64,
      fileMimeType,
    } = req.body;

    if (!courseCode) {
      if (ndjson) {
        ndjson.finishError(400, "courseCode is required.");
      } else {
        res.status(400).json({ error: "courseCode is required." });
      }
      return;
    }

    const activeSchool = schoolName || "D'Evelyn High School";
    const activeCourseName = courseName || `Course ${courseCode}`;
    const unitsList: string[] = Array.isArray(units) ? units : [];
    const formattedUnits =
      unitsList.length > 0
        ? unitsList.map((u, idx) => `  ${idx + 1}. ${u}`).join("\n")
        : "Cover the complete cumulative D'Evelyn syllabus for this course.";

    const systemPrompt = `You are a veteran D'Evelyn Jr./Sr. High School department chair and AP/Honors exam writer designing an elite finals preparation deck for "${activeCourseName}" (${courseCode}, Department: ${department || "Academic"}) at "${activeSchool}".

STRICT SUBJECT LOCK:
- Every single flashcard, cheat sheet section, study tip, timeline day, and ALL 25 mock exam questions MUST strictly belong to "${activeCourseName}" (${department || "this exact subject"}).
- Never cross over into unrelated subjects (for example, never put Computer Science/Java in a Mathematics course, and never put generic study-habit advice inside flashcards or quiz questions).

PREDICTIVE D'EVELYN FINALS QUALITY STANDARD:
- Ground every item in the exact D'Evelyn textbooks, problem types, proofs, theorems, primary sources, or labs listed below:
  - Course Overview & Texts: ${curriculumDetails || "Official D'Evelyn honors/cumulative syllabus"}
  - How Finals Are Tested: ${examFocus || "Cumulative honors/AP rigorous examination"}
  - Core Strategy: ${studyStrategy || "Active retrieval and rigorous problem execution"}
- Target Curriculum Units to Predict & Cover Evenly:
${formattedUnits}

FLASHCARD REQUIREMENTS (14 to 16 cards):
- Do NOT write vague glossary definitions or generic study-habit advice.
- Each flashcard MUST predict high-probability D'Evelyn exam items: exact non-calculator values, worked micro-problems, theorem hypotheses/conditions, common exam traps/extraneous root checks, primary-source arguments, syntax/grammar rules, or code-trace outputs.
- Keep each card concise: front question + crisp answer first followed by the key formula, condition, or pitfall.

MOCK EXAM REQUIREMENTS (EXACTLY 25 questions):
- Distribute the 25 questions evenly across ALL listed Target Curriculum Units.
- Write authentic, challenging, textbook-accurate questions with realistic numbers, equations, historical arguments, literary excerpts, language conjugations, or code snippets.
- MATCHING POOL UNIQUENESS CONSTRAINT: Questions are grouped into sets of 10 (Q1-Q10, Q11-Q20, Q21-Q25) where students match questions to correct answer cards. Within each set of 10 questions (1-10, 11-20, 21-25), ALL 10 correct answer choices MUST be completely distinct values/phrases (never allow two questions in the same 10-question set to have identical correct answer strings like both having "1", "0", or "True").
- Provide 4 distinct options formatted strictly as ["A) ...", "B) ...", "C) ...", "D) ..."], with correctIndex in 0..3 and 1 crisp, direct sentence explaining the solution.

FORMULA & TONE RULES:
- Use clean, readable plain Unicode math (e.g., "sin²(θ) + cos²(θ) = 1", "log₂(64) = 6", "√(b² - 4ac)", "π/6", "ΔH < 0", "x̅", "p̂"). NEVER use raw LaTeX ($...$, $$...$$, \\frac, \\sqrt, \\bar).
- Keep the tone focused, sharp, and academic—no slang, memes, or filler jokes.

Student Context: ${additionalNotes || "Cumulative semester final review"}

Return ONLY valid JSON matching the schema with:
- summary: { title, curriculumExplanation, topTipsForFinal (4 subject-specific tactics), synthesizedNotesParagraph, coreCheatSheetMarkdown (dense unit-by-unit formulas/theorems/dates cheat sheet) }
- timeline: 5 concise days mapped directly to the selected units
- flashcards: 14 to 16 predictive D'Evelyn exam flashcards
- quiz: EXACTLY 25 unique cumulative multiple-choice questions`;

    const promptMessage = `Build the complete predictive D'Evelyn finals study deck for ${activeCourseName} (${courseCode}). Cover every listed unit across 14–16 predictive flashcards, a dense unit-by-unit cheat sheet, a 5-day schedule, and EXACTLY 25 unique multiple-choice questions with distinct correct answers per 10-question set.${
      pastedText ? `\n\nReference material:\n"""\n${String(pastedText).slice(0, 15000)}\n"""` : ""
    }`;

    const contents: any[] = [];
    if (fileBase64 && fileMimeType) {
      const cleanBase64 = String(fileBase64).replace(/^data:.*;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: fileMimeType,
          data: cleanBase64,
        },
      });
    }
    contents.push({ text: promptMessage });

    let lastStageSent = "";
    const emitStage = (msg: string) => {
      if (!ndjson || msg === lastStageSent) return;
      lastStageSent = msg;
      ndjson.writeLine({ type: "progress", message: msg });
    };

    const normalizedDeck = await executeGeminiWithRetry(
      async (aiInstance, entry, attemptLabel) => {
        const streamPromise = aiInstance.models.generateContentStream({
          model: entry.model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: entry.thinkingLevel },
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

        const replyText = await collectStreamedText(
          streamPromise,
          entry,
          attemptLabel,
          (acc) => {
            const qCount = (acc.match(/"correctIndex"/g) || []).length;
            if (qCount > 0) {
              emitStage(`Writing live Mock Final questions (${Math.min(25, qCount)} / 25)...`);
            } else if (acc.includes('"flashcards"')) {
              emitStage("Generating predictive D'Evelyn exam flashcards...");
            } else if (acc.includes('"timeline"')) {
              emitStage("Building your 5-day finals battle plan...");
            } else if (acc.includes('"summary"')) {
              emitStage("Synthesizing core D'Evelyn unit cheat sheet...");
            }
          }
        );

        if (!replyText) {
          throw new Error("Empty response from Gemini API.");
        }
        const parsed = parseGeminiJson(replyText);
        return validateAndNormalizeDeck(parsed);
      },
      (switchMsg) => emitStage(switchMsg)
    );

    if (ndjson) {
      ndjson.finishResult(normalizedDeck);
    } else {
      res.json(normalizedDeck);
    }
  } catch (err: any) {
    console.error("Live AI study deck generation failed:", err);
    const { status, message } = extractErrorStatusAndMessage(err);
    if (ndjson) {
      ndjson.finishError(status, message);
    } else {
      res.status(status).json({ error: message });
    }
  }
});

// REST API endpoint to generate 25 more live AI questions on demand
app.post("/api/generate-more-questions", async (req, res) => {
  const ndjson = setupNdjsonStream(req, res);

  try {
    const {
      courseCode,
      courseName,
      department,
      curriculumDetails,
      examFocus,
      units,
      existingQuestions,
    } = req.body;

    if (!courseCode) {
      if (ndjson) {
        ndjson.finishError(400, "courseCode is required.");
      } else {
        res.status(400).json({ error: "courseCode is required." });
      }
      return;
    }

    const activeCourseName = courseName || `Course ${courseCode}`;
    const unitsList: string[] = Array.isArray(units) ? units : [];
    const unitsBlock =
      unitsList.length > 0
        ? `\nTarget Course Units to Cover Evenly:\n${unitsList.map((u, idx) => `- ${idx + 1}. ${u}`).join("\n")}\n`
        : "";

    const systemPrompt = `You are a veteran D'Evelyn Jr./Sr. High School exam writer crafting 25 brand-new cumulative mock final questions for "${activeCourseName}" (${courseCode}, Department: ${department || "Academic"}).
${curriculumDetails ? `Textbook & Syllabus Context: ${curriculumDetails}\n` : ""}${examFocus ? `Exam Rigor & Focus: ${examFocus}\n` : ""}${unitsBlock}
STRICT RULES:
- Every question MUST test real, challenging subject matter from "${activeCourseName}" and predict actual honors/AP/Saxon exam items.
- Do NOT write generic study-tip questions or drift into any other subject.
- MATCHING POOL UNIQUENESS CONSTRAINT: Within every group of 10 questions (Q1-Q10, Q11-Q20, Q21-Q25), ALL 10 correct answer strings MUST be completely distinct values/phrases so no two questions in the same set share the same answer text.
- Format options strictly as ["A) ...", "B) ...", "C) ...", "D) ..."] with correctIndex in 0..3 and 1 crisp, direct sentence explaining the solution.
- Use clean Unicode math only (no raw LaTeX $$, \\frac, \\sqrt).

DO NOT repeat or closely paraphrase any of these existing questions:
${(existingQuestions || []).map((q: any) => `- ${q.question}`).slice(0, 60).join("\n")}`;

    const promptMessage = `Generate EXACTLY 25 brand-new predictive multiple-choice questions inside the "quiz" array for ${activeCourseName} (${courseCode}).`;

    let lastStageSent = "";
    const emitStage = (msg: string) => {
      if (!ndjson || msg === lastStageSent) return;
      lastStageSent = msg;
      ndjson.writeLine({ type: "progress", message: msg });
    };

    const normalizedQuiz = await executeGeminiWithRetry(
      async (aiInstance, entry, attemptLabel) => {
        const streamPromise = aiInstance.models.generateContentStream({
          model: entry.model,
          contents: promptMessage,
          config: {
            systemInstruction: systemPrompt,
            thinkingConfig: { thinkingLevel: entry.thinkingLevel },
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

        const replyText = await collectStreamedText(
          streamPromise,
          entry,
          attemptLabel,
          (acc) => {
            const qCount = (acc.match(/"correctIndex"/g) || []).length;
            if (qCount > 0) {
              emitStage(`Generating 25 more questions (${Math.min(25, qCount)} / 25)...`);
            }
          }
        );

        if (!replyText) {
          throw new Error("Empty response from Gemini API.");
        }

        const parsed = parseGeminiJson(replyText);
        const quiz = normalizeQuizItems(parsed?.quiz, 25);
        if (quiz.length < 15) {
          throw new Error(`AI returned too few valid questions (${quiz.length}).`);
        }
        return quiz;
      },
      (switchMsg) => emitStage(switchMsg)
    );

    if (ndjson) {
      ndjson.finishResult({ quiz: normalizedQuiz });
    } else {
      res.json({ quiz: normalizedQuiz });
    }
  } catch (err: any) {
    console.error("Live AI generate-more-questions failed:", err);
    const { status, message } = extractErrorStatusAndMessage(err);
    if (ndjson) {
      ndjson.finishError(status, message);
    } else {
      res.status(status).json({ error: message });
    }
  }
});

// Ensure /api/* middleware errors (e.g. body-parser size/syntax errors) always return JSON, never HTML
app.use("/api", (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = Number(err?.status || err?.statusCode || 500);
  res.status(status).json({
    error: err?.message || "Unexpected API request error.",
  });
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

// Only start the standalone listener if running locally (not on Vercel serverless)
if (!process.env.VERCEL) {
  startServer();
}

// Export app so Vercel can handle requests via serverless functions
export default app;
