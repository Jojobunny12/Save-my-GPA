"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  Eye,
  Flame,
  Heart,
  Layers,
  LogOut,
  Map as MapIcon,
  Medal,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { Firestore } from "firebase/firestore";
import {
  ARENA_POIS,
  ARENA_SIZE,
  MINI_BOZZ_RADIUS,
  PLAYER_RADIUS,
  RARITY_META,
  StormZoneState,
  WEAPON_META,
  computeStormZoneState,
  generateArenaLayout,
  generateMiniBozzes,
  getBiomeAtPoint,
  getBushContainingPoint,
  hasLineOfSight,
  isPointInWater,
  pointHitsFirewall,
  pointHitsObstacle,
  resolveCircleObstacles,
} from "./arenaEngine";
import { playBattleSfx } from "./battleSfx";
import {
  hostFinishRoyaleMatch,
  publishWorldPatch,
  syncLocalPlayerState,
  syncWorldState,
} from "./roomService";
import {
  ArenaCrate,
  BotState,
  FirewallWall,
  FloorLootOrb,
  LootRarity,
  MiniBozzState,
  Projectile,
  StudyBattleQuestion,
  StudyPlayerDocument,
  StudyRoomDocument,
  StudyWorldStateDocument,
  SyncedCrateState,
  WeaponArchetype,
} from "./types";

interface BattleRoyaleCanvasProps {
  db: Firestore;
  room: StudyRoomDocument;
  players: StudyPlayerDocument[];
  worldState: StudyWorldStateDocument | null;
  currentPlayerId: string;
  isHost: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onLeaveRoom: () => void;
  onMatchComplete: (stats: {
    placement: number;
    totalPlayers: number;
    kills: number;
    miniBozzKills: number;
    medallionSecured: boolean;
    questionsCorrect: number;
    questionsAttempted: number;
    winnerName: string;
  }) => void;
  onRequeue?: (
    immediateLaunch: boolean,
    directMatchStats?: {
      placement: number;
      totalPlayers: number;
      kills: number;
      miniBozzKills: number;
      medallionSecured: boolean;
      questionsCorrect: number;
      questionsAttempted: number;
      winnerName: string;
    }
  ) => Promise<void>;
  isRequeueing?: boolean;
  fillWithBots?: boolean;
  registerLiveStream?: (handlers: {
    onPlayers: (p: StudyPlayerDocument[]) => void;
    onWorld: (w: StudyWorldStateDocument | null) => void;
  }) => () => void;
}

interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface AfterImage {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface LocalCombatState {
  x: number;
  y: number;
  aimAngle: number;
  hp: number;
  shield: number;
  ammo: number;
  medkits: number;
  shieldPotions: number;
  tokens: number;
  shockwaveCharges: number;
  kills: number;
  miniBozzKills: number;
  hasMedallion: boolean;
  streak: number;
  weapons: Record<WeaponArchetype, LootRarity | null>;
  activeWeapon: WeaponArchetype;
  questionsCorrect: number;
  questionsAttempted: number;
  alive: boolean;
  placement: number;
  speedBoostUntilMs: number;
  radarUntilMs: number;
  exposedUntilMs: number;
  dashCooldownUntilMs: number;
  dashEndMs: number;
  dashVx: number;
  dashVy: number;
  inBush: boolean;
  inWater: boolean;
  lastFireMs: number;
  lastShotId: string;
  lastShotX: number;
  lastShotY: number;
  lastShotVx: number;
  lastShotVy: number;
  lastShotAtMs: number;
}

interface HudSnapshot {
  hp: number;
  shield: number;
  ammo: number;
  medkits: number;
  shieldPotions: number;
  tokens: number;
  shockwaveCharges: number;
  kills: number;
  miniBozzKills: number;
  hasMedallion: boolean;
  streak: number;
  activeWeapon: WeaponArchetype;
  weapons: Record<WeaponArchetype, LootRarity | null>;
  questionsCorrect: number;
  questionsAttempted: number;
  alive: boolean;
  aliveCount: number;
  totalCount: number;
  humanAliveCount: number;
  humanTotalCount: number;
  miniBozzesAlive: number;
  biomeName: string;
  biomeSubtitle: string;
  biomeAccent: string;
  speedSecLeft: number;
  radarSecLeft: number;
  exposedSecLeft: number;
  dashSecLeft: number;
  inBurnout: boolean;
  inWater: boolean;
  inBush: boolean;
  zonePhase: number;
  zoneCountdownSec: number;
  nearbyCrate: { crate: ArenaCrate; lockedSec: number } | null;
  nearbyBoss: MiniBozzState | null;
  killFeed: string[];
  spectatingName: string;
  spectatingKind: "Friend" | "Bot" | null;
  spectatingHp: number;
  spectatingShield: number;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
const WEAPON_SLOTS: WeaponArchetype[] = ["blaster", "cannon", "scatter", "railgun"];

function rollCrateLootRarity(isTerminal: boolean, streak: number): LootRarity {
  const roll = Math.random();
  const bonus = Math.min(0.32, streak * 0.06);
  if (isTerminal) {
    if (roll + bonus > 1.05) return "Mythic";
    if (roll + bonus > 0.78) return "Legendary";
    if (roll + bonus > 0.44) return "Epic";
    return "Rare";
  }
  if (roll + bonus > 0.96) return "Legendary";
  if (roll + bonus > 0.68) return "Epic";
  if (roll + bonus > 0.34) return "Rare";
  return "Common";
}

function getProjectileColor(
  archetype: WeaponArchetype | undefined,
  rarity: LootRarity | undefined,
  isBot: boolean,
  isMiniBozz?: boolean
): string {
  if (isMiniBozz) return "#FB7185";
  if (isBot) return "#A78BFA";
  if (rarity && rarity !== "Common") return RARITY_META[rarity].color;
  if (archetype === "cannon") return "#F97316";
  if (archetype === "scatter") return "#38BDF8";
  if (archetype === "railgun") return "#E879F9";
  return "#10B981";
}

const ARCH_CODE: Record<WeaponArchetype, string> = {
  blaster: "b",
  cannon: "c",
  scatter: "s",
  railgun: "r",
};
const CODE_TO_ARCH: Record<string, WeaponArchetype> = {
  b: "blaster",
  c: "cannon",
  s: "scatter",
  r: "railgun",
};
const CODE_TO_RARITY: Record<string, LootRarity> = {
  C: "Common",
  R: "Rare",
  E: "Epic",
  L: "Legendary",
  M: "Mythic",
};

function encodeShotId(
  now: number,
  archetype: WeaponArchetype,
  damage: number,
  rarity: LootRarity
): string {
  const ts = (now % 10000000).toString(36);
  const rnd = Math.floor(Math.random() * 1295).toString(36);
  return `s_${ts}_${rnd}|${ARCH_CODE[archetype]}:${Math.round(damage)}:${rarity[0]}`.slice(0, 48);
}

interface SmoothEntity {
  x: number;
  y: number;
  aimAngle: number;
  targetX: number;
  targetY: number;
  targetAim: number;
  vx: number;
  vy: number;
  lastPacketMs: number;
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

function upsertSmoothEntity(
  map: Map<string, SmoothEntity>,
  id: string,
  x: number,
  y: number,
  aimAngle: number,
  now: number
) {
  const existing = map.get(id);
  if (!existing) {
    map.set(id, {
      x,
      y,
      aimAngle,
      targetX: x,
      targetY: y,
      targetAim: aimAngle,
      vx: 0,
      vy: 0,
      lastPacketMs: now,
    });
    return;
  }
  const distJump = Math.hypot(x - existing.targetX, y - existing.targetY);
  if (distJump > 320) {
    existing.x = x;
    existing.y = y;
    existing.targetX = x;
    existing.targetY = y;
    existing.vx = 0;
    existing.vy = 0;
    existing.aimAngle = aimAngle;
    existing.targetAim = aimAngle;
    existing.lastPacketMs = now;
    return;
  }
  const elapsedSec = Math.max(0.06, Math.min(0.8, (now - existing.lastPacketMs) / 1000));
  let vx = (x - existing.targetX) / elapsedSec;
  let vy = (y - existing.targetY) / elapsedSec;
  const spd = Math.hypot(vx, vy);
  if (spd > 420) {
    vx = (vx / spd) * 420;
    vy = (vy / spd) * 420;
  }
  existing.vx = existing.vx * 0.35 + vx * 0.65;
  existing.vy = existing.vy * 0.35 + vy * 0.65;
  existing.targetX = x;
  existing.targetY = y;
  existing.targetAim = aimAngle;
  existing.lastPacketMs = now;
}

function stepSmoothMap(
  map: Map<string, SmoothEntity>,
  dt: number,
  now: number,
  aimSpeed = 16
) {
  const posFactor = Math.min(1, dt * 16);
  const aimFactor = Math.min(1, dt * aimSpeed);
  for (const sm of map.values()) {
    const ageMs = now - sm.lastPacketMs;
    if (ageMs < 360) {
      const decay = Math.max(0, 1 - ageMs / 380);
      sm.targetX = Math.max(
        20,
        Math.min(ARENA_SIZE - 20, sm.targetX + sm.vx * dt * decay)
      );
      sm.targetY = Math.max(
        20,
        Math.min(ARENA_SIZE - 20, sm.targetY + sm.vy * dt * decay)
      );
    }
    sm.x += (sm.targetX - sm.x) * posFactor;
    sm.y += (sm.targetY - sm.y) * posFactor;
    sm.aimAngle = lerpAngle(sm.aimAngle, sm.targetAim, aimFactor);
  }
}

function decodeShotId(shotId: string): {
  archetype: WeaponArchetype;
  damage: number;
  rarity: LootRarity;
} {
  const pipeIdx = shotId.indexOf("|");
  if (pipeIdx === -1) {
    return { archetype: "blaster", damage: 20, rarity: "Rare" };
  }
  const meta = shotId.slice(pipeIdx + 1).split(":");
  const archetype = CODE_TO_ARCH[meta[0]] || "blaster";
  const parsedDmg = Number(meta[1]);
  const damage = Number.isFinite(parsedDmg) && parsedDmg > 0 ? Math.min(200, parsedDmg) : 20;
  const rarity = CODE_TO_RARITY[meta[2]] || "Rare";
  return { archetype, damage, rarity };
}

export default function BattleRoyaleCanvas({
  db,
  room,
  players,
  worldState,
  currentPlayerId,
  isHost,
  muted,
  onToggleMute,
  onLeaveRoom,
  onMatchComplete,
  onRequeue,
  isRequeueing = false,
  fillWithBots = true,
  registerLiveStream,
}: BattleRoyaleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const fullMapRef = useRef<HTMLCanvasElement | null>(null);

  const layout = useMemo(
    () => generateArenaLayout(room.arenaSeed),
    [room.arenaSeed]
  );

  const meFromRoom = useMemo(
    () => players.find((p) => p.playerId === currentPlayerId) || null,
    [players, currentPlayerId]
  );

  const localRef = useRef<LocalCombatState>({
    x: meFromRoom?.x ?? ARENA_SIZE / 2,
    y: meFromRoom?.y ?? ARENA_SIZE / 2,
    aimAngle: 0,
    hp: 100,
    shield: 0,
    ammo: 0,
    medkits: 1,
    shieldPotions: 1,
    tokens: 2,
    shockwaveCharges: 2,
    kills: 0,
    miniBozzKills: 0,
    hasMedallion: false,
    streak: 0,
    weapons: {
      blaster: "Common",
      cannon: null,
      scatter: null,
      railgun: null,
    },
    activeWeapon: "blaster",
    questionsCorrect: 0,
    questionsAttempted: 0,
    alive: true,
    placement: 0,
    speedBoostUntilMs: 0,
    radarUntilMs: 0,
    exposedUntilMs: 0,
    dashCooldownUntilMs: 0,
    dashEndMs: 0,
    dashVx: 0,
    dashVy: 0,
    inBush: false,
    inWater: false,
    lastFireMs: 0,
    lastShotId: "",
    lastShotX: 0,
    lastShotY: 0,
    lastShotVx: 0,
    lastShotVy: 0,
    lastShotAtMs: 0,
  });

  const remotePlayersRef = useRef<StudyPlayerDocument[]>(players);
  const remoteSmoothRef = useRef<Map<string, SmoothEntity>>(new Map());
  const botSmoothRef = useRef<Map<string, SmoothEntity>>(new Map());
  const bossSmoothRef = useRef<Map<string, SmoothEntity>>(new Map());
  const prevRemoteAliveRef = useRef<Map<string, boolean>>(new Map());
  const lastHitRemoteAtRef = useRef<Map<string, number>>(new Map());
  const recentBotHitAtRef = useRef<Map<string, number>>(new Map());
  const recentBossHitAtRef = useRef<Map<string, number>>(new Map());
  const creditedHumanKillsRef = useRef<Set<string>>(new Set());
  const recentlyPlacedWallIdsRef = useRef<Map<string, number>>(new Map());
  const lastEntityShotIdRef = useRef<Map<string, string>>(new Map());
  const syncNowRef = useRef<boolean>(false);
  const playerSyncInFlightRef = useRef<boolean>(false);
  const playerSyncPendingRef = useRef<boolean>(false);
  const worldSyncInFlightRef = useRef<boolean>(false);
  const lastSentPlayerSigRef = useRef<string>("");
  const patchFlushInFlightRef = useRef<boolean>(false);
  const lastPatchFlushMsRef = useRef<number>(0);
  const pendingPatchRef = useRef<{
    botDamages: Map<
      string,
      { id: string; hp: number; shield: number; alive: boolean; placement?: number }
    >;
    miniBozzDamages: Map<string, { id: string; hp: number; shield: number; alive: boolean }>;
    crateStates: Map<string, SyncedCrateState>;
    firewalls: FirewallWall[];
    killFeedEntries: string[];
  }>({
    botDamages: new Map(),
    miniBozzDamages: new Map(),
    crateStates: new Map(),
    firewalls: [],
    killFeedEntries: [],
  });
  const terrainCacheRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCacheRef = useRef<HTMLCanvasElement | null>(null);
  const spawnSyncedRef = useRef<boolean>(Boolean(meFromRoom));
  const canvasSizeRef = useRef<{ cw: number; ch: number; dpr: number }>({
    cw: 960,
    ch: 640,
    dpr: 1,
  });
  const aliveCountRef = useRef<number>(
    players.length + (worldState?.bots?.length || 0)
  );
  const botsRef = useRef<BotState[]>(worldState?.bots || []);
  const miniBozzesRef = useRef<MiniBozzState[]>(
    worldState?.miniBozzes && worldState.miniBozzes.length > 0
      ? worldState.miniBozzes
      : generateMiniBozzes(layout.obstacles)
  );
  const firewallsRef = useRef<FirewallWall[]>(worldState?.firewalls || []);
  const crateStatesRef = useRef<Map<string, SyncedCrateState>>(
    new Map<string, SyncedCrateState>()
  );
  const killFeedRef = useRef<string[]>(worldState?.killFeed || []);
  const projectilesRef = useRef<Projectile[]>([]);
  const seenShotIdsRef = useRef<Set<string>>(new Set());
  const particlesRef = useRef<FloatingParticle[]>([]);
  const labelsRef = useRef<FloatingLabel[]>([]);
  const afterImagesRef = useRef<AfterImage[]>([]);
  const shockwavesRef = useRef<ShockwaveRing[]>([]);
  const lootOrbsRef = useRef<FloorLootOrb[]>([]);
  const shrineCooldownsRef = useRef<Map<string, number>>(new Map());
  const padCooldownsRef = useRef<Map<string, number>>(new Map());

  const screenShakeRef = useRef(0);
  const damageFlashRef = useRef(0);
  const lastPhaseRef = useRef(1);
  const lastFootstepDistRef = useRef(0);
  const lastShieldRegenTickRef = useRef(0);
  const lastStormSfxMsRef = useRef(0);

  const keysRef = useRef<Set<string>>(new Set());
  const mouseScreenRef = useRef<{ x: number; y: number; down: boolean }>({
    x: 450,
    y: 320,
    down: false,
  });
  const cameraRef = useRef<{ x: number; y: number }>({
    x: Math.max(0, (meFromRoom?.x ?? ARENA_SIZE / 2) - 480),
    y: Math.max(0, (meFromRoom?.y ?? ARENA_SIZE / 2) - 320),
  });

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const activeQuizRef = useRef<boolean>(false);
  const showFullMapRef = useRef<boolean>(false);
  const completedReportedRef = useRef(false);
  const matchFinishTriggeredRef = useRef(false);
  const roomRef = useRef(room);
  roomRef.current = room;

  const [showFullMap, setShowFullMap] = useState(false);
  showFullMapRef.current = showFullMap;

  const [activePrompt, setActivePrompt] = useState<{
    mode: "crate" | "boss";
    crate?: ArenaCrate;
    bossId?: string;
    bossName?: string;
    bossStep?: number;
    question: StudyBattleQuestion;
  } | null>(null);
  const [promptFeedback, setPromptFeedback] = useState<{
    correct: boolean;
    headline: string;
    detail: string;
  } | null>(null);
  const [lootBanner, setLootBanner] = useState<{
    title: string;
    detail: string;
    tone: "reward" | "penalty";
  } | null>(null);

  const [eliminatedMode, setEliminatedMode] = useState<"practice" | "spectate">("practice");
  const eliminatedModeRef = useRef<"practice" | "spectate">("practice");
  eliminatedModeRef.current = eliminatedMode;
  const [practiceQuestionIdx, setPracticeQuestionIdx] = useState(() =>
    room.questions.length > 0 ? Math.floor(Math.random() * room.questions.length) : 0
  );
  const [practicePickedIdx, setPracticePickedIdx] = useState<number | null>(null);
  const practicePickedIdxRef = useRef<number | null>(null);
  practicePickedIdxRef.current = practicePickedIdx;
  const [practiceStats, setPracticeStats] = useState({
    correct: 0,
    attempted: 0,
    streak: 0,
  });
  const spectateTargetIdRef = useRef<string | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    hp: 100,
    shield: 0,
    ammo: 0,
    medkits: 1,
    shieldPotions: 1,
    tokens: 2,
    shockwaveCharges: 2,
    kills: 0,
    miniBozzKills: 0,
    hasMedallion: false,
    streak: 0,
    activeWeapon: "blaster",
    weapons: { blaster: "Common", cannon: null, scatter: null, railgun: null },
    questionsCorrect: 0,
    questionsAttempted: 0,
    alive: true,
    aliveCount: players.length + (worldState?.bots?.length || 0),
    totalCount: players.length + (worldState?.bots?.length || 0),
    humanAliveCount: players.filter((p) => p.alive).length,
    humanTotalCount: players.length,
    miniBozzesAlive: miniBozzesRef.current.filter((m) => m.alive).length,
    biomeName: "Bozz Citadel",
    biomeSubtitle: "Drop Live",
    biomeAccent: "#10B981",
    speedSecLeft: 0,
    radarSecLeft: 0,
    exposedSecLeft: 0,
    dashSecLeft: 0,
    inBurnout: false,
    inWater: false,
    inBush: false,
    zonePhase: 1,
    zoneCountdownSec: 48,
    nearbyCrate: null,
    nearbyBoss: null,
    killFeed: worldState?.killFeed || [],
    spectatingName: "",
    spectatingKind: null,
    spectatingHp: 0,
    spectatingShield: 0,
  });

  activeQuizRef.current = Boolean(activePrompt);

  useEffect(() => {
    if (
      !spawnSyncedRef.current &&
      meFromRoom &&
      meFromRoom.alive &&
      meFromRoom.placement === 0
    ) {
      spawnSyncedRef.current = true;
      localRef.current.x = meFromRoom.x;
      localRef.current.y = meFromRoom.y;
      cameraRef.current.x = Math.max(
        0,
        Math.min(ARENA_SIZE - canvasSizeRef.current.cw, meFromRoom.x - canvasSizeRef.current.cw / 2)
      );
      cameraRef.current.y = Math.max(
        0,
        Math.min(ARENA_SIZE - canvasSizeRef.current.ch, meFromRoom.y - canvasSizeRef.current.ch / 2)
      );
    }
  }, [meFromRoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncDims = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cw = Math.max(320, Math.floor(rect.width));
      const ch = Math.max(240, Math.floor(rect.height));
      canvasSizeRef.current = { cw, ch, dpr };
      const targetW = Math.round(cw * dpr);
      const targetH = Math.round(ch * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    syncDims();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncDims);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Pre-render all static arena geometry & minimap base once per layout to boost non-host FPS
  useEffect(() => {
    if (typeof document === "undefined") return;

    const terrain = document.createElement("canvas");
    terrain.width = ARENA_SIZE;
    terrain.height = ARENA_SIZE;
    const tctx = terrain.getContext("2d");
    if (tctx) {
      tctx.fillStyle = "#06080D";
      tctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE);

      for (const biome of layout.biomes) {
        if (biome.kind === "rotunda") continue;
        tctx.fillStyle = biome.floorColor;
        tctx.fillRect(biome.x, biome.y, biome.w, biome.h);

        if (biome.kind === "library") {
          tctx.strokeStyle = "rgba(167, 139, 250, 0.06)";
          tctx.lineWidth = 1;
          for (let py = biome.y; py <= biome.y + biome.h; py += 44) {
            tctx.beginPath();
            tctx.moveTo(biome.x, py);
            tctx.lineTo(biome.x + biome.w, py);
            tctx.stroke();
          }
        } else if (biome.kind === "stadium") {
          tctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
          tctx.lineWidth = 22;
          tctx.beginPath();
          tctx.ellipse(520, 1840, 310, 210, 0, 0, Math.PI * 2);
          tctx.stroke();
        } else if (biome.kind === "lab") {
          tctx.strokeStyle = "rgba(251, 191, 36, 0.065)";
          tctx.lineWidth = 1;
          for (let px = biome.x; px <= biome.x + biome.w; px += 64) {
            tctx.beginPath();
            tctx.moveTo(px, biome.y);
            tctx.lineTo(px, biome.y + biome.h);
            tctx.stroke();
          }
        }
      }

      // Bozz Citadel Center Plaza
      const center = ARENA_SIZE / 2;
      tctx.fillStyle = "#160F24";
      tctx.beginPath();
      tctx.arc(center, center, 315, 0, Math.PI * 2);
      tctx.fill();
      tctx.strokeStyle = "rgba(244, 63, 94, 0.28)";
      tctx.lineWidth = 3;
      tctx.stroke();

      tctx.strokeStyle = "rgba(167, 139, 250, 0.16)";
      tctx.lineWidth = 2;
      tctx.beginPath();
      tctx.arc(center, center, 175, 0, Math.PI * 2);
      tctx.stroke();

      // Tactical Grid
      const tileSize = 100;
      tctx.strokeStyle = "rgba(255,255,255,0.032)";
      tctx.lineWidth = 1;
      for (let c = 0; c <= ARENA_SIZE / tileSize; c++) {
        tctx.beginPath();
        tctx.moveTo(c * tileSize, 0);
        tctx.lineTo(c * tileSize, ARENA_SIZE);
        tctx.stroke();
      }
      for (let r = 0; r <= ARENA_SIZE / tileSize; r++) {
        tctx.beginPath();
        tctx.moveTo(0, r * tileSize);
        tctx.lineTo(ARENA_SIZE, r * tileSize);
        tctx.stroke();
      }

      // Roads
      tctx.lineCap = "round";
      for (const road of layout.roads) {
        tctx.strokeStyle = "#1B1F2A";
        tctx.lineWidth = road.width;
        tctx.beginPath();
        tctx.moveTo(road.x1, road.y1);
        tctx.lineTo(road.x2, road.y2);
        tctx.stroke();

        tctx.strokeStyle = "rgba(226, 232, 240, 0.08)";
        tctx.lineWidth = 2;
        tctx.setLineDash([16, 18]);
        tctx.beginPath();
        tctx.moveTo(road.x1, road.y1);
        tctx.lineTo(road.x2, road.y2);
        tctx.stroke();
        tctx.setLineDash([]);
      }

      // Data Canal River Base
      tctx.lineCap = "round";
      tctx.lineJoin = "round";
      tctx.strokeStyle = "#1E293B";
      tctx.lineWidth = 104;
      tctx.beginPath();
      layout.riverPoints.forEach((pt, idx) => {
        if (idx === 0) tctx.moveTo(pt.x, pt.y);
        else tctx.lineTo(pt.x, pt.y);
      });
      tctx.stroke();
      tctx.strokeStyle = "#082F49";
      tctx.lineWidth = 86;
      tctx.stroke();

      // Bridges
      for (const br of layout.bridges) {
        tctx.fillStyle = "#4A3222";
        tctx.strokeStyle = "#92623D";
        tctx.lineWidth = 3;
        tctx.fillRect(br.x, br.y, br.w, br.h);
        tctx.strokeRect(br.x, br.y, br.w, br.h);
        tctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        tctx.lineWidth = 2;
        for (let sy = br.y + 14; sy < br.y + br.h - 6; sy += 16) {
          tctx.beginPath();
          tctx.moveTo(br.x + 6, sy);
          tctx.lineTo(br.x + br.w - 6, sy);
          tctx.stroke();
        }
      }

      // POI Floor Signs
      tctx.font = "bold 22px Plus Jakarta Sans, sans-serif";
      tctx.textAlign = "center";
      for (const poi of ARENA_POIS) {
        tctx.fillStyle = "rgba(255,255,255,0.065)";
        tctx.fillText(poi.name.toUpperCase(), poi.dropX, poi.dropY - 125);
      }

      // Arena Border
      tctx.strokeStyle = "#8B5CF6";
      tctx.lineWidth = 5;
      tctx.strokeRect(12, 12, ARENA_SIZE - 24, ARENA_SIZE - 24);

      // Static Obstacles
      for (const obs of layout.obstacles) {
        tctx.fillStyle = "rgba(0,0,0,0.45)";
        tctx.fillRect(obs.x + 6, obs.y + 6, obs.w, obs.h);

        if (obs.kind === "wall") {
          tctx.fillStyle = "#242938";
          tctx.strokeStyle = "#475569";
          tctx.lineWidth = 2;
        } else if (obs.kind === "bookshelf") {
          tctx.fillStyle = "#241914";
          tctx.strokeStyle = "#78553A";
          tctx.lineWidth = 2;
        } else if (obs.kind === "server") {
          tctx.fillStyle = "#0F172A";
          tctx.strokeStyle = "#8B5CF6";
          tctx.lineWidth = 2;
        } else if (obs.kind === "bleacher") {
          tctx.fillStyle = "#1E293B";
          tctx.strokeStyle = "#38BDF8";
          tctx.lineWidth = 2;
        } else if (obs.kind === "desk") {
          tctx.fillStyle = "#151D2E";
          tctx.strokeStyle = "#334155";
          tctx.lineWidth = 2;
        } else {
          tctx.fillStyle = "#1E2235";
          tctx.strokeStyle = "#64748B";
          tctx.lineWidth = 2.5;
        }
        tctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        tctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        if (obs.kind === "server") {
          tctx.fillStyle = "#10B981";
          tctx.fillRect(obs.x + 8, obs.y + 10, 8, 5);
          tctx.fillStyle = "#38BDF8";
          tctx.fillRect(obs.x + 8, obs.y + obs.h - 15, 8, 5);
        }
      }
    }
    terrainCacheRef.current = terrain;

    const mmSize = 154;
    const mm = document.createElement("canvas");
    mm.width = mmSize;
    mm.height = mmSize;
    const mctx = mm.getContext("2d");
    if (mctx) {
      const scale = mmSize / ARENA_SIZE;
      mctx.fillStyle = "#080A10";
      mctx.fillRect(0, 0, mmSize, mmSize);
      for (const b of layout.biomes) {
        if (b.kind === "rotunda") continue;
        mctx.fillStyle = b.floorColor;
        mctx.fillRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
      }
      mctx.strokeStyle = "#0369A1";
      mctx.lineWidth = Math.max(4, 86 * scale);
      mctx.lineCap = "round";
      mctx.beginPath();
      layout.riverPoints.forEach((pt, i) => {
        if (i === 0) mctx.moveTo(pt.x * scale, pt.y * scale);
        else mctx.lineTo(pt.x * scale, pt.y * scale);
      });
      mctx.stroke();
      mctx.fillStyle = "#92623D";
      for (const br of layout.bridges) {
        mctx.fillRect(
          br.x * scale,
          br.y * scale,
          Math.max(4, br.w * scale),
          Math.max(4, br.h * scale)
        );
      }
    }
    minimapCacheRef.current = mm;
  }, [layout]);

  const flushPendingWorldPatches = useCallback(
    (forceNow = false) => {
      if (isHost) return;
      const q = pendingPatchRef.current;
      const hasAny =
        q.botDamages.size > 0 ||
        q.miniBozzDamages.size > 0 ||
        q.crateStates.size > 0 ||
        q.firewalls.length > 0 ||
        q.killFeedEntries.length > 0;
      if (!hasAny || patchFlushInFlightRef.current) return;

      const now = Date.now();
      if (!forceNow && now - lastPatchFlushMsRef.current < 200) return;

      const botDamages = Array.from<{
        id: string;
        hp: number;
        shield: number;
        alive: boolean;
        placement?: number;
      }>(q.botDamages.values());
      const miniBozzDamages = Array.from<{
        id: string;
        hp: number;
        shield: number;
        alive: boolean;
      }>(q.miniBozzDamages.values());
      const crateStates = Array.from<SyncedCrateState>(q.crateStates.values());
      const firewallsToAdd = q.firewalls.splice(0, q.firewalls.length);
      const killFeedEntries = q.killFeedEntries.splice(0, q.killFeedEntries.length);
      q.botDamages.clear();
      q.miniBozzDamages.clear();
      q.crateStates.clear();

      patchFlushInFlightRef.current = true;
      lastPatchFlushMsRef.current = now;

      void publishWorldPatch({
        db,
        roomCode: roomRef.current.roomCode,
        botDamages,
        miniBozzDamages,
        crateStates,
        firewallsToAdd,
        killFeedEntries,
      }).finally(() => {
        patchFlushInFlightRef.current = false;
      });
    },
    [db, isHost]
  );

  const queueWorldPatch = useCallback(
    (
      patch: {
        addFirewall?: FirewallWall;
        crateState?: SyncedCrateState;
        miniBozzDamage?: { id: string; hp: number; shield: number; alive: boolean };
        botDamage?: {
          id: string;
          hp: number;
          shield: number;
          alive: boolean;
          placement?: number;
        };
        killFeedEntry?: string;
      },
      immediate = false
    ) => {
      const q = pendingPatchRef.current;
      if (patch.addFirewall) {
        q.firewalls.push(patch.addFirewall);
      }
      if (patch.crateState) {
        q.crateStates.set(patch.crateState.crateId, patch.crateState);
      }
      if (patch.miniBozzDamage) {
        q.miniBozzDamages.set(patch.miniBozzDamage.id, patch.miniBozzDamage);
      }
      if (patch.botDamage) {
        q.botDamages.set(patch.botDamage.id, patch.botDamage);
      }
      if (patch.killFeedEntry) {
        q.killFeedEntries.push(patch.killFeedEntry);
      }
      if (immediate) {
        flushPendingWorldPatches(true);
      }
    },
    [flushPendingWorldPatches]
  );

  const applyPlayersSnapshot = useCallback(
    (nextPlayers: StudyPlayerDocument[]) => {
      remotePlayersRef.current = nextPlayers;
      const now = Date.now();
      if (seenShotIdsRef.current.size > 500) {
        seenShotIdsRef.current.clear();
      }
      const meSnap = nextPlayers.find((p) => p.playerId === currentPlayerId);
      if (
        !spawnSyncedRef.current &&
        meSnap &&
        meSnap.alive &&
        meSnap.placement === 0
      ) {
        spawnSyncedRef.current = true;
        localRef.current.x = meSnap.x;
        localRef.current.y = meSnap.y;
        cameraRef.current.x = Math.max(
          0,
          Math.min(ARENA_SIZE - canvasSizeRef.current.cw, meSnap.x - canvasSizeRef.current.cw / 2)
        );
        cameraRef.current.y = Math.max(
          0,
          Math.min(ARENA_SIZE - canvasSizeRef.current.ch, meSnap.y - canvasSizeRef.current.ch / 2)
        );
      }
      for (const p of nextPlayers) {
        if (p.playerId === currentPlayerId) continue;

        upsertSmoothEntity(
          remoteSmoothRef.current,
          p.playerId,
          p.x,
          p.y,
          p.aimAngle,
          now
        );

        const prevAlive = prevRemoteAliveRef.current.get(p.playerId);
        if (prevAlive === true && !p.alive) {
          const hitAt = lastHitRemoteAtRef.current.get(p.playerId) || 0;
          if (
            now - hitAt < 3500 &&
            !creditedHumanKillsRef.current.has(p.playerId)
          ) {
            creditedHumanKillsRef.current.add(p.playerId);
            const local = localRef.current;
            local.kills += 1;
            local.shield = Math.min(100, local.shield + 20);
            local.hp = Math.min(100, local.hp + 10);
            local.tokens = Math.min(12, local.tokens + 1);
            playBattleSfx("elim", mutedRef.current);
            labelsRef.current.push({
              x: local.x,
              y: local.y - 22,
              text: `ELIMINATED ${p.displayName}! +20 SHD`,
              color: "#10B981",
              life: 1.1,
              maxLife: 1.1,
            });
          }
        }
        prevRemoteAliveRef.current.set(p.playerId, p.alive);

        const prevShot = lastEntityShotIdRef.current.get(p.playerId);
        if (p.lastShotId && p.lastShotId !== prevShot) {
          lastEntityShotIdRef.current.set(p.playerId, p.lastShotId);
          const isFreshInitial =
            prevShot !== undefined || Math.abs(now - p.lastShotAtMs) < 2500;
          if (isFreshInitial && !seenShotIdsRef.current.has(p.lastShotId)) {
            seenShotIdsRef.current.add(p.lastShotId);
            const decoded = decodeShotId(p.lastShotId);
            const weaponCfg = WEAPON_META[decoded.archetype];
            const estLagSec = Math.max(0, Math.min(0.14, (now - p.lastShotAtMs) / 1000));
            const lifeTrim = Math.max(0, Math.min(220, now - p.lastShotAtMs));
            const maxLife = Math.max(350, (weaponCfg.maxLifeMs || 1100) - lifeTrim);

            if (decoded.archetype === "scatter") {
              const baseAng = Math.atan2(p.lastShotVy, p.lastShotVx);
              const spd = Math.hypot(p.lastShotVx, p.lastShotVy) || weaponCfg.speed;
              for (let i = 0; i < weaponCfg.pellets; i++) {
                const offset =
                  ((i / Math.max(1, weaponCfg.pellets - 1)) - 0.5) * weaponCfg.spreadRad;
                const vx = Math.cos(baseAng + offset) * spd;
                const vy = Math.sin(baseAng + offset) * spd;
                projectilesRef.current.push({
                  id: `${p.lastShotId}_p${i}`,
                  ownerId: p.playerId,
                  ownerName: p.displayName,
                  isBot: false,
                  x: p.lastShotX + vx * estLagSec,
                  y: p.lastShotY + vy * estLagSec,
                  vx,
                  vy,
                  damage: decoded.damage,
                  archetype: "scatter",
                  rarity: decoded.rarity,
                  splashRadius: 0,
                  maxLifeMs: maxLife,
                  createdAtMs: now,
                });
              }
            } else {
              projectilesRef.current.push({
                id: p.lastShotId,
                ownerId: p.playerId,
                ownerName: p.displayName,
                isBot: false,
                x: p.lastShotX + p.lastShotVx * estLagSec,
                y: p.lastShotY + p.lastShotVy * estLagSec,
                vx: p.lastShotVx,
                vy: p.lastShotVy,
                damage: decoded.damage,
                archetype: decoded.archetype,
                rarity: decoded.rarity,
                splashRadius: weaponCfg.splashRadius,
                maxLifeMs: maxLife,
                createdAtMs: now,
              });
            }
          }
        }
      }
    },
    [currentPlayerId]
  );

  const applyWorldSnapshot = useCallback(
    (nextWorld: StudyWorldStateDocument | null) => {
      if (!nextWorld) return;
      const now = Date.now();

      if (!isHost) {
        const incomingBots = nextWorld.bots || [];
        botsRef.current = incomingBots.map((inc) => {
          upsertSmoothEntity(
            botSmoothRef.current,
            inc.id,
            inc.x,
            inc.y,
            inc.aimAngle,
            now
          );
          const hitAt = recentBotHitAtRef.current.get(inc.id) || 0;
          const cur = botsRef.current.find((b) => b.id === inc.id);
          if (cur && now - hitAt < 1800) {
            const curEhp = cur.hp + cur.shield;
            const incEhp = inc.hp + inc.shield;
            if (curEhp < incEhp || (!cur.alive && inc.alive)) {
              return {
                ...inc,
                hp: cur.hp,
                shield: cur.shield,
                alive: cur.alive && inc.alive,
              };
            }
          }
          return inc;
        });

        if (nextWorld.miniBozzes && nextWorld.miniBozzes.length > 0) {
          miniBozzesRef.current = nextWorld.miniBozzes.map((inc) => {
            upsertSmoothEntity(
              bossSmoothRef.current,
              inc.id,
              inc.x,
              inc.y,
              inc.aimAngle,
              now
            );
            const hitAt = recentBossHitAtRef.current.get(inc.id) || 0;
            const cur = miniBozzesRef.current.find((m) => m.id === inc.id);
            if (cur && now - hitAt < 1800) {
              const curEhp = cur.hp + cur.shield;
              const incEhp = inc.hp + inc.shield;
              if (curEhp < incEhp || (!cur.alive && inc.alive)) {
                return {
                  ...inc,
                  hp: cur.hp,
                  shield: cur.shield,
                  alive: cur.alive && inc.alive,
                };
              }
            }
            return inc;
          });
        }

        const incomingWalls = (nextWorld.firewalls || []).filter(
          (fw) => fw.hp > 0 && fw.expiresAtMs > now
        );
        const keptLocal = firewallsRef.current.filter((fw) => {
          const graceUntil = recentlyPlacedWallIdsRef.current.get(fw.id) || 0;
          return (
            fw.hp > 0 &&
            fw.expiresAtMs > now &&
            graceUntil > now &&
            !incomingWalls.some((inc) => inc.id === fw.id)
          );
        });
        firewallsRef.current = [...incomingWalls, ...keptLocal];
      } else {
        if (botsRef.current.length === 0 && (nextWorld.bots?.length || 0) > 0) {
          botsRef.current = nextWorld.bots;
        } else if (nextWorld.bots && nextWorld.bots.length > 0) {
          for (const inc of nextWorld.bots) {
            const cur = botsRef.current.find((b) => b.id === inc.id);
            if (cur) {
              const curEhp = cur.hp + cur.shield;
              const incEhp = inc.hp + inc.shield;
              if (incEhp < curEhp) {
                cur.hp = inc.hp;
                cur.shield = inc.shield;
              }
              if (!inc.alive && cur.alive) {
                cur.alive = false;
                cur.hp = 0;
                cur.shield = 0;
                cur.placement = inc.placement || cur.placement;
              }
            }
          }
        }

        if (
          miniBozzesRef.current.length === 0 &&
          (nextWorld.miniBozzes?.length || 0) > 0
        ) {
          miniBozzesRef.current = nextWorld.miniBozzes;
        } else if (nextWorld.miniBozzes && nextWorld.miniBozzes.length > 0) {
          for (const inc of nextWorld.miniBozzes) {
            const cur = miniBozzesRef.current.find((m) => m.id === inc.id);
            if (cur) {
              const curEhp = cur.hp + cur.shield;
              const incEhp = inc.hp + inc.shield;
              if (incEhp < curEhp) {
                cur.hp = inc.hp;
                cur.shield = inc.shield;
              }
              if (!inc.alive && cur.alive) {
                cur.alive = false;
                cur.hp = 0;
                cur.shield = 0;
              }
            }
          }
        }
        for (const fw of nextWorld.firewalls || []) {
          if (
            fw.hp > 0 &&
            fw.expiresAtMs > now &&
            !firewallsRef.current.some((cur) => cur.id === fw.id)
          ) {
            firewallsRef.current.push(fw);
          }
        }
      }

      const map = crateStatesRef.current;
      for (const cs of nextWorld.crateStates || []) {
        const prev = map.get(cs.crateId);
        map.set(cs.crateId, {
          crateId: cs.crateId,
          lockedUntilMs: Math.max(prev?.lockedUntilMs || 0, cs.lockedUntilMs),
          depletedUntilMs: Math.max(prev?.depletedUntilMs || 0, cs.depletedUntilMs),
        });
      }

      if (!isHost) {
        killFeedRef.current = nextWorld.killFeed || [];
        for (const b of nextWorld.bots || []) {
          const prevShot = lastEntityShotIdRef.current.get(b.id);
          if (b.lastShotId && b.lastShotId !== prevShot) {
            lastEntityShotIdRef.current.set(b.id, b.lastShotId);
            const isFresh =
              prevShot !== undefined || Math.abs(now - b.lastShotAtMs) < 2500;
            if (isFresh && !seenShotIdsRef.current.has(b.lastShotId)) {
              seenShotIdsRef.current.add(b.lastShotId);
              const estLagSec = Math.max(
                0,
                Math.min(0.14, (now - b.lastShotAtMs) / 1000)
              );
              const lifeTrim = Math.max(0, Math.min(200, now - b.lastShotAtMs));
              projectilesRef.current.push({
                id: b.lastShotId,
                ownerId: b.id,
                ownerName: b.name,
                isBot: true,
                x: b.lastShotX + b.lastShotVx * estLagSec,
                y: b.lastShotY + b.lastShotVy * estLagSec,
                vx: b.lastShotVx,
                vy: b.lastShotVy,
                damage: 15,
                archetype: b.weaponArchetype || "blaster",
                rarity: b.weaponRarity || "Common",
                maxLifeMs: Math.max(400, 1100 - lifeTrim),
                createdAtMs: now,
              });
            }
          }
        }
        for (const mb of nextWorld.miniBozzes || []) {
          const prevShot = lastEntityShotIdRef.current.get(mb.id);
          if (mb.lastShotId && mb.lastShotId !== prevShot) {
            lastEntityShotIdRef.current.set(mb.id, mb.lastShotId);
            const isFresh =
              prevShot !== undefined || Math.abs(now - mb.lastShotAtMs) < 2500;
            if (isFresh && !seenShotIdsRef.current.has(mb.lastShotId)) {
              seenShotIdsRef.current.add(mb.lastShotId);
              const estLagSec = Math.max(
                0,
                Math.min(0.14, (now - mb.lastShotAtMs) / 1000)
              );
              const lifeTrim = Math.max(0, Math.min(200, now - mb.lastShotAtMs));
              projectilesRef.current.push({
                id: mb.lastShotId,
                ownerId: mb.id,
                ownerName: mb.name,
                isBot: true,
                isMiniBozz: true,
                x: mb.lastShotX + mb.lastShotVx * estLagSec,
                y: mb.lastShotY + mb.lastShotVy * estLagSec,
                vx: mb.lastShotVx,
                vy: mb.lastShotVy,
                damage: 22,
                archetype: "cannon",
                rarity: "Mythic",
                maxLifeMs: Math.max(400, 1100 - lifeTrim),
                createdAtMs: now,
              });
            }
          }
        }
      }
    },
    [isHost]
  );

  useEffect(() => {
    applyPlayersSnapshot(players);
  }, [players, applyPlayersSnapshot]);

  useEffect(() => {
    applyWorldSnapshot(worldState);
  }, [worldState, applyWorldSnapshot]);

  useEffect(() => {
    if (!registerLiveStream) return;
    return registerLiveStream({
      onPlayers: applyPlayersSnapshot,
      onWorld: applyWorldSnapshot,
    });
  }, [registerLiveStream, applyPlayersSnapshot, applyWorldSnapshot]);

  const spawnBurst = useCallback(
    (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 170;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.38,
          maxLife: 0.38,
          color,
          radius: 2.2 + Math.random() * 2.8,
        });
      }
    },
    []
  );

  const spawnLabel = useCallback((x: number, y: number, text: string, color: string) => {
    labelsRef.current.push({
      x,
      y: y - 22,
      text,
      color,
      life: 1.1,
      maxLife: 1.1,
    });
  }, []);

  const spawnShockwave = useCallback(
    (x: number, y: number, maxRadius: number, color: string) => {
      shockwavesRef.current.push({
        x,
        y,
        radius: 12,
        maxRadius,
        life: 0.32,
        maxLife: 0.32,
        color,
      });
    },
    []
  );

  const spawnLootOrb = useCallback(
    (
      x: number,
      y: number,
      opts?: {
        ammo?: number;
        shield?: number;
        hp?: number;
        tokens?: number;
        medallion?: boolean;
        weaponArchetype?: WeaponArchetype;
        weaponRarity?: LootRarity;
      }
    ) => {
      lootOrbsRef.current.push({
        id: `orb_${Date.now()}_${Math.floor(Math.random() * 99999)}`,
        x: x + (Math.random() - 0.5) * 28,
        y: y + (Math.random() - 0.5) * 28,
        ammo: opts?.ammo ?? 9,
        shield: opts?.shield ?? 20,
        hp: opts?.hp ?? 12,
        tokens: opts?.tokens ?? 1,
        medallion: opts?.medallion,
        weaponArchetype: opts?.weaponArchetype,
        weaponRarity: opts?.weaponRarity,
        createdAtMs: Date.now(),
      });
    },
    []
  );

  const pushKillFeed = useCallback((entry: string) => {
    killFeedRef.current = [entry, ...killFeedRef.current].slice(0, 6);
  }, []);

  const showToast = useCallback(
    (title: string, detail: string, tone: "reward" | "penalty") => {
      setLootBanner({ title, detail, tone });
      setTimeout(() => {
        setLootBanner((prev) => (prev?.title === title ? null : prev));
      }, 3600);
    },
    []
  );

  const handleMiniBozzDefeated = useCallback(
    (mb: MiniBozzState, defeatedByName: string, byLocal: boolean) => {
      mb.alive = false;
      mb.hp = 0;
      mb.shield = 0;
      const mythics: WeaponArchetype[] = ["railgun", "cannon", "scatter", "blaster"];
      const mythicArchetype = mythics[Math.floor(Math.random() * mythics.length)];
      const weaponName = WEAPON_META[mythicArchetype].name;

      spawnBurst(mb.x, mb.y, "#FB7185", 26);
      spawnShockwave(mb.x, mb.y, 120, "#FBBF24");
      pushKillFeed(`${defeatedByName} defeated Mini-Bozz ${mb.name}!`);
      playBattleSfx("bossDown", mutedRef.current);

      if (byLocal) {
        const local = localRef.current;
        local.miniBozzKills += 1;
        local.hasMedallion = true;
        local.weapons[mythicArchetype] = "Mythic";
        local.activeWeapon = mythicArchetype;
        local.ammo = Math.min(500, local.ammo + 26);
        local.tokens = Math.min(12, local.tokens + 3);
        local.shield = Math.min(100, local.shield + 50);
        spawnLabel(local.x, local.y, `MYTHIC ${weaponName.toUpperCase()} + MEDALLION!`, "#FBBF24");
        showToast(
          `Mini-Bozz ${mb.name} Defeated!`,
          `Mythic ${weaponName} + Bozz Medallion (Shield Regen + Gold Ring)`,
          "reward"
        );
      } else {
        spawnLootOrb(mb.x, mb.y, {
          ammo: 24,
          shield: 50,
          hp: 30,
          tokens: 3,
          medallion: true,
          weaponArchetype: mythicArchetype,
          weaponRarity: "Mythic",
        });
      }
    },
    [pushKillFeed, showToast, spawnBurst, spawnLabel, spawnLootOrb, spawnShockwave]
  );

  const openNearbyCrate = useCallback(
    (crateOverride?: ArenaCrate) => {
      const local = localRef.current;
      if (!local.alive || activePrompt) return;
      const now = Date.now();

      let target = crateOverride || null;
      if (!target) {
        let bestDist = 84;
        for (const c of layout.crates) {
          const d = Math.hypot(c.x - local.x, c.y - local.y);
          if (d < bestDist) {
            bestDist = d;
            target = c;
          }
        }
      }
      if (!target) return;

      const state = crateStatesRef.current.get(target.id);
      if (state && state.lockedUntilMs > now) {
        const sec = ((state.lockedUntilMs - now) / 1000).toFixed(1);
        showToast("Terminal Locked", `Alarm lockout ends in ${sec}s`, "penalty");
        playBattleSfx("lock", mutedRef.current);
        return;
      }
      if (state && state.depletedUntilMs > now) {
        const sec = Math.ceil((state.depletedUntilMs - now) / 1000);
        showToast("Cache Recharging", `Restocks in ${sec}s`, "penalty");
        return;
      }

      const pool = roomRef.current.questions;
      const q = pool[Math.floor(Math.random() * pool.length)];
      if (!q) return;

      playBattleSfx("crate", mutedRef.current);
      setPromptFeedback(null);
      setActivePrompt({ mode: "crate", crate: target, question: q });
    },
    [activePrompt, layout.crates, showToast]
  );

  const openNearbyBossQuiz = useCallback(
    (bossOverride?: MiniBozzState) => {
      const local = localRef.current;
      if (!local.alive || activePrompt) return;
      let target = bossOverride || null;
      if (!target) {
        let bestDist = 145;
        for (const mb of miniBozzesRef.current) {
          if (!mb.alive) continue;
          const d = Math.hypot(mb.x - local.x, mb.y - local.y);
          if (d < bestDist) {
            bestDist = d;
            target = mb;
          }
        }
      }
      if (!target || !target.alive) return;
      const pool = roomRef.current.questions;
      const q = pool[Math.floor(Math.random() * pool.length)];
      if (!q) return;
      playBattleSfx("crate", mutedRef.current);
      setPromptFeedback(null);
      setActivePrompt({
        mode: "boss",
        bossId: target.id,
        bossName: target.name,
        bossStep: 1,
        question: q,
      });
    },
    [activePrompt]
  );

  const handleUseShieldPotion = useCallback(() => {
    const local = localRef.current;
    if (!local.alive || local.shieldPotions <= 0) return;
    if (local.shield >= 100) {
      showToast("Shields Full", "Gbozz Shield bar is already at 100.", "reward");
      return;
    }
    local.shieldPotions -= 1;
    local.shield = Math.min(100, local.shield + 50);
    playBattleSfx("potion", mutedRef.current);
    spawnBurst(local.x, local.y, "#38BDF8", 14);
    spawnLabel(local.x, local.y, "+50 SHIELD", "#38BDF8");
  }, [showToast, spawnBurst, spawnLabel]);

  const handleUseMedkit = useCallback(() => {
    const local = localRef.current;
    if (!local.alive || local.medkits <= 0) return;
    if (local.hp >= 100) {
      showToast("HP Full", "Health is already at 100.", "reward");
      return;
    }
    local.medkits -= 1;
    local.hp = Math.min(100, local.hp + 45);
    playBattleSfx("potion", mutedRef.current);
    spawnBurst(local.x, local.y, "#10B981", 14);
    spawnLabel(local.x, local.y, "+45 HP", "#10B981");
  }, [showToast, spawnBurst, spawnLabel]);

  const handleDeployFirewall = useCallback(() => {
    const local = localRef.current;
    const now = Date.now();
    if (!local.alive || activeQuizRef.current) return;
    if (local.tokens <= 0) {
      showToast("No Firewall Tokens", "Answer crates/terminals to earn Tokens.", "penalty");
      return;
    }

    local.tokens -= 1;
    const horizontal = Math.abs(Math.sin(local.aimAngle)) >= Math.abs(Math.cos(local.aimAngle));
    const w = horizontal ? 116 : 22;
    const h = horizontal ? 22 : 116;
    const placeDist = 56;
    const cx = Math.max(80, Math.min(ARENA_SIZE - 80, local.x + Math.cos(local.aimAngle) * placeDist));
    const cy = Math.max(80, Math.min(ARENA_SIZE - 80, local.y + Math.sin(local.aimAngle) * placeDist));

    const wall: FirewallWall = {
      id: `fw_${currentPlayerId}_${now}_${Math.floor(Math.random() * 999)}`,
      ownerId: currentPlayerId,
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      w,
      h,
      hp: 180,
      maxHp: 180,
      expiresAtMs: now + 15000,
      color: "#38BDF8",
    };

    recentlyPlacedWallIdsRef.current.set(wall.id, now + 3500);
    firewallsRef.current = [
      ...firewallsRef.current.filter((fw) => fw.hp > 0 && fw.expiresAtMs > now),
      wall,
    ].slice(-24);

    if (!isHost) {
      queueWorldPatch({ addFirewall: wall }, true);
    }

    playBattleSfx("buildWall", mutedRef.current);
    spawnBurst(cx, cy, "#38BDF8", 12);
    spawnLabel(cx, cy, "FIREWALL DEPLOYED", "#38BDF8");
  }, [currentPlayerId, isHost, queueWorldPatch, showToast, spawnBurst, spawnLabel]);

  const handleDash = useCallback(() => {
    const local = localRef.current;
    const now = Date.now();
    if (!local.alive || activeQuizRef.current) return;
    if (local.shockwaveCharges <= 0 && now < local.dashCooldownUntilMs) {
      return;
    }
    const keys = keysRef.current;
    let dx = 0;
    let dy = 0;
    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;

    const ang = dx !== 0 || dy !== 0 ? Math.atan2(dy, dx) : local.aimAngle;
    const usedCharge = local.shockwaveCharges > 0;
    if (usedCharge) {
      local.shockwaveCharges -= 1;
    } else {
      local.dashCooldownUntilMs = now + 4200;
    }
    local.dashVx = Math.cos(ang) * (usedCharge ? 880 : 740);
    local.dashVy = Math.sin(ang) * (usedCharge ? 880 : 740);
    local.dashEndMs = now + 220;

    // Shockwave pushback on nearby bots when using a Shockwave charge
    if (usedCharge) {
      spawnShockwave(local.x, local.y, 130, "#38BDF8");
      if (isHost) {
        for (const bot of botsRef.current) {
          if (!bot.alive) continue;
          const d = Math.hypot(bot.x - local.x, bot.y - local.y);
          if (d < 135 && d > 1) {
            const pushAng = Math.atan2(bot.y - local.y, bot.x - local.x);
            const resolved = resolveCircleObstacles(
              bot.x + Math.cos(pushAng) * 85,
              bot.y + Math.sin(pushAng) * 85,
              PLAYER_RADIUS,
              layout.obstacles
            );
            bot.x = resolved.x;
            bot.y = resolved.y;
          }
        }
      }
    }

    playBattleSfx("dash", mutedRef.current);
    spawnBurst(local.x, local.y, "#38BDF8", 10);
  }, [isHost, layout.obstacles, spawnBurst, spawnShockwave]);

  const handleSelectWeaponSlot = useCallback((archetype: WeaponArchetype) => {
    const local = localRef.current;
    if (!local.weapons[archetype]) return;
    local.activeWeapon = archetype;
    playBattleSfx("tick", mutedRef.current);
  }, []);

  const handleAnswerPrompt = useCallback(
    (optionIndex: number) => {
      if (!activePrompt || promptFeedback) return;
      const local = localRef.current;
      const now = Date.now();
      const { mode, question } = activePrompt;
      const isCorrect = optionIndex === question.correctIndex;
      local.questionsAttempted += 1;

      if (mode === "boss") {
        const mb = miniBozzesRef.current.find((b) => b.id === activePrompt.bossId);
        if (isCorrect) {
          local.questionsCorrect += 1;
          local.streak += 1;
          const surgeDmg = 210;
          let defeated = false;
          if (mb && mb.alive) {
            let rem = surgeDmg;
            if (mb.shield > 0) {
              const abs = Math.min(mb.shield, rem);
              mb.shield -= abs;
              rem -= abs;
            }
            if (rem > 0) {
              mb.hp = Math.max(0, mb.hp - rem);
            }
            spawnBurst(mb.x, mb.y, "#FBBF24", 18);
            spawnLabel(mb.x, mb.y, `-${surgeDmg} QUIZ OVERLOAD!`, "#FBBF24");
            if (mb.hp <= 0) {
              defeated = true;
              handleMiniBozzDefeated(mb, meFromRoom?.displayName || "You", true);
            }
            if (!isHost) {
              recentBossHitAtRef.current.set(mb.id, now);
              queueWorldPatch(
                {
                  miniBozzDamage: {
                    id: mb.id,
                    hp: mb.hp,
                    shield: mb.shield,
                    alive: mb.alive,
                  },
                  killFeedEntry: defeated
                    ? `${meFromRoom?.displayName || "Player"} defeated Mini-Bozz ${mb.name}!`
                    : undefined,
                },
                true
              );
            }
          }

          if (defeated || !mb || !mb.alive) {
            setPromptFeedback({
              correct: true,
              headline: `Mini-Bozz ${activePrompt.bossName} Overloaded! Mythic Loot + Bozz Medallion`,
              detail:
                question.memoryHook ||
                question.explanation ||
                "Shield regeneration & Gold Medallion radar aura activated!",
            });
            setTimeout(() => {
              setActivePrompt(null);
              setPromptFeedback(null);
            }, 950);
          } else {
            // Chain second rapid-fire question immediately to finish Mini-Bozz!
            playBattleSfx("streak", mutedRef.current);
            const pool = roomRef.current.questions;
            const nextQ = pool[Math.floor(Math.random() * pool.length)] || question;
            setPromptFeedback({
              correct: true,
              headline: `210 Surge Hit! Rapid-Fire Follow-up Loading...`,
              detail: question.memoryHook || "One more correct answer to claim the Bozz Medallion!",
            });
            setTimeout(() => {
              setPromptFeedback(null);
              setActivePrompt({
                mode: "boss",
                bossId: mb.id,
                bossName: mb.name,
                bossStep: (activePrompt.bossStep || 1) + 1,
                question: nextQ,
              });
            }, 650);
          }
        } else {
          local.streak = 0;
          local.hp = Math.max(0, local.hp - 14);
          local.exposedUntilMs = now + 5500;
          damageFlashRef.current = 0.35;
          screenShakeRef.current = 7;
          playBattleSfx("wrong", mutedRef.current);
          spawnLabel(local.x, local.y, "-14 HP · BOSS COUNTER", "#EF4444");
          if (local.hp <= 0) {
            local.alive = false;
            const aliveOthers =
              remotePlayersRef.current.filter(
                (p) => p.alive && p.playerId !== currentPlayerId
              ).length + botsRef.current.filter((b) => b.alive).length;
            local.placement = Math.max(1, aliveOthers + 1);
            pushKillFeed(`${meFromRoom?.displayName || "Player"} fell to ${activePrompt.bossName}`);
          }
          setPromptFeedback({
            correct: false,
            headline: "Mini-Bozz Counterattack! -14 HP & Alarm Ping",
            detail: `Correct: ${question.options[question.correctIndex]}`,
          });
          setTimeout(() => {
            setActivePrompt(null);
            setPromptFeedback(null);
          }, 1250);
        }
        return;
      }

      // Crate / Gbozz Terminal Answer Handling
      const crate = activePrompt.crate!;
      if (isCorrect) {
        local.questionsCorrect += 1;
        local.streak += 1;
        const isTerm = crate.kind === "terminal";
        const rarity = rollCrateLootRarity(isTerm, local.streak);
        const archetypes: WeaponArchetype[] = ["blaster", "cannon", "scatter", "railgun"];
        const droppedArchetype =
          archetypes[Math.floor(Math.random() * archetypes.length)];

        const prevRarity = local.weapons[droppedArchetype];
        const prevRank = prevRarity ? RARITY_META[prevRarity].rank : 0;
        const newRank = RARITY_META[rarity].rank;
        const upgradedWeapon = newRank > prevRank;
        if (upgradedWeapon) {
          local.weapons[droppedArchetype] = rarity;
          local.activeWeapon = droppedArchetype;
        }

        const ammoGain = (isTerm ? 18 : 12) + Math.min(8, local.streak * 2);
        const tokenGain = isTerm ? 2 : 1;
        local.ammo = Math.min(500, local.ammo + ammoGain);
        local.tokens = Math.min(12, local.tokens + tokenGain);

        let healText = "";
        if (local.shield < 95) {
          const shdGain = isTerm ? 45 : 30;
          local.shield = Math.min(100, local.shield + shdGain);
          healText = `+${shdGain} Shield`;
        } else {
          local.shieldPotions = Math.min(4, local.shieldPotions + 1);
          healText = "+1 Shield Potion [Q]";
        }

        if (local.hp < 90) {
          local.hp = Math.min(100, local.hp + 18);
        } else {
          local.medkits = Math.min(4, local.medkits + 1);
        }

        let utilityText = "";
        const utilRoll = Math.random();
        if (isTerm || utilRoll < 0.36) {
          local.radarUntilMs = Math.max(local.radarUntilMs, now) + 12000;
          utilityText = "Radar Ping";
        } else if (utilRoll < 0.7) {
          local.shockwaveCharges = Math.min(4, local.shockwaveCharges + 1);
          utilityText = "+1 Shockwave [Shift]";
        } else {
          local.speedBoostUntilMs = Math.max(local.speedBoostUntilMs, now) + 8000;
          utilityText = "Speed Surge";
        }

        const unlockedState: SyncedCrateState = {
          crateId: crate.id,
          lockedUntilMs: 0,
          depletedUntilMs: now + 22000,
        };
        crateStatesRef.current.set(crate.id, unlockedState);
        if (!isHost) {
          queueWorldPatch({ crateState: unlockedState }, true);
        }

        const rarityColor = RARITY_META[rarity].color;
        const weaponTitle = `${rarity} ${WEAPON_META[droppedArchetype].name}`;
        playBattleSfx(
          newRank >= 3 ? "rareDrop" : local.streak >= 3 ? "streak" : "correct",
          mutedRef.current
        );
        spawnBurst(crate.x, crate.y, rarityColor, 18);
        spawnLabel(
          local.x,
          local.y,
          upgradedWeapon ? weaponTitle.toUpperCase() : `+${ammoGain} AMMO · +${tokenGain} TOKENS`,
          rarityColor
        );

        const summaryText = `${weaponTitle} · +${ammoGain} Ammo · +${tokenGain} Tokens · ${healText} · ${utilityText}`;
        setPromptFeedback({
          correct: true,
          headline: `${rarity} Cache Unlocked (${local.streak}x Streak)`,
          detail: `${summaryText}${question.memoryHook ? ` — ${question.memoryHook}` : ""}`,
        });
        showToast(`${weaponTitle} Equipped!`, summaryText, "reward");
      } else {
        local.streak = 0;
        const lockedState: SyncedCrateState = {
          crateId: crate.id,
          lockedUntilMs: now + 5000,
          depletedUntilMs: 0,
        };
        crateStatesRef.current.set(crate.id, lockedState);
        if (!isHost) {
          queueWorldPatch({ crateState: lockedState }, true);
        }
        local.hp = Math.max(0, local.hp - 10);
        local.exposedUntilMs = now + 6000;
        syncNowRef.current = true;
        damageFlashRef.current = 0.35;
        screenShakeRef.current = 7;

        if (local.hp <= 0) {
          local.alive = false;
          const aliveOthers =
            remotePlayersRef.current.filter(
              (p) => p.alive && p.playerId !== currentPlayerId
            ).length + botsRef.current.filter((b) => b.alive).length;
          local.placement = Math.max(1, aliveOthers + 1);
          pushKillFeed(`${meFromRoom?.displayName || "Player"} tripped a Gbozz Alarm`);
        }

        playBattleSfx("wrong", mutedRef.current);
        spawnBurst(local.x, local.y, "#EF4444", 12);
        spawnLabel(local.x, local.y, "LOCKED 5s · ALARM PING!", "#EF4444");

        setPromptFeedback({
          correct: false,
          headline: "Wrong Answer · Locked 5s · Alarm Ping on Minimap!",
          detail: `Correct: ${question.options[question.correctIndex]}${
            question.memoryHook ? ` — ${question.memoryHook}` : ""
          }`,
        });
        showToast(
          "Security Alarm Triggered!",
          "Terminal locked 5s and rivals can see your ping on minimap.",
          "penalty"
        );
      }

      setTimeout(() => {
        setActivePrompt(null);
        setPromptFeedback(null);
      }, isCorrect ? 850 : 1400);
    },
    [
      activePrompt,
      promptFeedback,
      currentPlayerId,
      isHost,
      meFromRoom?.displayName,
      handleMiniBozzDefeated,
      pushKillFeed,
      queueWorldPatch,
      showToast,
      spawnBurst,
      spawnLabel,
    ]
  );

  const activePracticeQuestion =
    room.questions[practiceQuestionIdx % Math.max(1, room.questions.length)] ||
    room.questions[0];

  const handleNextPracticeQuestion = useCallback(() => {
    const total = room.questions.length;
    setPracticePickedIdx(null);
    if (total > 1) {
      setPracticeQuestionIdx((prev) => (prev + 1) % total);
    }
  }, [room.questions.length]);

  const handleAnswerPractice = useCallback(
    (optionIndex: number) => {
      if (practicePickedIdxRef.current !== null || !activePracticeQuestion) return;
      setPracticePickedIdx(optionIndex);
      const isCorrect = optionIndex === activePracticeQuestion.correctIndex;
      playBattleSfx(isCorrect ? "correct" : "wrong", mutedRef.current);
      setPracticeStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        attempted: prev.attempted + 1,
        streak: isCorrect ? prev.streak + 1 : 0,
      }));
    },
    [activePracticeQuestion]
  );

  const getSpectateCandidates = useCallback(() => {
    const humans = remotePlayersRef.current
      .filter((p) => p.alive && p.playerId !== currentPlayerId)
      .map((p) => {
        const sm = remoteSmoothRef.current.get(p.playerId);
        return {
          id: p.playerId,
          name: p.displayName,
          kind: "Friend" as const,
          hp: Math.ceil(p.hp),
          shield: Math.ceil(p.shield),
          x: sm ? sm.x : p.x,
          y: sm ? sm.y : p.y,
        };
      });
    const bots = botsRef.current
      .filter((b) => b.alive)
      .map((b) => {
        const sm = !isHost ? botSmoothRef.current.get(b.id) : null;
        return {
          id: b.id,
          name: b.name,
          kind: "Bot" as const,
          hp: Math.ceil(b.hp),
          shield: Math.ceil(b.shield),
          x: sm ? sm.x : b.x,
          y: sm ? sm.y : b.y,
        };
      });
    return [...humans, ...bots];
  }, [currentPlayerId, isHost]);

  const cycleSpectateTarget = useCallback(
    (dir: -1 | 1) => {
      const candidates = getSpectateCandidates();
      if (candidates.length === 0) return;
      const curIdx = candidates.findIndex(
        (c) => c.id === spectateTargetIdRef.current
      );
      const nextIdx =
        curIdx === -1
          ? 0
          : (curIdx + dir + candidates.length) % candidates.length;
      const picked = candidates[nextIdx];
      spectateTargetIdRef.current = picked.id;
      setHud((prev) => ({
        ...prev,
        spectatingName: picked.name,
        spectatingKind: picked.kind,
        spectatingHp: picked.hp,
        spectatingShield: picked.shield,
      }));
    },
    [getSpectateCandidates]
  );

  // Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (!localRef.current.alive && roomRef.current.status === "active") {
        if (eliminatedModeRef.current === "practice") {
          if (key === "1" || key === "2" || key === "3" || key === "4") {
            e.preventDefault();
            handleAnswerPractice(Number(key) - 1);
          } else if (
            (key === "enter" || key === "arrowright") &&
            practicePickedIdxRef.current !== null
          ) {
            e.preventDefault();
            handleNextPracticeQuestion();
          }
        } else {
          if (key === "arrowleft" || key === "a") {
            e.preventDefault();
            cycleSpectateTarget(-1);
          } else if (key === "arrowright" || key === "d") {
            e.preventDefault();
            cycleSpectateTarget(1);
          }
        }
        if (key === "m" || key === "tab") {
          e.preventDefault();
          setShowFullMap((prev) => !prev);
        } else if (key === "escape" && showFullMapRef.current) {
          e.preventDefault();
          setShowFullMap(false);
        }
        return;
      }

      if (activePrompt) {
        if (key === "1" || key === "2" || key === "3" || key === "4") {
          e.preventDefault();
          handleAnswerPrompt(Number(key) - 1);
        } else if (key === "escape") {
          e.preventDefault();
          setActivePrompt(null);
          setPromptFeedback(null);
        }
        return;
      }

      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(key)) {
        e.preventDefault();
      }
      keysRef.current.add(key);

      if (key === "e" || key === " ") {
        openNearbyCrate();
      } else if (key === "r") {
        openNearbyBossQuiz();
      } else if (key === "q") {
        handleUseShieldPotion();
      } else if (key === "h") {
        handleUseMedkit();
      } else if (key === "f" || key === "b") {
        handleDeployFirewall();
      } else if (key === "shift") {
        handleDash();
      } else if (key === "1" || key === "2" || key === "3" || key === "4") {
        handleSelectWeaponSlot(WEAPON_SLOTS[Number(key) - 1]);
      } else if (key === "m" || key === "tab") {
        setShowFullMap((prev) => !prev);
      } else if (key === "escape" && showFullMapRef.current) {
        setShowFullMap(false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    activePrompt,
    handleAnswerPrompt,
    handleAnswerPractice,
    handleNextPracticeQuestion,
    cycleSpectateTarget,
    openNearbyCrate,
    openNearbyBossQuiz,
    handleUseShieldPotion,
    handleUseMedkit,
    handleDeployFirewall,
    handleDash,
    handleSelectWeaponSlot,
  ]);

  useEffect(() => {
    if (completedReportedRef.current) return;
    const totalPlayers = Math.max(
      2,
      players.length + (worldState?.bots?.length || 0)
    );

    if (room.status === "finished") {
      completedReportedRef.current = true;
      playBattleSfx("victory", mutedRef.current);
      const local = localRef.current;
      const finalPlacement =
        local.placement > 0
          ? local.placement
          : local.alive
          ? 1
          : Math.max(2, aliveCountRef.current + 1);
      onMatchComplete({
        placement: finalPlacement,
        totalPlayers,
        kills: local.kills,
        miniBozzKills: local.miniBozzKills,
        medallionSecured: local.hasMedallion,
        questionsCorrect: local.questionsCorrect,
        questionsAttempted: local.questionsAttempted,
        winnerName: room.winnerName || meFromRoom?.displayName || "Bozz Champion",
      });
    }
  }, [
    room.status,
    room.winnerName,
    players.length,
    worldState?.bots?.length,
    meFromRoom?.displayName,
    onMatchComplete,
  ]);

  // Main 60fps World Simulation, Mini-Bozzes, Firewall Cover, Bots & Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let lastHudUpdateMs = 0;
    let lastMinimapDrawMs = 0;
    let lastPlayerSyncMs = 0;
    let lastWorldSyncMs = 0;

    const fireBolt = (
      ownerId: string,
      ownerName: string,
      isBot: boolean,
      x: number,
      y: number,
      angle: number,
      damage: number,
      now: number,
      speed = 780,
      archetype: WeaponArchetype = "blaster",
      rarity: LootRarity = "Common",
      isMiniBozz = false,
      splashRadius = 0,
      maxLifeMs = 1100
    ) => {
      const spawnDist = (isMiniBozz ? MINI_BOZZ_RADIUS : PLAYER_RADIUS) + 8;
      const sx = x + Math.cos(angle) * spawnDist;
      const sy = y + Math.sin(angle) * spawnDist;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const id = `${ownerId}_${now}_${Math.floor(Math.random() * 9999)}`;
      seenShotIdsRef.current.add(id);

      const proj: Projectile = {
        id,
        ownerId,
        ownerName,
        isBot,
        isMiniBozz,
        x: sx,
        y: sy,
        vx,
        vy,
        damage,
        archetype,
        rarity,
        splashRadius,
        maxLifeMs,
        createdAtMs: now,
      };
      projectilesRef.current.push(proj);
      return proj;
    };

    const applyDamage = (
      target: { hp: number; shield: number; alive: boolean },
      dmg: number,
      isLocal = false
    ): boolean => {
      let remaining = dmg;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, remaining);
        target.shield = Math.max(0, target.shield - absorbed);
        remaining -= absorbed;
        if (target.shield <= 0 && isLocal) {
          playBattleSfx("shieldBreak", mutedRef.current);
        }
      }
      if (remaining > 0) {
        target.hp = Math.max(0, target.hp - remaining);
      }
      if (target.hp <= 0) {
        target.alive = false;
        return true;
      }
      return false;
    };

    const tickFrame = (perfNow: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (perfNow - lastTime) / 1000));
      lastTime = perfNow;
      const now = Date.now();
      const canvas = canvasRef.current;
      const currentRoom = roomRef.current;
      const local = localRef.current;

      // Expire old Firewall Cover walls
      firewallsRef.current = firewallsRef.current.filter(
        (fw) => fw.hp > 0 && fw.expiresAtMs > now
      );

      const zone: StormZoneState = computeStormZoneState(
        currentRoom.matchStartedAtMs || now,
        now,
        layout.stormTargetX,
        layout.stormTargetY
      );

      if (zone.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = zone.phase;
        playBattleSfx("zonePhase", mutedRef.current);
        showToast(
          `System Glitch Phase ${zone.phase}`,
          `Corrupting Storm intensifying (${zone.damagePerSec} DPS)!`,
          "penalty"
        );
      }

      if (screenShakeRef.current > 0) {
        screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 24);
      }
      if (damageFlashRef.current > 0) {
        damageFlashRef.current = Math.max(0, damageFlashRef.current - dt * 1.4);
      }

      // 1. Local Human Player Movement, Medallion Regen, Weapons & Zone Tick
      if (local.alive && currentRoom.status === "active") {
        // Bozz Medallion passive shield regeneration (+4/s)
        if (local.hasMedallion && now - lastShieldRegenTickRef.current >= 500) {
          lastShieldRegenTickRef.current = now;
          if (local.shield < 100) {
            local.shield = Math.min(100, local.shield + 2);
          }
        }

        const inWater = isPointInWater(
          local.x,
          local.y,
          layout.riverPoints,
          layout.bridges
        );
        local.inWater = inWater;

        const bush = getBushContainingPoint(local.x, local.y, layout.bushes);
        const nowInBush = Boolean(bush);
        if (nowInBush !== local.inBush) {
          local.inBush = nowInBush;
          playBattleSfx("bush", mutedRef.current);
        }

        let moveX = 0;
        let moveY = 0;
        if (!activeQuizRef.current) {
          const keys = keysRef.current;
          if (keys.has("w") || keys.has("arrowup")) moveY -= 1;
          if (keys.has("s") || keys.has("arrowdown")) moveY += 1;
          if (keys.has("a") || keys.has("arrowleft")) moveX -= 1;
          if (keys.has("d") || keys.has("arrowright")) moveX += 1;
        }

        const isDashing = now < local.dashEndMs;
        if (isDashing) {
          const resolved = resolveCircleObstacles(
            local.x + local.dashVx * dt,
            local.y + local.dashVy * dt,
            PLAYER_RADIUS,
            layout.obstacles,
            firewallsRef.current,
            now
          );
          local.x = resolved.x;
          local.y = resolved.y;
          afterImagesRef.current.push({
            x: local.x,
            y: local.y,
            life: 0.2,
            maxLife: 0.2,
            color: "#38BDF8",
          });
        } else if (moveX !== 0 || moveY !== 0) {
          const len = Math.hypot(moveX, moveY);
          const hasSpeed = local.speedBoostUntilMs > now;
          const terrainMult = inWater ? 0.72 : 1.0;
          const speed = (hasSpeed ? 360 : 258) * terrainMult;
          const prevX = local.x;
          const prevY = local.y;
          const resolved = resolveCircleObstacles(
            local.x + (moveX / len) * speed * dt,
            local.y + (moveY / len) * speed * dt,
            PLAYER_RADIUS,
            layout.obstacles,
            firewallsRef.current,
            now
          );
          local.x = resolved.x;
          local.y = resolved.y;

          const movedDist = Math.hypot(local.x - prevX, local.y - prevY);
          lastFootstepDistRef.current += movedDist;
          if (lastFootstepDistRef.current >= 58) {
            lastFootstepDistRef.current = 0;
            playBattleSfx(inWater ? "waterStep" : "footstep", mutedRef.current);
            if (inWater) {
              spawnBurst(local.x, local.y, "#38BDF8", 3);
            }
          }
        }

        // Shockwave Launch Pads
        for (const pad of layout.jumpPads) {
          const readyAt = padCooldownsRef.current.get(pad.id) || 0;
          if (now >= readyAt && Math.hypot(local.x - pad.x, local.y - pad.y) <= pad.radius + 4) {
            padCooldownsRef.current.set(pad.id, now + 3500);
            const launchAng =
              moveX !== 0 || moveY !== 0
                ? Math.atan2(moveY, moveX)
                : Math.atan2(ARENA_SIZE / 2 - local.y, ARENA_SIZE / 2 - local.x);
            local.dashVx = Math.cos(launchAng) * 960;
            local.dashVy = Math.sin(launchAng) * 960;
            local.dashEndMs = now + 340;
            playBattleSfx("jumppad", mutedRef.current);
            spawnBurst(pad.x, pad.y, "#10B981", 14);
            spawnLabel(local.x, local.y, "SHOCKWAVE LAUNCH!", "#38BDF8");
            break;
          }
        }

        // Shield Recharge Shrines
        for (const shrine of layout.shrines) {
          const readyAt = shrineCooldownsRef.current.get(shrine.id) || 0;
          if (
            now >= readyAt &&
            Math.hypot(local.x - shrine.x, local.y - shrine.y) <= shrine.radius + 6 &&
            (local.hp < 100 || local.shield < 100)
          ) {
            shrineCooldownsRef.current.set(shrine.id, now + 22000);
            local.hp = Math.min(100, local.hp + 20);
            local.shield = Math.min(100, local.shield + 25);
            playBattleSfx("shrine", mutedRef.current);
            spawnBurst(shrine.x, shrine.y, "#F59E0B", 12);
            spawnLabel(local.x, local.y, "+20 HP · +25 SHIELD", "#FBBF24");
          }
        }

        // Magnetic Floor Loot Orbs (including Mythic Weapons & Bozz Medallion!)
        const remainingOrbs: FloorLootOrb[] = [];
        for (const orb of lootOrbsRef.current) {
          if (now - orb.createdAtMs > 55000) continue;
          const dist = Math.hypot(local.x - orb.x, local.y - orb.y);
          if (dist <= 36) {
            local.ammo = Math.min(500, local.ammo + orb.ammo);
            local.shield = Math.min(100, local.shield + orb.shield);
            local.hp = Math.min(100, local.hp + orb.hp);
            if (orb.tokens) local.tokens = Math.min(12, local.tokens + orb.tokens);
            if (orb.weaponArchetype && orb.weaponRarity) {
              const cur = local.weapons[orb.weaponArchetype];
              if (
                !cur ||
                RARITY_META[orb.weaponRarity].rank > RARITY_META[cur].rank
              ) {
                local.weapons[orb.weaponArchetype] = orb.weaponRarity;
                local.activeWeapon = orb.weaponArchetype;
              }
            }
            if (orb.medallion) {
              local.hasMedallion = true;
              showToast(
                "Bozz Medallion Claimed!",
                "Passively regenerating Shield & broadcasting Gold Ring on minimap.",
                "reward"
              );
            }
            playBattleSfx(orb.medallion ? "rareDrop" : "pickup", mutedRef.current);
            spawnBurst(orb.x, orb.y, orb.medallion ? "#FBBF24" : "#10B981", 10);
            spawnLabel(
              local.x,
              local.y,
              orb.medallion ? "BOZZ MEDALLION CLAIMED!" : `+${orb.ammo} AMMO`,
              orb.medallion ? "#FBBF24" : "#6EE7B7"
            );
          } else {
            if (dist < 115) {
              const pullAng = Math.atan2(local.y - orb.y, local.x - orb.x);
              orb.x += Math.cos(pullAng) * 235 * dt;
              orb.y += Math.sin(pullAng) * 235 * dt;
            }
            remainingOrbs.push(orb);
          }
        }
        lootOrbsRef.current = remainingOrbs;

        const worldMouseX = mouseScreenRef.current.x + cameraRef.current.x;
        const worldMouseY = mouseScreenRef.current.y + cameraRef.current.y;
        local.aimAngle = Math.atan2(worldMouseY - local.y, worldMouseX - local.x);

        // Fire Active Weapon Archetype (Rapid Blaster / Prompt Cannon / Scatter Shot / Railgun)
        const activeRarity = local.weapons[local.activeWeapon] || "Common";
        const weaponCfg = WEAPON_META[local.activeWeapon];
        const rarityMeta = RARITY_META[activeRarity];
        const scaledDmg = Math.round(weaponCfg.baseDamage * rarityMeta.damageMult);

        if (
          mouseScreenRef.current.down &&
          !activeQuizRef.current &&
          !showFullMapRef.current &&
          local.ammo > 0 &&
          now - local.lastFireMs >= weaponCfg.fireRateMs
        ) {
          local.lastFireMs = now;
          local.ammo -= 1;

          const count = weaponCfg.pellets;
          let centerProj: Projectile | null = null;
          for (let i = 0; i < count; i++) {
            const offset =
              count === 1
                ? (Math.random() - 0.5) * weaponCfg.spreadRad
                : ((i / Math.max(1, count - 1)) - 0.5) * weaponCfg.spreadRad;
            const p = fireBolt(
              currentPlayerId,
              meFromRoom?.displayName || "You",
              false,
              local.x,
              local.y,
              local.aimAngle + offset,
              scaledDmg,
              now,
              weaponCfg.speed,
              local.activeWeapon,
              activeRarity,
              false,
              weaponCfg.splashRadius,
              weaponCfg.maxLifeMs
            );
            if (i === Math.floor(count / 2)) centerProj = p;
          }

          if (centerProj) {
            local.lastShotId = encodeShotId(
              now,
              local.activeWeapon,
              scaledDmg,
              activeRarity
            );
            local.lastShotX = Math.round(centerProj.x);
            local.lastShotY = Math.round(centerProj.y);
            local.lastShotVx = Math.round(
              Math.cos(local.aimAngle) * weaponCfg.speed
            );
            local.lastShotVy = Math.round(
              Math.sin(local.aimAngle) * weaponCfg.speed
            );
            local.lastShotAtMs = now;
            syncNowRef.current = true;
          }

          if (local.activeWeapon === "cannon") {
            playBattleSfx("shootCannon", mutedRef.current);
            screenShakeRef.current = Math.max(screenShakeRef.current, 4.5);
          } else if (local.activeWeapon === "scatter") {
            playBattleSfx("shootScatter", mutedRef.current);
            screenShakeRef.current = Math.max(screenShakeRef.current, 3);
          } else if (local.activeWeapon === "railgun") {
            playBattleSfx("shootRail", mutedRef.current);
            screenShakeRef.current = Math.max(screenShakeRef.current, 3.8);
          } else {
            playBattleSfx("shoot", mutedRef.current);
          }

          spawnBurst(
            local.x + Math.cos(local.aimAngle) * 24,
            local.y + Math.sin(local.aimAngle) * 24,
            rarityMeta.color,
            4
          );
        }

        // System Glitch Storm Damage
        const distFromCenter = Math.hypot(local.x - zone.cx, local.y - zone.cy);
        if (distFromCenter > zone.currentRadius) {
          const stormDmg = zone.damagePerSec * dt;
          local.hp = Math.max(0, local.hp - stormDmg);
          if (now - lastStormSfxMsRef.current >= 650) {
            lastStormSfxMsRef.current = now;
            playBattleSfx("stormTick", mutedRef.current);
          }
          if (local.hp <= 0) {
            local.alive = false;
            syncNowRef.current = true;
            const aliveOthers =
              remotePlayersRef.current.filter(
                (p) => p.alive && p.playerId !== currentPlayerId
              ).length + botsRef.current.filter((b) => b.alive).length;
            local.placement = Math.max(1, aliveOthers + 1);
            pushKillFeed(`${meFromRoom?.displayName || "Player"} fell to the System Glitch`);
            playBattleSfx("wrong", mutedRef.current);
          }
        }
      }

      // 2. Host-Authoritative AI Bots & AI Mini-Bozzes
      if (isHost && currentRoom.status === "active") {
        const allBots = botsRef.current;
        const activeHumans = remotePlayersRef.current.map((p) =>
          p.playerId === currentPlayerId
            ? {
                id: p.playerId,
                name: p.displayName,
                x: local.x,
                y: local.y,
                alive: local.alive,
                inBush: local.inBush && local.exposedUntilMs < now,
              }
            : {
                id: p.playerId,
                name: p.displayName,
                x: p.x,
                y: p.y,
                alive: p.alive,
                inBush:
                  Boolean(getBushContainingPoint(p.x, p.y, layout.bushes)) &&
                  p.exposedUntilMs < now,
              }
        );

        // 2a. Mini-Bozzes Patrol & Combat AI
        for (const mb of miniBozzesRef.current) {
          if (!mb.alive) continue;

          // Pick nearest visible target within 370px
          let target: { x: number; y: number; dist: number } | null = null;
          for (const h of activeHumans) {
            if (!h.alive) continue;
            const d = Math.hypot(h.x - mb.x, h.y - mb.y);
            if (d < 370 && (!target || d < target.dist)) {
              if (hasLineOfSight(mb.x, mb.y, h.x, h.y, layout.obstacles)) {
                target = { x: h.x, y: h.y, dist: d };
              }
            }
          }
          for (const b of allBots) {
            if (!b.alive) continue;
            const d = Math.hypot(b.x - mb.x, b.y - mb.y);
            if (d < 340 && (!target || d < target.dist)) {
              if (hasLineOfSight(mb.x, mb.y, b.x, b.y, layout.obstacles)) {
                target = { x: b.x, y: b.y, dist: d };
              }
            }
          }

          if (target) {
            const ang = Math.atan2(target.y - mb.y, target.x - mb.x);
            mb.aimAngle = ang;
            const homeDist = Math.hypot(mb.x - mb.homeX, mb.y - mb.homeY);
            const moveAng = homeDist > 210 ? Math.atan2(mb.homeY - mb.y, mb.homeX - mb.x) : ang + Math.PI / 2;
            const res = resolveCircleObstacles(
              mb.x + Math.cos(moveAng) * 118 * dt,
              mb.y + Math.sin(moveAng) * 118 * dt,
              MINI_BOZZ_RADIUS,
              layout.obstacles,
              firewallsRef.current,
              now
            );
            mb.x = res.x;
            mb.y = res.y;

            if (now - mb.lastFireMs >= 920) {
              mb.lastFireMs = now;
              const proj = fireBolt(
                mb.id,
                mb.name,
                true,
                mb.x,
                mb.y,
                ang,
                22,
                now,
                630,
                "cannon",
                "Mythic",
                true,
                0,
                1100
              );
              mb.lastShotId = proj.id;
              mb.lastShotX = proj.x;
              mb.lastShotY = proj.y;
              mb.lastShotVx = proj.vx;
              mb.lastShotVy = proj.vy;
              mb.lastShotAtMs = now;
            }
          } else {
            // Orbit around POI home
            const orbitAng = now * 0.0008 + (mb.homeX % 5);
            const tx = mb.homeX + Math.cos(orbitAng) * 75;
            const ty = mb.homeY + Math.sin(orbitAng) * 75;
            const ang = Math.atan2(ty - mb.y, tx - mb.x);
            mb.aimAngle = ang;
            const res = resolveCircleObstacles(
              mb.x + Math.cos(ang) * 95 * dt,
              mb.y + Math.sin(ang) * 95 * dt,
              MINI_BOZZ_RADIUS,
              layout.obstacles,
              firewallsRef.current,
              now
            );
            mb.x = res.x;
            mb.y = res.y;
          }
        }

        // 2b. Backfilled Bots State Machine
        for (const bot of allBots) {
          if (!bot.alive) continue;

          if (bot.hasMedallion && bot.shield < 100) {
            bot.shield = Math.min(100, bot.shield + 3 * dt);
          }

          const distCenter = Math.hypot(bot.x - zone.cx, bot.y - zone.cy);
          if (distCenter > zone.currentRadius) {
            bot.hp = Math.max(0, bot.hp - zone.damagePerSec * dt);
            if (bot.hp <= 0) {
              bot.alive = false;
              const remain =
                activeHumans.filter((h) => h.alive).length +
                allBots.filter((b) => b.alive).length;
              bot.placement = Math.max(1, remain + 1);
              if (bot.hasMedallion) {
                bot.hasMedallion = false;
                spawnLootOrb(bot.x, bot.y, { medallion: true, ammo: 15, shield: 40 });
              }
              pushKillFeed(`${bot.name} glitched out in the Storm`);
              continue;
            }
          }

          let nearestEnemy: { id: string; x: number; y: number; dist: number } | null =
            null;
          if (bot.ammo > 0) {
            for (const h of activeHumans) {
              if (!h.alive) continue;
              const d = Math.hypot(h.x - bot.x, h.y - bot.y);
              const sightLimit = h.inBush ? 95 : 430;
              if (d < sightLimit && (!nearestEnemy || d < nearestEnemy.dist)) {
                if (hasLineOfSight(bot.x, bot.y, h.x, h.y, layout.obstacles)) {
                  nearestEnemy = { id: h.id, x: h.x, y: h.y, dist: d };
                }
              }
            }
            for (const ob of allBots) {
              if (!ob.alive || ob.id === bot.id) continue;
              const d = Math.hypot(ob.x - bot.x, ob.y - bot.y);
              if (d < 400 && (!nearestEnemy || d < nearestEnemy.dist)) {
                if (hasLineOfSight(bot.x, bot.y, ob.x, ob.y, layout.obstacles)) {
                  nearestEnemy = { id: ob.id, x: ob.x, y: ob.y, dist: d };
                }
              }
            }
          }

          const botInWater = isPointInWater(
            bot.x,
            bot.y,
            layout.riverPoints,
            layout.bridges
          );
          const mustRotateToSafe = distCenter > zone.currentRadius - 55;
          const botSpeed =
            (bot.speedBoostUntilMs > now ? 255 : 198) * (botInWater ? 0.74 : 1);

          if (mustRotateToSafe) {
            bot.aiState = "rotate";
            const ang = Math.atan2(zone.cy - bot.y, zone.cx - bot.x);
            bot.aimAngle = ang;
            const resolved = resolveCircleObstacles(
              bot.x + Math.cos(ang) * botSpeed * dt,
              bot.y + Math.sin(ang) * botSpeed * dt,
              PLAYER_RADIUS,
              layout.obstacles,
              firewallsRef.current,
              now
            );
            bot.x = resolved.x;
            bot.y = resolved.y;
          } else if (nearestEnemy && bot.ammo > 0) {
            bot.aiState = "combat";
            const baseAng = Math.atan2(
              nearestEnemy.y - bot.y,
              nearestEnemy.x - bot.x
            );
            bot.aimAngle = baseAng;
            const moveAng =
              nearestEnemy.dist < 170
                ? baseAng + Math.PI
                : baseAng + Math.PI / 2;
            const resolved = resolveCircleObstacles(
              bot.x + Math.cos(moveAng) * (botSpeed * 0.85) * dt,
              bot.y + Math.sin(moveAng) * (botSpeed * 0.85) * dt,
              PLAYER_RADIUS,
              layout.obstacles,
              firewallsRef.current,
              now
            );
            bot.x = resolved.x;
            bot.y = resolved.y;

            if (now - bot.lastFireMs >= 540 + Math.random() * 250) {
              bot.lastFireMs = now;
              bot.ammo -= 1;
              const jitter = (Math.random() - 0.5) * 0.24;
              const proj = fireBolt(
                bot.id,
                bot.name,
                true,
                bot.x,
                bot.y,
                baseAng + jitter,
                15,
                now,
                760,
                bot.weaponArchetype || "blaster",
                bot.weaponRarity || "Common"
              );
              bot.lastShotId = proj.id;
              bot.lastShotX = proj.x;
              bot.lastShotY = proj.y;
              bot.lastShotVx = proj.vx;
              bot.lastShotVy = proj.vy;
              bot.lastShotAtMs = now;
            }
          } else if (bot.aiState === "answering") {
            if (now >= bot.answerEndMs) {
              const crate = layout.crates.find((c) => c.id === bot.targetCrateId);
              const success = Math.random() < bot.accuracy;
              if (crate) {
                if (success) {
                  const isTerm = crate.kind === "terminal";
                  bot.ammo = Math.min(200, bot.ammo + (isTerm ? 15 : 10));
                  bot.shield = Math.min(100, bot.shield + (isTerm ? 40 : 25));
                  bot.hp = Math.min(100, bot.hp + 15);
                  if (isTerm) bot.weaponRarity = "Epic";
                  if (isTerm || Math.random() > 0.6) {
                    bot.speedBoostUntilMs = now + 7000;
                  }
                  crateStatesRef.current.set(crate.id, {
                    crateId: crate.id,
                    lockedUntilMs: 0,
                    depletedUntilMs: now + 22000,
                  });
                } else {
                  crateStatesRef.current.set(crate.id, {
                    crateId: crate.id,
                    lockedUntilMs: now + 5000,
                    depletedUntilMs: 0,
                  });
                  bot.hp = Math.max(0, bot.hp - 10);
                  bot.exposedUntilMs = now + 6000;
                  if (bot.hp <= 0) {
                    bot.alive = false;
                    const remain =
                      activeHumans.filter((h) => h.alive).length +
                      allBots.filter((b) => b.alive).length;
                    bot.placement = Math.max(1, remain + 1);
                    pushKillFeed(`${bot.name} tripped a Gbozz Alarm`);
                  }
                }
              }
              bot.aiState = "loot";
              bot.targetCrateId = "";
            }
          } else {
            bot.aiState = "loot";
            let targetCrate = layout.crates.find((c) => c.id === bot.targetCrateId);
            const targetState = targetCrate
              ? crateStatesRef.current.get(targetCrate.id)
              : null;
            if (
              !targetCrate ||
              (targetState &&
                (targetState.lockedUntilMs > now || targetState.depletedUntilMs > now))
            ) {
              let bestScore = Infinity;
              let picked: ArenaCrate | undefined;
              for (const c of layout.crates) {
                const cs = crateStatesRef.current.get(c.id);
                if (cs && (cs.lockedUntilMs > now || cs.depletedUntilMs > now)) {
                  continue;
                }
                const inSafe =
                  Math.hypot(c.x - zone.cx, c.y - zone.cy) < zone.currentRadius - 40;
                const d = Math.hypot(c.x - bot.x, c.y - bot.y) + (inSafe ? 0 : 900);
                if (d < bestScore) {
                  bestScore = d;
                  picked = c;
                }
              }
              targetCrate = picked;
              bot.targetCrateId = picked?.id || "";
            }

            if (targetCrate) {
              const distCrate = Math.hypot(
                targetCrate.x - bot.x,
                targetCrate.y - bot.y
              );
              if (distCrate <= 52) {
                bot.aiState = "answering";
                bot.answerEndMs = now + 2000 + Math.random() * 2000;
              } else {
                const ang = Math.atan2(
                  targetCrate.y - bot.y,
                  targetCrate.x - bot.x
                );
                bot.aimAngle = ang;
                const prevX = bot.x;
                const prevY = bot.y;
                const resolved = resolveCircleObstacles(
                  bot.x + Math.cos(ang) * botSpeed * dt,
                  bot.y + Math.sin(ang) * botSpeed * dt,
                  PLAYER_RADIUS,
                  layout.obstacles,
                  firewallsRef.current,
                  now
                );
                if (Math.hypot(resolved.x - prevX, resolved.y - prevY) < 0.8) {
                  const slideAng = ang + Math.PI / 2;
                  const alt = resolveCircleObstacles(
                    bot.x + Math.cos(slideAng) * botSpeed * dt,
                    bot.y + Math.sin(slideAng) * botSpeed * dt,
                    PLAYER_RADIUS,
                    layout.obstacles,
                    firewallsRef.current,
                    now
                  );
                  bot.x = alt.x;
                  bot.y = alt.y;
                } else {
                  bot.x = resolved.x;
                  bot.y = resolved.y;
                }
              }
            }
          }
        }
      }

      // 2.5 Velocity-Extrapolated 60 FPS Entity Smoothing for Remote Humans & (for Non-Host) Bots / Mini-Bozzes
      stepSmoothMap(remoteSmoothRef.current, dt, now, 18);
      if (!isHost) {
        stepSmoothMap(botSmoothRef.current, dt, now, 16);
        stepSmoothMap(bossSmoothRef.current, dt, now, 14);
      }

      // 3. Projectile Simulation, Firewall Blocking, & Hits (Players / Bots / Mini-Bozzes)
      const nextProjectiles: Projectile[] = [];
      for (const proj of projectilesRef.current) {
        if (now - proj.createdAtMs > (proj.maxLifeMs || 1200)) continue;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // Check static obstacle collision
        if (
          proj.x < 0 ||
          proj.x > ARENA_SIZE ||
          proj.y < 0 ||
          proj.y > ARENA_SIZE ||
          pointHitsObstacle(proj.x, proj.y, layout.obstacles)
        ) {
          spawnBurst(proj.x, proj.y, "#8B5CF6", 5);
          continue;
        }

        // Check Firewall Cover collision (skip owner's own outward shots within 90ms)
        const hitWall = pointHitsFirewall(proj.x, proj.y, firewallsRef.current, now);
        if (
          hitWall &&
          !(hitWall.ownerId === proj.ownerId && now - proj.createdAtMs < 90)
        ) {
          hitWall.hp = Math.max(0, hitWall.hp - proj.damage);
          spawnBurst(proj.x, proj.y, "#38BDF8", 6);
          if (hitWall.hp <= 0) {
            spawnShockwave(hitWall.x + hitWall.w / 2, hitWall.y + hitWall.h / 2, 65, "#38BDF8");
          }
          continue;
        }

        let consumed = false;

        // Check hit on local human player
        if (
          local.alive &&
          proj.ownerId !== currentPlayerId &&
          Math.hypot(proj.x - local.x, proj.y - local.y) <= PLAYER_RADIUS + 6
        ) {
          consumed = true;
          const died = applyDamage(local, proj.damage, true);
          syncNowRef.current = true;
          damageFlashRef.current = 0.28;
          screenShakeRef.current = Math.max(screenShakeRef.current, 6);
          spawnBurst(proj.x, proj.y, "#EF4444", 10);
          spawnLabel(local.x, local.y, `-${proj.damage}`, "#EF4444");
          playBattleSfx("damage", mutedRef.current);
          if (died) {
            const aliveOthers =
              remotePlayersRef.current.filter(
                (p) => p.alive && p.playerId !== currentPlayerId
              ).length + botsRef.current.filter((b) => b.alive).length;
            local.placement = Math.max(1, aliveOthers + 1);
            pushKillFeed(`${proj.ownerName} eliminated ${meFromRoom?.displayName || "You"}`);
            playBattleSfx("wrong", mutedRef.current);
          }
        }

        // Check hit on Mini-Bozzes (host handles host/bots; non-host handles own bullets accurately)
        if (!consumed && !proj.isMiniBozz) {
          for (const mb of miniBozzesRef.current) {
            if (!mb.alive) continue;
            const mbSm = !isHost ? bossSmoothRef.current.get(mb.id) : null;
            const mbX = mbSm ? mbSm.x : mb.x;
            const mbY = mbSm ? mbSm.y : mb.y;
            if (Math.hypot(proj.x - mbX, proj.y - mbY) <= MINI_BOZZ_RADIUS + 6) {
              consumed = true;
              spawnBurst(proj.x, proj.y, "#FB7185", 10);
              spawnLabel(mbX, mbY, `-${proj.damage}`, "#FBBF24");
              if (proj.ownerId === currentPlayerId) {
                playBattleSfx("hit", mutedRef.current);
              }
              const shouldApply = isHost
                ? proj.isBot || proj.ownerId === currentPlayerId
                : proj.ownerId === currentPlayerId;
              if (shouldApply) {
                const died = applyDamage(mb, proj.damage);
                if (died) {
                  handleMiniBozzDefeated(
                    mb,
                    proj.ownerName,
                    proj.ownerId === currentPlayerId
                  );
                }
                if (!isHost) {
                  recentBossHitAtRef.current.set(mb.id, now);
                  queueWorldPatch(
                    {
                      miniBozzDamage: {
                        id: mb.id,
                        hp: mb.hp,
                        shield: mb.shield,
                        alive: mb.alive,
                      },
                      killFeedEntry: died
                        ? `${proj.ownerName} defeated Mini-Bozz ${mb.name}!`
                        : undefined,
                    },
                    died
                  );
                }
              }
              break;
            }
          }
        }

        // Check hit on Bots (each human validates their own hits on bots so non-host combat feels instant!)
        if (!consumed) {
          for (const bot of botsRef.current) {
            if (!bot.alive || bot.id === proj.ownerId) continue;
            const bSm = !isHost ? botSmoothRef.current.get(bot.id) : null;
            const bx = bSm ? bSm.x : bot.x;
            const by = bSm ? bSm.y : bot.y;
            if (Math.hypot(proj.x - bx, proj.y - by) <= PLAYER_RADIUS + 6) {
              consumed = true;
              const prevShield = bot.shield;
              spawnBurst(proj.x, proj.y, "#10B981", 8);
              spawnLabel(bx, by, `-${proj.damage}`, "#F59E0B");
              if (proj.ownerId === currentPlayerId) {
                playBattleSfx(
                  prevShield > 0 && prevShield <= proj.damage ? "shieldBreak" : "hit",
                  mutedRef.current
                );
              }

              const shouldApply = isHost
                ? proj.isBot || proj.ownerId === currentPlayerId
                : proj.ownerId === currentPlayerId;

              if (shouldApply) {
                const botDied = applyDamage(bot, proj.damage);
                if (botDied) {
                  const aliveHumans = remotePlayersRef.current.filter((p) =>
                    p.playerId === currentPlayerId ? local.alive : p.alive
                  ).length;
                  const aliveBots = botsRef.current.filter((b) => b.alive).length;
                  bot.placement = Math.max(1, aliveHumans + aliveBots + 1);
                  pushKillFeed(`${proj.ownerName} eliminated ${bot.name}`);
                  spawnLootOrb(bx, by, {
                    ammo: 10,
                    shield: 20,
                    hp: 15,
                    tokens: 1,
                    medallion: Boolean(bot.hasMedallion),
                    weaponArchetype: bot.weaponArchetype,
                    weaponRarity: bot.weaponRarity,
                  });
                  bot.hasMedallion = false;
                  spawnBurst(bx, by, "#F59E0B", 18);

                  if (proj.ownerId === currentPlayerId) {
                    local.kills += 1;
                    local.shield = Math.min(100, local.shield + 20);
                    local.hp = Math.min(100, local.hp + 10);
                    local.tokens = Math.min(12, local.tokens + 1);
                    syncNowRef.current = true;
                    playBattleSfx("elim", mutedRef.current);
                    spawnLabel(local.x, local.y, `ELIMINATED ${bot.name}! +20 SHD`, "#10B981");
                  } else if (proj.isBot) {
                    const killerBot = botsRef.current.find((b) => b.id === proj.ownerId);
                    if (killerBot) killerBot.kills += 1;
                  }
                }

                if (!isHost) {
                  recentBotHitAtRef.current.set(bot.id, now);
                  queueWorldPatch(
                    {
                      botDamage: {
                        id: bot.id,
                        hp: bot.hp,
                        shield: bot.shield,
                        alive: bot.alive,
                        placement: bot.placement,
                      },
                      killFeedEntry: botDied
                        ? `${proj.ownerName} eliminated ${bot.name}`
                        : undefined,
                    },
                    botDied
                  );
                }
              }
              break;
            }
          }
        }

        // Check hit on Remote Humans (using smoothed live positions)
        if (!consumed && proj.ownerId === currentPlayerId) {
          for (const rp of remotePlayersRef.current) {
            if (!rp.alive || rp.playerId === currentPlayerId) continue;
            const sm = remoteSmoothRef.current.get(rp.playerId);
            const rpx = sm ? sm.x : rp.x;
            const rpy = sm ? sm.y : rp.y;
            if (Math.hypot(proj.x - rpx, proj.y - rpy) <= PLAYER_RADIUS + 8) {
              consumed = true;
              lastHitRemoteAtRef.current.set(rp.playerId, now);
              spawnBurst(proj.x, proj.y, "#38BDF8", 9);
              spawnLabel(rpx, rpy, `-${proj.damage}`, "#38BDF8");
              playBattleSfx("hit", mutedRef.current);
              if (
                rp.hp + rp.shield <= proj.damage &&
                !creditedHumanKillsRef.current.has(rp.playerId)
              ) {
                creditedHumanKillsRef.current.add(rp.playerId);
                local.kills += 1;
                local.shield = Math.min(100, local.shield + 20);
                local.hp = Math.min(100, local.hp + 10);
                local.tokens = Math.min(12, local.tokens + 1);
                syncNowRef.current = true;
                spawnLootOrb(rpx, rpy, {
                  ammo: 12,
                  shield: 25,
                  tokens: 2,
                  medallion: Boolean(rp.hasMedallion),
                });
                playBattleSfx("elim", mutedRef.current);
              }
              break;
            }
          }
        }

        // Cannon Splash Damage
        if (consumed && proj.splashRadius && proj.splashRadius > 0) {
          spawnShockwave(proj.x, proj.y, proj.splashRadius, "#F97316");
          if (isHost) {
            for (const bot of botsRef.current) {
              if (!bot.alive || bot.id === proj.ownerId) continue;
              const d = Math.hypot(bot.x - proj.x, bot.y - proj.y);
              if (d <= proj.splashRadius && d > PLAYER_RADIUS + 6) {
                applyDamage(bot, Math.round(proj.damage * 0.45));
              }
            }
          }
        }

        if (!consumed) {
          nextProjectiles.push(proj);
        }
      }
      projectilesRef.current = nextProjectiles;

      // 4. Particles, Shockwaves, Afterimages & Floating Combat Labels
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.life > 0;
      });
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        sw.life -= dt;
        sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 12);
        return sw.life > 0;
      });
      afterImagesRef.current = afterImagesRef.current.filter((a) => {
        a.life -= dt;
        return a.life > 0;
      });
      labelsRef.current = labelsRef.current.filter((l) => {
        l.life -= dt;
        l.y -= 28 * dt;
        return l.life > 0;
      });

      // 5. Render Main Arena Canvas
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const { cw, ch, dpr } = canvasSizeRef.current;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          let focusX = local.x;
          let focusY = local.y;
          if (!local.alive) {
            const targetId = spectateTargetIdRef.current;
            const pickedHuman = targetId
              ? remotePlayersRef.current.find(
                  (p) => p.alive && p.playerId === targetId && p.playerId !== currentPlayerId
                )
              : undefined;
            const pickedBot = targetId && !pickedHuman
              ? botsRef.current.find((b) => b.alive && b.id === targetId)
              : undefined;

            const liveHuman =
              pickedHuman ||
              remotePlayersRef.current.find(
                (p) => p.alive && p.playerId !== currentPlayerId
              );
            const liveBot =
              !liveHuman ? pickedBot || botsRef.current.find((b) => b.alive) : undefined;

            if (liveHuman) {
              spectateTargetIdRef.current = liveHuman.playerId;
              const sm = remoteSmoothRef.current.get(liveHuman.playerId);
              focusX = sm ? sm.x : liveHuman.x;
              focusY = sm ? sm.y : liveHuman.y;
            } else if (liveBot) {
              spectateTargetIdRef.current = liveBot.id;
              const sm = !isHost ? botSmoothRef.current.get(liveBot.id) : null;
              focusX = sm ? sm.x : liveBot.x;
              focusY = sm ? sm.y : liveBot.y;
            }
          }

          const targetCamX = Math.max(0, Math.min(ARENA_SIZE - cw, focusX - cw / 2));
          const targetCamY = Math.max(0, Math.min(ARENA_SIZE - ch, focusY - ch / 2));
          cameraRef.current.x += (targetCamX - cameraRef.current.x) * Math.min(1, dt * 11);
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * Math.min(1, dt * 11);

          const shakeAmt = screenShakeRef.current;
          const shakeX = shakeAmt > 0 ? (Math.random() - 0.5) * shakeAmt : 0;
          const shakeY = shakeAmt > 0 ? (Math.random() - 0.5) * shakeAmt : 0;
          const camX = cameraRef.current.x + shakeX;
          const camY = cameraRef.current.y + shakeY;

          ctx.fillStyle = "#06080D";
          ctx.fillRect(0, 0, cw, ch);

          ctx.save();
          ctx.translate(-camX, -camY);

          // A. Single-Blit Cached Static Terrain, Roads, River Channel, Bridges, Watermarks & Obstacles
          const sx = Math.max(0, Math.floor(camX));
          const sy = Math.max(0, Math.floor(camY));
          const sw = Math.min(ARENA_SIZE - sx, Math.ceil(cw + 2));
          const sh = Math.min(ARENA_SIZE - sy, Math.ceil(ch + 2));
          if (terrainCacheRef.current && sw > 0 && sh > 0) {
            ctx.drawImage(terrainCacheRef.current, sx, sy, sw, sh, sx, sy, sw, sh);
          }

          // Lightweight Animated Data Canal Flow Accent
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 14;
          ctx.setLineDash([28, 34]);
          ctx.lineDashOffset = -(now * 0.04) % 62;
          ctx.beginPath();
          layout.riverPoints.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.setLineDash([]);

          // Jump Pads & Shrines
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.007);
          for (const pad of layout.jumpPads) {
            const ready = now >= (padCooldownsRef.current.get(pad.id) || 0);
            ctx.fillStyle = ready ? "rgba(16, 185, 129, 0.18)" : "rgba(71, 85, 105, 0.18)";
            ctx.strokeStyle = ready ? "#10B981" : "#475569";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            if (ready) {
              ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 + pulse * 0.5})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pad.x, pad.y, pad.radius * (0.55 + pulse * 0.35), 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.fillStyle = ready ? "#6EE7B7" : "#64748B";
            ctx.font = "bold 9px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.fillText("LAUNCH", pad.x, pad.y + 3);
          }

          for (const shrine of layout.shrines) {
            const ready = now >= (shrineCooldownsRef.current.get(shrine.id) || 0);
            ctx.fillStyle = ready ? "rgba(245, 158, 11, 0.16)" : "rgba(51, 65, 85, 0.15)";
            ctx.strokeStyle = ready ? "#F59E0B" : "#475569";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(shrine.x, shrine.y, shrine.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = ready ? "#FCD34D" : "#64748B";
            ctx.font = "bold 9px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.fillText(ready ? "+SHIELD" : "COOL", shrine.x, shrine.y + 3);
          }

          // Floor Loot Orbs (including Mythic & Medallion orbs!)
          for (const orb of lootOrbsRef.current) {
            const bob = Math.sin(now * 0.008 + orb.x) * 2.5;
            const orbColor = orb.medallion
              ? "#FBBF24"
              : orb.weaponRarity
              ? RARITY_META[orb.weaponRarity].color
              : "#10B981";
            ctx.fillStyle = `${orbColor}44`;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y + bob, orb.medallion ? 18 : 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = orbColor;
            ctx.strokeStyle = "#F8FAFC";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y + bob, orb.medallion ? 10 : 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          // Data Crates & Gbozz Terminals
          for (const crate of layout.crates) {
            if (
              crate.x + 50 < camX ||
              crate.x - 50 > camX + cw ||
              crate.y + 50 < camY ||
              crate.y - 50 > camY + ch
            ) {
              continue;
            }
            const cState = crateStatesRef.current.get(crate.id);
            const isLocked = Boolean(cState && cState.lockedUntilMs > now);
            const isDepleted = Boolean(cState && cState.depletedUntilMs > now);
            const distMe = Math.hypot(crate.x - local.x, crate.y - local.y);
            const isNear = local.alive && distMe <= 84 && !isLocked && !isDepleted;

            if (isNear) {
              ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(crate.x, crate.y, crate.radius + 10, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (crate.kind === "terminal") {
              ctx.fillStyle = isDepleted ? "#1E1B2E" : isLocked ? "#451A1A" : "#1E1638";
              ctx.strokeStyle = isDepleted ? "#475569" : isLocked ? "#EF4444" : "#8B5CF6";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.roundRect(crate.x - 19, crate.y - 19, 38, 38, 8);
              ctx.fill();
              ctx.stroke();
              if (!isDepleted && !isLocked) {
                ctx.fillStyle = "#10B981";
                ctx.fillRect(crate.x - 9, crate.y - 7, 18, 10);
              }
            } else {
              ctx.fillStyle = isDepleted ? "#1F242D" : isLocked ? "#451A1A" : "#4A2E14";
              ctx.strokeStyle = isDepleted ? "#475569" : isLocked ? "#EF4444" : "#F59E0B";
              ctx.lineWidth = 2.5;
              ctx.fillRect(crate.x - 17, crate.y - 17, 34, 34);
              ctx.strokeRect(crate.x - 17, crate.y - 17, 34, 34);
              ctx.beginPath();
              ctx.moveTo(crate.x - 17, crate.y - 17);
              ctx.lineTo(crate.x + 17, crate.y + 17);
              ctx.stroke();
            }

            if (isLocked && cState) {
              const sec = Math.ceil((cState.lockedUntilMs - now) / 1000);
              ctx.fillStyle = "#FCA5A5";
              ctx.font = "bold 11px JetBrains Mono, monospace";
              ctx.textAlign = "center";
              ctx.fillText(`LOCKED ${sec}s`, crate.x, crate.y - 25);
            } else if (isNear) {
              ctx.fillStyle = "#10B981";
              ctx.font = "bold 11px JetBrains Mono, monospace";
              ctx.textAlign = "center";
              ctx.fillText(
                crate.kind === "terminal" ? "[E] TERMINAL" : "[E] DATA CRATE",
                crate.x,
                crate.y - 26
              );
            }
          }
          // Static obstacles are pre-rendered in terrainCacheRef for max FPS!

          // Deployed Temporary Firewall Cover Walls
          for (const fw of firewallsRef.current) {
            if (fw.hp <= 0 || fw.expiresAtMs <= now) continue;
            const hpPct = Math.max(0, Math.min(1, fw.hp / fw.maxHp));
            ctx.fillStyle = "rgba(56, 189, 248, 0.28)";
            ctx.strokeStyle = "#38BDF8";
            ctx.lineWidth = 2.5;
            ctx.fillRect(fw.x, fw.y, fw.w, fw.h);
            ctx.strokeRect(fw.x, fw.y, fw.w, fw.h);

            // Inner honeycomb energy grid line
            ctx.fillStyle = `rgba(16, 185, 129, ${0.35 + hpPct * 0.45})`;
            ctx.fillRect(fw.x + 3, fw.y + 3, (fw.w - 6) * hpPct, fw.h - 6);
          }

          // Shockwave Rings & Afterimages
          for (const sw of shockwavesRef.current) {
            ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;

          for (const a of afterImagesRef.current) {
            ctx.globalAlpha = Math.max(0, (a.life / a.maxLife) * 0.45);
            ctx.fillStyle = a.color;
            ctx.beginPath();
            ctx.arc(a.x, a.y, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          // Projectiles
          for (const proj of projectilesRef.current) {
            const boltColor = getProjectileColor(
              proj.archetype,
              proj.rarity,
              proj.isBot,
              proj.isMiniBozz
            );
            const r =
              proj.isMiniBozz || proj.archetype === "cannon"
                ? 7.5
                : proj.archetype === "railgun"
                ? 5.5
                : 4.5;
            ctx.fillStyle = boltColor;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = boltColor;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = proj.archetype === "cannon" ? 5 : 3;
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            ctx.lineTo(proj.x - proj.vx * 0.032, proj.y - proj.vy * 0.032);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          // AI Mini-Bozzes Render (smoothed on non-host screens!)
          for (const mb of miniBozzesRef.current) {
            if (!mb.alive) continue;
            const mbSm = !isHost ? bossSmoothRef.current.get(mb.id) : null;
            const mbx = mbSm ? mbSm.x : mb.x;
            const mby = mbSm ? mbSm.y : mb.y;
            const mbAim = mbSm ? mbSm.aimAngle : mb.aimAngle;
            const dLocal = Math.hypot(mbx - local.x, mby - local.y);

            // Boss aura
            ctx.strokeStyle = "rgba(251, 113, 133, 0.55)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(mbx, mby, MINI_BOZZ_RADIUS + 10 + pulse * 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.save();
            ctx.translate(mbx, mby);
            ctx.rotate(mbAim);
            ctx.fillStyle = "#FB7185";
            ctx.fillRect(14, -6, 26, 12);
            ctx.fillStyle = "#F43F5E";
            ctx.strokeStyle = "#FBBF24";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, MINI_BOZZ_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.font = "bold 11px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#FBBF24";
            ctx.fillText(`MINI-BOZZ · ${mb.name}`, mbx, mby - 44);

            // Boss Shield & HP Bar
            const bw = 64;
            ctx.fillStyle = "rgba(0,0,0,0.75)";
            ctx.fillRect(mbx - bw / 2, mby - 38, bw, 9);
            ctx.fillStyle = "#F43F5E";
            ctx.fillRect(mbx - bw / 2, mby - 38, bw * (mb.hp / mb.maxHp), 5);
            ctx.fillStyle = "#38BDF8";
            ctx.fillRect(mbx - bw / 2, mby - 33, bw * (mb.shield / mb.maxShield), 4);

            if (local.alive && dLocal <= 145) {
              ctx.fillStyle = "#FBBF24";
              ctx.font = "bold 11px JetBrains Mono, monospace";
              ctx.fillText("[R] RAPID-FIRE BONUS DUEL", mbx, mby + 44);
            }
          }

          // Contestants Render
          const drawContestant = (params: {
            x: number;
            y: number;
            aimAngle: number;
            name: string;
            hp: number;
            shield: number;
            ammo: number;
            rarity?: LootRarity | null;
            hasMedallion?: boolean;
            isSelf: boolean;
            isBot: boolean;
            exposed: boolean;
            speedBoost: boolean;
            answering: boolean;
            recentlyFired: boolean;
          }) => {
            if (
              params.x + 60 < camX ||
              params.x - 60 > camX + cw ||
              params.y + 60 < camY ||
              params.y - 60 > camY + ch
            ) {
              return;
            }

            if (!params.isSelf && !params.exposed && !params.recentlyFired) {
              const hiddenBush = getBushContainingPoint(params.x, params.y, layout.bushes);
              if (hiddenBush && Math.hypot(params.x - local.x, params.y - local.y) > 95) {
                return;
              }
            }

            if (params.hasMedallion) {
              ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(params.x, params.y, PLAYER_RADIUS + 14, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (params.exposed) {
              ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(params.x, params.y, PLAYER_RADIUS + 11, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (params.speedBoost) {
              ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(params.x, params.y, PLAYER_RADIUS + 6, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (params.shield > 0) {
              ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(params.x, params.y, PLAYER_RADIUS + 3, 0, Math.PI * 2);
              ctx.stroke();
            }

            ctx.save();
            ctx.translate(params.x, params.y);
            ctx.rotate(params.aimAngle);

            if (params.ammo > 0) {
              const gunColor = params.rarity
                ? RARITY_META[params.rarity].color
                : params.isSelf
                ? "#10B981"
                : "#8B5CF6";
              ctx.fillStyle = gunColor;
              ctx.fillRect(10, -4, 22, 8);
              ctx.fillStyle = "#E2E8F0";
              ctx.fillRect(26, -3, 6, 6);
            }

            ctx.fillStyle = params.isSelf ? "#34D399" : params.isBot ? "#A78BFA" : "#F59E0B";
            ctx.beginPath();
            ctx.arc(13, 10, 5.5, 0, Math.PI * 2);
            ctx.arc(13, -10, 5.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = params.isSelf ? "#10B981" : params.isBot ? "#6D28D9" : "#EA580C";
            ctx.strokeStyle = "#050507";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.font = "bold 11px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = params.hasMedallion
              ? "#FBBF24"
              : params.isSelf
              ? "#6EE7B7"
              : "#E4E4E7";
            ctx.fillText(
              params.hasMedallion ? `★ ${params.name}` : params.name,
              params.x,
              params.y - 30
            );

            if (!params.isSelf) {
              const bw = 38;
              ctx.fillStyle = "rgba(0,0,0,0.65)";
              ctx.fillRect(params.x - bw / 2, params.y - 25, bw, 5);
              ctx.fillStyle = "#EF4444";
              ctx.fillRect(
                params.x - bw / 2,
                params.y - 25,
                bw * Math.max(0, Math.min(1, params.hp / 100)),
                5
              );
            }

            if (params.answering) {
              ctx.fillStyle = "#FACC15";
              ctx.font = "10px JetBrains Mono, monospace";
              ctx.fillText("Hacking Crate...", params.x, params.y + 32);
            }
          };

          for (const bot of botsRef.current) {
            if (!bot.alive) continue;
            const bSm = !isHost ? botSmoothRef.current.get(bot.id) : null;
            drawContestant({
              x: bSm ? bSm.x : bot.x,
              y: bSm ? bSm.y : bot.y,
              aimAngle: bSm ? bSm.aimAngle : bot.aimAngle,
              name: bot.name,
              hp: bot.hp,
              shield: bot.shield,
              ammo: bot.ammo,
              rarity: bot.weaponRarity,
              hasMedallion: bot.hasMedallion,
              isSelf: false,
              isBot: true,
              exposed: bot.exposedUntilMs > now,
              speedBoost: bot.speedBoostUntilMs > now,
              answering: bot.aiState === "answering",
              recentlyFired: now - bot.lastShotAtMs < 1200,
            });
          }

          for (const rp of remotePlayersRef.current) {
            if (!rp.alive || rp.playerId === currentPlayerId) continue;
            const sm = remoteSmoothRef.current.get(rp.playerId);
            const rx = sm ? sm.x : rp.x;
            const ry = sm ? sm.y : rp.y;
            const rAim = sm ? sm.aimAngle : rp.aimAngle;

            // Distinct Cyan Challenger Ring so friends/rivals stand out cleanly
            ctx.strokeStyle = "rgba(56, 189, 248, 0.72)";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(rx, ry, PLAYER_RADIUS + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            drawContestant({
              x: rx,
              y: ry,
              aimAngle: rAim,
              name: rp.displayName,
              hp: rp.hp,
              shield: rp.shield,
              ammo: rp.ammo,
              hasMedallion: rp.hasMedallion,
              isSelf: false,
              isBot: false,
              exposed: rp.exposedUntilMs > now,
              speedBoost: false,
              answering: false,
              recentlyFired: true,
            });
          }

          if (local.alive) {
            const curRarity = local.weapons[local.activeWeapon] || "Common";
            if (local.ammo > 0) {
              ctx.strokeStyle = `${RARITY_META[curRarity].color}44`;
              ctx.setLineDash([6, 6]);
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(local.x, local.y);
              ctx.lineTo(
                local.x + Math.cos(local.aimAngle) * 280,
                local.y + Math.sin(local.aimAngle) * 280
              );
              ctx.stroke();
              ctx.setLineDash([]);
            }

            drawContestant({
              x: local.x,
              y: local.y,
              aimAngle: local.aimAngle,
              name: meFromRoom?.displayName || "You",
              hp: local.hp,
              shield: local.shield,
              ammo: local.ammo,
              rarity: curRarity,
              hasMedallion: local.hasMedallion,
              isSelf: true,
              isBot: false,
              exposed: local.exposedUntilMs > now,
              speedBoost: local.speedBoostUntilMs > now,
              answering: Boolean(activeQuizRef.current),
              recentlyFired: true,
            });
          }

          // Stealth Bushes
          for (const bush of layout.bushes) {
            if (
              bush.x + bush.radius + 10 < camX ||
              bush.x - bush.radius - 10 > camX + cw ||
              bush.y + bush.radius + 10 < camY ||
              bush.y - bush.radius - 10 > camY + ch
            ) {
              continue;
            }
            const meInside = Math.hypot(local.x - bush.x, local.y - bush.y) <= bush.radius + 8;
            ctx.globalAlpha = meInside ? 0.36 : 0.88;
            ctx.fillStyle = bush.kind === "tree" ? "#064E3B" : "#065F46";
            ctx.beginPath();
            ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = bush.kind === "tree" ? "#047857" : "#10B981";
            ctx.globalAlpha = meInside ? 0.28 : 0.55;
            ctx.beginPath();
            ctx.arc(bush.x - 5, bush.y - 5, bush.radius * 0.65, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          // Particles & Labels
          for (const p of particlesRef.current) {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          for (const l of labelsRef.current) {
            ctx.globalAlpha = Math.max(0, l.life / l.maxLife);
            ctx.fillStyle = l.color;
            ctx.font = "bold 12px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.fillText(l.text, l.x, l.y);
          }
          ctx.globalAlpha = 1;

          // System Glitch Storm Overlay (Glitching Red Zone!)
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.setLineDash([10, 8]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(zone.cx, zone.cy, zone.nextRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "rgba(239, 68, 68, 0.24)";
          ctx.beginPath();
          ctx.rect(-200, -200, ARENA_SIZE + 400, ARENA_SIZE + 400);
          ctx.arc(zone.cx, zone.cy, zone.currentRadius, 0, Math.PI * 2, true);
          ctx.fill();

          // Glitch scanline edge slices
          ctx.strokeStyle = Math.floor(now / 120) % 2 === 0 ? "#EF4444" : "#F43F5E";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(zone.cx, zone.cy, zone.currentRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();

          // Edge-of-Screen Compass Indicators toward Live Human Challengers so friends can find each other!
          if (local.alive) {
            for (const rp of remotePlayersRef.current) {
              if (!rp.alive || rp.playerId === currentPlayerId) continue;
              const sm = remoteSmoothRef.current.get(rp.playerId);
              const rx = sm ? sm.x : rp.x;
              const ry = sm ? sm.y : rp.y;
              const screenX = rx - camX;
              const screenY = ry - camY;
              if (screenX >= 20 && screenX <= cw - 20 && screenY >= 20 && screenY <= ch - 20) {
                continue;
              }
              const ang = Math.atan2(ry - local.y, rx - local.x);
              const margin = 46;
              const clampedX = Math.max(margin, Math.min(cw - margin, cw / 2 + Math.cos(ang) * (cw * 0.44)));
              const clampedY = Math.max(margin + 20, Math.min(ch - 75, ch / 2 + Math.sin(ang) * (ch * 0.42)));
              const distMeters = Math.round(Math.hypot(rx - local.x, ry - local.y) / 14);

              ctx.save();
              ctx.translate(clampedX, clampedY);
              ctx.fillStyle = "rgba(8, 12, 22, 0.88)";
              ctx.strokeStyle = "#38BDF8";
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.roundRect(-42, -13, 84, 26, 7);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "#38BDF8";
              ctx.font = "bold 10px JetBrains Mono, monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`${rp.displayName.slice(0, 7)} ${distMeters}m`, 0, 0);
              ctx.restore();
            }
          }

          if (damageFlashRef.current > 0) {
            ctx.fillStyle = `rgba(239, 68, 68, ${damageFlashRef.current})`;
            ctx.fillRect(0, 0, cw, ch);
          }
        }
      }

      // 6. Throttled Minimap & Full Map Render (~12Hz) with Cached Static Terrain
      if (now - lastMinimapDrawMs >= 85) {
        lastMinimapDrawMs = now;
        const drawMapCanvas = (targetCanvas: HTMLCanvasElement | null, showLabels: boolean) => {
          if (!targetCanvas) return;
          const mctx = targetCanvas.getContext("2d");
          if (!mctx) return;
          const mw = targetCanvas.width;
          const scale = mw / ARENA_SIZE;

          if (minimapCacheRef.current) {
            mctx.drawImage(minimapCacheRef.current, 0, 0, mw, mw);
          } else {
            mctx.fillStyle = "#080A10";
            mctx.fillRect(0, 0, mw, mw);
          }

          // System Glitch Storm Overlay
          mctx.fillStyle = "rgba(239, 68, 68, 0.32)";
          mctx.beginPath();
          mctx.rect(0, 0, mw, mw);
          mctx.arc(zone.cx * scale, zone.cy * scale, zone.currentRadius * scale, 0, Math.PI * 2, true);
          mctx.fill();

        mctx.strokeStyle = "#10B981";
        mctx.lineWidth = showLabels ? 2.5 : 1.5;
        mctx.beginPath();
        mctx.arc(zone.cx * scale, zone.cy * scale, zone.currentRadius * scale, 0, Math.PI * 2);
        mctx.stroke();

        // Crates & Terminals
        for (const c of layout.crates) {
          const cs = crateStatesRef.current.get(c.id);
          if (cs && cs.depletedUntilMs > now) continue;
          mctx.fillStyle =
            cs && cs.lockedUntilMs > now
              ? "#EF4444"
              : c.kind === "terminal"
              ? "#A78BFA"
              : "#F59E0B";
          const sz = showLabels ? 5 : 2.8;
          mctx.fillRect(c.x * scale - sz / 2, c.y * scale - sz / 2, sz, sz);
        }

        // Mini-Bozzes Skull Markers
        for (const mb of miniBozzesRef.current) {
          if (!mb.alive) continue;
          mctx.fillStyle = "#FB7185";
          mctx.beginPath();
          mctx.arc(mb.x * scale, mb.y * scale, showLabels ? 6 : 3.5, 0, Math.PI * 2);
          mctx.fill();
        }

        // Gold Radius Circle for Bozz Medallion Holders!
        const drawMedallionRing = (hx: number, hy: number) => {
          mctx.fillStyle = "rgba(251, 191, 36, 0.16)";
          mctx.strokeStyle = "#FBBF24";
          mctx.lineWidth = 1.6;
          mctx.beginPath();
          mctx.arc(hx * scale, hy * scale, 220 * scale, 0, Math.PI * 2);
          mctx.fill();
          mctx.stroke();
        };

        if (local.alive && local.hasMedallion) {
          drawMedallionRing(local.x, local.y);
        }
        for (const rp of remotePlayersRef.current) {
          if (rp.alive && rp.playerId !== currentPlayerId && rp.hasMedallion) {
            const sm = remoteSmoothRef.current.get(rp.playerId);
            drawMedallionRing(sm ? sm.x : rp.x, sm ? sm.y : rp.y);
          }
        }
        for (const b of botsRef.current) {
          if (b.alive && b.hasMedallion) {
            const sm = !isHost ? botSmoothRef.current.get(b.id) : null;
            drawMedallionRing(sm ? sm.x : b.x, sm ? sm.y : b.y);
          }
        }

        // Radar sweep & Alarm Pings
        const radarActive = local.radarUntilMs > now;
        if (radarActive) {
          mctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
          mctx.lineWidth = 1.5;
          mctx.beginPath();
          mctx.arc(local.x * scale, local.y * scale, 950 * scale, 0, Math.PI * 2);
          mctx.stroke();
        }

        const revealEnemy = (ex: number, ey: number, exposed: boolean) => {
          const dist = Math.hypot(ex - local.x, ey - local.y);
          if (!exposed && !(radarActive && dist <= 950)) return;
          mctx.fillStyle = "#EF4444";
          mctx.beginPath();
          mctx.arc(ex * scale, ey * scale, showLabels ? 5 : exposed ? 3.5 : 2.5, 0, Math.PI * 2);
          mctx.fill();
        };

        for (const b of botsRef.current) {
          if (b.alive) {
            const sm = !isHost ? botSmoothRef.current.get(b.id) : null;
            revealEnemy(sm ? sm.x : b.x, sm ? sm.y : b.y, b.exposedUntilMs > now);
          }
        }
        // Always show live human challengers on minimap & full map so friends can find & battle each other
        for (const rp of remotePlayersRef.current) {
          if (!rp.alive || rp.playerId === currentPlayerId) continue;
          const sm = remoteSmoothRef.current.get(rp.playerId);
          const rx = (sm ? sm.x : rp.x) * scale;
          const ry = (sm ? sm.y : rp.y) * scale;
          mctx.fillStyle = "#38BDF8";
          mctx.strokeStyle = "#FFFFFF";
          mctx.lineWidth = 1.2;
          mctx.beginPath();
          mctx.arc(rx, ry, showLabels ? 6 : 4, 0, Math.PI * 2);
          mctx.fill();
          mctx.stroke();
          if (showLabels) {
            mctx.fillStyle = "#38BDF8";
            mctx.font = "bold 10px JetBrains Mono, monospace";
            mctx.textAlign = "center";
            mctx.fillText(rp.displayName, rx, ry - 9);
          }
        }

        if (showLabels) {
          mctx.font = "bold 12px JetBrains Mono, monospace";
          mctx.textAlign = "center";
          for (const poi of ARENA_POIS) {
            mctx.fillStyle = "rgba(5, 5, 10, 0.78)";
            mctx.fillRect(poi.dropX * scale - 64, poi.dropY * scale - 11, 128, 18);
            mctx.fillStyle = poi.color;
            mctx.fillText(poi.name.toUpperCase(), poi.dropX * scale, poi.dropY * scale + 2);
          }
        }

        if (local.alive) {
          mctx.fillStyle = "#FFFFFF";
          mctx.beginPath();
          mctx.arc(local.x * scale, local.y * scale, showLabels ? 6 : 4, 0, Math.PI * 2);
          mctx.fill();
        }
      };

      drawMapCanvas(minimapRef.current, false);
      if (showFullMapRef.current) {
        drawMapCanvas(fullMapRef.current, true);
      }
      }

      // 7. Throttled React HUD Snapshot (~7.5Hz)
      if (now - lastHudUpdateMs >= 130) {
        lastHudUpdateMs = now;
        const hasLocalInList = remotePlayersRef.current.some(
          (p) => p.playerId === currentPlayerId
        );
        const aliveHumans =
          remotePlayersRef.current.filter((p) =>
            p.playerId === currentPlayerId ? local.alive : p.alive
          ).length + (!hasLocalInList && local.alive ? 1 : 0);
        const totalHumans =
          remotePlayersRef.current.length + (hasLocalInList ? 0 : 1);
        const aliveBots = botsRef.current.filter((b) => b.alive).length;
        const aliveCount = aliveHumans + aliveBots;
        aliveCountRef.current = aliveCount;
        const totalCount = totalHumans + botsRef.current.length;

        let spectatingName = "";
        let spectatingKind: "Friend" | "Bot" | null = null;
        let spectatingHp = 0;
        let spectatingShield = 0;
        if (!local.alive) {
          const targetId = spectateTargetIdRef.current;
          const specHuman =
            (targetId
              ? remotePlayersRef.current.find(
                  (p) => p.alive && p.playerId === targetId && p.playerId !== currentPlayerId
                )
              : undefined) ||
            remotePlayersRef.current.find(
              (p) => p.alive && p.playerId !== currentPlayerId
            );
          const specBot = !specHuman
            ? (targetId
                ? botsRef.current.find((b) => b.alive && b.id === targetId)
                : undefined) || botsRef.current.find((b) => b.alive)
            : undefined;
          if (specHuman) {
            spectateTargetIdRef.current = specHuman.playerId;
            spectatingName = specHuman.displayName;
            spectatingKind = "Friend";
            spectatingHp = Math.ceil(specHuman.hp);
            spectatingShield = Math.ceil(specHuman.shield);
          } else if (specBot) {
            spectateTargetIdRef.current = specBot.id;
            spectatingName = specBot.name;
            spectatingKind = "Bot";
            spectatingHp = Math.ceil(specBot.hp);
            spectatingShield = Math.ceil(specBot.shield);
          }
        }

        let nearestCrate: { crate: ArenaCrate; lockedSec: number } | null = null;
        let minCrateDist = 84;
        for (const c of layout.crates) {
          const cs = crateStatesRef.current.get(c.id);
          if (cs && cs.depletedUntilMs > now) continue;
          const d = Math.hypot(c.x - local.x, c.y - local.y);
          if (d < minCrateDist) {
            minCrateDist = d;
            nearestCrate = {
              crate: c,
              lockedSec:
                cs && cs.lockedUntilMs > now
                  ? Math.ceil((cs.lockedUntilMs - now) / 1000)
                  : 0,
            };
          }
        }

        let nearestBoss: MiniBozzState | null = null;
        let minBossDist = 145;
        for (const mb of miniBozzesRef.current) {
          if (!mb.alive) continue;
          const d = Math.hypot(mb.x - local.x, mb.y - local.y);
          if (d < minBossDist) {
            minBossDist = d;
            nearestBoss = mb;
          }
        }

        const currentBiome = getBiomeAtPoint(local.x, local.y, layout.biomes);
        const inBurnout =
          Math.hypot(local.x - zone.cx, local.y - zone.cy) > zone.currentRadius;

        setHud({
          hp: Math.ceil(local.hp),
          shield: Math.ceil(local.shield),
          ammo: local.ammo,
          medkits: local.medkits,
          shieldPotions: local.shieldPotions,
          tokens: local.tokens,
          shockwaveCharges: local.shockwaveCharges,
          kills: local.kills,
          miniBozzKills: local.miniBozzKills,
          hasMedallion: local.hasMedallion,
          streak: local.streak,
          activeWeapon: local.activeWeapon,
          weapons: { ...local.weapons },
          questionsCorrect: local.questionsCorrect,
          questionsAttempted: local.questionsAttempted,
          alive: local.alive,
          aliveCount,
          totalCount,
          humanAliveCount: aliveHumans,
          humanTotalCount: totalHumans,
          miniBozzesAlive: miniBozzesRef.current.filter((m) => m.alive).length,
          biomeName: currentBiome.name,
          biomeSubtitle: currentBiome.subtitle,
          biomeAccent: currentBiome.accentColor,
          speedSecLeft: Math.max(0, Math.ceil((local.speedBoostUntilMs - now) / 1000)),
          radarSecLeft: Math.max(0, Math.ceil((local.radarUntilMs - now) / 1000)),
          exposedSecLeft: Math.max(0, Math.ceil((local.exposedUntilMs - now) / 1000)),
          dashSecLeft: Math.max(0, Math.ceil((local.dashCooldownUntilMs - now) / 1000)),
          inBurnout,
          inWater: local.inWater,
          inBush: local.inBush,
          zonePhase: zone.phase,
          zoneCountdownSec: zone.phaseTimeLeftSec,
          nearbyCrate: nearestCrate,
          nearbyBoss: nearestBoss,
          killFeed: killFeedRef.current,
          spectatingName,
          spectatingKind,
          spectatingHp,
          spectatingShield,
        });

        if (
          isHost &&
          currentRoom.status === "active" &&
          !matchFinishTriggeredRef.current &&
          totalCount >= 2 &&
          aliveCount <= 1
        ) {
          matchFinishTriggeredRef.current = true;
          const lastHuman = remotePlayersRef.current.find((p) =>
            p.playerId === currentPlayerId ? local.alive : p.alive
          );
          const lastBot = botsRef.current.find((b) => b.alive);
          const winnerId = lastHuman?.playerId || lastBot?.id || currentPlayerId;
          const winnerName =
            lastHuman?.displayName || lastBot?.name || meFromRoom?.displayName || "Bozz Champion";

          if (local.alive) local.placement = 1;
          void syncWorldState({
            db,
            roomCode: currentRoom.roomCode,
            bots: botsRef.current,
            miniBozzes: miniBozzesRef.current,
            firewalls: firewallsRef.current,
            crateStates: Array.from<SyncedCrateState>(crateStatesRef.current.values()),
            killFeed: killFeedRef.current,
          })
            .catch(() => {})
            .finally(() => {
              void hostFinishRoyaleMatch({
                db,
                roomCode: currentRoom.roomCode,
                winnerId,
                winnerName,
              }).catch(() => {});
            });
        }
      }

      // 8. Serialized High-Frequency Firestore Sync (Dirty-Checked Human ~135ms + Batched Non-Host Patches ~200ms + Serialized Host World ~320ms)
      if (!isHost && currentRoom.status === "active" && !matchFinishTriggeredRef.current) {
        flushPendingWorldPatches(false);
      }

      const curLocal = localRef.current;
      const curPlayerSig = `${curLocal.alive ? 1 : 0}:${Math.round(curLocal.hp)}:${Math.round(
        curLocal.shield
      )}:${curLocal.ammo}:${curLocal.kills}:${curLocal.hasMedallion ? 1 : 0}:${Math.round(
        curLocal.x
      )}:${Math.round(curLocal.y)}:${curLocal.aimAngle.toFixed(2)}:${curLocal.lastShotId}`;

      const shouldFlushPlayer =
        currentRoom.status === "active" &&
        !matchFinishTriggeredRef.current &&
        (syncNowRef.current ||
          (now - lastPlayerSyncMs >= 135 && curPlayerSig !== lastSentPlayerSigRef.current));

      if (shouldFlushPlayer) {
        if (playerSyncInFlightRef.current) {
          playerSyncPendingRef.current = true;
        } else {
          syncNowRef.current = false;
          playerSyncPendingRef.current = false;
          playerSyncInFlightRef.current = true;
          lastPlayerSyncMs = now;
          lastSentPlayerSigRef.current = curPlayerSig;
          void syncLocalPlayerState({
            db,
            roomCode: currentRoom.roomCode,
            playerId: currentPlayerId,
            state: {
              alive: curLocal.alive,
              hp: curLocal.hp,
              shield: curLocal.shield,
              ammo: curLocal.ammo,
              kills: curLocal.kills,
              hasMedallion: curLocal.hasMedallion,
              questionsCorrect: curLocal.questionsCorrect,
              questionsAttempted: curLocal.questionsAttempted,
              x: curLocal.x,
              y: curLocal.y,
              aimAngle: curLocal.aimAngle,
              exposedUntilMs: curLocal.exposedUntilMs,
              placement: curLocal.placement,
              lastShotId: curLocal.lastShotId,
              lastShotX: curLocal.lastShotX,
              lastShotY: curLocal.lastShotY,
              lastShotVx: curLocal.lastShotVx,
              lastShotVy: curLocal.lastShotVy,
              lastShotAtMs: curLocal.lastShotAtMs,
            },
          })
            .catch(() => {})
            .finally(() => {
              playerSyncInFlightRef.current = false;
              if (
                playerSyncPendingRef.current &&
                roomRef.current.status === "active" &&
                !matchFinishTriggeredRef.current
              ) {
                playerSyncPendingRef.current = false;
                syncNowRef.current = true;
              }
            });
        }
      }

      if (
        isHost &&
        currentRoom.status === "active" &&
        !matchFinishTriggeredRef.current &&
        !worldSyncInFlightRef.current &&
        now - lastWorldSyncMs >= 320
      ) {
        lastWorldSyncMs = now;
        worldSyncInFlightRef.current = true;
        const activeCrates = Array.from<SyncedCrateState>(
          crateStatesRef.current.values()
        ).filter((c) => c.lockedUntilMs > now || c.depletedUntilMs > now);
        void syncWorldState({
          db,
          roomCode: currentRoom.roomCode,
          bots: botsRef.current,
          miniBozzes: miniBozzesRef.current,
          firewalls: firewallsRef.current,
          crateStates: activeCrates,
          killFeed: killFeedRef.current,
        })
          .catch(() => {})
          .finally(() => {
            worldSyncInFlightRef.current = false;
          });
      }

      rafId = requestAnimationFrame(tickFrame);
    };

    rafId = requestAnimationFrame(tickFrame);
    return () => cancelAnimationFrame(rafId);
  }, [
    db,
    isHost,
    currentPlayerId,
    layout,
    meFromRoom?.displayName,
    flushPendingWorldPatches,
    handleMiniBozzDefeated,
    pushKillFeed,
    queueWorldPatch,
    showToast,
    spawnBurst,
    spawnLabel,
    spawnLootOrb,
    spawnShockwave,
  ]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseScreenRef.current.x = e.clientX - rect.left;
    mouseScreenRef.current.y = e.clientY - rect.top;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      handleDash();
      return;
    }
    if (e.button !== 0 || activePrompt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mouseScreenRef.current.x = sx;
    mouseScreenRef.current.y = sy;

    const wx = sx + cameraRef.current.x;
    const wy = sy + cameraRef.current.y;
    const clickedCrate = layout.crates.find(
      (c) =>
        Math.hypot(c.x - wx, c.y - wy) <= c.radius + 16 &&
        Math.hypot(c.x - localRef.current.x, c.y - localRef.current.y) <= 86
    );
    if (clickedCrate) {
      openNearbyCrate(clickedCrate);
      return;
    }

    mouseScreenRef.current.down = true;
  };

  const handleCanvasMouseUp = () => {
    mouseScreenRef.current.down = false;
  };

  const curWeaponMeta = WEAPON_META[hud.activeWeapon];
  const curRarity = hud.weapons[hud.activeWeapon] || "Common";
  const curRarityMeta = RARITY_META[curRarity];

  return (
    <div className="space-y-3">
      {/* Compact Top Telemetry Strip */}
      <div className="bg-zinc-950/95 border border-white/10 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3.5 text-xs font-mono tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
            <Trophy className="h-4 w-4" />
            Alive: {hud.aliveCount} / {hud.totalCount}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-sky-300 font-bold">
            <Swords className="h-3.5 w-3.5 text-sky-400" />
            Humans: {hud.humanAliveCount}/{hud.humanTotalCount}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-purple-300">
            <Skull className="h-3.5 w-3.5 text-purple-400" />
            Kills: <strong className="text-white">{hud.kills}</strong>
          </span>
          <span className="text-zinc-600">·</span>
          <span className="inline-flex items-center gap-1.5 text-rose-300">
            <Medal className="h-3.5 w-3.5 text-amber-400" />
            Mini-Bozzes: <strong className="text-white">{hud.miniBozzesAlive}/3</strong>
          </span>
          <span className="text-zinc-600 hidden sm:inline">·</span>
          <span className="inline-flex items-center gap-1.5" style={{ color: hud.biomeAccent }}>
            <Compass className="h-3.5 w-3.5" />
            <strong className="truncate max-w-[150px]">{hud.biomeName}</strong>
          </span>
          <span className="text-zinc-600 hidden md:inline">·</span>
          <span
            className={`inline-flex items-center gap-1.5 font-bold ${
              hud.inBurnout ? "text-red-400" : "text-zinc-300"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-red-400" />
            Glitch {hud.zonePhase}/5 ({hud.zoneCountdownSec}s)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFullMap((m) => !m)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/15 rounded-lg text-xs font-mono text-zinc-200 cursor-pointer whitespace-nowrap"
          >
            <MapIcon className="h-3.5 w-3.5 text-purple-400" />
            <span>[M] Map</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/15 rounded-lg text-xs font-mono text-zinc-300 cursor-pointer whitespace-nowrap"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>{muted ? "SFX Off" : "SFX On"}</span>
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-red-950/50 border border-white/10 hover:border-red-500/40 rounded-lg text-xs font-mono text-zinc-400 hover:text-red-300 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Main 2D Top-Down Gbozz Arena Viewport */}
      <div className="relative w-full h-[590px] lg:h-[670px] rounded-2xl overflow-hidden border border-white/15 bg-[#06080D] shadow-2xl select-none">
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block cursor-crosshair"
        />

        {/* System Glitch Storm Border Alert */}
        {hud.inBurnout && hud.alive && (
          <div className="pointer-events-none absolute inset-0 border-[6px] border-red-500/55">
            <div className="mt-3 mx-auto w-fit px-4 py-1.5 bg-red-950/90 border border-red-400/60 rounded-lg text-xs font-mono font-bold text-red-200">
              SYSTEM GLITCH STORM · MOVE INSIDE SAFE ZONE
            </div>
          </div>
        )}

        {/* Top-Left Kill Feed & Buffs */}
        <div className="pointer-events-none absolute top-3 left-3 space-y-1.5 max-w-[300px]">
          {hud.hasMedallion && (
            <div className="px-2.5 py-1 bg-amber-950/90 border border-amber-400/60 rounded-lg text-[11px] font-mono text-amber-200 font-bold flex items-center gap-1.5">
              <Medal className="h-3.5 w-3.5 text-amber-400" />
              <span>BOZZ MEDALLION · SHIELD REGEN ON</span>
            </div>
          )}
          {hud.inBush && (
            <div className="px-2.5 py-1 bg-emerald-950/85 border border-emerald-400/50 rounded-lg text-[11px] font-mono text-emerald-200 font-bold">
              STEALTH BUSH · CONCEALED
            </div>
          )}
          {hud.inWater && (
            <div className="px-2.5 py-1 bg-sky-950/85 border border-sky-400/50 rounded-lg text-[11px] font-mono text-sky-200 font-bold">
              DATA CANAL · CROSS PIER FOR FULL SPEED
            </div>
          )}
          {hud.killFeed.slice(0, 4).map((item, idx) => (
            <div
              key={`${idx}-${item}`}
              className="px-2.5 py-1 bg-zinc-950/90 border border-white/10 rounded-lg text-[11px] font-mono text-zinc-200 truncate"
            >
              {item}
            </div>
          ))}
        </div>

        {/* Top-Right Minimap */}
        <button
          type="button"
          onClick={() => setShowFullMap((m) => !m)}
          title="Click or press [M] for full Gbozz Arena Map"
          className="absolute top-3 right-3 p-1.5 bg-zinc-950/92 hover:bg-zinc-900 border border-white/15 rounded-xl space-y-1 cursor-pointer text-left"
        >
          <canvas
            ref={minimapRef}
            width={154}
            height={154}
            className="rounded-lg block border border-white/10"
          />
          <div className="flex items-center justify-between px-1 text-[10px] font-mono text-zinc-400">
            <span>{hud.biomeName}</span>
            {hud.exposedSecLeft > 0 ? (
              <span className="text-red-400 font-bold">ALARM {hud.exposedSecLeft}s</span>
            ) : hud.radarSecLeft > 0 ? (
              <span className="text-emerald-400 font-bold">RADAR {hud.radarSecLeft}s</span>
            ) : (
              <span className="text-purple-300">[M] Map</span>
            )}
          </div>
        </button>

        {/* Loot Toast */}
        {lootBanner && (
          <div
            className={`pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl border text-center animate-reveal-pop ${
              lootBanner.tone === "reward"
                ? "bg-emerald-950/95 border-emerald-400/60 text-emerald-100"
                : "bg-red-950/95 border-red-400/60 text-red-100"
            }`}
          >
            <div className="text-xs font-mono font-extrabold">{lootBanner.title}</div>
            <div className="text-[11px] font-mono opacity-90">{lootBanner.detail}</div>
          </div>
        )}

        {/* Crate / Terminal / Mini-Bozz Interaction Prompts */}
        {hud.alive && (hud.nearbyCrate || hud.nearbyBoss) && !activePrompt && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2">
            {hud.nearbyCrate && (
              <button
                type="button"
                onClick={() => openNearbyCrate(hud.nearbyCrate?.crate)}
                disabled={hud.nearbyCrate.lockedSec > 0}
                className={`px-4 py-2 rounded-xl border font-mono text-xs font-bold shadow-xl cursor-pointer whitespace-nowrap ${
                  hud.nearbyCrate.lockedSec > 0
                    ? "bg-red-950/90 border-red-400/50 text-red-200 cursor-not-allowed"
                    : hud.nearbyCrate.crate.kind === "terminal"
                    ? "bg-purple-600 hover:bg-purple-500 border-purple-300 text-white"
                    : "bg-amber-500 hover:bg-amber-400 border-amber-200 text-zinc-950"
                }`}
              >
                {hud.nearbyCrate.lockedSec > 0
                  ? `Locked ${hud.nearbyCrate.lockedSec}s`
                  : `[E] Hack ${hud.nearbyCrate.crate.label}`}
              </button>
            )}
            {hud.nearbyBoss && (
              <button
                type="button"
                onClick={() => openNearbyBossQuiz(hud.nearbyBoss || undefined)}
                className="px-4 py-2 rounded-xl border bg-rose-600 hover:bg-rose-500 border-amber-300 text-white font-mono text-xs font-bold shadow-xl cursor-pointer whitespace-nowrap"
              >
                [R] Rapid-Fire Quiz vs {hud.nearbyBoss.name}
              </button>
            )}
          </div>
        )}

        {/* Bottom HUD: Separate HP & Shield Bars + 4-Slot Weapon Bar + Firewall & Healing */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(97%,940px)] bg-zinc-950/94 border border-white/15 rounded-xl px-3.5 py-2.5 space-y-2 font-mono text-xs tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Separate HP & Shield Bars */}
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                    <Heart className="h-3 w-3 text-red-400" />
                    HP {hud.hp}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sky-300 font-bold">
                    <Shield className="h-3 w-3 text-sky-400" />
                    SHD {hud.shield}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100"
                      style={{ width: `${Math.max(0, Math.min(100, hud.hp))}%` }}
                    />
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all duration-100"
                      style={{ width: `${Math.max(0, Math.min(100, hud.shield))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Weapon & Ammo + Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold"
                style={{
                  color: curRarityMeta.color,
                  backgroundColor: curRarityMeta.bg,
                  borderColor: curRarityMeta.border,
                }}
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>
                  {curRarity} {curWeaponMeta.shortName}: {hud.ammo}
                </span>
              </div>

              <button
                type="button"
                onClick={handleDeployFirewall}
                disabled={!hud.alive || hud.tokens <= 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 border border-cyan-400/45 rounded-lg text-cyan-200 font-bold cursor-pointer whitespace-nowrap"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>[F] Wall ({hud.tokens})</span>
              </button>

              <button
                type="button"
                onClick={handleDash}
                disabled={!hud.alive || (hud.shockwaveCharges <= 0 && hud.dashSecLeft > 0)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 border border-sky-400/40 rounded-lg text-sky-200 font-bold cursor-pointer whitespace-nowrap"
              >
                <Wind className="h-3.5 w-3.5" />
                <span>
                  {hud.shockwaveCharges > 0
                    ? `[Shift] Shock (${hud.shockwaveCharges})`
                    : hud.dashSecLeft > 0
                    ? `Dash ${hud.dashSecLeft}s`
                    : "[Shift] Dash"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleUseShieldPotion}
                disabled={!hud.alive || hud.shieldPotions <= 0}
                className="inline-flex items-center gap-1 px-2 py-1 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 border border-sky-400/40 rounded-lg text-sky-200 font-bold cursor-pointer whitespace-nowrap"
              >
                <Shield className="h-3 w-3" />
                <span>[Q] ({hud.shieldPotions})</span>
              </button>

              <button
                type="button"
                onClick={handleUseMedkit}
                disabled={!hud.alive || hud.medkits <= 0}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 border border-emerald-400/40 rounded-lg text-emerald-200 font-bold cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3 w-3" />
                <span>[H] ({hud.medkits})</span>
              </button>
            </div>
          </div>

          {/* 4-Slot Fortnite Weapon Hotbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              {WEAPON_SLOTS.map((arch, idx) => {
                const rarity = hud.weapons[arch];
                const active = hud.activeWeapon === arch;
                const rMeta = rarity ? RARITY_META[rarity] : null;
                return (
                  <button
                    key={arch}
                    type="button"
                    disabled={!rarity}
                    onClick={() => handleSelectWeaponSlot(arch)}
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                      active ? "ring-1 ring-white" : ""
                    }`}
                    style={{
                      color: rMeta ? rMeta.color : "#71717A",
                      backgroundColor: rMeta ? rMeta.bg : "rgba(24,24,27,0.7)",
                      borderColor: rMeta ? rMeta.border : "rgba(255,255,255,0.08)",
                    }}
                  >
                    [{idx + 1}] {WEAPON_META[arch].shortName}
                    {rarity ? ` · ${rarity}` : ""}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              {hud.speedSecLeft > 0 && (
                <span className="inline-flex items-center gap-1 text-sky-300 font-bold">
                  <Zap className="h-3 w-3" />
                  {hud.speedSecLeft}s
                </span>
              )}
              {hud.radarSecLeft > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                  <Radio className="h-3 w-3" />
                  {hud.radarSecLeft}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full Tactical Map Overlay */}
        {showFullMap && !activePrompt && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="bg-[#0B0D14] border border-white/15 rounded-2xl p-5 space-y-3 max-w-lg w-full">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white font-bold">
                  Gbozz Arena Map · {hud.biomeName}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullMap(false)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  [M / ESC] Close
                </button>
              </div>
              <canvas
                ref={fullMapRef}
                width={420}
                height={420}
                className="w-full aspect-square rounded-xl border border-white/10 block"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
                <span>Amber: Data Crate · Violet: Gbozz Terminal</span>
                <span>Rose: Mini-Bozz · Gold Ring: Medallion Holder</span>
              </div>
            </div>
          </div>
        )}

        {/* Crate / Terminal / Mini-Bozz Quiz Modal */}
        {activePrompt && hud.alive && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="w-full max-w-xl bg-[#0B0B10]/95 border border-purple-400/50 rounded-2xl p-6 space-y-4 shadow-2xl animate-reveal-pop">
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <span
                  className={`font-bold ${
                    activePrompt.mode === "boss" ? "text-rose-400" : "text-purple-300"
                  }`}
                >
                  {activePrompt.mode === "boss"
                    ? `RAPID-FIRE BOSS DUEL · ${activePrompt.bossName} (Round ${activePrompt.bossStep || 1})`
                    : `${activePrompt.crate?.label} · ${
                        activePrompt.crate?.kind === "terminal"
                          ? "High-Rarity Gbozz Terminal"
                          : "Data Crate Loot"
                      }`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePrompt(null);
                    setPromptFeedback(null);
                  }}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  [ESC] Close
                </button>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {activePrompt.question.question}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activePrompt.question.options.slice(0, 4).map((opt, idx) => {
                  const isCorrectOpt = idx === activePrompt.question.correctIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(promptFeedback)}
                      onClick={() => handleAnswerPrompt(idx)}
                      className={`text-left p-3.5 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer ${
                        promptFeedback
                          ? isCorrectOpt
                            ? "bg-emerald-500/20 border-emerald-400 text-white"
                            : "bg-zinc-950/50 border-white/10 text-zinc-500"
                          : "bg-zinc-950 hover:bg-zinc-900 border-white/15 hover:border-purple-400 text-zinc-100"
                      }`}
                    >
                      <span className="h-7 w-7 rounded-md bg-zinc-900 border border-white/15 font-mono text-xs font-bold text-purple-300 flex items-center justify-center shrink-0">
                        {idx + 1}/{OPTION_LETTERS[idx]}
                      </span>
                      <span className="text-xs font-medium leading-snug flex-1">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {promptFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    promptFeedback.correct
                      ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-100"
                      : "bg-red-500/15 border-red-400/50 text-red-100"
                  }`}
                >
                  <div className="font-mono font-bold">{promptFeedback.headline}</div>
                  <p className="opacity-90 leading-relaxed">{promptFeedback.detail}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Eliminated Experience: Practice Study Questions OR Spectate Live + Instant Squad Requeue */}
        {!hud.alive && room.status === "active" && (() => {
          const allHumansEliminated = hud.humanTotalCount > 0 && hud.humanAliveCount === 0;
          const botsRemaining = Math.max(0, hud.aliveCount - hud.humanAliveCount);
          const myPlacement = localRef.current.placement || Math.max(2, hud.aliveCount + 1);
          const totalPlayersCount = Math.max(2, hud.totalCount);
          const buildMatchStats = () => ({
            placement: myPlacement,
            totalPlayers: totalPlayersCount,
            kills: localRef.current.kills,
            miniBozzKills: localRef.current.miniBozzKills,
            medallionSecured: localRef.current.hasMedallion,
            questionsCorrect: localRef.current.questionsCorrect,
            questionsAttempted: localRef.current.questionsAttempted,
            winnerName: room.winnerName || "Match In Progress",
          });
          const practiceAccuracyPct =
            practiceStats.attempted > 0
              ? Math.round((practiceStats.correct / practiceStats.attempted) * 100)
              : 0;

          if (eliminatedMode === "practice") {
            return (
              <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center p-4 z-20">
                <div className="w-full max-w-2xl bg-zinc-950/95 border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                  {/* Top Bar: Elimination Summary + Mode Switcher + Claim Summary */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-bold text-red-400">
                        Eliminated · Placement #{myPlacement} / {totalPlayersCount}
                      </div>
                      <div className="text-xs font-mono text-zinc-400 tabular-nums">
                        {allHumansEliminated ? (
                          <span className="text-amber-300 font-semibold">
                            All friends eliminated · {botsRemaining} {botsRemaining === 1 ? "bot" : "bots"} remaining
                          </span>
                        ) : (
                          <span className="text-emerald-300 font-semibold">
                            {hud.humanAliveCount} {hud.humanAliveCount === 1 ? "squadmate" : "squadmates"} still playing
                          </span>
                        )}
                        {" · "}Kills: {hud.kills}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-white/10 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setEliminatedMode("practice")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-400 text-zinc-950 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Practice Study</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEliminatedMode("spectate")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Spectate Live</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onMatchComplete(buildMatchStats())}
                        className="px-3.5 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Claim MMR &amp; Summary
                      </button>
                    </div>
                  </div>

                  {/* Instant Squad Requeue Banner when ALL human friends are dead and bots remain */}
                  {allHumansEliminated && (
                    <div className="p-3.5 bg-zinc-900/95 border border-emerald-400/35 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-mono text-zinc-200">
                        {isHost
                          ? "All friends are out — requeue now without watching bots finish:"
                          : `All friends are out · Waiting for ${room.hostName} to requeue Room ${room.roomCode}`}
                      </div>
                      {isHost && onRequeue && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isRequeueing}
                            onClick={() => void onRequeue(true, buildMatchStats())}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>
                              {isRequeueing
                                ? "Requeueing..."
                                : `Instant Re-Drop (${fillWithBots ? "with Bots" : "Friends Only"})`}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={isRequeueing}
                            onClick={() => void onRequeue(false, buildMatchStats())}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/15 text-white font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Requeue to Lobby ({room.roomCode})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Practice Question Deck from Room Quiz Bank */}
                  {activePracticeQuestion && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400 tabular-nums">
                        <span>
                          Practice Question{" "}
                          {(practiceQuestionIdx % Math.max(1, room.questions.length)) + 1} /{" "}
                          {room.questions.length}
                          {activePracticeQuestion.unitTag
                            ? ` · ${activePracticeQuestion.unitTag}`
                            : ""}
                        </span>
                        <span>
                          Score: {practiceStats.correct}/{practiceStats.attempted} (
                          {practiceAccuracyPct}%) · Streak: {practiceStats.streak}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                        {activePracticeQuestion.question}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activePracticeQuestion.options.slice(0, 4).map((opt, idx) => {
                          const answered = practicePickedIdx !== null;
                          const isCorrectOpt = idx === activePracticeQuestion.correctIndex;
                          const isPicked = idx === practicePickedIdx;
                          let btnClasses =
                            "bg-zinc-900/90 hover:bg-zinc-800 border-white/15 hover:border-emerald-400/70 text-zinc-100";
                          if (answered) {
                            if (isCorrectOpt) {
                              btnClasses =
                                "bg-emerald-500/20 border-emerald-400 text-white";
                            } else if (isPicked) {
                              btnClasses = "bg-red-500/20 border-red-400 text-red-100";
                            } else {
                              btnClasses =
                                "bg-zinc-950/60 border-white/10 text-zinc-500";
                            }
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={answered}
                              onClick={() => handleAnswerPractice(idx)}
                              className={`text-left p-3.5 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer ${btnClasses}`}
                            >
                              <span className="h-7 w-7 rounded-md bg-zinc-950 border border-white/15 font-mono text-xs font-bold text-emerald-300 flex items-center justify-center shrink-0">
                                {answered && isCorrectOpt ? (
                                  <Check className="h-4 w-4 text-emerald-400" />
                                ) : answered && isPicked ? (
                                  <X className="h-4 w-4 text-red-400" />
                                ) : (
                                  `${idx + 1}/${OPTION_LETTERS[idx]}`
                                )}
                              </span>
                              <span className="text-xs font-medium leading-snug flex-1">
                                {opt}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        {practicePickedIdx !== null ? (
                          <div
                            className={`flex-1 min-w-[220px] p-3 rounded-xl border text-xs space-y-1 ${
                              practicePickedIdx === activePracticeQuestion.correctIndex
                                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                                : "bg-red-500/15 border-red-400/40 text-red-100"
                            }`}
                          >
                            <div className="font-mono font-bold">
                              {practicePickedIdx === activePracticeQuestion.correctIndex
                                ? "Correct! Keep the streak rolling."
                                : `Missed · Answer: ${
                                    OPTION_LETTERS[activePracticeQuestion.correctIndex]
                                  }`}
                            </div>
                            {(activePracticeQuestion.explanation ||
                              activePracticeQuestion.memoryHook) && (
                              <p className="opacity-90 leading-relaxed">
                                {activePracticeQuestion.explanation ||
                                  activePracticeQuestion.memoryHook}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-zinc-400">
                            Press 1-4 or click an answer to drill while your squadmates finish (does not affect match MMR).
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleNextPracticeQuestion}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-extrabold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>
                            {practicePickedIdx !== null ? "Next Question" : "Skip Question"}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // SPECTATE LIVE MODE
          return (
            <div className="absolute inset-x-0 top-14 flex flex-col items-center gap-2.5 px-4 pointer-events-none z-20">
              <div className="pointer-events-auto w-full max-w-4xl bg-zinc-950/95 border border-white/15 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono font-bold text-red-400">
                      Eliminated · #{myPlacement} / {totalPlayersCount}
                    </div>
                    <div className="text-xs font-mono text-zinc-200 tabular-nums">
                      {hud.spectatingName ? (
                        <>
                          Spectating:{" "}
                          <strong className="text-white">{hud.spectatingName}</strong> (
                          {hud.spectatingKind}) · HP {hud.spectatingHp} · SHD{" "}
                          {hud.spectatingShield}
                        </>
                      ) : (
                        "Spectating Arena"
                      )}
                    </div>
                  </div>

                  {hud.aliveCount > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cycleSpectateTarget(-1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 text-xs font-mono rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleSpectateTarget(1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 text-xs font-mono rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEliminatedMode("practice")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-extrabold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Practice Questions</span>
                  </button>

                  {allHumansEliminated && isHost && onRequeue && (
                    <>
                      <button
                        type="button"
                        disabled={isRequeueing}
                        onClick={() => void onRequeue(true, buildMatchStats())}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-zinc-950 font-extrabold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>{isRequeueing ? "Requeueing..." : "Instant Re-Drop"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isRequeueing}
                        onClick={() => void onRequeue(false, buildMatchStats())}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/15 text-white font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Requeue ({room.roomCode})</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onMatchComplete(buildMatchStats())}
                    className="px-3.5 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Claim MMR &amp; Summary
                  </button>
                </div>
              </div>

              {allHumansEliminated && !isHost && (
                <div className="pointer-events-auto bg-zinc-950/95 border border-amber-400/40 rounded-xl px-4 py-2 text-xs font-mono text-amber-200 shadow-lg">
                  All friends eliminated · Waiting for {room.hostName} to requeue Room{" "}
                  {room.roomCode} (practice questions or spectate while waiting).
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] font-mono text-zinc-400">
        <span>Move: WASD/Arrows · Shoot: Left Click · Weapons: [1–4] · Wall: [F] · Shockwave: [Shift]</span>
        <span>Hack Crate: [E] · Mini-Bozz Quiz: [R] · Shield: [Q] · Medkit: [H] · Map: [M]</span>
      </div>
    </div>
  );
}
