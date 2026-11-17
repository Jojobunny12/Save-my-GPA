import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Clock,
  Flame,
  GitBranch,
  Layers,
  MessageSquareQuote,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Swords,
  Trash2,
} from "lucide-react";
import {
  ExamReadinessMetrics,
  FSRSCardState,
  StudyDeck,
  WorkspaceRoute,
} from "../types";
import {
  computeRetrievability,
  daysBetween,
  daysUntilDate,
} from "../utils/fsrsEngine";
import {
  BUTTON_TAP,
  MAGNETIC_HOVER,
  SPRING_HUD,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
} from "../utils/motionPresets";
import { cleanMathFormula } from "../utils/mathFormat";

interface TelemetryCommandCenterProps {
  decks: StudyDeck[];
  activeDeck: StudyDeck | null;
  readiness: ExamReadinessMetrics;
  testDate: string;
  onChangeTestDate: (isoDate: string) => void;
  onSelectDeck: (deck: StudyDeck) => void;
  onDeleteDeck: (id: string) => void;
  onNavigate: (route: WorkspaceRoute) => void;
  onLaunchStudyHub: (deck: StudyDeck) => void;
}

type TimerPreset = "ultradian" | "pomodoro";

export default function TelemetryCommandCenter({
  decks,
  activeDeck,
  readiness,
  testDate,
  onChangeTestDate,
  onSelectDeck,
  onDeleteDeck,
  onNavigate,
  onLaunchStudyHub,
}: TelemetryCommandCenterProps) {
  // Focus Timer (Ultradian 50/10 or Pomodoro 25/5)
  const [preset, setPreset] = useState<TimerPreset>("ultradian");
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(50 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          const nextIsBreak = !isBreak;
          setIsBreak(nextIsBreak);
          return (
            (preset === "ultradian"
              ? nextIsBreak
                ? 10
                : 50
              : nextIsBreak
              ? 5
              : 25) * 60
          );
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, isBreak, preset]);

  const switchPreset = (next: TimerPreset) => {
    setIsRunning(false);
    setPreset(next);
    setIsBreak(false);
    setSecondsLeft((next === "ultradian" ? 50 : 25) * 60);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(
      (preset === "ultradian" ? (isBreak ? 10 : 50) : isBreak ? 5 : 25) * 60
    );
  };

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [secondsLeft]);

  const daysLeft = daysUntilDate(testDate);

  // SVG Telemetry Ring math
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const readinessPct = readiness.examReadinessPct;
  const dashOffset = circumference - (readinessPct / 100) * circumference;

  const ringColor =
    readiness.totalTrackedConcepts === 0 || readinessPct === 0
      ? "#64748B"
      : readinessPct >= 82
      ? "#34D399"
      : readinessPct >= 60
      ? "#22D3EE"
      : "#F59E0B";

  const statusText =
    readiness.totalTrackedConcepts === 0
      ? "Build a deck to start"
      : readinessPct === 0
      ? "Awaiting first review"
      : readinessPct >= 85
      ? "Exam Ready"
      : readinessPct >= 65
      ? "Building Stability"
      : "Decay Risk";

  const level = Math.floor(readiness.totalXp / 250) + 1;
  const levelProgressPct = Math.round(((readiness.totalXp % 250) / 250) * 100);

  return (
    <motion.div
      variants={STAGGER_CONTAINER}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Row: Animated Readiness Ring + Countdown / Focus Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Main Readiness Telemetry HUD */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-8 bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-7 flex flex-col justify-between gap-6"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-7">
            {/* Animated SVG Ring */}
            <div className="relative flex items-center justify-center shrink-0 mx-auto md:mx-0">
              <svg width="196" height="196" viewBox="0 0 196 196" className="-rotate-90">
                <circle
                  cx="98"
                  cy="98"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="12"
                />
                <circle
                  cx="98"
                  cy="98"
                  r={radius - 14}
                  fill="none"
                  stroke="rgba(34,211,238,0.14)"
                  strokeWidth="2"
                  strokeDasharray="4 6"
                />
                <motion.circle
                  cx="98"
                  cy="98"
                  r={radius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={SPRING_HUD}
                  style={{
                    filter:
                      readinessPct > 0
                        ? `drop-shadow(0 0 12px ${ringColor}66)`
                        : "none",
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Exam Readiness
                </span>
                <span className="font-mono text-4xl font-extrabold text-zinc-50 tabular-nums tracking-tight mt-0.5">
                  {readinessPct}%
                </span>
                <span
                  className="text-xs font-mono font-semibold mt-1"
                  style={{ color: ringColor }}
                >
                  {statusText}
                </span>
              </div>
            </div>

            {/* Diagnostic Breakdown */}
            <div className="flex-1 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-cyan-400">
                    {activeDeck
                      ? `${activeDeck.courseCode} · ${activeDeck.courseName}`
                      : "All D'Evelyn Courses"}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                    Cognitive Telemetry Command
                  </h1>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <div className="text-[11px] text-zinc-400">Royale Rank</div>
                  <div className="text-sm font-bold text-emerald-400">
                    Level {level} · {readiness.totalXp} XP
                  </div>
                  <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1 ml-auto">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgressPct}%` }}
                      transition={SPRING_HUD}
                    />
                  </div>
                </div>
              </div>

              {/* 4 True Cognitive Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3">
                  <div className="text-[11px] font-mono text-zinc-400">Live Retention</div>
                  <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums mt-0.5">
                    {readiness.currentRetentionPct}%
                  </div>
                </div>

                <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3">
                  <div className="text-[11px] font-mono text-zinc-400">Test-Day Curve</div>
                  <div className="font-mono text-xl font-bold text-cyan-400 tabular-nums mt-0.5">
                    {readiness.projectedTestDayRetentionPct}%
                  </div>
                </div>

                <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3">
                  <div className="text-[11px] font-mono text-zinc-400">Recall Latency</div>
                  <div className="font-mono text-xl font-bold text-zinc-100 tabular-nums mt-0.5">
                    {readiness.avgLatencySec > 0 ? `${readiness.avgLatencySec}s` : "--"}
                  </div>
                </div>

                <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3">
                  <div className="text-[11px] font-mono text-zinc-400">Drill Accuracy</div>
                  <div className="font-mono text-xl font-bold text-zinc-100 tabular-nums mt-0.5">
                    {readiness.interleavedAccuracyPct}%
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <motion.button
                  type="button"
                  whileHover={MAGNETIC_HOVER}
                  whileTap={BUTTON_TAP}
                  onClick={() => onNavigate(activeDeck ? "recall" : "builder")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap"
                >
                  <BrainCircuit className="h-4 w-4" />
                  <span>
                    {activeDeck
                      ? `Drill Due Queue (${readiness.dueNowCount})`
                      : "Build Your First Study Deck"}
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={MAGNETIC_HOVER}
                  whileTap={BUTTON_TAP}
                  onClick={() => onNavigate("royale")}
                  disabled={decks.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-cyan-300 font-semibold text-xs rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Swords className="h-4 w-4" />
                  <span>Weakness Royale</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={MAGNETIC_HOVER}
                  whileTap={BUTTON_TAP}
                  onClick={() => onNavigate("builder")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold text-xs rounded-xl cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 text-zinc-400" />
                  <span>New Deck / Notes</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* FSRS Summary Strip */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400 tabular-nums">
            <div className="flex flex-wrap items-center gap-5">
              <span>
                Tracked Concepts:{" "}
                <strong className="text-zinc-100">{readiness.totalTrackedConcepts}</strong>
              </span>
              <span>
                Mastered:{" "}
                <strong className="text-emerald-400">{readiness.masteredCount}</strong>
              </span>
              <span>
                High-Risk Decay:{" "}
                <strong className="text-amber-400">{readiness.criticalWeakCount}</strong>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-cyan-300">
              <Flame className="h-3.5 w-3.5" />
              <span>Streak: {readiness.currentStreak} sessions</span>
            </div>
          </div>
        </motion.section>

        {/* Right Side HUD: Exam Countdown Anchor + Focus Timer */}
        <motion.aside
          variants={STAGGER_ITEM}
          className="lg:col-span-4 flex flex-col gap-4 justify-between"
        >
          {/* Test Date Anchor Card */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                <CalendarClock className="h-4 w-4 text-cyan-400" />
                <span>Exam Countdown Anchor</span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                {daysLeft !== null ? `${daysLeft}d left` : "Unset"}
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              FSRS clamps spaced repetition intervals so critical concepts always resurface before your exam.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={testDate}
                onChange={(e) => onChangeTestDate(e.target.value)}
                aria-label="Target Exam Date"
                className="flex-1 px-3 py-2 bg-zinc-950 border border-white/10 focus:border-cyan-400 rounded-xl font-mono text-xs text-zinc-100 focus:outline-none"
              />
              {testDate && (
                <button
                  type="button"
                  onClick={() => onChangeTestDate("")}
                  className="px-2.5 py-2 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-white/10 rounded-xl cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Ultradian / Pomodoro Timer Card */}
          <div className="bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>{isBreak ? "Recovery Phase" : "Deep Focus Timer"}</span>
              </div>

              <div className="flex items-center gap-1 bg-zinc-950 border border-white/10 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => switchPreset("ultradian")}
                  className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    preset === "ultradian"
                      ? "bg-cyan-400 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  50/10
                </button>
                <button
                  type="button"
                  onClick={() => switchPreset("pomodoro")}
                  className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    preset === "pomodoro"
                      ? "bg-cyan-400 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  25/5
                </button>
              </div>
            </div>

            <div className="text-center py-1">
              <div className="font-mono text-4xl font-extrabold tracking-tight text-white tabular-nums">
                {formattedTimer}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-1">
                {preset === "ultradian"
                  ? "90m Ultradian Peak Protocol (50m Deep / 10m Rest)"
                  : "Pomodoro Sprint (25m Retrieval / 5m Rest)"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={BUTTON_TAP}
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  isRunning
                    ? "bg-amber-400 text-zinc-950"
                    : "bg-cyan-400 hover:bg-cyan-300 text-zinc-950"
                }`}
              >
                {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isRunning ? "Pause" : "Start Timer"}</span>
              </motion.button>
              <button
                type="button"
                onClick={resetTimer}
                aria-label="Reset focus timer"
                className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-white/10 text-zinc-300 rounded-xl cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Scientific Module Launcher Grid */}
      <motion.section variants={STAGGER_ITEM} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-zinc-100 tracking-tight">
            Scientific Study Modules
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            5 Integrated Cognitive Engines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.button
            type="button"
            whileHover={MAGNETIC_HOVER}
            whileTap={BUTTON_TAP}
            onClick={() => onNavigate("recall")}
            className="text-left bg-[#111114]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-400/50 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <Layers className="h-5 w-5" />
                <span className="text-[11px] font-mono tabular-nums">
                  {readiness.dueNowCount} due
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-white">
                3D Active Recall &amp; Feynman
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Spring-loaded card flips with FSRS interval scheduling and AI plain-English grading.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 pt-2 border-t border-white/10">
              <span>Launch Module</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </motion.button>

          <motion.button
            type="button"
            whileHover={MAGNETIC_HOVER}
            whileTap={BUTTON_TAP}
            onClick={() => onNavigate("royale")}
            className="text-left bg-[#111114]/80 backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-cyan-400">
                <Swords className="h-5 w-5" />
                <span className="text-[11px] font-mono tabular-nums">
                  {readiness.criticalWeakCount} weak
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-white">
                Weakness Royale &amp; Exam
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cross-unit interleaved drills weighted to weak concepts, plus Matching Mock Exam &amp; PDF export.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 pt-2 border-t border-white/10">
              <span>Enter Arena</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </motion.button>

          <motion.button
            type="button"
            whileHover={MAGNETIC_HOVER}
            whileTap={BUTTON_TAP}
            onClick={() => onNavigate("socratic")}
            className="text-left bg-[#111114]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-400/50 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <MessageSquareQuote className="h-5 w-5" />
                <span className="text-[11px] font-mono">AP / Honors Rubric</span>
              </div>
              <h3 className="font-display text-sm font-bold text-white">
                Socratic Seminar Arena
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Debate an exacting D&apos;Evelyn moderator that demands textual evidence and scores theses.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 pt-2 border-t border-white/10">
              <span>Defend Thesis</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </motion.button>

          <motion.button
            type="button"
            whileHover={MAGNETIC_HOVER}
            whileTap={BUTTON_TAP}
            onClick={() => onNavigate("map")}
            className="text-left bg-[#111114]/80 backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-cyan-400">
                <GitBranch className="h-5 w-5" />
                <span className="text-[11px] font-mono">Dual-Coding SVG</span>
              </div>
              <h3 className="font-display text-sm font-bold text-white">
                Concept Graph &amp; Timeline
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Interactive spatial node maps and causal timelines synced with concept stability.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 pt-2 border-t border-white/10">
              <span>Inspect Map</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </motion.button>
        </div>
      </motion.section>

      {/* Bottom Split: Weakest FSRS Concepts + Saved Study Decks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Weakest FSRS Concepts */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-6 bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-white">
              <Activity className="h-4 w-4 text-amber-400" />
              <h2 className="font-display font-bold text-sm">Priority Decay Queue</h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Lowest Retrievability</span>
          </div>

          {readiness.weakestConcepts.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                No FSRS concept telemetry tracked yet. Generate a D&apos;Evelyn deck or paste class notes to populate your spaced queue.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {readiness.weakestConcepts.map((c: FSRSCardState) => {
                const rPct = Math.round(
                  (c.lastReviewAt
                    ? computeRetrievability(daysBetween(c.lastReviewAt), c.stability)
                    : 0.35) * 100
                );
                return (
                  <div
                    key={c.conceptId}
                    className="p-3.5 bg-zinc-950/75 border border-white/10 rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400">
                        <span className="truncate">{c.unitTag}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400">{c.courseCode}</span>
                      </div>
                      <p className="text-xs font-medium text-zinc-100 line-clamp-1">
                        {cleanMathFormula(c.question)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div
                        className={`text-xs font-bold ${
                          rPct >= 80
                            ? "text-emerald-400"
                            : rPct >= 55
                            ? "text-cyan-400"
                            : "text-amber-400"
                        }`}
                      >
                        {rPct}%
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {c.errorCount > 0 ? `${c.errorCount} miss` : `${c.stability}d stab`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Saved Study Decks */}
        <motion.section
          variants={STAGGER_ITEM}
          className="lg:col-span-6 bg-[#111114]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display font-bold text-sm text-white">
              Saved Study Decks ({decks.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("builder")}
              className="text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              + New Deck
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Build a deck from D&apos;Evelyn&apos;s official 28-course catalog, attach a teacher review PDF, or paste raw class notes.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("builder")}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                Open Deck Studio
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {decks.map((deck) => {
                const isActive = activeDeck?.id === deck.id;
                return (
                  <div
                    key={deck.id}
                    onClick={() => onSelectDeck(deck)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 group ${
                      isActive
                        ? "bg-cyan-400/10 border-cyan-400/50"
                        : "bg-zinc-950/75 border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                        <span className={isActive ? "text-cyan-300 font-bold" : "text-emerald-400 font-semibold"}>
                          {deck.courseCode}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400">
                          {new Date(deck.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-zinc-100 line-clamp-1">
                        {cleanMathFormula(deck.summary?.title || deck.courseName)}
                      </h3>
                      <div className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {deck.flashcards?.length || 0} cards · {deck.quiz?.length || 0} questions
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchStudyHub(deck);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-mono font-semibold bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Study Hub &amp; PDF
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDeck(deck.id);
                        }}
                        aria-label={`Delete ${deck.courseName}`}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
