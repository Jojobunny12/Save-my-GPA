import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileDown,
  Flame,
  Heart,
  RotateCcw,
  Scissors,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Zap,
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
  SCREEN_SHAKE,
  SPRING_HUD,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
} from "../utils/motionPresets";

interface FinalBossBattleProps {
  decks: StudyDeck[];
  activeDeck: StudyDeck | null;
  onTelemetryChange: () => void;
  onOpenMatchingExam: () => void;
  onGoToBuilder: () => void;
}

type BossGameState = "TITLE_MENU" | "PLAYING" | "VICTORY" | "DEFEAT";

const PARTICLE_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const BLITZ_SECONDS = 25;

function playTacticalSfx(type: "hit" | "crit" | "damage" | "victory" | "defeat" | "power", muted: boolean) {
  if (muted || typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "crit") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (type === "hit") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === "damage") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.22);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "power") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.06);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (type === "victory") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1);
      osc.frequency.setValueAtTime(659, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.56);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.42);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.46);
    }

    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Ignore autoplay restriction errors
  }
}

export default function FinalBossBattle({
  decks,
  activeDeck,
  onTelemetryChange,
  onOpenMatchingExam,
  onGoToBuilder,
}: FinalBossBattleProps) {
  const [gameState, setGameState] = useState<BossGameState>("TITLE_MENU");
  const [difficulty, setDifficulty] = useState<"standard" | "ruthless">("standard");
  const [muted, setMuted] = useState(false);

  const [queue, setQueue] = useState<RoyaleDrillItem[]>([]);
  const [qIndex, setQIndex] = useState(0);

  const [maxBossHp, setMaxBossHp] = useState(480);
  const [bossHp, setBossHp] = useState(480);
  const [playerHp, setPlayerHp] = useState(100);
  const [timerSec, setTimerSec] = useState(BLITZ_SECONDS);

  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [eliminatedOpts, setEliminatedOpts] = useState<number[]>([]);
  const [hintRevealed, setHintRevealed] = useState(false);

  const [powerUps, setPowerUps] = useState({ fiftyFifty: 2, freeze: 2, hint: 2 });
  const [combo, setCombo] = useState(0);
  const [critsLanded, setCritsLanded] = useState(0);
  const [hitsLanded, setHitsLanded] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [combatBanner, setCombatBanner] = useState<string>(
    "Lock in. Fast recall deals critical damage."
  );

  const questionStartRef = useRef<number>(Date.now());
  const roundEndedLoggedRef = useRef(false);

  const deckLookup = useMemo(() => {
    const map = new Map<string, StudyDeck>();
    decks.forEach((d) => map.set(d.id, d));
    return map;
  }, [decks]);

  const bossName = activeDeck
    ? `${activeDeck.courseName} Apex Exam`
    : "Cumulative Finals Leviathan";

  const startBossBattle = () => {
    const roundSize = difficulty === "ruthless" ? 15 : 12;
    const items = getInterleavedRoyaleQueue(
      decks,
      activeDeck ? activeDeck.id : undefined,
      roundSize
    );
    const totalBossHp = Math.max(200, items.length * 40);

    setQueue(items);
    setQIndex(0);
    setMaxBossHp(totalBossHp);
    setBossHp(totalBossHp);
    setPlayerHp(100);
    setTimerSec(difficulty === "ruthless" ? 18 : BLITZ_SECONDS);
    setSelectedOpt(null);
    setEliminatedOpts([]);
    setHintRevealed(false);
    setPowerUps({ fiftyFifty: 2, freeze: 2, hint: 2 });
    setCombo(0);
    setCritsLanded(0);
    setHitsLanded(0);
    setAnsweredCount(0);
    setXpEarned(0);
    setCombatBanner("Encounter started. Strike before the clock expires.");
    roundEndedLoggedRef.current = false;
    questionStartRef.current = Date.now();
    setGameState("PLAYING");
  };

  // Per-question countdown loop
  useEffect(() => {
    if (gameState !== "PLAYING" || selectedOpt !== null) return;
    const id = setInterval(() => {
      setTimerSec((prev) => {
        if (prev <= 1) {
          handleTimeoutPenalty();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, selectedOpt, qIndex, bossHp, playerHp]);

  const finalizeSessionTelemetry = (victory: boolean, finalAnswered: number, finalHits: number, finalXp: number) => {
    if (roundEndedLoggedRef.current) return;
    roundEndedLoggedRef.current = true;
    const acc = finalAnswered > 0 ? Math.round((finalHits / finalAnswered) * 100) : 0;
    appendTelemetrySession({
      mode: "boss",
      courseCode: activeDeck?.courseCode || "BOSS_BATTLE",
      accuracyPct: acc,
      avgLatencyMs: 6500,
      conceptsReviewed: finalAnswered,
      xpEarned: finalXp + (victory ? 120 : 20),
    });
    onTelemetryChange();
  };

  const handleTimeoutPenalty = () => {
    if (selectedOpt !== null || gameState !== "PLAYING") return;
    const currentItem = queue[qIndex];
    setSelectedOpt(-1); // Timeout sentinel

    const isPhase2 = bossHp <= maxBossHp * 0.5;
    const dmgTaken = (difficulty === "ruthless" ? 28 : 20) + (isPhase2 ? 5 : 0);
    const nextPlayerHp = Math.max(0, playerHp - dmgTaken);
    const nextAnswered = answeredCount + 1;

    setPlayerHp(nextPlayerHp);
    setAnsweredCount(nextAnswered);
    setCombo(0);
    setShakeTrigger((c) => c + 1);
    setCombatBanner(`TIME EXPIRED — Boss strikes for -${dmgTaken} Shield.`);
    playTacticalSfx("damage", muted);

    if (currentItem) {
      const owner = deckLookup.get(currentItem.deckId);
      if (owner) {
        recordQuestionOutcome(
          owner,
          currentItem.questionIndex,
          currentItem.question,
          currentItem.options[currentItem.correctIndex],
          currentItem.unitTag,
          currentItem.tier,
          false,
          25_000
        );
      }
    }

    if (nextPlayerHp <= 0) {
      playTacticalSfx("defeat", muted);
      finalizeSessionTelemetry(false, nextAnswered, hitsLanded, xpEarned);
      setTimeout(() => setGameState("DEFEAT"), 900);
    }
  };

  const handleSelectOption = (optIdx: number) => {
    if (selectedOpt !== null || gameState !== "PLAYING") return;
    const currentItem = queue[qIndex];
    if (!currentItem) return;

    setSelectedOpt(optIdx);
    const latencyMs = Math.max(350, Date.now() - questionStartRef.current);
    const isCorrect = optIdx === currentItem.correctIndex;
    const owner = deckLookup.get(currentItem.deckId);

    if (owner) {
      recordQuestionOutcome(
        owner,
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
    setAnsweredCount(nextAnswered);

    if (isCorrect) {
      const isCrit = latencyMs <= 7500;
      const nextCombo = combo + 1;
      const damage = (isCrit ? 65 : 40) + Math.min(25, nextCombo * 5);
      const nextBossHp = Math.max(0, bossHp - damage);
      const gainedXp = (isCrit ? 45 : 28) + nextCombo * 6;
      const nextHits = hitsLanded + 1;
      const nextXp = xpEarned + gainedXp;

      setBossHp(nextBossHp);
      setCombo(nextCombo);
      setHitsLanded(nextHits);
      if (isCrit) setCritsLanded((c) => c + 1);
      setXpEarned(nextXp);
      setShakeTrigger((c) => c + 1);
      setBurstTrigger((c) => c + 1);
      setCombatBanner(
        isCrit
          ? `CRITICAL HIT (${damage} DMG) — ${(latencyMs / 1000).toFixed(1)}s retrieval.`
          : `DIRECT HIT (${damage} DMG) — Concept locked.`
      );
      playTacticalSfx(isCrit ? "crit" : "hit", muted);

      if (nextBossHp <= 0) {
        playTacticalSfx("victory", muted);
        finalizeSessionTelemetry(true, nextAnswered, nextHits, nextXp);
        setTimeout(() => setGameState("VICTORY"), 850);
      }
    } else {
      const isPhase2 = bossHp <= maxBossHp * 0.5;
      const dmgTaken = (difficulty === "ruthless" ? 28 : 20) + (isPhase2 ? 5 : 0);
      const nextPlayerHp = Math.max(0, playerHp - dmgTaken);

      setPlayerHp(nextPlayerHp);
      setCombo(0);
      setShakeTrigger((c) => c + 1);
      setCombatBanner(`BOSS COUNTER (-${dmgTaken} Shield) — Review missed concept below.`);
      playTacticalSfx("damage", muted);

      if (nextPlayerHp <= 0) {
        playTacticalSfx("defeat", muted);
        finalizeSessionTelemetry(false, nextAnswered, hitsLanded, xpEarned);
        setTimeout(() => setGameState("DEFEAT"), 900);
      }
    }
  };

  const handleAdvanceTurn = () => {
    if (bossHp <= 0) {
      setGameState("VICTORY");
      return;
    }
    if (playerHp <= 0) {
      setGameState("DEFEAT");
      return;
    }

    if (qIndex + 1 >= queue.length) {
      // Survived all waves -> victory if hits >= 60%, else boss survives with low HP
      const cleared = bossHp <= maxBossHp * 0.35 || hitsLanded >= Math.ceil(queue.length * 0.6);
      playTacticalSfx(cleared ? "victory" : "defeat", muted);
      finalizeSessionTelemetry(cleared, answeredCount, hitsLanded, xpEarned);
      setGameState(cleared ? "VICTORY" : "DEFEAT");
      return;
    }

    setQIndex((prev) => prev + 1);
    setSelectedOpt(null);
    setEliminatedOpts([]);
    setHintRevealed(false);
    setTimerSec(difficulty === "ruthless" ? 18 : BLITZ_SECONDS);
    questionStartRef.current = Date.now();
  };

  const useFiftyFifty = () => {
    if (powerUps.fiftyFifty <= 0 || selectedOpt !== null || eliminatedOpts.length > 0) return;
    const item = queue[qIndex];
    if (!item) return;
    const wrong = [0, 1, 2, 3].filter((i) => i !== item.correctIndex);
    const cut = [...wrong].sort(() => 0.5 - Math.random()).slice(0, 2);
    setEliminatedOpts(cut);
    setPowerUps((p) => ({ ...p, fiftyFifty: p.fiftyFifty - 1 }));
    playTacticalSfx("power", muted);
  };

  const useTimeFreeze = () => {
    if (powerUps.freeze <= 0 || selectedOpt !== null) return;
    setTimerSec((t) => t + 12);
    setPowerUps((p) => ({ ...p, freeze: p.freeze - 1 }));
    setCombatBanner("TIME FREEZE ACTIVE — +12s added to clock.");
    playTacticalSfx("power", muted);
  };

  const useHint = () => {
    if (powerUps.hint <= 0 || selectedOpt !== null || hintRevealed) return;
    setHintRevealed(true);
    setPowerUps((p) => ({ ...p, hint: p.hint - 1 }));
    playTacticalSfx("power", muted);
  };

  if (decks.length === 0) {
    return (
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 text-center space-y-4">
        <Skull className="h-10 w-10 text-purple-400 mx-auto" />
        <h2 className="font-display text-xl font-bold text-white">
          No Study Deck Loaded for Boss Battle
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Paste your class notes or pick a D&apos;Evelyn course first so Bozz GPT can spawn the Final Boss from your actual exam material.
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

  const currentItem = queue[qIndex];
  const isPhase2 = bossHp <= maxBossHp * 0.5;
  const bossHpPct = Math.round((bossHp / maxBossHp) * 100);

  return (
    <motion.div
      variants={PANEL_FADE}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-4xl mx-auto relative"
    >
      {/* Kinetic XP Particle Burst */}
      <AnimatePresence>
        {burstTrigger > 0 && gameState === "PLAYING" && (
          <div
            key={burstTrigger}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          >
            {PARTICLE_ANGLES.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <motion.div
                  key={deg}
                  initial={{ x: 0, y: 0, scale: 1.1, opacity: 1 }}
                  animate={{
                    x: Math.cos(rad) * 155,
                    y: Math.sin(rad) * 155,
                    scale: 0,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-purple-400"
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* STATE 1: TITLE MENU */}
      {gameState === "TITLE_MENU" && (
        <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-purple-500/35 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-purple-400 font-semibold">
                Exam Simulation Mode · Timed Interleaved Combat
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Final Boss Battle: {bossName}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Answer under pressure to break Boss HP. Sub-7.5s retrievals trigger Critical Hits. Wrong answers or expired clocks drain your Shield and flag weak concepts in FSRS.
              </p>
            </div>

            {activeDeck && (
              <button
                type="button"
                onClick={onOpenMatchingExam}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-emerald-400 font-semibold text-xs rounded-xl cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileDown className="h-4 w-4" />
                <span>Matching Exam &amp; PDF</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDifficulty("standard")}
              className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                difficulty === "standard"
                  ? "bg-emerald-500/10 border-emerald-400"
                  : "bg-zinc-950/75 border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-emerald-400">Standard Exam Blitz</span>
                <span className="text-zinc-400">12 Waves · 25s / item</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1.5">
                Full power-up loadout (`50/50`, `Time Freeze`, `Hint`) and -20 Shield penalty per miss.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDifficulty("ruthless")}
              className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                difficulty === "ruthless"
                  ? "bg-red-500/10 border-red-500"
                  : "bg-zinc-950/75 border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-red-400">Ruthless Curve Breaker</span>
                <span className="text-zinc-400">15 Waves · 18s / item</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1.5">
                High-pressure AP pacing with -28 Shield hits and Phase 2 synthesis surge.
              </p>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs font-mono text-zinc-300 hover:text-white cursor-pointer"
            >
              {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
              <span>{muted ? "SFX Muted" : "Synthesized SFX On"}</span>
            </button>

            <motion.button
              type="button"
              whileTap={BUTTON_TAP}
              onClick={startBossBattle}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Swords className="h-4 w-4" />
              <span>Start Boss Battle</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE COMBAT ARENA */}
      {gameState === "PLAYING" && currentItem && (
        <motion.div
          key={shakeTrigger}
          animate={shakeTrigger > 0 ? SCREEN_SHAKE : undefined}
          className="space-y-5"
        >
          {/* Top Combat HUD */}
          <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Boss HP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="font-bold text-red-400 flex items-center gap-1.5">
                    <Skull className="h-4 w-4" />
                    <span>
                      {bossName} {isPhase2 ? "· PHASE 2 SURGE" : "· PHASE 1"}
                    </span>
                  </span>
                  <span className="text-zinc-200 font-bold">
                    HP: {bossHp} / {maxBossHp} ({bossHpPct}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-900 border border-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      isPhase2
                        ? "bg-gradient-to-r from-red-500 to-purple-500"
                        : "bg-gradient-to-r from-purple-500 to-red-400"
                    }`}
                    animate={{ width: `${bossHpPct}%` }}
                    transition={SPRING_HUD}
                  />
                </div>
              </div>

              {/* Player Shield + Timer + Mute */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    <span>SHIELD: {playerHp} / 100 · {playerHp >= 60 ? "STABLE" : "CRITICAL"}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                      <Flame className="h-3.5 w-3.5" />
                      {combo}x
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        timerSec <= 6 ? "text-red-400" : "text-purple-300"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {timerSec}s
                    </span>
                    <button
                      type="button"
                      onClick={() => setMuted(!muted)}
                      aria-label="Toggle SFX"
                      className="text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="h-3 w-full bg-zinc-900 border border-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      playerHp >= 60
                        ? "bg-emerald-400"
                        : playerHp >= 30
                        ? "bg-amber-400"
                        : "bg-red-500"
                    }`}
                    animate={{ width: `${playerHp}%` }}
                    transition={SPRING_HUD}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span
                className={
                  combatBanner.includes("CRITICAL") || combatBanner.includes("DIRECT")
                    ? "text-emerald-400 font-semibold"
                    : combatBanner.includes("BOSS") || combatBanner.includes("TIME EXPIRED")
                    ? "text-red-400 font-semibold"
                    : "text-purple-300"
                }
              >
                {combatBanner}
              </span>
              <span className="text-zinc-400 tabular-nums">
                Wave {qIndex + 1} / {queue.length} · +{xpEarned} XP
              </span>
            </div>
          </div>

          {/* Active Combat Prompt */}
          <motion.div
            key={currentItem.id}
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="visible"
            className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-7 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono border-b border-white/10 pb-3">
              <span className="text-purple-400 font-semibold">
                {currentItem.courseCode} · {currentItem.unitTag}
              </span>
              <span className="text-zinc-400">
                Sub-7.5s answer = 65 DMG Critical Strike
              </span>
            </div>

            <h3 className="font-display text-base md:text-lg font-bold text-white leading-relaxed">
              {cleanMathFormula(currentItem.question)}
            </h3>

            {hintRevealed && (
              <div className="p-3.5 bg-purple-950/30 border border-purple-500/40 rounded-xl text-xs text-purple-200 leading-relaxed">
                <strong className="font-mono text-purple-300 mr-1.5">Tactical Clue:</strong>
                {cleanMathFormula(currentItem.explanation)}
              </div>
            )}

            <div className="space-y-2.5">
              {currentItem.options.map((opt, idx) => {
                const isEliminated = eliminatedOpts.includes(idx);
                const isSelected = selectedOpt === idx;
                const isRight = idx === currentItem.correctIndex;

                let cls =
                  "bg-zinc-950/85 border-white/10 hover:border-purple-400/70 text-zinc-100";
                if (isEliminated) {
                  cls = "bg-zinc-950/30 border-white/5 text-zinc-600 line-through cursor-not-allowed";
                } else if (selectedOpt !== null) {
                  if (isRight) {
                    cls = "bg-emerald-950/45 border-emerald-400 text-emerald-200";
                  } else if (isSelected) {
                    cls = "bg-red-950/45 border-red-500 text-red-200";
                  } else {
                    cls = "bg-zinc-950/40 border-white/5 text-zinc-500";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    variants={STAGGER_ITEM}
                    whileTap={selectedOpt === null && !isEliminated ? BUTTON_TAP : undefined}
                    type="button"
                    disabled={selectedOpt !== null || isEliminated}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-xl border text-xs md:text-sm font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${cls}`}
                  >
                    <span>{cleanMathFormula(opt)}</span>
                    {selectedOpt !== null && isRight && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    {selectedOpt !== null && isSelected && !isRight && (
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Power-ups or Next Wave Bar */}
            {selectedOpt === null ? (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={powerUps.fiftyFifty <= 0 || eliminatedOpts.length > 0}
                  onClick={useFiftyFifty}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-900 border border-white/10 rounded-xl text-xs font-mono text-purple-300 disabled:opacity-35 cursor-pointer"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  <span>50/50 Cut ({powerUps.fiftyFifty})</span>
                </button>
                <button
                  type="button"
                  disabled={powerUps.freeze <= 0}
                  onClick={useTimeFreeze}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-900 border border-white/10 rounded-xl text-xs font-mono text-emerald-300 disabled:opacity-35 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Time Freeze ({powerUps.freeze})</span>
                </button>
                <button
                  type="button"
                  disabled={powerUps.hint <= 0 || hintRevealed}
                  onClick={useHint}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-900 border border-white/10 rounded-xl text-xs font-mono text-zinc-200 disabled:opacity-35 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Tactical Hint ({powerUps.hint})</span>
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="text-xs text-zinc-300 leading-relaxed flex-1">
                  <span className="font-mono font-bold text-purple-400 mr-2">
                    Combat Breakdown:
                  </span>
                  {cleanMathFormula(currentItem.explanation)}
                </div>
                <motion.button
                  type="button"
                  whileTap={BUTTON_TAP}
                  onClick={handleAdvanceTurn}
                  className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap shrink-0"
                >
                  {bossHp <= 0
                    ? "Claim Victory"
                    : playerHp <= 0
                    ? "View Debrief"
                    : qIndex + 1 >= queue.length
                    ? "Finish Encounter"
                    : "Next Wave"}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* STATE 3: VICTORY OR DEFEAT DEBRIEF */}
      {(gameState === "VICTORY" || gameState === "DEFEAT") && (
        <div
          className={`bg-[#0B0B10]/90 backdrop-blur-2xl rounded-2xl p-8 text-center space-y-6 border ${
            gameState === "VICTORY" ? "border-emerald-400/50" : "border-red-500/50"
          }`}
        >
          {gameState === "VICTORY" ? (
            <Sparkles className="h-11 w-11 text-emerald-400 mx-auto" />
          ) : (
            <Heart className="h-11 w-11 text-red-400 mx-auto" />
          )}

          <div className="space-y-1.5">
            <div
              className={`text-xs font-mono font-bold ${
                gameState === "VICTORY" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {gameState === "VICTORY"
                ? "VICTORY — EXAM CURVE CLEARED"
                : "SHIELD BROKEN — FSRS WEAKNESSES FLAGGED"}
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white">
              {gameState === "VICTORY" ? `${bossName} Defeated` : `Defeated by ${bossName}`}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto font-mono tabular-nums">
            <div className="p-3.5 bg-zinc-950 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Accuracy</div>
              <div className="text-lg font-extrabold text-white">
                {answeredCount > 0 ? Math.round((hitsLanded / answeredCount) * 100) : 0}%
              </div>
            </div>
            <div className="p-3.5 bg-zinc-950 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Critical Strikes</div>
              <div className="text-lg font-extrabold text-emerald-400">{critsLanded}</div>
            </div>
            <div className="p-3.5 bg-zinc-950 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Shield Left</div>
              <div className="text-lg font-extrabold text-purple-400">{playerHp} HP</div>
            </div>
            <div className="p-3.5 bg-zinc-950 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">XP Earned</div>
              <div className="text-lg font-extrabold text-emerald-400">
                +{xpEarned + (gameState === "VICTORY" ? 120 : 20)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <motion.button
              type="button"
              whileTap={BUTTON_TAP}
              onClick={startBossBattle}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Play Again</span>
            </motion.button>
            {activeDeck && (
              <button
                type="button"
                onClick={onOpenMatchingExam}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-100 font-semibold text-xs rounded-xl cursor-pointer"
              >
                <FileDown className="h-4 w-4 text-purple-400" />
                <span>Open Matching Exam &amp; PDF</span>
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
