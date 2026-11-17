import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  ChevronRight,
  FileDown,
  Flame,
  RotateCcw,
  Sparkles,
  Swords,
  XCircle,
} from "lucide-react";
import { StudyDeck } from "../types";
import {
  RoyaleDrillItem,
  appendTelemetrySession,
  getInterleavedRoyaleQueue,
  recordQuestionOutcome,
} from "../utils/fsrsEngine";
import { cleanMathFormula } from "../utils/mathFormat";
import {
  BUTTON_TAP,
  PANEL_FADE,
  SPRING_HUD,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
} from "../utils/motionPresets";

interface WeaknessRoyaleStudioProps {
  decks: StudyDeck[];
  activeDeck: StudyDeck | null;
  onTelemetryChange: () => void;
  onOpenMatchingExam: () => void;
  onLaunchBossBattle: () => void;
  onGoToBuilder: () => void;
}

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function WeaknessRoyaleStudio({
  decks,
  activeDeck,
  onTelemetryChange,
  onOpenMatchingExam,
  onLaunchBossBattle,
  onGoToBuilder,
}: WeaknessRoyaleStudioProps) {
  const [scope, setScope] = useState<"active" | "all">(activeDeck ? "active" : "all");
  const [queue, setQueue] = useState<RoyaleDrillItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(Date.now());
  const [showBurst, setShowBurst] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);

  const rebuildQueue = () => {
    const items = getInterleavedRoyaleQueue(
      decks,
      scope === "active" && activeDeck ? activeDeck.id : undefined,
      15
    );
    setQueue(items);
    setCurrentIdx(0);
    setSelectedOpt(null);
    setCombo(0);
    setBestCombo(0);
    setRoundXp(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setRoundComplete(false);
    setQuestionStartedAt(Date.now());
  };

  useEffect(() => {
    rebuildQueue();
  }, [decks.length, activeDeck?.id, scope]);

  const currentItem = queue[currentIdx];

  const deckLookup = useMemo(() => {
    const map = new Map<string, StudyDeck>();
    decks.forEach((d) => map.set(d.id, d));
    return map;
  }, [decks]);

  const handleChooseOption = (optIdx: number) => {
    if (selectedOpt !== null || !currentItem) return;
    setSelectedOpt(optIdx);

    const latencyMs = Math.max(400, Date.now() - questionStartedAt);
    const isCorrect = optIdx === currentItem.correctIndex;
    const ownerDeck = deckLookup.get(currentItem.deckId);

    if (ownerDeck) {
      recordQuestionOutcome(
        ownerDeck,
        currentItem.questionIndex,
        currentItem.question,
        currentItem.options[currentItem.correctIndex],
        currentItem.unitTag,
        currentItem.tier,
        isCorrect,
        latencyMs
      );
    }

    const nextAnswered = answeredCount + 1;
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    const nextCombo = isCorrect ? combo + 1 : 0;
    const gainedXp = isCorrect ? 25 + Math.min(25, nextCombo * 5) : 5;

    setAnsweredCount(nextAnswered);
    setCorrectCount(nextCorrect);
    setCombo(nextCombo);
    setBestCombo((prev) => Math.max(prev, nextCombo));
    setRoundXp((prev) => prev + gainedXp);

    if (isCorrect && nextCombo >= 2) {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 750);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= queue.length) {
      const accuracyPct =
        answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
      appendTelemetrySession({
        mode: "royale",
        courseCode: activeDeck?.courseCode || "INTERLEAVED",
        accuracyPct,
        avgLatencyMs: 5000,
        conceptsReviewed: answeredCount,
        xpEarned: roundXp,
      });
      onTelemetryChange();
      setRoundComplete(true);
      if (accuracyPct >= 80) {
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 950);
      }
      return;
    }

    setCurrentIdx((prev) => prev + 1);
    setSelectedOpt(null);
    setQuestionStartedAt(Date.now());
  };

  if (decks.length === 0 || queue.length === 0) {
    return (
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 text-center space-y-4">
        <Swords className="h-9 w-9 text-purple-400 mx-auto" />
        <h2 className="font-display text-xl font-bold text-white">
          Weakness Drill Queue Empty
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Ingest notes or pick a D&apos;Evelyn course first so Bozz GPT can interleave questions across your weakest units.
        </p>
        <button
          type="button"
          onClick={onGoToBuilder}
          className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
        >
          Ingest Notes or Pick Course
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={PANEL_FADE}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl mx-auto relative"
    >
      {/* Kinetic Particle Burst Overlay */}
      <AnimatePresence>
        {showBurst && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            {BURST_ANGLES.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <motion.div
                  key={deg}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: Math.cos(rad) * 140,
                    y: Math.sin(rad) * 140,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-purple-400"
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Royale HUD Header */}
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-purple-400">
            Cognitive Interleaving · Adaptive Weakness Weighting
          </div>
          <h2 className="font-display text-xl font-bold text-white tracking-tight mt-0.5">
            Interleaved Weakness Drills
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeDeck && (
            <div className="flex items-center bg-zinc-950 border border-white/10 rounded-xl p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope("active")}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                  scope === "active"
                    ? "bg-purple-500 text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {activeDeck.courseCode} Units
              </button>
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap ${
                  scope === "all"
                    ? "bg-purple-500 text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Cross-Course All
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onLaunchBossBattle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/50 text-purple-200 font-semibold text-xs rounded-xl cursor-pointer whitespace-nowrap"
          >
            <Swords className="h-3.5 w-3.5 text-purple-400" />
            <span>Boss Battle</span>
          </button>

          {activeDeck && (
            <button
              type="button"
              onClick={onOpenMatchingExam}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-emerald-300 font-semibold text-xs rounded-xl cursor-pointer whitespace-nowrap"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Matching Exam &amp; PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Combo & XP Bar */}
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-xl p-4 space-y-2.5 font-mono tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-zinc-300">
              Item <strong className="text-white">{Math.min(currentIdx + 1, queue.length)}</strong> / {queue.length}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
              <Flame className="h-3.5 w-3.5" />
              Combo {combo}x
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-bold">+{roundXp} XP</span>
            <span className="text-purple-400">
              {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}% Acc
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-emerald-400"
            animate={{
              width: `${((roundComplete ? queue.length : currentIdx + 1) / queue.length) * 100}%`,
            }}
            transition={SPRING_HUD}
          />
        </div>
      </div>

      {/* Round Summary or Active Interleaved Question */}
      {roundComplete ? (
        <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-emerald-400/35 rounded-2xl p-8 text-center space-y-5">
          <Sparkles className="h-9 w-9 text-emerald-400 mx-auto" />
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-400">Interleaved Round Complete</div>
            <h3 className="font-display text-2xl font-extrabold text-white tabular-nums">
              {correctCount} / {answeredCount} Correct (
              {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%)
            </h3>
            <p className="text-xs font-mono text-zinc-400 tabular-nums">
              Best Combo: {bestCombo}x · Earned +{roundXp} Royale XP · FSRS Weights Updated
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={rebuildQueue}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Re-Queue Weakest Concepts</span>
            </button>
            {activeDeck && (
              <button
                type="button"
                onClick={onOpenMatchingExam}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-100 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Open Full 25-Q Matching Exam
              </button>
            )}
          </div>
        </div>
      ) : (
        currentItem && (
          <motion.div
            key={currentItem.id}
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="visible"
            className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-7 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-purple-400">
                <span>{currentItem.courseCode}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-200">{currentItem.unitTag}</span>
              </div>
              <span className="text-amber-400 tabular-nums">
                Priority Weight: {currentItem.weaknessWeight}
              </span>
            </div>

            <h3 className="font-display text-base md:text-lg font-bold text-white leading-relaxed">
              {cleanMathFormula(currentItem.question)}
            </h3>

            <div className="space-y-2.5">
              {currentItem.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isRight = idx === currentItem.correctIndex;
                let cls =
                  "bg-zinc-950/80 border-white/10 hover:border-purple-400/70 text-zinc-200";
                if (selectedOpt !== null) {
                  if (isRight) {
                    cls = "bg-emerald-950/45 border-emerald-400/70 text-emerald-200";
                  } else if (isSelected) {
                    cls = "bg-red-950/45 border-red-500/70 text-red-200";
                  } else {
                    cls = "bg-zinc-950/40 border-white/5 text-zinc-500";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    variants={STAGGER_ITEM}
                    whileTap={selectedOpt === null ? BUTTON_TAP : undefined}
                    type="button"
                    disabled={selectedOpt !== null}
                    onClick={() => handleChooseOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border text-xs md:text-sm font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${cls}`}
                  >
                    <span>{cleanMathFormula(opt)}</span>
                    {selectedOpt !== null && isRight && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    {selectedOpt !== null && isSelected && !isRight && (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {selectedOpt !== null && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="text-xs text-zinc-300 leading-relaxed flex-1">
                  <span className="font-mono font-semibold text-purple-400 mr-2">
                    Diagnostic Note:
                  </span>
                  {cleanMathFormula(currentItem.explanation)}
                </div>

                <motion.button
                  type="button"
                  whileTap={BUTTON_TAP}
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{currentIdx + 1 >= queue.length ? "Finish Round" : "Next Concept"}</span>
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )
      )}
    </motion.div>
  );
}
