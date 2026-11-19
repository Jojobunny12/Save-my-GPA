export type StudyRoomStatus = "lobby" | "active" | "finished";

export type CompetitiveTier =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Grand Gbozz";

export type LootRarity = "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";

export type WeaponArchetype = "blaster" | "cannon" | "scatter" | "railgun";

export interface WeaponLoadoutItem {
  archetype: WeaponArchetype;
  rarity: LootRarity;
}

export type PoiId =
  | "bozz_citadel"
  | "prompt_plaza"
  | "neural_nexus"
  | "data_docks"
  | "token_vault";

export interface PoiInfo {
  id: PoiId;
  name: string;
  subtitle: string;
  dropX: number;
  dropY: number;
  color: string;
  biomeKind: BiomeKind;
  hasMiniBozz: boolean;
}

export interface StudyBattleQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  unitTag?: string;
  timeSeconds?: number;
  timeReason?: string;
  memoryHook?: string;
  learningMethod?: string;
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
  targetPlayers: number;
  countdownEndsAtMs: number;
  matchStartedAtMs: number;
  arenaSeed: number;
  questions: StudyBattleQuestion[];
  winnerId: string;
  winnerName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyPlayerDocument {
  playerId: string;
  displayName: string;
  mmr: number;
  tier: CompetitiveTier;
  isHost: boolean;
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
  joinedAt?: unknown;
  updatedAt?: unknown;
}

export type BotAIState = "loot" | "answering" | "rotate" | "combat";

export interface BotState {
  id: string;
  name: string;
  tier: CompetitiveTier;
  alive: boolean;
  hp: number;
  shield: number;
  ammo: number;
  kills: number;
  x: number;
  y: number;
  aimAngle: number;
  aiState: BotAIState;
  answerEndMs: number;
  accuracy: number;
  targetCrateId: string;
  exposedUntilMs: number;
  placement: number;
  speedBoostUntilMs: number;
  weaponArchetype?: WeaponArchetype;
  weaponRarity?: LootRarity;
  hasMedallion?: boolean;
  lastFireMs: number;
  lastShotId: string;
  lastShotX: number;
  lastShotY: number;
  lastShotVx: number;
  lastShotVy: number;
  lastShotAtMs: number;
}

export interface MiniBozzState {
  id: string;
  name: string;
  title: string;
  poiId: PoiId;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  alive: boolean;
  aimAngle: number;
  lastFireMs: number;
  lastShotId: string;
  lastShotX: number;
  lastShotY: number;
  lastShotVx: number;
  lastShotVy: number;
  lastShotAtMs: number;
}

export interface FirewallWall {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  expiresAtMs: number;
  color: string;
}

export interface SyncedCrateState {
  crateId: string;
  lockedUntilMs: number;
  depletedUntilMs: number;
}

export interface StudyWorldStateDocument {
  bots: BotState[];
  miniBozzes: MiniBozzState[];
  firewalls: FirewallWall[];
  crateStates: SyncedCrateState[];
  killFeed: string[];
  updatedAt?: unknown;
}

export interface BattleProfileDocument {
  profileId: string;
  displayName: string;
  mmr: number;
  peakMmr: number;
  tier: CompetitiveTier;
  matchesPlayed: number;
  wins: number;
  totalKills: number;
  questionsCorrect: number;
  questionsAttempted: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type BiomeKind = "rotunda" | "quad" | "library" | "lab" | "stadium";

export interface BiomeZone {
  id: string;
  kind: BiomeKind;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorColor: string;
  accentColor: string;
}

export interface RoadSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface RiverPoint {
  x: number;
  y: number;
}

export interface BridgeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: "horizontal" | "vertical";
}

export interface BushCover {
  id: string;
  kind: "bush" | "tree";
  x: number;
  y: number;
  radius: number;
}

export interface JumpPad {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface HealingShrine {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface FloorLootOrb {
  id: string;
  x: number;
  y: number;
  ammo: number;
  shield: number;
  hp: number;
  tokens?: number;
  medallion?: boolean;
  weaponArchetype?: WeaponArchetype;
  weaponRarity?: LootRarity;
  createdAtMs: number;
}

export interface ArenaObstacle {
  id: string;
  kind: "bookshelf" | "desk" | "pillar" | "wall" | "server" | "bleacher";
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface ArenaCrate {
  id: string;
  kind: "crate" | "terminal";
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface Projectile {
  id: string;
  ownerId: string;
  ownerName: string;
  isBot: boolean;
  isMiniBozz?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  archetype?: WeaponArchetype;
  rarity?: LootRarity;
  splashRadius?: number;
  maxLifeMs?: number;
  createdAtMs: number;
}

export interface MatchResultSummary {
  placement: number;
  totalPlayers: number;
  kills: number;
  miniBozzKills: number;
  medallionSecured: boolean;
  questionsCorrect: number;
  questionsAttempted: number;
  previousMmr: number;
  newMmr: number;
  mmrDelta: number;
  previousTier: CompetitiveTier;
  newTier: CompetitiveTier;
  winnerName: string;
}

export interface StudyBattleProps {
  /** Optional pre-generated questions passed from the parent study app */
  initialQuestions?: StudyBattleQuestion[];
  /** Optional default room title */
  initialTitle?: string;
  /** Optional pre-filled 4-letter room code (e.g. from URL ?room=BOZZ) */
  initialJoinCode?: string;
  /** Optional Firebase config override */
  firebaseConfig?: StudyBattleFirebaseConfig;
  /** Optional callback to navigate back to parent workspace */
  onBack?: () => void;
}
