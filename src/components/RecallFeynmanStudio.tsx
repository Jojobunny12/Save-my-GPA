import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  FSRSCardState,
  FSRSRating,
  FeynmanEvaluation,
  StudyDeck,
} from "../types";
import {
  appendTelemetrySession,
  formatIntervalLabel,
  loadFSRSStates,
  previewNextIntervalDays,
  scheduleFlashcardReview,
  syncDeckToFSRS,
} from "../utils/fsrsEngine";
import { cleanMathFormula } from "../utils/mathFormat";
import { postJsonOrNdjson } from "../utils/streamFetch";
import {
  BUTTON_TAP,
  PANEL_FADE,
  SPRING_CARD_FLIP,
  SPRING_TACTILE,
} from "../utils/motionPresets";

interface RecallFeynmanStudioProps {
  deck: StudyDeck | null;
  redBlueMemoryTint: boolean;
  onToggleRedBlueTint: () => void;
  onTelemetryChange: () => void;
  onGoToBuilder: () => void;
}

function splitDualTint(text: string) {
  const cleaned = cleanMathFormula(text);
  let splitIndex = -1;
  for (const d of ["?", ",", ":", ";"]) {
    const idx = cleaned.indexOf(d);
    if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
      splitIndex = idx + 1;
    }
  }
  if (splitIndex > 10 && splitIndex < cleaned.length - 10) {
    return {
      part1: cleaned.slice(0, splitIndex).trim(),
      part2: cleaned.slice(splitIndex).trim(),
    };
  }
  const words = cleaned.split(" ");
  if (words.length <= 4) return { part1: cleaned, part2: "" };
  const mid = Math.ceil(words.length / 2);
  return {
    part1: words.slice(0, mid).join(" "),
    part2: words.slice(mid).join(" "),
  };
}

export default function RecallFeynmanStudio({
  deck,
  redBlueMemoryTint,
  onToggleRedBlueTint,
  onTelemetryChange,
  onGoToBuilder,
}: RecallFeynmanStudioProps) {
  const [mode, setMode] = useState<"recall" | "feynman">("recall");
  const [queueFilter, setQueueFilter] = useState<"due" | "all">("all");
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [fsrsMap, setFsrsMap] = useState<Record<string, FSRSCardState>>({});

  // Retrieval latency stopwatch
  const [cardStartedAt, setCardStartedAt] = useState<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Feynman grading state
  const [feynmanText, setFeynmanText] = useState("");
  const [isGradingFeynman, setIsGradingFeynman] = useState(false);
  const [feynmanResult, setFeynmanResult] = useState<FeynmanEvaluation | null>(null);
  const [feynmanError, setFeynmanError] = useState<string | null>(null);
  const [lastRatingNotice, setLastRatingNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!deck) return;
    const synced = syncDeckToFSRS(deck);
    setFsrsMap(synced);
    setCardIndex(0);
    setIsFlipped(false);
    setCardStartedAt(Date.now());
    setElapsedSec(0);
    setFeynmanText("");
    setFeynmanResult(null);
    setFeynmanError(null);
    setLastRatingNotice(null);
  }, [deck?.id]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Number(((Date.now() - cardStartedAt) / 1000).toFixed(1)));
    }, 250);
    return () => clearInterval(id);
  }, [cardStartedAt]);

  const cardStates = useMemo(() => {
    if (!deck) return [];
    const now = Date.now();
    const list = (deck.flashcards || []).map((fc, idx) => {
      const id = `${deck.id}::fc::${idx}`;
      return (
        fsrsMap[id] || {
          conceptId: id,
          deckId: deck.id,
          courseCode: deck.courseCode,
          courseName: deck.courseName,
          question: fc.question,
          answer: fc.answer,
          unitTag: fc.unitTag || deck.units?.[idx % (deck.units.length || 1)] || deck.courseName,
          tier: fc.tier || "definition",
          stability: 0.9,
          difficulty: 5.0,
          reps: 0,
          lapses: 0,
          errorCount: 0,
          lastLatencyMs: 0,
          avgLatencyMs: 0,
          lastReviewAt: null,
          dueAt: new Date().toISOString(),
        }
      );
    });

    if (queueFilter === "due") {
      const dueList = list.filter((c) => new Date(c.dueAt).getTime() <= now);
      return dueList.length > 0 ? dueList : list;
    }
    return list;
  }, [deck, fsrsMap, queueFilter]);

  const safeIdx = Math.min(cardIndex, Math.max(0, cardStates.length - 1));
  const activeCard = cardStates[safeIdx];

  const advanceCard = (nextIdx: number) => {
    setCardIndex(nextIdx);
    setIsFlipped(false);
    setCardStartedAt(Date.now());
    setElapsedSec(0);
    setFeynmanText("");
    setFeynmanResult(null);
    setFeynmanError(null);
  };

  const handleRateCard = (rating: FSRSRating) => {
    if (!deck || !activeCard) return;
    const latencyMs = Math.max(400, Date.now() - cardStartedAt);
    const updated = scheduleFlashcardReview(activeCard, rating, latencyMs, deck.testDate);
    setFsrsMap(loadFSRSStates());

    appendTelemetrySession({
      mode: mode === "feynman" ? "feynman" : "recall",
      courseCode: deck.courseCode,
      accuracyPct: rating >= 3 ? 100 : rating === 2 ? 65 : 20,
      avgLatencyMs: latencyMs,
      conceptsReviewed: 1,
      xpEarned: rating === 4 ? 30 : rating === 3 ? 22 : rating === 2 ? 12 : 6,
    });
    onTelemetryChange();

    const preview = previewNextIntervalDays(activeCard, rating, deck.testDate);
    setLastRatingNotice(`Scheduled next review in ${formatIntervalLabel(preview.intervalDays)}`);
    setTimeout(() => setLastRatingNotice(null), 2400);

    if (safeIdx < cardStates.length - 1) {
      advanceCard(safeIdx + 1);
    } else {
      advanceCard(0);
    }
  };

  const handleGradeFeynman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck || !activeCard || !feynmanText.trim()) return;

    setIsGradingFeynman(true);
    setFeynmanError(null);
    const startMs = cardStartedAt;

    try {
      const evaluation = await postJsonOrNdjson<FeynmanEvaluation>(
        "/api/feynman-grade",
        {
          courseCode: deck.courseCode,
          courseName: deck.courseName,
          conceptQuestion: activeCard.question,
          modelAnswer: activeCard.answer,
          studentExplanation: feynmanText.trim(),
        },
        { timeoutMs: 45_000 }
      );
      setFeynmanResult(evaluation);

      const rating: FSRSRating =
        evaluation.overallScore >= 85
          ? 4
          : evaluation.overallScore >= 70
          ? 3
          : evaluation.overallScore >= 50
          ? 2
          : 1;
      const latencyMs = Date.now() - startMs;
      scheduleFlashcardReview(activeCard, rating, latencyMs, deck.testDate);
      setFsrsMap(loadFSRSStates());
      appendTelemetrySession({
        mode: "feynman",
        courseCode: deck.courseCode,
        accuracyPct: evaluation.overallScore,
        avgLatencyMs: latencyMs,
        conceptsReviewed: 1,
        xpEarned: Math.max(10, Math.round(evaluation.overallScore / 2)),
      });
      onTelemetryChange();
    } catch (err: any) {
      setFeynmanError(err?.message || "Failed to grade Feynman explanation. Please try again.");
    } finally {
      setIsGradingFeynman(false);
    }
  };

  if (!deck) {
    return (
      <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center space-y-4">
        <Brain className="h-9 w-9 text-cyan-400 mx-auto" />
        <h2 className="font-display text-xl font-bold text-white">No Active Study Deck Selected</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Generate a deck from D&apos;Evelyn&apos;s course catalog or paste your class notes to unlock 3D FSRS Active Recall and Feynman grading.
        </p>
        <button
          type="button"
          onClick={onGoToBuilder}
          className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
        >
          Go to Deck Studio
        </button>
      </div>
    );
  }

  const tierLabel =
    activeCard?.tier === "why_how"
      ? "Conceptual Mechanism (Why / How)"
      : activeCard?.tier === "ap_stimulus"
      ? "AP / Exam Synthesis"
      : "Rapid Precision Recall";

  const splitParts = activeCard ? splitDualTint(activeCard.question) : { part1: "", part2: "" };

  return (
    <motion.div
      variants={PANEL_FADE}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Studio Control Header */}
      <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400">
            {deck.courseCode} · {deck.courseName}
          </div>
          <h2 className="font-display text-xl font-bold text-white tracking-tight mt-0.5">
            3D Active Recall &amp; Feynman Engine
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-950 border border-white/10 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("recall")}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                mode === "recall" ? "bg-emerald-400 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              3D Recall Flip
            </button>
            <button
              type="button"
              onClick={() => setMode("feynman")}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                mode === "feynman" ? "bg-cyan-400 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Feynman Grader
            </button>
          </div>

          {/* Red/Blue Cognitive Tint Toggle */}
          <button
            type="button"
            onClick={onToggleRedBlueTint}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono cursor-pointer transition-colors whitespace-nowrap ${
              redBlueMemoryTint
                ? "bg-gradient-to-r from-red-950/60 to-blue-950/60 border-white/20 text-zinc-100"
                : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white"
            }`}
            title="Toggle proven Red/Blue dual-color memory encoding on cards"
          >
            <Palette className="h-3.5 w-3.5 text-cyan-400" />
            <span>{redBlueMemoryTint ? "Red/Blue Tint: On" : "Red/Blue Tint: Off"}</span>
          </button>

          {/* Due / All Filter */}
          <button
            type="button"
            onClick={() => {
              setQueueFilter(queueFilter === "all" ? "due" : "all");
              setCardIndex(0);
            }}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            {queueFilter === "due" ? "Showing Due Queue" : "All Cards"}
          </button>
        </div>
      </div>

      {/* Telemetry Progress Strip */}
      <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs tabular-nums">
        <div className="flex items-center gap-3 text-zinc-300">
          <span>
            Card <strong className="text-white">{safeIdx + 1}</strong> / {cardStates.length}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-cyan-400 truncate max-w-[240px]">{activeCard?.unitTag}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{tierLabel}</span>
        </div>

        <div className="flex items-center gap-4">
          {lastRatingNotice && (
            <span className="text-emerald-400 font-semibold">{lastRatingNotice}</span>
          )}
          <div className="inline-flex items-center gap-1.5 text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>{elapsedSec.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Mode 1: 3D Spring-Loaded Active Recall Card */}
      {mode === "recall" && activeCard && (
        <div className="space-y-5">
          <div className="perspective-1200 w-full">
            <motion.div
              onClick={() => setIsFlipped(!isFlipped)}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={SPRING_CARD_FLIP}
              className="preserve-3d relative w-full min-h-[290px] cursor-pointer select-none"
            >
              {/* FRONT FACE */}
              <div
                className={`backface-hidden absolute inset-0 rounded-2xl p-6 md:p-8 border flex flex-col justify-between shadow-2xl ${
                  redBlueMemoryTint
                    ? "bg-gradient-to-br from-red-950/45 via-[#111114] to-blue-950/45 border-white/15"
                    : "bg-[#111114]/90 border-white/15"
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[11px] font-mono">
                  <span className="text-cyan-400 font-semibold">Active Recall Prompt</span>
                  <span className="text-zinc-400 tabular-nums">
                    Stability: {activeCard.stability}d · Reps: {activeCard.reps}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center py-6 px-2">
                  {redBlueMemoryTint ? (
                    <p className="text-center font-semibold text-base md:text-lg leading-relaxed max-w-2xl">
                      <span className="text-red-300">{splitParts.part1}</span>
                      {splitParts.part2 && (
                        <span className="text-blue-300 ml-1.5">{splitParts.part2}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-center font-semibold text-base md:text-lg leading-relaxed text-zinc-100 max-w-2xl">
                      {cleanMathFormula(activeCard.question)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-3 text-xs font-mono text-zinc-400">
                  <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Click card to flip &amp; grade memory stability</span>
                </div>
              </div>

              {/* BACK FACE */}
              <div
                className={`backface-hidden rotate-y-180 absolute inset-0 rounded-2xl p-6 md:p-8 border flex flex-col justify-between shadow-2xl ${
                  redBlueMemoryTint
                    ? "bg-gradient-to-br from-blue-950/55 via-[#12141A] to-red-950/55 border-emerald-400/40"
                    : "bg-[#12161E] border-emerald-400/40"
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[11px] font-mono">
                  <span className="text-emerald-400 font-semibold">Diagnostic Solution</span>
                  <span className="text-zinc-400 tabular-nums">
                    Difficulty: {activeCard.difficulty}/10
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center py-6 px-2">
                  <p className="text-center font-semibold text-base md:text-lg leading-relaxed text-zinc-50 max-w-2xl">
                    {cleanMathFormula(activeCard.answer)}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-3 text-xs font-mono text-emerald-300">
                  <span>Rate retrieval difficulty below to update FSRS interval</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* FSRS 4-Button Scheduler Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { rating: 1 as FSRSRating, label: "Again", sub: "Reset & re-queue", cls: "border-rose-500/40 hover:bg-rose-500/15 text-rose-300" },
                { rating: 2 as FSRSRating, label: "Hard", sub: "Hesitant recall", cls: "border-amber-500/40 hover:bg-amber-500/15 text-amber-300" },
                { rating: 3 as FSRSRating, label: "Good", sub: "Clean retrieval", cls: "border-cyan-400/40 hover:bg-cyan-400/15 text-cyan-300" },
                { rating: 4 as FSRSRating, label: "Easy", sub: "Instant cold recall", cls: "border-emerald-400/40 hover:bg-emerald-400/15 text-emerald-300" },
              ] as const
            ).map((btn) => {
              const preview = previewNextIntervalDays(activeCard, btn.rating, deck.testDate);
              return (
                <motion.button
                  key={btn.rating}
                  type="button"
                  whileHover={{ y: -2, transition: SPRING_TACTILE }}
                  whileTap={BUTTON_TAP}
                  onClick={() => handleRateCard(btn.rating)}
                  className={`p-3.5 rounded-xl bg-[#111114]/90 border text-left transition-colors cursor-pointer ${btn.cls}`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-xs font-bold">{btn.label}</span>
                    <span className="text-xs font-extrabold tabular-nums">
                      {formatIntervalLabel(preview.intervalDays)}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">{btn.sub}</div>
                </motion.button>
              );
            })}
          </div>

          {/* Card Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={safeIdx === 0}
              onClick={() => advanceCard(safeIdx - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs font-semibold text-zinc-200 disabled:opacity-35 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("feynman")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/40 rounded-xl text-xs font-mono font-semibold text-cyan-300 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Test This Concept in Feynman Mode</span>
            </button>

            <button
              type="button"
              disabled={safeIdx >= cardStates.length - 1}
              onClick={() => advanceCard(safeIdx + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs font-semibold text-zinc-200 disabled:opacity-35 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Feynman Plain-English Diagnostic Grader */}
      {mode === "feynman" && activeCard && (
        <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-cyan-400">
              Feynman Technique · Teach Without Jargon
            </div>
            <h3 className="font-display text-lg font-bold text-white leading-snug">
              {cleanMathFormula(activeCard.question)}
            </h3>
            <p className="text-xs text-zinc-400">
              Explain the underlying logic, boundary conditions, and why it works in plain English as if teaching a classmate.
            </p>
          </div>

          <form onSubmit={handleGradeFeynman} className="space-y-4">
            <textarea
              rows={5}
              value={feynmanText}
              onChange={(e) => setFeynmanText(e.target.value)}
              placeholder="Write your plain-English explanation here..."
              className="w-full p-4 bg-zinc-950 border border-white/10 focus:border-cyan-400 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeIdx === 0}
                  onClick={() => advanceCard(safeIdx - 1)}
                  className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 disabled:opacity-35 cursor-pointer"
                >
                  Prev Prompt
                </button>
                <button
                  type="button"
                  disabled={safeIdx >= cardStates.length - 1}
                  onClick={() => advanceCard(safeIdx + 1)}
                  className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 disabled:opacity-35 cursor-pointer"
                >
                  Next Prompt
                </button>
              </div>

              <motion.button
                type="submit"
                whileTap={BUTTON_TAP}
                disabled={isGradingFeynman || !feynmanText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isGradingFeynman ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Grading Logical Precision...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Grade Feynman Explanation</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {feynmanError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{feynmanError}</span>
            </div>
          )}

          <AnimatePresence>
            {feynmanResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pt-5 border-t border-white/10 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                  <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl">
                    <div className="text-[11px] text-zinc-400">Overall Score</div>
                    <div
                      className={`text-2xl font-extrabold mt-0.5 ${
                        feynmanResult.overallScore >= 85
                          ? "text-emerald-400"
                          : feynmanResult.overallScore >= 65
                          ? "text-cyan-400"
                          : "text-amber-400"
                      }`}
                    >
                      {feynmanResult.overallScore}% · {feynmanResult.verdict}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl">
                    <div className="text-[11px] text-zinc-400">Logical Precision</div>
                    <div className="text-2xl font-extrabold text-white mt-0.5">
                      {feynmanResult.logicalPrecision}%
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl">
                    <div className="text-[11px] text-zinc-400">Conceptual Nuance</div>
                    <div className="text-2xl font-extrabold text-white mt-0.5">
                      {feynmanResult.nuanceScore}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verified Strengths</span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-200 list-disc pl-4">
                      {feynmanResult.strengths.map((s, i) => (
                        <li key={i}>{cleanMathFormula(s)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      <span>Detected Blind Spots</span>
                    </div>
                    <ul className="space-y-1.5 text-zinc-200 list-disc pl-4">
                      {feynmanResult.blindSpots.map((b, i) => (
                        <li key={i}>{cleanMathFormula(b)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl space-y-1.5 text-xs">
                  <div className="font-mono font-semibold text-cyan-400">
                    Model Reference Explanation
                  </div>
                  <p className="text-zinc-200 leading-relaxed">
                    {cleanMathFormula(feynmanResult.refinedModelExplanation)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
