import {
  Firestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  ARENA_SIZE,
  LOBBY_COUNTDOWN_SEC,
  TARGET_LOBBY_SIZE,
  computeMatchMmrDelta,
  generateArenaLayout,
  generateBackfillBots,
  generateMiniBozzes,
  getPoiSpawnPosition,
  getSafeSpawnPosition,
  getTierFromMmr,
  normalizeTierName,
} from "./arenaEngine";
import { OperationType, handleFirestoreError } from "./firebaseConfig";
import {
  BattleProfileDocument,
  BotState,
  CompetitiveTier,
  FirewallWall,
  MatchResultSummary,
  MiniBozzState,
  PoiId,
  StudyBattleQuestion,
  StudyPlayerDocument,
  StudyRoomDocument,
  StudyWorldStateDocument,
  SyncedCrateState,
} from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOCAL_PROFILE_STORAGE_KEY = "bozz_battle_royale_profile_v1";

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
}

export function getOrCreateClientToken(storageKey: string, prefix: string): string {
  if (typeof window === "undefined") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9_-]{6,64}$/.test(existing)) {
      return existing;
    }
    const generated = sanitizeId(
      `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    );
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return sanitizeId(`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  }
}

export function getOrCreateSessionToken(storageKey: string, prefix: string): string {
  if (typeof window === "undefined") {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9_-]{6,64}$/.test(existing)) {
      return existing;
    }
    const generated = sanitizeId(
      `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    );
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return sanitizeId(`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  }
}

export function parseStudyQuestionsJson(rawInput: string): {
  questions: StudyBattleQuestion[];
  error: string | null;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { questions: [], error: "Paste a JSON array of questions to host Bozz Battles." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      questions: [],
      error: "Invalid JSON syntax. Expecting an array of { question, options, correctIndex } objects.",
    };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return {
      questions: [],
      error: "JSON must be a non-empty array of question objects.",
    };
  }

  if (parsed.length > 50) {
    return {
      questions: [],
      error: "Maximum 50 questions per Bozz Battles room.",
    };
  }

  const normalized: StudyBattleQuestion[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>;
    if (!item || typeof item !== "object") {
      return { questions: [], error: `Question #${i + 1} must be an object.` };
    }
    const questionText = typeof item.question === "string" ? item.question.trim() : "";
    if (!questionText) {
      return { questions: [], error: `Question #${i + 1} is missing a non-empty "question" string.` };
    }
    if (!Array.isArray(item.options) || item.options.length !== 4) {
      return {
        questions: [],
        error: `Question #${i + 1} must include exactly 4 string choices in "options".`,
      };
    }
    const cleanOptions = item.options.map((opt) =>
      typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()
    );
    if (cleanOptions.some((o) => !o)) {
      return {
        questions: [],
        error: `Question #${i + 1} has an empty option string.`,
      };
    }
    const correctIndex = Number(item.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return {
        questions: [],
        error: `Question #${i + 1} must have an integer "correctIndex" between 0 and 3.`,
      };
    }

    const qObj: StudyBattleQuestion = {
      question: questionText.slice(0, 400),
      options: cleanOptions.map((o) => o.slice(0, 180)),
      correctIndex,
    };
    if (typeof item.explanation === "string" && item.explanation.trim()) {
      qObj.explanation = item.explanation.trim().slice(0, 400);
    }
    if (typeof item.unitTag === "string" && item.unitTag.trim()) {
      qObj.unitTag = item.unitTag.trim().slice(0, 80);
    }
    if (typeof item.memoryHook === "string" && item.memoryHook.trim()) {
      qObj.memoryHook = item.memoryHook.trim().slice(0, 200);
    }
    if (typeof item.learningMethod === "string" && item.learningMethod.trim()) {
      qObj.learningMethod = item.learningMethod.trim().slice(0, 40);
    }
    normalized.push(qObj);
  }

  return { questions: normalized, error: null };
}

export async function calibrateStudyQuestionsWithAI(
  questions: StudyBattleQuestion[],
  title: string
): Promise<StudyBattleQuestion[]> {
  const response = await fetch("/api/calibrate-battle-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, title }),
  });

  if (!response.ok) {
    let errText = `AI question enrichment failed (HTTP ${response.status}).`;
    try {
      const errBody = await response.json();
      if (errBody?.error) errText = errBody.error;
    } catch {
      // Keep default status text
    }
    throw new Error(errText);
  }

  const data = await response.json();
  if (!Array.isArray(data?.questions) || data.questions.length === 0) {
    throw new Error("AI enrichment returned an invalid question list.");
  }
  return data.questions as StudyBattleQuestion[];
}

function defaultProfile(profileId: string, displayName: string): BattleProfileDocument {
  return {
    profileId,
    displayName: displayName.trim().slice(0, 24) || "Scholar",
    mmr: 1000,
    peakMmr: 1000,
    tier: "Silver",
    matchesPlayed: 0,
    wins: 0,
    totalKills: 0,
    questionsCorrect: 0,
    questionsAttempted: 0,
  };
}

function readLocalProfile(profileId: string): BattleProfileDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BattleProfileDocument;
    if (parsed && parsed.profileId === profileId && typeof parsed.mmr === "number") {
      return {
        ...parsed,
        tier: normalizeTierName(parsed.tier),
      };
    }
  } catch {
    // Ignore localStorage read errors
  }
  return null;
}

function writeLocalProfile(profile: BattleProfileDocument): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore localStorage quota errors
  }
}

export async function loadOrCreateBattleProfile(
  db: Firestore,
  profileId: string,
  displayName: string
): Promise<BattleProfileDocument> {
  const path = `battleProfiles/${profileId}`;
  const cleanName = displayName.trim().slice(0, 24) || "Scholar";
  let snap;
  try {
    snap = await getDoc(doc(db, "battleProfiles", profileId));
  } catch (err) {
    const local = readLocalProfile(profileId);
    if (local) return local;
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (snap.exists()) {
    const raw = snap.data() as BattleProfileDocument;
    const data: BattleProfileDocument = {
      ...raw,
      tier: normalizeTierName(raw.tier),
    };
    writeLocalProfile(data);
    return data;
  }

  const initial = defaultProfile(profileId, cleanName);
  const payload: BattleProfileDocument = {
    ...initial,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "battleProfiles", profileId), payload);
  } catch (err) {
    writeLocalProfile(initial);
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  writeLocalProfile(initial);
  return initial;
}

export async function recordMatchRankResult(params: {
  db: Firestore;
  profileId: string;
  displayName: string;
  placement: number;
  totalPlayers: number;
  kills: number;
  miniBozzKills?: number;
  medallionSecured?: boolean;
  questionsCorrect: number;
  questionsAttempted: number;
  winnerName: string;
}): Promise<{ profile: BattleProfileDocument; summary: MatchResultSummary }> {
  const {
    db,
    profileId,
    displayName,
    placement,
    totalPlayers,
    kills,
    miniBozzKills = 0,
    medallionSecured = false,
    questionsCorrect,
    questionsAttempted,
    winnerName,
  } = params;

  const existing = await loadOrCreateBattleProfile(db, profileId, displayName);
  const prevTier = normalizeTierName(existing.tier);
  const { mmrDelta, newMmr, newTier } = computeMatchMmrDelta({
    placement,
    totalPlayers,
    kills,
    miniBozzKills,
    questionsCorrect,
    questionsAttempted,
    currentMmr: existing.mmr,
  });

  const cleanName = displayName.trim().slice(0, 24) || existing.displayName;
  const nextProfile: BattleProfileDocument = {
    profileId,
    displayName: cleanName,
    mmr: newMmr,
    peakMmr: Math.max(existing.peakMmr, newMmr),
    tier: newTier,
    matchesPlayed: existing.matchesPlayed + 1,
    wins: existing.wins + (placement === 1 ? 1 : 0),
    totalKills: existing.totalKills + Math.max(0, kills),
    questionsCorrect: existing.questionsCorrect + Math.max(0, questionsCorrect),
    questionsAttempted: existing.questionsAttempted + Math.max(0, questionsAttempted),
  };

  const path = `battleProfiles/${profileId}`;
  const profileRef = doc(db, "battleProfiles", profileId);
  try {
    const existingSnap = await getDoc(profileRef);
    if (existingSnap.exists()) {
      await updateDoc(profileRef, {
        displayName: nextProfile.displayName,
        mmr: nextProfile.mmr,
        peakMmr: nextProfile.peakMmr,
        tier: nextProfile.tier,
        matchesPlayed: nextProfile.matchesPlayed,
        wins: nextProfile.wins,
        totalKills: nextProfile.totalKills,
        questionsCorrect: nextProfile.questionsCorrect,
        questionsAttempted: nextProfile.questionsAttempted,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(profileRef, {
        ...nextProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }

  writeLocalProfile(nextProfile);

  return {
    profile: nextProfile,
    summary: {
      placement,
      totalPlayers,
      kills,
      miniBozzKills,
      medallionSecured,
      questionsCorrect,
      questionsAttempted,
      previousMmr: existing.mmr,
      newMmr,
      mmrDelta,
      previousTier: prevTier,
      newTier,
      winnerName,
    },
  };
}

function randomRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return code;
}

export async function generateUniqueRoomCode(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = randomRoomCode();
    const ref = doc(db, "studyRooms", candidate);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return candidate;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `studyRooms/${candidate}`);
    }
  }
  return randomRoomCode();
}

export async function createBattleRoom(params: {
  db: Firestore;
  hostId: string;
  hostName: string;
  title: string;
  questions: StudyBattleQuestion[];
  hostPlayerId: string;
  hostMmr: number;
  hostTier: CompetitiveTier;
  dropPoiId?: PoiId;
}): Promise<string> {
  const { db, hostId, hostName, title, questions, hostPlayerId, hostMmr, hostTier, dropPoiId } =
    params;
  const roomCode = await generateUniqueRoomCode(db);
  const arenaSeed = Math.floor(10000 + Math.random() * 890000);
  const layout = generateArenaLayout(arenaSeed);
  const spawn = dropPoiId
    ? getPoiSpawnPosition(
        dropPoiId,
        layout.obstacles,
        arenaSeed,
        layout.riverPoints,
        layout.bridges
      )
    : getSafeSpawnPosition(
        0,
        TARGET_LOBBY_SIZE,
        layout.obstacles,
        arenaSeed,
        layout.riverPoints,
        layout.bridges
      );

  const cleanHostName = hostName.trim().slice(0, 24) || "Host";
  const cleanTitle = title.trim().slice(0, 120) || "Bozz Battles Royale";

  const roomPayload: StudyRoomDocument = {
    roomCode,
    hostId,
    hostName: cleanHostName,
    title: cleanTitle,
    status: "lobby",
    targetPlayers: TARGET_LOBBY_SIZE,
    countdownEndsAtMs: 0,
    matchStartedAtMs: 0,
    arenaSeed,
    questions,
    winnerId: "",
    winnerName: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const playerPayload: StudyPlayerDocument = {
    playerId: hostPlayerId,
    displayName: cleanHostName,
    mmr: Math.max(0, Math.min(5000, Math.round(hostMmr))),
    tier: normalizeTierName(hostTier),
    isHost: true,
    alive: true,
    hp: 100,
    shield: 0,
    ammo: 0,
    kills: 0,
    hasMedallion: false,
    questionsCorrect: 0,
    questionsAttempted: 0,
    x: Math.round(spawn.x),
    y: Math.round(spawn.y),
    aimAngle: 0,
    exposedUntilMs: 0,
    placement: 0,
    lastShotId: "",
    lastShotX: 0,
    lastShotY: 0,
    lastShotVx: 0,
    lastShotVy: 0,
    lastShotAtMs: 0,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "studyRooms", roomCode), roomPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `studyRooms/${roomCode}`);
  }

  const miniBozzes = generateMiniBozzes(layout.obstacles);
  const subBatch = writeBatch(db);
  subBatch.set(doc(db, "studyRooms", roomCode, "players", hostPlayerId), playerPayload);
  subBatch.set(doc(db, "studyRooms", roomCode, "world", "state"), {
    bots: [],
    miniBozzes,
    firewalls: [],
    crateStates: [],
    killFeed: [],
    updatedAt: serverTimestamp(),
  } satisfies StudyWorldStateDocument);

  try {
    await subBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studyRooms/${roomCode}/players/${hostPlayerId}`);
  }

  return roomCode;
}

export async function joinBattleRoom(params: {
  db: Firestore;
  roomCode: string;
  playerId: string;
  displayName: string;
  mmr: number;
  tier: CompetitiveTier;
  dropPoiId?: PoiId;
}): Promise<StudyRoomDocument> {
  const { db, playerId, displayName, mmr, tier, dropPoiId } = params;
  const code = params.roomCode.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) {
    throw new Error("Room code must be exactly 4 letters (e.g. BOZZ).");
  }

  const roomPath = `studyRooms/${code}`;
  let roomSnap;
  try {
    roomSnap = await getDoc(doc(db, "studyRooms", code));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, roomPath);
  }

  if (!roomSnap.exists()) {
    throw new Error(`No Bozz Battles room found for code "${code}".`);
  }

  const roomData = roomSnap.data() as StudyRoomDocument;
  const playerRef = doc(db, "studyRooms", code, "players", playerId);
  const playerPath = `studyRooms/${code}/players/${playerId}`;

  let existingPlayer;
  try {
    existingPlayer = await getDoc(playerRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, playerPath);
  }

  if (existingPlayer.exists()) {
    return roomData;
  }

  if (roomData.status !== "lobby") {
    throw new Error(`Match ${code} has already launched (${roomData.status}).`);
  }

  const cleanName = displayName.trim().slice(0, 24);
  if (!cleanName) {
    throw new Error("Enter your display name before dropping in.");
  }

  const layout = generateArenaLayout(roomData.arenaSeed);
  const randIndex = Math.floor(Math.random() * (roomData.targetPlayers - 1)) + 1;
  const spawn = dropPoiId
    ? getPoiSpawnPosition(
        dropPoiId,
        layout.obstacles,
        roomData.arenaSeed,
        layout.riverPoints,
        layout.bridges
      )
    : getSafeSpawnPosition(
        randIndex,
        roomData.targetPlayers,
        layout.obstacles,
        roomData.arenaSeed,
        layout.riverPoints,
        layout.bridges
      );

  const playerPayload: StudyPlayerDocument = {
    playerId,
    displayName: cleanName,
    mmr: Math.max(0, Math.min(5000, Math.round(mmr))),
    tier: normalizeTierName(tier),
    isHost: false,
    alive: true,
    hp: 100,
    shield: 0,
    ammo: 0,
    kills: 0,
    hasMedallion: false,
    questionsCorrect: 0,
    questionsAttempted: 0,
    x: Math.round(spawn.x),
    y: Math.round(spawn.y),
    aimAngle: 0,
    exposedUntilMs: 0,
    placement: 0,
    lastShotId: "",
    lastShotX: 0,
    lastShotY: 0,
    lastShotVx: 0,
    lastShotVy: 0,
    lastShotAtMs: 0,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(playerRef, playerPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, playerPath);
  }

  return roomData;
}

export async function updatePlayerDropPoi(params: {
  db: Firestore;
  roomCode: string;
  playerId: string;
  arenaSeed: number;
  poiId: PoiId;
}): Promise<{ x: number; y: number }> {
  const { db, roomCode, playerId, arenaSeed, poiId } = params;
  const layout = generateArenaLayout(arenaSeed);
  const pos = getPoiSpawnPosition(
    poiId,
    layout.obstacles,
    arenaSeed,
    layout.riverPoints,
    layout.bridges
  );
  const path = `studyRooms/${roomCode}/players/${playerId}`;
  try {
    await updateDoc(doc(db, "studyRooms", roomCode, "players", playerId), {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
  return pos;
}

export function subscribeToBattleRoom(
  db: Firestore,
  roomCode: string,
  callbacks: {
    onRoom: (room: StudyRoomDocument | null) => void;
    onPlayers: (players: StudyPlayerDocument[]) => void;
    onWorld: (world: StudyWorldStateDocument | null) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const roomPath = `studyRooms/${roomCode}`;
  const playersPath = `studyRooms/${roomCode}/players`;
  const worldPath = `studyRooms/${roomCode}/world/state`;

  const unsubRoom = onSnapshot(
    doc(db, "studyRooms", roomCode),
    (snap) => {
      callbacks.onRoom(snap.exists() ? (snap.data() as StudyRoomDocument) : null);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, roomPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubPlayers = onSnapshot(
    collection(db, "studyRooms", roomCode, "players"),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as StudyPlayerDocument;
          return {
            ...data,
            tier: normalizeTierName(data.tier),
            hasMedallion: Boolean(data.hasMedallion),
          };
        })
        .sort(
          (a, b) =>
            Number(b.isHost) - Number(a.isHost) ||
            a.displayName.localeCompare(b.displayName)
        );
      callbacks.onPlayers(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, playersPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubWorld = onSnapshot(
    doc(db, "studyRooms", roomCode, "world", "state"),
    (snap) => {
      callbacks.onWorld(snap.exists() ? (snap.data() as StudyWorldStateDocument) : null);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, worldPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubRoom();
    unsubPlayers();
    unsubWorld();
  };
}

export async function hostExtendLobbyCountdown(
  db: Firestore,
  roomCode: string
): Promise<void> {
  const path = `studyRooms/${roomCode}`;
  try {
    await updateDoc(doc(db, "studyRooms", roomCode), {
      countdownEndsAtMs: Date.now() + LOBBY_COUNTDOWN_SEC * 1000,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function hostLaunchRoyaleMatch(params: {
  db: Firestore;
  room: StudyRoomDocument;
  players: StudyPlayerDocument[];
  fillWithBots?: boolean;
}): Promise<void> {
  const { db, room, players, fillWithBots = true } = params;
  if (room.status !== "lobby") return;

  const layout = generateArenaLayout(room.arenaSeed);
  const bots = fillWithBots
    ? generateBackfillBots({
        existingHumanCount: players.length,
        targetPlayers: room.targetPlayers || TARGET_LOBBY_SIZE,
        arenaSeed: room.arenaSeed,
        obstacles: layout.obstacles,
        riverPoints: layout.riverPoints,
        bridges: layout.bridges,
      })
    : [];
  const miniBozzes = generateMiniBozzes(layout.obstacles);

  const batch = writeBatch(db);
  batch.set(doc(db, "studyRooms", room.roomCode, "world", "state"), {
    bots,
    miniBozzes,
    firewalls: [],
    crateStates: [],
    killFeed: [
      fillWithBots
        ? `Drop live · ${players.length} humans + ${bots.length} bots · ${miniBozzes.length} Mini-Bozzes`
        : `Friends Battle live · ${players.length} challengers · ${miniBozzes.length} Mini-Bozzes`,
    ],
    updatedAt: serverTimestamp(),
  } satisfies StudyWorldStateDocument);

  batch.update(doc(db, "studyRooms", room.roomCode), {
    status: "active",
    matchStartedAtMs: Date.now(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studyRooms/${room.roomCode}`);
  }
}

export async function hostRequeueRoyaleRoom(params: {
  db: Firestore;
  room: StudyRoomDocument;
  players: StudyPlayerDocument[];
  immediateLaunch?: boolean;
  fillWithBots?: boolean;
}): Promise<number> {
  const {
    db,
    room,
    players,
    immediateLaunch = false,
    fillWithBots = true,
  } = params;

  const newSeed = Math.floor(Math.random() * 900000) + 1000;
  const layout = generateArenaLayout(newSeed);
  const miniBozzes = generateMiniBozzes(layout.obstacles);
  const bots =
    immediateLaunch && fillWithBots
      ? generateBackfillBots({
          existingHumanCount: players.length,
          targetPlayers: room.targetPlayers || TARGET_LOBBY_SIZE,
          arenaSeed: newSeed,
          obstacles: layout.obstacles,
          riverPoints: layout.riverPoints,
          bridges: layout.bridges,
        })
      : [];

  const batch = writeBatch(db);
  const targetCount = Math.max(2, players.length);

  players.forEach((p, idx) => {
    const spawn = getSafeSpawnPosition(
      idx,
      targetCount,
      layout.obstacles,
      newSeed,
      layout.riverPoints,
      layout.bridges
    );
    batch.update(doc(db, "studyRooms", room.roomCode, "players", p.playerId), {
      alive: true,
      hp: 100,
      shield: 0,
      ammo: 0,
      kills: 0,
      hasMedallion: false,
      questionsCorrect: 0,
      questionsAttempted: 0,
      x: Math.round(spawn.x),
      y: Math.round(spawn.y),
      aimAngle: 0,
      exposedUntilMs: 0,
      placement: 0,
      lastShotId: "",
      lastShotX: 0,
      lastShotY: 0,
      lastShotVx: 0,
      lastShotVy: 0,
      lastShotAtMs: 0,
      updatedAt: serverTimestamp(),
    });
  });

  batch.set(doc(db, "studyRooms", room.roomCode, "world", "state"), {
    bots,
    miniBozzes,
    firewalls: [],
    crateStates: [],
    killFeed: immediateLaunch
      ? [
          fillWithBots
            ? `Requeue live · ${players.length} humans + ${bots.length} bots · ${miniBozzes.length} Mini-Bozzes`
            : `Friends Requeue live · ${players.length} challengers · ${miniBozzes.length} Mini-Bozzes`,
        ]
      : [],
    updatedAt: serverTimestamp(),
  } satisfies StudyWorldStateDocument);

  batch.update(doc(db, "studyRooms", room.roomCode), {
    status: immediateLaunch ? "active" : "lobby",
    winnerId: "",
    winnerName: "",
    arenaSeed: newSeed,
    matchStartedAtMs: immediateLaunch ? Date.now() : 0,
    ...(immediateLaunch ? {} : { countdownEndsAtMs: 0 }),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studyRooms/${room.roomCode}`);
  }

  return newSeed;
}

export async function syncLocalPlayerState(params: {
  db: Firestore;
  roomCode: string;
  playerId: string;
  state: {
    alive: boolean;
    hp: number;
    shield: number;
    ammo: number;
    kills: number;
    hasMedallion: boolean;
    questionsCorrect: number;
    questionsAttempted: number;
    x: number;
    y: number;
    aimAngle: number;
    exposedUntilMs: number;
    placement: number;
    lastShotId: string;
    lastShotX: number;
    lastShotY: number;
    lastShotVx: number;
    lastShotVy: number;
    lastShotAtMs: number;
  };
}): Promise<void> {
  const { db, roomCode, playerId, state } = params;
  const path = `studyRooms/${roomCode}/players/${playerId}`;
  const safeAngle = Number.isFinite(state.aimAngle) ? Number(state.aimAngle.toFixed(3)) : 0;
  const safeFinite = (val: number) => (Number.isFinite(val) ? Math.round(val) : 0);

  try {
    await updateDoc(doc(db, "studyRooms", roomCode, "players", playerId), {
      alive: state.alive,
      hp: Math.max(0, Math.min(100, Math.round(state.hp))),
      shield: Math.max(0, Math.min(100, Math.round(state.shield))),
      ammo: Math.max(0, Math.min(500, Math.round(state.ammo))),
      kills: Math.max(0, Math.min(50, Math.round(state.kills))),
      hasMedallion: Boolean(state.hasMedallion),
      questionsCorrect: Math.max(0, Math.min(200, Math.round(state.questionsCorrect))),
      questionsAttempted: Math.max(0, Math.min(200, Math.round(state.questionsAttempted))),
      x: Math.max(0, Math.min(ARENA_SIZE, safeFinite(state.x))),
      y: Math.max(0, Math.min(ARENA_SIZE, safeFinite(state.y))),
      aimAngle: safeAngle,
      exposedUntilMs: Math.max(0, safeFinite(state.exposedUntilMs)),
      placement: Math.max(0, Math.min(20, Math.round(state.placement))),
      lastShotId: state.lastShotId.slice(0, 48),
      lastShotX: safeFinite(state.lastShotX),
      lastShotY: safeFinite(state.lastShotY),
      lastShotVx: safeFinite(state.lastShotVx),
      lastShotVy: safeFinite(state.lastShotVy),
      lastShotAtMs: Math.max(0, safeFinite(state.lastShotAtMs)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function publishWorldPatch(params: {
  db: Firestore;
  roomCode: string;
  addFirewall?: FirewallWall;
  crateState?: SyncedCrateState;
  miniBozzDamage?: { id: string; hp: number; shield: number; alive: boolean };
  botDamage?: { id: string; hp: number; shield: number; alive: boolean; placement?: number };
  killFeedEntry?: string;
}): Promise<void> {
  const {
    db,
    roomCode,
    addFirewall,
    crateState,
    miniBozzDamage,
    botDamage,
    killFeedEntry,
  } = params;
  const worldRef = doc(db, "studyRooms", roomCode, "world", "state");
  const now = Date.now();
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(worldRef);
      if (!snap.exists()) return;
      const cur = snap.data() as StudyWorldStateDocument;

      let nextFirewalls = (cur.firewalls || []).filter(
        (fw) => fw.hp > 0 && fw.expiresAtMs > now
      );
      if (addFirewall && !nextFirewalls.some((fw) => fw.id === addFirewall.id)) {
        nextFirewalls = [...nextFirewalls, addFirewall].slice(-24);
      }

      let nextCrates = (cur.crateStates || []).filter(
        (c) => c.lockedUntilMs > now || c.depletedUntilMs > now
      );
      if (crateState) {
        nextCrates = [
          ...nextCrates.filter((c) => c.crateId !== crateState.crateId),
          crateState,
        ].slice(-60);
      }

      let nextMiniBozzes = cur.miniBozzes || [];
      if (miniBozzDamage) {
        nextMiniBozzes = nextMiniBozzes.map((mb) => {
          if (mb.id !== miniBozzDamage.id) return mb;
          const curEhp = mb.hp + mb.shield;
          const incEhp = miniBozzDamage.hp + miniBozzDamage.shield;
          return incEhp < curEhp || (!miniBozzDamage.alive && mb.alive)
            ? {
                ...mb,
                hp: Math.max(0, miniBozzDamage.hp),
                shield: Math.max(0, miniBozzDamage.shield),
                alive: mb.alive && miniBozzDamage.alive,
              }
            : mb;
        });
      }

      let nextBots = cur.bots || [];
      if (botDamage) {
        nextBots = nextBots.map((b) => {
          if (b.id !== botDamage.id) return b;
          const curEhp = b.hp + b.shield;
          const incEhp = botDamage.hp + botDamage.shield;
          return incEhp < curEhp || (!botDamage.alive && b.alive)
            ? {
                ...b,
                hp: Math.max(0, botDamage.hp),
                shield: Math.max(0, botDamage.shield),
                alive: b.alive && botDamage.alive,
                placement: botDamage.alive ? b.placement : botDamage.placement || b.placement,
              }
            : b;
        });
      }

      const nextFeed = killFeedEntry
        ? [killFeedEntry, ...(cur.killFeed || [])].slice(0, 10)
        : (cur.killFeed || []).slice(0, 10);

      tx.set(worldRef, {
        bots: nextBots.slice(0, 20),
        miniBozzes: nextMiniBozzes.slice(0, 4),
        firewalls: nextFirewalls,
        crateStates: nextCrates,
        killFeed: nextFeed,
        updatedAt: serverTimestamp(),
      } satisfies StudyWorldStateDocument);
    });
  } catch {
    // Non-fatal patch conflict under contention; next tick reconciles
  }
}

export async function syncWorldState(params: {
  db: Firestore;
  roomCode: string;
  bots: BotState[];
  miniBozzes: MiniBozzState[];
  firewalls: FirewallWall[];
  crateStates: SyncedCrateState[];
  killFeed: string[];
}): Promise<void> {
  const { db, roomCode, bots, miniBozzes, firewalls, crateStates, killFeed } = params;
  const path = `studyRooms/${roomCode}/world/state`;
  try {
    await setDoc(doc(db, "studyRooms", roomCode, "world", "state"), {
      bots: bots.slice(0, 20),
      miniBozzes: miniBozzes.slice(0, 4),
      firewalls: firewalls.slice(0, 24),
      crateStates: crateStates.slice(0, 60),
      killFeed: killFeed.slice(0, 10),
      updatedAt: serverTimestamp(),
    } satisfies StudyWorldStateDocument);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function hostFinishRoyaleMatch(params: {
  db: Firestore;
  roomCode: string;
  winnerId: string;
  winnerName: string;
}): Promise<void> {
  const { db, roomCode, winnerId, winnerName } = params;
  const path = `studyRooms/${roomCode}`;
  try {
    await updateDoc(doc(db, "studyRooms", roomCode), {
      status: "finished",
      winnerId: winnerId.slice(0, 64),
      winnerName: winnerName.slice(0, 32),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export { getTierFromMmr };
