import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Firestore, doc, getDocFromServer, getFirestore } from "firebase/firestore";
import { StudyBattleFirebaseConfig } from "./types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function readEnvConfig(): Partial<StudyBattleFirebaseConfig> {
  const viteEnv =
    typeof import.meta !== "undefined"
      ? ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {})
      : {};

  const nodeEnv =
    typeof process !== "undefined" && process.env ? process.env : {};

  return {
    apiKey: nodeEnv.NEXT_PUBLIC_FIREBASE_API_KEY || viteEnv.VITE_FIREBASE_API_KEY || "",
    authDomain:
      nodeEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || viteEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId:
      nodeEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || viteEnv.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket:
      nodeEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      viteEnv.VITE_FIREBASE_STORAGE_BUCKET ||
      "",
    messagingSenderId:
      nodeEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      "",
    appId: nodeEnv.NEXT_PUBLIC_FIREBASE_APP_ID || viteEnv.VITE_FIREBASE_APP_ID || "",
    firestoreDatabaseId:
      nodeEnv.NEXT_PUBLIC_FIREBASE_DATABASE_ID ||
      viteEnv.VITE_FIREBASE_DATABASE_ID ||
      undefined,
  };
}

let cachedDb: Firestore | null = null;
let cachedConfigKey = "";
let connectionTested = false;

async function testConnection(db: Firestore): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export function resolveFirebaseConfig(
  override?: StudyBattleFirebaseConfig
): StudyBattleFirebaseConfig | null {
  const envCfg = readEnvConfig();
  const merged: StudyBattleFirebaseConfig = {
    apiKey: override?.apiKey || envCfg.apiKey || "",
    authDomain: override?.authDomain || envCfg.authDomain || "",
    projectId: override?.projectId || envCfg.projectId || "",
    storageBucket: override?.storageBucket || envCfg.storageBucket || "",
    messagingSenderId: override?.messagingSenderId || envCfg.messagingSenderId || "",
    appId: override?.appId || envCfg.appId || "",
    firestoreDatabaseId: override?.firestoreDatabaseId || envCfg.firestoreDatabaseId,
  };

  if (!merged.apiKey || !merged.projectId || !merged.appId) {
    return null;
  }

  return merged;
}

export function getStudyBattleDb(override?: StudyBattleFirebaseConfig): Firestore {
  const cfg = resolveFirebaseConfig(override);
  if (!cfg) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* or VITE_FIREBASE_* environment variables (or pass firebaseConfig)."
    );
  }

  const key = `${cfg.projectId}::${cfg.appId}::${cfg.firestoreDatabaseId || "(default)"}`;
  if (cachedDb && cachedConfigKey === key) {
    return cachedDb;
  }

  const firebaseOptions = {
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain || `${cfg.projectId}.firebaseapp.com`,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  };

  let app: FirebaseApp;
  const existing = getApps().find((a) => a.name === "study-battle");
  if (existing) {
    app = existing;
  } else if (getApps().length > 0 && !override?.firestoreDatabaseId) {
    app = getApp();
  } else {
    app = initializeApp(firebaseOptions, "study-battle");
  }

  const db = cfg.firestoreDatabaseId
    ? getFirestore(app, cfg.firestoreDatabaseId)
    : getFirestore(app);

  cachedDb = db;
  cachedConfigKey = key;
  void testConnection(db);
  return db;
}
