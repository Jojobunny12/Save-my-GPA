import {
  AssessmentTier,
  ExamReadinessMetrics,
  FSRSCardState,
  FSRSRating,
  SocraticSession,
  StudyDeck,
  TelemetrySession,
} from "../types";

const STORAGE_KEYS = {
  FSRS_STATES: "gparoyale_fsrs_states_v1",
  TELEMETRY_SESSIONS: "gparoyale_telemetry_sessions_v1",
  SOCRATIC_SESSIONS: "gparoyale_socratic_sessions_v1",
  TEST_DATES: "gparoyale_test_dates_v1",
  PREFERENCES: "gparoyale_preferences_v1",
} as const;

export interface UserPreferences {
  redBlueMemoryTint: boolean;
  totalXp: number;
  currentStreak: number;
}

const DEFAULT_PREFS: UserPreferences = {
  redBlueMemoryTint: true,
  totalXp: 0,
  currentStreak: 0,
};

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("localStorage write failed:", err);
  }
}

export function loadPreferences(): UserPreferences {
  return { ...DEFAULT_PREFS, ...safeReadJson<Partial<UserPreferences>>(STORAGE_KEYS.PREFERENCES, {}) };
}

export function savePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const next = { ...loadPreferences(), ...partial };
  safeWriteJson(STORAGE_KEYS.PREFERENCES, next);
  return next;
}

export function loadTestDates(): Record<string, string> {
  return safeReadJson<Record<string, string>>(STORAGE_KEYS.TEST_DATES, {});
}

export function saveTestDate(key: string, isoDate: string): Record<string, string> {
  const map = loadTestDates();
  if (isoDate) {
    map[key] = isoDate;
  } else {
    delete map[key];
  }
  safeWriteJson(STORAGE_KEYS.TEST_DATES, map);
  return map;
}

export function loadFSRSStates(): Record<string, FSRSCardState> {
  return safeReadJson<Record<string, FSRSCardState>>(STORAGE_KEYS.FSRS_STATES, {});
}

export function saveFSRSStates(states: Record<string, FSRSCardState>): void {
  safeWriteJson(STORAGE_KEYS.FSRS_STATES, states);
}

export function loadTelemetrySessions(): TelemetrySession[] {
  return safeReadJson<TelemetrySession[]>(STORAGE_KEYS.TELEMETRY_SESSIONS, []);
}

export function appendTelemetrySession(session: Omit<TelemetrySession, "id" | "timestamp">): TelemetrySession[] {
  const prev = loadTelemetrySessions();
  const nextItem: TelemetrySession = {
    ...session,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [nextItem, ...prev].slice(0, 80);
  safeWriteJson(STORAGE_KEYS.TELEMETRY_SESSIONS, updated);

  const prefs = loadPreferences();
  savePreferences({
    totalXp: prefs.totalXp + Math.max(0, session.xpEarned),
    currentStreak: session.accuracyPct >= 60 ? prefs.currentStreak + 1 : 0,
  });

  return updated;
}

export function loadSocraticSessions(): SocraticSession[] {
  return safeReadJson<SocraticSession[]>(STORAGE_KEYS.SOCRATIC_SESSIONS, []);
}

export function saveSocraticSession(session: SocraticSession): SocraticSession[] {
  const prev = loadSocraticSessions();
  const filtered = prev.filter((s) => s.id !== session.id);
  const updated = [session, ...filtered].slice(0, 25);
  safeWriteJson(STORAGE_KEYS.SOCRATIC_SESSIONS, updated);
  return updated;
}

/**
 * FSRS power-law forgetting curve:
 * R(t, S) = (1 + t / (9 * S)) ^ -1
 * where t is elapsed days since last review and S is memory stability in days.
 */
export function computeRetrievability(elapsedDays: number, stabilityDays: number): number {
  if (elapsedDays <= 0) return 1;
  const safeS = Math.max(0.25, stabilityDays);
  return Math.pow(1 + elapsedDays / (9 * safeS), -1);
}

export function daysBetween(fromIso: string | null, toDate: Date = new Date()): number {
  if (!fromIso) return 0;
  const fromMs = new Date(fromIso).getTime();
  if (Number.isNaN(fromMs)) return 0;
  return Math.max(0, (toDate.getTime() - fromMs) / (1000 * 60 * 60 * 24));
}

export function daysUntilDate(targetIsoDate?: string): number | null {
  if (!targetIsoDate) return null;
  const target = new Date(`${targetIsoDate}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function inferTierFromText(text: string, idx: number): AssessmentTier {
  const lower = text.toLowerCase();
  if (lower.includes("why") || lower.includes("how") || lower.includes("explain") || lower.includes("mechanism")) {
    return "why_how";
  }
  if (lower.includes("excerpt") || lower.includes("stimulus") || lower.includes("given") || lower.includes("compare")) {
    return "ap_stimulus";
  }
  return idx % 3 === 1 ? "why_how" : idx % 3 === 2 ? "ap_stimulus" : "definition";
}

export function syncDeckToFSRS(deck: StudyDeck): Record<string, FSRSCardState> {
  const states = loadFSRSStates();
  let changed = false;
  const nowIso = new Date().toISOString();
  const fallbackUnit = deck.units && deck.units.length > 0 ? deck.units[0] : deck.courseName;

  (deck.flashcards || []).forEach((fc, idx) => {
    const conceptId = `${deck.id}::fc::${idx}`;
    if (!states[conceptId]) {
      states[conceptId] = {
        conceptId,
        deckId: deck.id,
        courseCode: deck.courseCode,
        courseName: deck.courseName,
        question: fc.question,
        answer: fc.answer,
        unitTag: fc.unitTag || (deck.units?.[idx % (deck.units.length || 1)] || fallbackUnit),
        tier: fc.tier || inferTierFromText(fc.question, idx),
        stability: 0.9,
        difficulty: 5.0,
        reps: 0,
        lapses: 0,
        errorCount: 0,
        lastLatencyMs: 0,
        avgLatencyMs: 0,
        lastReviewAt: null,
        dueAt: nowIso,
      };
      changed = true;
    }
  });

  if (changed) {
    saveFSRSStates(states);
  }
  return states;
}

/**
 * Computes next FSRS stability, difficulty, and next review timestamp,
 * clamped to the student's target Test Date so critical cards always resurface before the final.
 */
export function previewNextIntervalDays(
  card: FSRSCardState,
  rating: FSRSRating,
  testDate?: string
): { intervalDays: number; nextStability: number; nextDifficulty: number } {
  const elapsed = daysBetween(card.lastReviewAt);
  const retrievability = card.lastReviewAt ? computeRetrievability(elapsed, card.stability) : 0.85;

  const difficultyDelta = (3 - rating) * 0.65;
  const nextDifficulty = Math.min(10, Math.max(1, Number((card.difficulty + difficultyDelta).toFixed(2))));

  let nextStability = card.stability;
  if (rating === 1) {
    // Lapse: reset stability sharply to force near-term re-retrieval
    nextStability = Math.max(0.35, Number((card.stability * 0.35).toFixed(2)));
  } else {
    const gradeMultiplier = rating === 2 ? 1.2 : rating === 3 ? 2.15 : 3.2;
    const difficultyFactor = (11 - nextDifficulty) / 6;
    const spacingBonus = 1 + (1 - retrievability) * 1.1;
    const base = card.reps === 0 ? 1 : card.stability;
    nextStability = Math.min(90, Math.max(0.5, Number((base * gradeMultiplier * difficultyFactor * spacingBonus).toFixed(2))));
  }

  // Raw target interval solves R(t, S) = 0.9 -> t = S * 9 * (1/0.9 - 1) = S
  let intervalDays = rating === 1 ? 0.08 : Math.max(0.5, Number((nextStability * (rating === 2 ? 0.75 : rating === 3 ? 1.0 : 1.35)).toFixed(2)));

  // Anchor to Test Date if scheduled soon
  const daysLeft = daysUntilDate(testDate);
  if (daysLeft !== null && daysLeft > 0) {
    const maxSafeInterval = Math.max(0.25, daysLeft * 0.6);
    if (intervalDays > maxSafeInterval) {
      intervalDays = Number(maxSafeInterval.toFixed(2));
    }
  } else if (daysLeft === 0) {
    intervalDays = Math.min(intervalDays, 0.15);
  }

  return { intervalDays, nextStability, nextDifficulty };
}

export function scheduleFlashcardReview(
  card: FSRSCardState,
  rating: FSRSRating,
  latencyMs: number,
  testDate?: string
): FSRSCardState {
  const now = new Date();
  const { intervalDays, nextStability, nextDifficulty } = previewNextIntervalDays(card, rating, testDate);
  const dueMs = now.getTime() + intervalDays * 24 * 60 * 60 * 1000;
  const safeLatency = Math.max(250, Math.min(120_000, Math.round(latencyMs)));
  const prevReps = card.reps;
  const avgLatencyMs =
    prevReps === 0
      ? safeLatency
      : Math.round((card.avgLatencyMs * prevReps + safeLatency) / (prevReps + 1));

  const updated: FSRSCardState = {
    ...card,
    stability: nextStability,
    difficulty: nextDifficulty,
    reps: prevReps + 1,
    lapses: rating === 1 ? card.lapses + 1 : card.lapses,
    errorCount: rating <= 2 ? card.errorCount + 1 : card.errorCount,
    lastLatencyMs: safeLatency,
    avgLatencyMs,
    lastRating: rating,
    lastReviewAt: now.toISOString(),
    dueAt: new Date(dueMs).toISOString(),
  };

  const allStates = loadFSRSStates();
  allStates[updated.conceptId] = updated;
  saveFSRSStates(allStates);

  return updated;
}

export function recordQuestionOutcome(
  deck: StudyDeck,
  questionIndex: number,
  questionText: string,
  answerText: string,
  unitTag: string | undefined,
  tier: AssessmentTier | undefined,
  isCorrect: boolean,
  latencyMs: number
): FSRSCardState {
  const states = loadFSRSStates();
  const conceptId = `${deck.id}::q::${questionIndex}`;
  const existing: FSRSCardState = states[conceptId] || {
    conceptId,
    deckId: deck.id,
    courseCode: deck.courseCode,
    courseName: deck.courseName,
    question: questionText,
    answer: answerText,
    unitTag: unitTag || (deck.units?.[questionIndex % (deck.units.length || 1)] || deck.courseName),
    tier: tier || inferTierFromText(questionText, questionIndex),
    stability: 1.0,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    errorCount: 0,
    lastLatencyMs: 0,
    avgLatencyMs: 0,
    lastReviewAt: null,
    dueAt: new Date().toISOString(),
  };

  const rating: FSRSRating = !isCorrect ? 1 : latencyMs < 5500 ? 4 : latencyMs < 12000 ? 3 : 2;
  return scheduleFlashcardReview(existing, rating, latencyMs, deck.testDate);
}

export interface RoyaleDrillItem {
  id: string;
  deckId: string;
  courseCode: string;
  courseName: string;
  unitTag: string;
  tier: AssessmentTier;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  weaknessWeight: number;
  questionIndex: number;
}

/**
 * Builds an interleaved cross-unit Weakness Royale drill queue,
 * prioritizing missed concepts, low FSRS stability, and slow retrieval latency,
 * while strictly shuffling units so consecutive items never lock to the same chapter.
 */
export function getInterleavedRoyaleQueue(
  decks: StudyDeck[],
  activeDeckId?: string,
  maxItems = 15
): RoyaleDrillItem[] {
  const scopedDecks = activeDeckId
    ? decks.filter((d) => d.id === activeDeckId)
    : decks;
  const sourceDecks = scopedDecks.length > 0 ? scopedDecks : decks;
  const states = loadFSRSStates();
  const candidates: RoyaleDrillItem[] = [];

  for (const deck of sourceDecks) {
    (deck.quiz || []).forEach((q, idx) => {
      const qState = states[`${deck.id}::q::${idx}`];
      const elapsed = qState?.lastReviewAt ? daysBetween(qState.lastReviewAt) : 0;
      const retrievability = qState?.lastReviewAt
        ? computeRetrievability(elapsed, qState.stability)
        : 0.65;
      const errorBoost = (qState?.errorCount || 0) * 3.5 + (qState?.lapses || 0) * 2.5;
      const latencyPenalty = qState?.avgLatencyMs ? Math.min(2.5, qState.avgLatencyMs / 6000) : 0.4;
      const unreviewedBoost = qState ? 0 : 1.2;
      const weaknessWeight = Number(((1 - retrievability) * 5 + errorBoost + latencyPenalty + unreviewedBoost).toFixed(2));

      const unitTag =
        q.unitTag ||
        (deck.units && deck.units.length > 0 ? deck.units[idx % deck.units.length] : deck.courseName);

      candidates.push({
        id: `${deck.id}::q::${idx}`,
        deckId: deck.id,
        courseCode: deck.courseCode,
        courseName: deck.courseName,
        unitTag,
        tier: q.tier || inferTierFromText(q.question, idx),
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        weaknessWeight,
        questionIndex: idx,
      });
    });
  }

  // Sort hardest/weakest first
  const sorted = [...candidates].sort((a, b) => b.weaknessWeight - a.weaknessWeight);

  // Interleave across units so two consecutive items do not share the same unitTag when alternatives exist
  const interleaved: RoyaleDrillItem[] = [];
  const pool = [...sorted];
  let lastUnit = "";

  while (pool.length > 0 && interleaved.length < maxItems) {
    let pickIdx = pool.findIndex((item) => item.unitTag !== lastUnit);
    if (pickIdx === -1) pickIdx = 0;
    const [chosen] = pool.splice(pickIdx, 1);
    interleaved.push(chosen);
    lastUnit = chosen.unitTag;
  }

  return interleaved;
}

export function computeExamReadiness(
  decks: StudyDeck[],
  activeDeckId?: string,
  overrideTestDate?: string
): ExamReadinessMetrics {
  const prefs = loadPreferences();
  const allStates = Object.values(loadFSRSStates());
  const sessions = loadTelemetrySessions();

  const relevantDeckIds = new Set(
    (activeDeckId ? decks.filter((d) => d.id === activeDeckId) : decks).map((d) => d.id)
  );
  const relevantStates = allStates.filter((s) =>
    relevantDeckIds.size === 0 ? true : relevantDeckIds.has(s.deckId)
  );

  if (relevantStates.length === 0) {
    return {
      examReadinessPct: 0,
      currentRetentionPct: 0,
      projectedTestDayRetentionPct: 0,
      avgLatencySec: 0,
      interleavedAccuracyPct: 0,
      totalTrackedConcepts: 0,
      dueNowCount: 0,
      masteredCount: 0,
      criticalWeakCount: 0,
      totalXp: prefs.totalXp,
      currentStreak: prefs.currentStreak,
      weakestConcepts: [],
    };
  }

  const now = new Date();
  const activeDeck = decks.find((d) => d.id === activeDeckId);
  const targetTestDate = overrideTestDate || activeDeck?.testDate;
  const daysToTest = daysUntilDate(targetTestDate);

  let retentionSum = 0;
  let projectedSum = 0;
  let dueNowCount = 0;
  let masteredCount = 0;
  let criticalWeakCount = 0;
  let latencySum = 0;
  let latencyCount = 0;
  let reviewedCount = 0;

  for (const s of relevantStates) {
    const elapsed = daysBetween(s.lastReviewAt, now);
    const currentR = s.lastReviewAt ? computeRetrievability(elapsed, s.stability) : 0.35;
    const projectedElapsed = daysToTest !== null ? elapsed + daysToTest : elapsed + 1;
    const projectedR = s.lastReviewAt ? computeRetrievability(projectedElapsed, s.stability) : 0.25;

    retentionSum += currentR;
    projectedSum += projectedR;

    if (new Date(s.dueAt).getTime() <= now.getTime()) {
      dueNowCount++;
    }
    if (s.reps >= 1 && currentR >= 0.85 && s.stability >= 3.0) {
      masteredCount++;
    }
    if (s.lapses > 0 || s.errorCount > 0 || (s.reps > 0 && currentR < 0.65)) {
      criticalWeakCount++;
    }
    if (s.avgLatencyMs > 0) {
      latencySum += s.avgLatencyMs;
      latencyCount++;
    }
    if (s.reps > 0) {
      reviewedCount++;
    }
  }

  const totalTrackedConcepts = relevantStates.length;
  const currentRetentionPct = Math.round((retentionSum / totalTrackedConcepts) * 100);
  const projectedTestDayRetentionPct = Math.round((projectedSum / totalTrackedConcepts) * 100);
  const avgLatencySec =
    latencyCount > 0 ? Number((latencySum / latencyCount / 1000).toFixed(1)) : 0;

  const recentSessions = sessions.slice(0, 12);
  const interleavedAccuracyPct =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((acc, item) => acc + item.accuracyPct, 0) / recentSessions.length
        )
      : reviewedCount > 0
      ? Math.round(
          (relevantStates.filter((s) => s.reps > 0 && s.lapses === 0).length /
            Math.max(1, reviewedCount)) *
            100
        )
      : 0;

  const coverageRatio = reviewedCount / totalTrackedConcepts;
  const latencyScore =
    avgLatencySec === 0
      ? 0
      : avgLatencySec <= 4
      ? 100
      : Math.max(40, Math.round(100 - (avgLatencySec - 4) * 6));

  const rawReadiness =
    reviewedCount === 0
      ? 0
      : currentRetentionPct * 0.4 +
        projectedTestDayRetentionPct * 0.25 +
        interleavedAccuracyPct * 0.2 +
        coverageRatio * 100 * 0.1 +
        latencyScore * 0.05;

  const weakestConcepts = [...relevantStates]
    .sort((a, b) => {
      const aWeak = a.errorCount * 3 + a.lapses * 2 + (1 - computeRetrievability(daysBetween(a.lastReviewAt), a.stability)) * 4;
      const bWeak = b.errorCount * 3 + b.lapses * 2 + (1 - computeRetrievability(daysBetween(b.lastReviewAt), b.stability)) * 4;
      return bWeak - aWeak;
    })
    .slice(0, 6);

  return {
    examReadinessPct: Math.min(100, Math.max(0, Math.round(rawReadiness))),
    currentRetentionPct,
    projectedTestDayRetentionPct,
    avgLatencySec,
    interleavedAccuracyPct,
    totalTrackedConcepts,
    dueNowCount,
    masteredCount,
    criticalWeakCount,
    totalXp: prefs.totalXp,
    currentStreak: prefs.currentStreak,
    weakestConcepts,
  };
}

export function formatIntervalLabel(days: number): string {
  if (days < 0.2) return `${Math.max(15, Math.round(days * 24 * 60))}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(days < 3 ? 1 : 0)}d`;
}
