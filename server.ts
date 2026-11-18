import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limits to support up to 5 base64 study files
app.use(express.json({ limit: "65mb" }));
app.use(express.urlencoded({ limit: "65mb", extended: true }));

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

type AssessmentTierValue = "definition" | "why_how" | "ap_stimulus";

function normalizeTier(rawTier: any, idx: number): AssessmentTierValue {
  if (rawTier === "definition" || rawTier === "why_how" || rawTier === "ap_stimulus") {
    return rawTier;
  }
  return idx % 3 === 1 ? "why_how" : idx % 3 === 2 ? "ap_stimulus" : "definition";
}

interface NormalizedQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  unitTag?: string;
  tier?: AssessmentTierValue;
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
      unitTag: typeof item?.unitTag === "string" && item.unitTag.trim() ? item.unitTag.trim() : undefined,
      tier: normalizeTier(item?.tier, cleaned.length),
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
        .map((f: any, idx: number) => ({
          question: f.question.trim(),
          answer: f.answer.trim(),
          unitTag: typeof f?.unitTag === "string" && f.unitTag.trim() ? f.unitTag.trim() : undefined,
          tier: normalizeTier(f?.tier, idx),
        }))
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
      files,
    } = req.body;

    interface UploadedMaterialPayload {
      name: string;
      mimeType: string;
      base64: string;
    }

    const normalizedFiles: UploadedMaterialPayload[] = Array.isArray(files)
      ? files
          .filter(
            (f: any) =>
              f &&
              typeof f.base64 === "string" &&
              f.base64.trim() &&
              typeof f.mimeType === "string" &&
              f.mimeType.trim()
          )
          .slice(0, 5)
          .map((f: any, idx: number) => ({
            name: typeof f.name === "string" && f.name.trim() ? f.name.trim() : `Material_${idx + 1}`,
            mimeType: f.mimeType.trim(),
            base64: f.base64,
          }))
      : fileBase64 && fileMimeType
      ? [
          {
            name: "Uploaded_Study_Material",
            mimeType: String(fileMimeType),
            base64: String(fileBase64),
          },
        ]
      : [];

    const cleanPastedText = typeof pastedText === "string" ? pastedText.trim() : "";
    const resolvedCourseCode =
      typeof courseCode === "string" && courseCode.trim()
        ? courseCode.trim()
        : cleanPastedText || normalizedFiles.length > 0
        ? "CUSTOM_NOTES"
        : "";

    if (!resolvedCourseCode) {
      if (ndjson) {
        ndjson.finishError(400, "Select a D'Evelyn course, enter a course code, paste notes, or upload study materials.");
      } else {
        res.status(400).json({ error: "Select a D'Evelyn course, enter a course code, paste notes, or upload study materials." });
      }
      return;
    }

    const activeSchool = schoolName || "D'Evelyn High School";
    const activeCourseName = courseName || (resolvedCourseCode === "CUSTOM_NOTES" ? "Custom Lecture & Notes Study Deck" : `Course ${resolvedCourseCode}`);
    const unitsList: string[] = Array.isArray(units) ? units : [];
    const formattedUnits =
      unitsList.length > 0
        ? unitsList.map((u, idx) => `  ${idx + 1}. ${u}`).join("\n")
        : cleanPastedText || normalizedFiles.length > 0
        ? "Derive distinct unit/topic labels directly from the student's uploaded materials and pasted syllabus/notes."
        : "Cover the complete cumulative D'Evelyn syllabus for this course.";

    const systemPrompt = `You are a veteran D'Evelyn Jr./Sr. High School department chair and AP/Honors exam writer designing an elite finals preparation deck for "${activeCourseName}" (${resolvedCourseCode}, Department: ${department || "Academic"}) at "${activeSchool}".

STRICT SUBJECT LOCK:
- Every single flashcard, cheat sheet section, study tip, timeline day, and ALL 25 mock exam questions MUST strictly belong to "${activeCourseName}" (${department || "this exact subject"}).
- Never cross over into unrelated subjects (for example, never put Computer Science/Java in a Mathematics course, and never put generic study-habit advice inside flashcards or quiz questions).

PREDICTIVE D'EVELYN FINALS QUALITY STANDARD:
- Ground every item in the exact D'Evelyn textbooks, problem types, proofs, theorems, primary sources, or labs listed below:
  - Course Overview & Texts: ${curriculumDetails || "Official D'Evelyn honors/cumulative syllabus & uploaded class materials"}
  - How Finals Are Tested: ${examFocus || "Cumulative honors/AP rigorous examination"}
  - Core Strategy: ${studyStrategy || "Active retrieval and rigorous problem execution"}
- Target Curriculum Units to Predict & Cover Evenly:
${formattedUnits}

COGNITIVE TIERS & UNIT TAGGING:
- Tag every flashcard and quiz question with:
  - "unitTag": the concise unit or chapter name it tests.
  - "tier": balanced across "definition" (rapid-fire precision terms/formulas), "why_how" (conceptual mechanism & causation prompts), and "ap_stimulus" (AP-style problem/excerpt/document stimulus).

FLASHCARD REQUIREMENTS (14 to 16 cards):
- Do NOT write vague glossary definitions or generic study-habit advice.
- Each flashcard MUST predict high-probability D'Evelyn exam items: exact non-calculator values, worked micro-problems, theorem hypotheses/conditions, common exam traps/extraneous root checks, primary-source arguments, syntax/grammar rules, or code-trace outputs.
- Keep each card concise: front question + crisp answer first followed by the key formula, condition, or pitfall.

MOCK EXAM REQUIREMENTS (EXACTLY 25 questions):
- Distribute the 25 questions evenly across ALL listed Target Curriculum Units and mix tiers ("definition", "why_how", "ap_stimulus").
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
- flashcards: 14 to 16 predictive D'Evelyn exam flashcards (each with question, answer, unitTag, tier)
- quiz: EXACTLY 25 unique cumulative multiple-choice questions (each with question, options, correctIndex, explanation, unitTag, tier)`;

    const contents: any[] = [];
    const textAttachments: string[] = [];
    const binaryAttachmentNames: string[] = [];

    for (const file of normalizedFiles) {
      const cleanBase64 = String(file.base64).replace(/^data:.*;base64,/, "");
      const mimeLower = file.mimeType.toLowerCase();
      if (mimeLower.startsWith("text/") || mimeLower === "application/json") {
        const decoded = Buffer.from(cleanBase64, "base64").toString("utf-8").trim();
        if (decoded) {
          textAttachments.push(`--- File: ${file.name} ---\n${decoded.slice(0, 12000)}`);
        }
      } else {
        binaryAttachmentNames.push(file.name);
        contents.push({
          inlineData: {
            mimeType: file.mimeType,
            data: cleanBase64,
          },
        });
      }
    }

    const promptMessage = `Build the complete predictive D'Evelyn finals study deck for ${activeCourseName} (${resolvedCourseCode}). Cover every listed unit across 14–16 predictive flashcards, a dense unit-by-unit cheat sheet, a 5-day schedule, and EXACTLY 25 unique multiple-choice questions with distinct correct answers per 10-question set.${
      binaryAttachmentNames.length > 0
        ? `\n\nSynthesize across ALL ${binaryAttachmentNames.length} attached study document(s): ${binaryAttachmentNames.join(", ")}.`
        : ""
    }${
      textAttachments.length > 0
        ? `\n\nAttached Text Study Materials:\n${textAttachments.join("\n\n")}`
        : ""
    }${
      cleanPastedText
        ? `\n\nStudent Lecture Notes / Syllabus / Excerpt:\n"""\n${cleanPastedText.slice(0, 18000)}\n"""`
        : ""
    }`;

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
                      unitTag: { type: Type.STRING },
                      tier: { type: Type.STRING },
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
                      unitTag: { type: Type.STRING },
                      tier: { type: Type.STRING },
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
- Tag each item with "unitTag" and "tier" ("definition", "why_how", or "ap_stimulus").
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
                      unitTag: { type: Type.STRING },
                      tier: { type: Type.STRING },
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

// REST API endpoint: Feynman Plain-English Diagnostic Grader
app.post("/api/feynman-grade", async (req, res) => {
  try {
    const { courseCode, courseName, conceptQuestion, modelAnswer, studentExplanation } = req.body || {};
    if (!conceptQuestion || !studentExplanation || !String(studentExplanation).trim()) {
      res.status(400).json({ error: "conceptQuestion and a non-empty studentExplanation are required." });
      return;
    }

    const systemInstruction = `You are an elite D'Evelyn Jr./Sr. High School honors & AP examiner grading a student's Feynman plain-English explanation for "${courseName || courseCode || "Academic Course"}".
Evaluate rigorously for logical precision, conceptual nuance, causal accuracy, and missing boundary conditions or exam traps. Never accept hand-wavy buzzwords without mechanistic explanation. Use clean Unicode math only (never raw LaTeX).`;

    const userPrompt = `Prompt / Concept:
${conceptQuestion}

Reference Standard:
${modelAnswer || "Evaluate based on exact honors/AP curriculum standards."}

Student's Plain-English Feynman Explanation:
${String(studentExplanation).trim()}

Return strict JSON grading logicalPrecision (0-100), nuanceScore (0-100), overallScore (0-100), verdict ("Mastered" | "Partial" | "Needs Review"), 2-3 specific strengths, 2-3 concrete blindSpots, and a crisp refinedModelExplanation.`;

    const evaluation = await executeGeminiWithRetry(async (aiInstance, entry, attemptLabel) => {
      const response = await withTimeout(
        aiInstance.models.generateContent({
          model: entry.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: entry.thinkingLevel },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: [
                "overallScore",
                "logicalPrecision",
                "nuanceScore",
                "verdict",
                "strengths",
                "blindSpots",
                "refinedModelExplanation",
              ],
              properties: {
                overallScore: { type: Type.INTEGER },
                logicalPrecision: { type: Type.INTEGER },
                nuanceScore: { type: Type.INTEGER },
                verdict: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                blindSpots: { type: Type.ARRAY, items: { type: Type.STRING } },
                refinedModelExplanation: { type: Type.STRING },
              },
            },
          },
        }),
        entry.totalTimeoutMs,
        `${attemptLabel}:feynman`
      );

      const text = response.text;
      if (!text) throw new Error("Empty Feynman evaluation from Gemini.");
      const parsed = parseGeminiJson(text);
      const overall = Math.min(100, Math.max(0, Math.round(Number(parsed.overallScore || 0))));
      const verdict =
        overall >= 85 ? "Mastered" : overall >= 60 ? "Partial" : "Needs Review";
      return {
        overallScore: overall,
        logicalPrecision: Math.min(100, Math.max(0, Math.round(Number(parsed.logicalPrecision || overall)))),
        nuanceScore: Math.min(100, Math.max(0, Math.round(Number(parsed.nuanceScore || overall)))),
        verdict,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 4) : [],
        blindSpots: Array.isArray(parsed.blindSpots) ? parsed.blindSpots.map(String).slice(0, 4) : [],
        refinedModelExplanation: String(parsed.refinedModelExplanation || modelAnswer || "").trim(),
      };
    });

    res.json(evaluation);
  } catch (err: any) {
    console.error("Live AI Feynman grading failed:", err);
    const { status, message } = extractErrorStatusAndMessage(err);
    res.status(status).json({ error: message });
  }
});

// REST API endpoint: Socratic Seminar Moderator & Thesis Rubric Grader
app.post("/api/socratic-turn", async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      topicPrompt,
      thesisStatement,
      history,
      studentMessage,
    } = req.body || {};

    if (!topicPrompt || !studentMessage || !String(studentMessage).trim()) {
      res.status(400).json({ error: "topicPrompt and studentMessage are required." });
      return;
    }

    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-8)
          .map((t: any) => `${t.role === "moderator" ? "MODERATOR" : "STUDENT"}: ${String(t.content || "").trim()}`)
          .join("\n")
      : "";

    const systemInstruction = `You are a demanding D'Evelyn Jr./Sr. High School Socratic Seminar & AP Humanities/Liberal Arts moderator for "${courseName || courseCode || "Honors Humanities"}".
Your role:
1. Interrogate weak generalizations, unearned claims, anachronisms, or vague phrasing.
2. Demand concrete textual evidence, historical primary-source specifics, or logical syllogism steps.
3. Score the student's current argument rigorously on the 4-axis AP/Honors rubric (each 0-25: claimScore, evidenceScore, reasoningScore, counterargumentScore; overallScore 0-100).
4. Respond with a razor-sharp critique, identify the primary challengeType ("Evidence Demand" | "Counterargument" | "Logical Precision" | "Synthesis"), pose one piercing probingQuestion, note any textualEvidenceCheck gap, and list 2–3 concrete feedbackBullets.`;

    const userPrompt = `Seminar Prompt: ${topicPrompt}
Working Thesis: ${thesisStatement || "Not stated separately — extract from argument"}
${formattedHistory ? `\nPrior Exchange:\n${formattedHistory}\n` : ""}
Latest Student Argument:
${String(studentMessage).trim()}

Return ONLY JSON matching the schema.`;

    const turnResult = await executeGeminiWithRetry(async (aiInstance, entry, attemptLabel) => {
      const response = await withTimeout(
        aiInstance.models.generateContent({
          model: entry.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: entry.thinkingLevel },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: [
                "moderatorReply",
                "challengeType",
                "probingQuestion",
                "textualEvidenceCheck",
                "rubric",
                "feedbackBullets",
              ],
              properties: {
                moderatorReply: { type: Type.STRING },
                challengeType: { type: Type.STRING },
                probingQuestion: { type: Type.STRING },
                textualEvidenceCheck: { type: Type.STRING },
                rubric: {
                  type: Type.OBJECT,
                  required: [
                    "claimScore",
                    "evidenceScore",
                    "reasoningScore",
                    "counterargumentScore",
                    "overallScore",
                  ],
                  properties: {
                    claimScore: { type: Type.INTEGER },
                    evidenceScore: { type: Type.INTEGER },
                    reasoningScore: { type: Type.INTEGER },
                    counterargumentScore: { type: Type.INTEGER },
                    overallScore: { type: Type.INTEGER },
                  },
                },
                feedbackBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
        }),
        entry.totalTimeoutMs,
        `${attemptLabel}:socratic`
      );

      const text = response.text;
      if (!text) throw new Error("Empty Socratic response from Gemini.");
      const parsed = parseGeminiJson(text);

      const clamp25 = (n: any) => Math.min(25, Math.max(0, Math.round(Number(n || 0))));
      const claimScore = clamp25(parsed?.rubric?.claimScore);
      const evidenceScore = clamp25(parsed?.rubric?.evidenceScore);
      const reasoningScore = clamp25(parsed?.rubric?.reasoningScore);
      const counterargumentScore = clamp25(parsed?.rubric?.counterargumentScore);
      const overallScore = claimScore + evidenceScore + reasoningScore + counterargumentScore;

      const validChallenges = [
        "Evidence Demand",
        "Counterargument",
        "Logical Precision",
        "Synthesis",
      ] as const;
      const rawChallenge = String(parsed.challengeType || "");
      const challengeType = (validChallenges as readonly string[]).includes(rawChallenge)
        ? rawChallenge
        : "Evidence Demand";

      return {
        moderatorReply: String(parsed.moderatorReply || "").trim(),
        challengeType,
        probingQuestion: String(parsed.probingQuestion || "").trim(),
        textualEvidenceCheck: String(parsed.textualEvidenceCheck || "").trim(),
        rubric: {
          claimScore,
          evidenceScore,
          reasoningScore,
          counterargumentScore,
          overallScore,
        },
        feedbackBullets: Array.isArray(parsed.feedbackBullets)
          ? parsed.feedbackBullets.map(String).slice(0, 4)
          : [],
      };
    });

    res.json(turnResult);
  } catch (err: any) {
    console.error("Live AI Socratic turn failed:", err);
    const { status, message } = extractErrorStatusAndMessage(err);
    res.status(status).json({ error: message });
  }
});

// REST API endpoint: Dual-Coding Concept Graph & Chronological Timeline Generator
app.post("/api/concept-map", async (req, res) => {
  try {
    const { courseCode, courseName, units, sourceNotes, cheatSheetMarkdown } = req.body || {};
    const notesText = String(sourceNotes || cheatSheetMarkdown || "").trim();
    if (!notesText && !courseName && !courseCode) {
      res.status(400).json({ error: "Provide a study deck, course name, or raw notes to map." });
      return;
    }

    const systemInstruction = `You are a cognitive scientist building a Dual-Coding interactive Concept Graph & Sequential Timeline for "${courseName || courseCode || "Academic Study"}".
Extract 8 to 10 high-yield conceptual nodes (tier: "core" | "mechanism" | "synthesis") with clean non-overlapping normalized canvas coordinates (x in 10..90, y in 14..86), 8 to 12 directed causal/structural edges ("from", "to", "relation"), and 4 to 6 ordered "timelineEvents" ("sequence", "title", "detail"). Use clean Unicode math only (no LaTeX).`;

    const userPrompt = `Course: ${courseName || courseCode || "Course Material"}
Units: ${Array.isArray(units) && units.length > 0 ? units.join(" | ") : "Core curriculum"}
Source Reference:
"""
${notesText.slice(0, 12000)}
"""
Generate the Dual-Coding Concept Graph JSON.`;

    const graphData = await executeGeminiWithRetry(async (aiInstance, entry, attemptLabel) => {
      const response = await withTimeout(
        aiInstance.models.generateContent({
          model: entry.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: entry.thinkingLevel },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["title", "nodes", "edges", "timelineEvents"],
              properties: {
                title: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["id", "label", "summary", "unitTag", "tier", "x", "y"],
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      summary: { type: Type.STRING },
                      unitTag: { type: Type.STRING },
                      tier: { type: Type.STRING },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                    },
                  },
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["from", "to", "relation"],
                    properties: {
                      from: { type: Type.STRING },
                      to: { type: Type.STRING },
                      relation: { type: Type.STRING },
                    },
                  },
                },
                timelineEvents: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["sequence", "title", "detail"],
                    properties: {
                      sequence: { type: Type.STRING },
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        }),
        entry.totalTimeoutMs,
        `${attemptLabel}:concept-map`
      );

      const text = response.text;
      if (!text) throw new Error("Empty concept map from Gemini.");
      const parsed = parseGeminiJson(text);
      const nodes = Array.isArray(parsed.nodes)
        ? parsed.nodes.slice(0, 12).map((n: any, idx: number) => ({
            id: String(n.id || `n${idx + 1}`),
            label: String(n.label || `Concept ${idx + 1}`).trim(),
            summary: String(n.summary || "").trim(),
            unitTag: String(n.unitTag || courseName || "Core Unit").trim(),
            tier: n.tier === "mechanism" || n.tier === "synthesis" ? n.tier : "core",
            x: Math.min(88, Math.max(12, Number(n.x || 18 + (idx % 4) * 21))),
            y: Math.min(85, Math.max(15, Number(n.y || 22 + Math.floor(idx / 4) * 28))),
          }))
        : [];

      const validIds = new Set(nodes.map((n: any) => n.id));
      const edges = Array.isArray(parsed.edges)
        ? parsed.edges
            .filter((e: any) => validIds.has(String(e.from)) && validIds.has(String(e.to)) && e.from !== e.to)
            .slice(0, 16)
            .map((e: any) => ({
              from: String(e.from),
              to: String(e.to),
              relation: String(e.relation || "connects to").trim(),
            }))
        : [];

      const timelineEvents = Array.isArray(parsed.timelineEvents)
        ? parsed.timelineEvents.slice(0, 8).map((ev: any, idx: number) => ({
            sequence: String(ev.sequence || `Step ${idx + 1}`).trim(),
            title: String(ev.title || "").trim(),
            detail: String(ev.detail || "").trim(),
          }))
        : [];

      if (nodes.length < 3) {
        throw new Error("Concept map returned fewer than 3 nodes.");
      }

      return {
        title: String(parsed.title || `${courseName || "Course"} Concept Architecture`).trim(),
        nodes,
        edges,
        timelineEvents,
      };
    });

    res.json(graphData);
  } catch (err: any) {
    console.error("Live AI concept map generation failed:", err);
    const { status, message } = extractErrorStatusAndMessage(err);
    res.status(status).json({ error: message });
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
