export type StudyRoomStatus = "lobby" | "question" | "leaderboard" | "finished";

export interface StudyBattleQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  unitTag?: string;
}

export interface StudyBattleFirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export interface StudyRoomDocument {
  roomCode: string;
  hostId: string;
  hostName: string;
  title: string;
  status: StudyRoomStatus;
  currentQuestionIndex: number;
  questionStartedAtMs: number;
  questionDurationSec: number;
  answersLocked: boolean;
  questions: StudyBattleQuestion[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyPlayerDocument {
  playerId: string;
  displayName: string;
  score: number;
  streak: number;
  lastPointsEarned: number;
  lastAnswerCorrect: boolean;
  isHost: boolean;
  joinedAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyAnswerDocument {
  playerId: string;
  questionIndex: number;
  selectedIndex: number;
  answeredAtMs: number;
  createdAt?: unknown;
}

export interface StudyBattleProps {
  /** Optional pre-generated questions passed from the parent study app */
  initialQuestions?: StudyBattleQuestion[];
  /** Optional default room title */
  initialTitle?: string;
  /** Optional pre-filled 4-letter room code (e.g. from URL ?room=BOZZ) */
  initialJoinCode?: string;
  /** Optional Firebase config override (defaults to NEXT_PUBLIC_FIREBASE_* / VITE_FIREBASE_* env vars) */
  firebaseConfig?: StudyBattleFirebaseConfig;
  /** Optional callback to navigate back to parent workspace */
  onBack?: () => void;
}
