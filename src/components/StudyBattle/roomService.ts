import {
  Firestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { OperationType, handleFirestoreError } from "./firebaseConfig";
import {
  StudyAnswerDocument,
  StudyBattleQuestion,
  StudyPlayerDocument,
  StudyRoomDocument,
} from "./types";

export const QUESTION_DURATION_SECONDS = 15;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Avoid ambiguous O/I? Or include all A-Z; valid ^[A-Z]{4}$

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

export function parseStudyQuestionsJson(rawInput: string): {
  questions: StudyBattleQuestion[];
  error: string | null;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { questions: [], error: "Paste a JSON array of questions to host a room." };
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
      error: "Maximum 50 questions per Study Battle room.",
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
    normalized.push(qObj);
  }

  return { questions: normalized, error: null };
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

export async function createStudyRoom(params: {
  db: Firestore;
  hostId: string;
  hostName: string;
  title: string;
  questions: StudyBattleQuestion[];
  joinHostAsPlayer: boolean;
  hostPlayerId: string;
}): Promise<string> {
  const { db, hostId, hostName, title, questions, joinHostAsPlayer, hostPlayerId } = params;
  const roomCode = await generateUniqueRoomCode(db);
  const roomPath = `studyRooms/${roomCode}`;

  const cleanHostName = hostName.trim().slice(0, 32) || "Host";
  const cleanTitle = title.trim().slice(0, 120) || "Bozz GPT Study Battle";

  const payload: StudyRoomDocument = {
    roomCode,
    hostId,
    hostName: cleanHostName,
    title: cleanTitle,
    status: "lobby",
    currentQuestionIndex: 0,
    questionStartedAtMs: 0,
    questionDurationSec: QUESTION_DURATION_SECONDS,
    answersLocked: false,
    questions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "studyRooms", roomCode), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, roomPath);
  }

  if (joinHostAsPlayer) {
    const playerPath = `studyRooms/${roomCode}/players/${hostPlayerId}`;
    const playerPayload: StudyPlayerDocument = {
      playerId: hostPlayerId,
      displayName: cleanHostName.slice(0, 24),
      score: 0,
      streak: 0,
      lastPointsEarned: 0,
      lastAnswerCorrect: false,
      isHost: true,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "studyRooms", roomCode, "players", hostPlayerId), playerPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, playerPath);
    }
  }

  return roomCode;
}

export async function joinStudyRoom(params: {
  db: Firestore;
  roomCode: string;
  playerId: string;
  displayName: string;
}): Promise<StudyRoomDocument> {
  const { db } = params;
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
    throw new Error(`No active Study Battle room found for code "${code}".`);
  }

  const roomData = roomSnap.data() as StudyRoomDocument;
  const playerRef = doc(db, "studyRooms", code, "players", params.playerId);
  const playerPath = `studyRooms/${code}/players/${params.playerId}`;

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
    throw new Error(`Room ${code} is already in progress (${roomData.status}). Wait for the next battle!`);
  }

  const cleanName = params.displayName.trim().slice(0, 24);
  if (!cleanName) {
    throw new Error("Enter a display name before joining.");
  }

  const playerPayload: StudyPlayerDocument = {
    playerId: params.playerId,
    displayName: cleanName,
    score: 0,
    streak: 0,
    lastPointsEarned: 0,
    lastAnswerCorrect: false,
    isHost: false,
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

export function subscribeToRoom(
  db: Firestore,
  roomCode: string,
  callbacks: {
    onRoom: (room: StudyRoomDocument | null) => void;
    onPlayers: (players: StudyPlayerDocument[]) => void;
    onAnswers: (answers: StudyAnswerDocument[]) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const roomPath = `studyRooms/${roomCode}`;
  const playersPath = `studyRooms/${roomCode}/players`;
  const answersPath = `studyRooms/${roomCode}/answers`;

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
        .map((d) => d.data() as StudyPlayerDocument)
        .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
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

  const unsubAnswers = onSnapshot(
    collection(db, "studyRooms", roomCode, "answers"),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as StudyAnswerDocument);
      callbacks.onAnswers(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, answersPath);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubRoom();
    unsubPlayers();
    unsubAnswers();
  };
}

export async function submitPlayerAnswer(params: {
  db: Firestore;
  roomCode: string;
  playerId: string;
  questionIndex: number;
  selectedIndex: number;
}): Promise<void> {
  const { db, roomCode, playerId, questionIndex, selectedIndex } = params;
  const answerId = `${questionIndex}_${playerId}`;
  const path = `studyRooms/${roomCode}/answers/${answerId}`;

  const payload: StudyAnswerDocument = {
    playerId,
    questionIndex,
    selectedIndex,
    answeredAtMs: Date.now(),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "studyRooms", roomCode, "answers", answerId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function hostStartGame(db: Firestore, roomCode: string): Promise<void> {
  const path = `studyRooms/${roomCode}`;
  try {
    await updateDoc(doc(db, "studyRooms", roomCode), {
      status: "question",
      currentQuestionIndex: 0,
      questionStartedAtMs: Date.now(),
      answersLocked: false,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function computeQuestionPoints(
  isCorrect: boolean,
  elapsedMs: number,
  durationSec: number
): number {
  if (!isCorrect) return 0;
  const totalMs = Math.max(1000, durationSec * 1000);
  const clampedElapsed = Math.max(0, Math.min(totalMs, elapsedMs));
  const speedRatio = 1 - clampedElapsed / totalMs;
  const pts = Math.round(500 + 500 * speedRatio);
  return Math.max(500, Math.min(1000, pts));
}

export async function hostLockAndScoreRound(params: {
  db: Firestore;
  room: StudyRoomDocument;
  players: StudyPlayerDocument[];
  answers: StudyAnswerDocument[];
}): Promise<void> {
  const { db, room, players, answers } = params;
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ) return;

  const roundAnswers = new Map<string, StudyAnswerDocument>();
  for (const ans of answers) {
    if (ans.questionIndex === room.currentQuestionIndex) {
      roundAnswers.set(ans.playerId, ans);
    }
  }

  const batch = writeBatch(db);
  const roomRef = doc(db, "studyRooms", room.roomCode);

  batch.update(roomRef, {
    status: "leaderboard",
    answersLocked: true,
    updatedAt: serverTimestamp(),
  });

  for (const player of players) {
    const ans = roundAnswers.get(player.playerId);
    const isCorrect = Boolean(ans && ans.selectedIndex === currentQ.correctIndex);
    const elapsedMs = ans
      ? Math.max(0, ans.answeredAtMs - room.questionStartedAtMs)
      : room.questionDurationSec * 1000;
    const pointsEarned = computeQuestionPoints(isCorrect, elapsedMs, room.questionDurationSec);

    const playerRef = doc(db, "studyRooms", room.roomCode, "players", player.playerId);
    batch.update(playerRef, {
      score: Math.min(100000, player.score + pointsEarned),
      streak: isCorrect ? Math.min(50, player.streak + 1) : 0,
      lastPointsEarned: pointsEarned,
      lastAnswerCorrect: isCorrect,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studyRooms/${room.roomCode}`);
  }
}

export async function hostAdvanceNext(db: Firestore, room: StudyRoomDocument): Promise<void> {
  const path = `studyRooms/${room.roomCode}`;
  const nextIndex = room.currentQuestionIndex + 1;
  const hasMore = nextIndex < room.questions.length;

  try {
    if (hasMore) {
      await updateDoc(doc(db, "studyRooms", room.roomCode), {
        status: "question",
        currentQuestionIndex: nextIndex,
        questionStartedAtMs: Date.now(),
        answersLocked: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, "studyRooms", room.roomCode), {
        status: "finished",
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
