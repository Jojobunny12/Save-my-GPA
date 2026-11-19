import {
  ArenaCrate,
  ArenaObstacle,
  BiomeZone,
  BotState,
  BridgeRect,
  BushCover,
  CompetitiveTier,
  FirewallWall,
  HealingShrine,
  JumpPad,
  LootRarity,
  MiniBozzState,
  PoiId,
  PoiInfo,
  RiverPoint,
  RoadSegment,
  WeaponArchetype,
} from "./types";

export const ARENA_SIZE = 2400;
export const PLAYER_RADIUS = 18;
export const MINI_BOZZ_RADIUS = 26;
export const TARGET_LOBBY_SIZE = 20;
export const LOBBY_COUNTDOWN_SEC = 15;
export const MATCH_DURATION_SEC = 240; // 4-minute 5-phase System Glitch match
export const RIVER_HALF_WIDTH = 44;

const BOT_USERNAMES = [
  "GbozzRunner",
  "PromptSnipe",
  "CalcWizard99",
  "APBio_Sniper",
  "SocraticSage",
  "EulerZero",
  "QuizValkyrie",
  "ThesisSlayer",
  "FeynmanFlex",
  "NightOwl_AP",
  "ByteScholar",
  "VectorViper",
  "NeuralNomad",
  "PrismKnight",
  "SyntaxAce",
  "CramKing42",
  "AtomBlaster",
  "TokenTrader",
  "DeltaForce_1",
  "GraphNinja",
  "HyperRecall",
  "ArchimedesX",
] as const;

export const TIER_CONFIG: Array<{
  tier: CompetitiveTier;
  minMmr: number;
  color: string;
  border: string;
}> = [
  { tier: "Bronze", minMmr: 0, color: "#D97706", border: "border-amber-600/50" },
  { tier: "Silver", minMmr: 1000, color: "#CBD5E1", border: "border-slate-300/50" },
  { tier: "Gold", minMmr: 1300, color: "#FACC15", border: "border-yellow-400/50" },
  { tier: "Platinum", minMmr: 1600, color: "#2DD4BF", border: "border-teal-400/50" },
  { tier: "Diamond", minMmr: 1900, color: "#38BDF8", border: "border-sky-400/50" },
  { tier: "Grand Gbozz", minMmr: 2200, color: "#F43F5E", border: "border-rose-400/75" },
];

export const RARITY_ORDER: LootRarity[] = [
  "Common",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
];

export const RARITY_META: Record<
  LootRarity,
  {
    label: LootRarity;
    color: string;
    bg: string;
    border: string;
    damageMult: number;
    rank: number;
  }
> = {
  Common: {
    label: "Common",
    color: "#94A3B8",
    bg: "rgba(148, 163, 184, 0.16)",
    border: "rgba(148, 163, 184, 0.45)",
    damageMult: 1.0,
    rank: 1,
  },
  Rare: {
    label: "Rare",
    color: "#38BDF8",
    bg: "rgba(56, 189, 248, 0.16)",
    border: "rgba(56, 189, 248, 0.55)",
    damageMult: 1.18,
    rank: 2,
  },
  Epic: {
    label: "Epic",
    color: "#C084FC",
    bg: "rgba(192, 132, 252, 0.18)",
    border: "rgba(192, 132, 252, 0.6)",
    damageMult: 1.36,
    rank: 3,
  },
  Legendary: {
    label: "Legendary",
    color: "#FBBF24",
    bg: "rgba(251, 191, 36, 0.18)",
    border: "rgba(251, 191, 36, 0.65)",
    damageMult: 1.56,
    rank: 4,
  },
  Mythic: {
    label: "Mythic",
    color: "#FB7185",
    bg: "rgba(251, 113, 133, 0.22)",
    border: "rgba(251, 113, 133, 0.78)",
    damageMult: 1.82,
    rank: 5,
  },
};

export const WEAPON_META: Record<
  WeaponArchetype,
  {
    archetype: WeaponArchetype;
    name: string;
    shortName: string;
    fireRateMs: number;
    baseDamage: number;
    speed: number;
    pellets: number;
    spreadRad: number;
    maxLifeMs: number;
    splashRadius: number;
  }
> = {
  blaster: {
    archetype: "blaster",
    name: "Rapid-Fire Blaster",
    shortName: "Blaster",
    fireRateMs: 165,
    baseDamage: 14,
    speed: 860,
    pellets: 1,
    spreadRad: 0.035,
    maxLifeMs: 950,
    splashRadius: 0,
  },
  cannon: {
    archetype: "cannon",
    name: "Heavy Prompt Cannon",
    shortName: "Cannon",
    fireRateMs: 620,
    baseDamage: 36,
    speed: 560,
    pellets: 1,
    spreadRad: 0.015,
    maxLifeMs: 1200,
    splashRadius: 62,
  },
  scatter: {
    archetype: "scatter",
    name: "Scatter Shot",
    shortName: "Scatter",
    fireRateMs: 490,
    baseDamage: 11,
    speed: 750,
    pellets: 5,
    spreadRad: 0.28,
    maxLifeMs: 520,
    splashRadius: 0,
  },
  railgun: {
    archetype: "railgun",
    name: "Long-Range Railgun",
    shortName: "Railgun",
    fireRateMs: 690,
    baseDamage: 40,
    speed: 1320,
    pellets: 1,
    spreadRad: 0,
    maxLifeMs: 1350,
    splashRadius: 0,
  },
};

export const ARENA_POIS: PoiInfo[] = [
  {
    id: "prompt_plaza",
    name: "Prompt Plaza",
    subtitle: "NW Courtyard · Stealth Foliage & Crates",
    dropX: 525,
    dropY: 500,
    color: "#10B981",
    biomeKind: "quad",
    hasMiniBozz: false,
  },
  {
    id: "neural_nexus",
    name: "Neural Nexus",
    subtitle: "NE Server Core · Mini-Bozz & Terminals",
    dropX: 1790,
    dropY: 470,
    color: "#A78BFA",
    biomeKind: "library",
    hasMiniBozz: true,
  },
  {
    id: "bozz_citadel",
    name: "Bozz Citadel",
    subtitle: "Center Fortress · Citadel Overlord Boss",
    dropX: 1200,
    dropY: 1200,
    color: "#F43F5E",
    biomeKind: "rotunda",
    hasMiniBozz: true,
  },
  {
    id: "data_docks",
    name: "Data Docks",
    subtitle: "SW Waterfront · Piers, Canal & Mini-Bozz",
    dropX: 520,
    dropY: 1840,
    color: "#38BDF8",
    biomeKind: "stadium",
    hasMiniBozz: true,
  },
  {
    id: "token_vault",
    name: "Token Vault",
    subtitle: "SE Foundry · Firewall Tokens & Shrines",
    dropX: 1785,
    dropY: 1865,
    color: "#FBBF24",
    biomeKind: "lab",
    hasMiniBozz: false,
  },
];

export function normalizeTierName(rawTier: string | undefined): CompetitiveTier {
  if (rawTier === "Valedictorian" || rawTier === "Grand Gbozz") {
    return "Grand Gbozz";
  }
  const found = TIER_CONFIG.find((c) => c.tier === rawTier);
  return found ? found.tier : "Silver";
}

export function getTierFromMmr(mmr: number): CompetitiveTier {
  let matched: CompetitiveTier = "Bronze";
  for (const cfg of TIER_CONFIG) {
    if (mmr >= cfg.minMmr) matched = cfg.tier;
  }
  return matched;
}

export function getTierMeta(tier: CompetitiveTier | string) {
  const normalized = normalizeTierName(tier);
  return TIER_CONFIG.find((t) => t.tier === normalized) || TIER_CONFIG[0];
}

export function getTierProgress(mmr: number): {
  currentTier: CompetitiveTier;
  nextTier: CompetitiveTier | null;
  nextThreshold: number | null;
  progressPct: number;
} {
  let idx = 0;
  for (let i = 0; i < TIER_CONFIG.length; i++) {
    if (mmr >= TIER_CONFIG[i].minMmr) idx = i;
  }
  const current = TIER_CONFIG[idx];
  const next = TIER_CONFIG[idx + 1] || null;
  if (!next) {
    return {
      currentTier: current.tier,
      nextTier: null,
      nextThreshold: null,
      progressPct: 100,
    };
  }
  const span = Math.max(1, next.minMmr - current.minMmr);
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round(((mmr - current.minMmr) / span) * 100))
  );
  return {
    currentTier: current.tier,
    nextTier: next.tier,
    nextThreshold: next.minMmr,
    progressPct,
  };
}

export function computeMatchMmrDelta(params: {
  placement: number;
  totalPlayers: number;
  kills: number;
  miniBozzKills?: number;
  questionsCorrect: number;
  questionsAttempted: number;
  currentMmr: number;
}): { mmrDelta: number; newMmr: number; newTier: CompetitiveTier } {
  const {
    placement,
    totalPlayers,
    kills,
    miniBozzKills = 0,
    questionsCorrect,
    questionsAttempted,
    currentMmr,
  } = params;

  const normalizedRank =
    1 - (Math.max(1, placement) - 1) / Math.max(1, totalPlayers - 1);
  let placementPoints = Math.round(normalizedRank * 66 - 22);
  if (placement === 1) placementPoints += 20;
  else if (placement <= 3) placementPoints += 8;

  const combatPoints = kills * 8 + miniBozzKills * 12;
  const wrongAnswers = Math.max(0, questionsAttempted - questionsCorrect);
  const accuracyPct =
    questionsAttempted > 0 ? questionsCorrect / questionsAttempted : 0;
  const accuracyBonus =
    questionsAttempted >= 3 && accuracyPct >= 0.8 ? 8 : 0;
  const quizPoints = questionsCorrect * 4 - wrongAnswers * 2 + accuracyBonus;

  const rawDelta = placementPoints + combatPoints + quizPoints;
  const mmrDelta = Math.max(-30, Math.min(110, rawDelta));
  const newMmr = Math.max(0, Math.min(5000, currentMmr + mmrDelta));
  return {
    mmrDelta,
    newMmr,
    newTier: getTierFromMmr(newMmr),
  };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function circleIntersectsRect(
  cx: number,
  cy: number,
  r: number,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 0.0001) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}

export function isPointInWater(
  x: number,
  y: number,
  riverPoints: RiverPoint[],
  bridges: BridgeRect[]
): boolean {
  for (const b of bridges) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return false;
    }
  }
  for (let i = 0; i < riverPoints.length - 1; i++) {
    const a = riverPoints[i];
    const b = riverPoints[i + 1];
    if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= RIVER_HALF_WIDTH) {
      return true;
    }
  }
  return false;
}

export function getBiomeAtPoint(x: number, y: number, biomes: BiomeZone[]): BiomeZone {
  const centerDist = Math.hypot(x - ARENA_SIZE / 2, y - ARENA_SIZE / 2);
  if (centerDist <= 315) {
    return biomes.find((b) => b.kind === "rotunda") || biomes[0];
  }
  for (const b of biomes) {
    if (b.kind === "rotunda") continue;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return b;
    }
  }
  return biomes[0];
}

export function getBushContainingPoint(
  x: number,
  y: number,
  bushes: BushCover[]
): BushCover | null {
  for (const bush of bushes) {
    if (Math.hypot(x - bush.x, y - bush.y) <= bush.radius - 4) {
      return bush;
    }
  }
  return null;
}

export function resolveCircleObstacles(
  x: number,
  y: number,
  radius: number,
  obstacles: ArenaObstacle[],
  firewalls: FirewallWall[] = [],
  nowMs = 0
): { x: number; y: number } {
  let nx = Math.max(radius + 16, Math.min(ARENA_SIZE - radius - 16, x));
  let ny = Math.max(radius + 16, Math.min(ARENA_SIZE - radius - 16, y));

  const activeWalls = firewalls.filter((fw) => fw.hp > 0 && fw.expiresAtMs > nowMs);
  const allSolids: Array<{ x: number; y: number; w: number; h: number }> = [
    ...obstacles,
    ...activeWalls,
  ];

  for (let pass = 0; pass < 2; pass++) {
    for (const obs of allSolids) {
      const closestX = Math.max(obs.x, Math.min(nx, obs.x + obs.w));
      const closestY = Math.max(obs.y, Math.min(ny, obs.y + obs.h));
      const dx = nx - closestX;
      const dy = ny - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          nx += (dx / dist) * push;
          ny += (dy / dist) * push;
        } else {
          const leftPen = nx - obs.x;
          const rightPen = obs.x + obs.w - nx;
          const topPen = ny - obs.y;
          const bottomPen = obs.y + obs.h - ny;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) nx = obs.x - radius;
          else if (minPen === rightPen) nx = obs.x + obs.w + radius;
          else if (minPen === topPen) ny = obs.y - radius;
          else ny = obs.y + obs.h + radius;
        }
      }
    }
  }

  return {
    x: Math.max(radius + 16, Math.min(ARENA_SIZE - radius - 16, nx)),
    y: Math.max(radius + 16, Math.min(ARENA_SIZE - radius - 16, ny)),
  };
}

export function pointHitsObstacle(
  x: number,
  y: number,
  obstacles: ArenaObstacle[]
): boolean {
  for (const obs of obstacles) {
    if (x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
      return true;
    }
  }
  return false;
}

export function pointHitsFirewall(
  x: number,
  y: number,
  firewalls: FirewallWall[],
  nowMs: number
): FirewallWall | null {
  for (const fw of firewalls) {
    if (fw.hp <= 0 || fw.expiresAtMs <= nowMs) continue;
    if (x >= fw.x && x <= fw.x + fw.w && y >= fw.y && y <= fw.y + fw.h) {
      return fw;
    }
  }
  return null;
}

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: ArenaObstacle[]
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(dist / 26));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointHitsObstacle(x1 + dx * t, y1 + dy * t, obstacles)) {
      return false;
    }
  }
  return true;
}

export interface CampusWorldLayout {
  biomes: BiomeZone[];
  roads: RoadSegment[];
  riverPoints: RiverPoint[];
  bridges: BridgeRect[];
  bushes: BushCover[];
  jumpPads: JumpPad[];
  shrines: HealingShrine[];
  obstacles: ArenaObstacle[];
  crates: ArenaCrate[];
  stormTargetX: number;
  stormTargetY: number;
}

export function generateArenaLayout(seed: number): CampusWorldLayout {
  const rand = mulberry32(seed || 1337);
  const center = ARENA_SIZE / 2;

  // 1. Five Named Gbozz Arena Biomes / POIs
  const biomes: BiomeZone[] = [
    {
      id: "biome_quad",
      kind: "quad",
      name: "Prompt Plaza",
      subtitle: "Courtyard Gazebos & Stealth Foliage",
      x: 0,
      y: 0,
      w: 1200,
      h: 1200,
      floorColor: "#0A1713",
      accentColor: "#10B981",
    },
    {
      id: "biome_library",
      kind: "library",
      name: "Neural Nexus",
      subtitle: "Nexus Hall & AI Server Vaults",
      x: 1200,
      y: 0,
      w: 1200,
      h: 1200,
      floorColor: "#120F1B",
      accentColor: "#A78BFA",
    },
    {
      id: "biome_stadium",
      kind: "stadium",
      name: "Data Docks",
      subtitle: "Waterfront Piers & Cargo Canal",
      x: 0,
      y: 1200,
      w: 1200,
      h: 1200,
      floorColor: "#0A1322",
      accentColor: "#38BDF8",
    },
    {
      id: "biome_lab",
      kind: "lab",
      name: "Token Vault",
      subtitle: "Firewall Foundry & Relay Yards",
      x: 1200,
      y: 1200,
      w: 1200,
      h: 1200,
      floorColor: "#131018",
      accentColor: "#FBBF24",
    },
    {
      id: "biome_rotunda",
      kind: "rotunda",
      name: "Bozz Citadel",
      subtitle: "Mythic Spire & Boss Stronghold",
      x: center - 315,
      y: center - 315,
      w: 630,
      h: 630,
      floorColor: "#160F24",
      accentColor: "#F43F5E",
    },
  ];

  // 2. Data Canal River curving past Data Docks & south of Bozz Citadel
  const riverPoints: RiverPoint[] = [
    { x: 0, y: 1210 },
    { x: 350, y: 1200 },
    { x: 720, y: 1360 },
    { x: 960, y: 1600 },
    { x: 1440, y: 1600 },
    { x: 1680, y: 1350 },
    { x: 2040, y: 1185 },
    { x: 2400, y: 1190 },
  ];

  // 3. Crossable Piers & Bridges (including Data Docks boardwalk!)
  const bridges: BridgeRect[] = [
    { id: "bridge_west", x: 325, y: 1125, w: 120, h: 155, orientation: "vertical" },
    { id: "bridge_docks_pier", x: 650, y: 1290, w: 135, h: 160, orientation: "vertical" },
    { id: "bridge_center", x: 1135, y: 1525, w: 130, h: 155, orientation: "vertical" },
    { id: "bridge_east", x: 1965, y: 1110, w: 120, h: 155, orientation: "vertical" },
  ];

  // 4. Paved Grid Walkways connecting all 5 POIs
  const roads: RoadSegment[] = [
    { id: "road_n_main", x1: center, y1: 180, x2: center, y2: 2220, width: 84 },
    { id: "road_w_wing", x1: 380, y1: 520, x2: 380, y2: 1880, width: 70 },
    { id: "road_e_wing", x1: 2020, y1: 520, x2: 2020, y2: 1880, width: 70 },
    { id: "road_north_cross", x1: 380, y1: 520, x2: 2020, y2: 520, width: 70 },
    { id: "road_south_cross", x1: 380, y1: 1880, x2: 2020, y2: 1880, width: 70 },
  ];

  const obstacles: ArenaObstacle[] = [];

  // 5. Bozz Citadel Pillars (Center Stronghold)
  const pillarOffset = 195;
  const pillarCoords = [
    [center - pillarOffset, center - pillarOffset],
    [center + pillarOffset - 54, center - pillarOffset],
    [center - pillarOffset, center + pillarOffset - 54],
    [center + pillarOffset - 54, center + pillarOffset - 54],
  ];
  pillarCoords.forEach(([px, py], idx) => {
    obstacles.push({
      id: `pillar_${idx}`,
      kind: "pillar",
      x: px,
      y: py,
      w: 54,
      h: 54,
      label: "Citadel Monolith",
    });
  });

  // 6. Neural Nexus Structure (NE)
  const nexX = 1520;
  const nexY = 230;
  const nexW = 540;
  const nexH = 480;
  const wallT = 24;
  obstacles.push(
    { id: "nex_wall_n1", kind: "wall", x: nexX, y: nexY, w: 215, h: wallT, label: "Nexus Bulkhead" },
    { id: "nex_wall_n2", kind: "wall", x: nexX + 325, y: nexY, w: 215, h: wallT, label: "Nexus Bulkhead" },
    { id: "nex_wall_s1", kind: "wall", x: nexX, y: nexY + nexH - wallT, w: 215, h: wallT, label: "Nexus Bulkhead" },
    { id: "nex_wall_s2", kind: "wall", x: nexX + 325, y: nexY + nexH - wallT, w: 215, h: wallT, label: "Nexus Bulkhead" },
    { id: "nex_wall_w1", kind: "wall", x: nexX, y: nexY + wallT, w: wallT, h: 160, label: "Nexus Bulkhead" },
    { id: "nex_wall_w2", kind: "wall", x: nexX, y: nexY + 295, w: wallT, h: 161, label: "Nexus Bulkhead" },
    { id: "nex_wall_e1", kind: "wall", x: nexX + nexW - wallT, y: nexY + wallT, w: wallT, h: 160, label: "Nexus Bulkhead" },
    { id: "nex_wall_e2", kind: "wall", x: nexX + nexW - wallT, y: nexY + 295, w: wallT, h: 161, label: "Nexus Bulkhead" },
    { id: "nex_srv_1", kind: "server", x: nexX + 75, y: nexY + 85, w: 140, h: 36, label: "Neural Rack" },
    { id: "nex_srv_2", kind: "server", x: nexX + 325, y: nexY + 85, w: 140, h: 36, label: "Neural Rack" },
    { id: "nex_srv_3", kind: "server", x: nexX + 75, y: nexY + 355, w: 140, h: 36, label: "Neural Rack" },
    { id: "nex_srv_4", kind: "server", x: nexX + 325, y: nexY + 355, w: 140, h: 36, label: "Neural Rack" },
    { id: "nex_desk_center", kind: "desk", x: nexX + 225, y: nexY + 205, w: 90, h: 70, label: "Core Console" }
  );

  // 7. Token Vault Structure (SE)
  const labX = 1520;
  const labY = 1660;
  obstacles.push(
    { id: "vault_wall_n1", kind: "wall", x: labX, y: labY, w: 190, h: 24, label: "Vault Gate" },
    { id: "vault_wall_n2", kind: "wall", x: labX + 310, y: labY, w: 220, h: 24, label: "Vault Gate" },
    { id: "vault_wall_s1", kind: "wall", x: labX, y: labY + 420, w: 190, h: 24, label: "Vault Gate" },
    { id: "vault_wall_s2", kind: "wall", x: labX + 310, y: labY + 420, w: 220, h: 24, label: "Vault Gate" },
    { id: "vault_srv_1", kind: "server", x: labX + 65, y: labY + 100, w: 46, h: 150, label: "Token Mainframe" },
    { id: "vault_srv_2", kind: "server", x: labX + 415, y: labY + 100, w: 46, h: 150, label: "Token Mainframe" },
    { id: "vault_desk_1", kind: "desk", x: labX + 205, y: labY + 145, w: 115, h: 58, label: "Firewall Bench" },
    { id: "vault_desk_2", kind: "desk", x: labX + 205, y: labY + 290, w: 115, h: 58, label: "Firewall Bench" }
  );

  // 8. Data Docks Cargo Bays & Piers (SW)
  obstacles.push(
    { id: "docks_bay_n", kind: "bleacher", x: 350, y: 1560, w: 320, h: 38, label: "North Freight Pier" },
    { id: "docks_bay_s", kind: "bleacher", x: 350, y: 2110, w: 320, h: 38, label: "South Freight Pier" },
    { id: "docks_bay_w", kind: "bleacher", x: 185, y: 1715, w: 38, h: 280, label: "West Crane Wall" },
    { id: "docks_desk_mid", kind: "desk", x: 475, y: 1825, w: 85, h: 60, label: "Harbor Control" }
  );

  // 9. Prompt Plaza Pavilion (NW)
  obstacles.push(
    { id: "plaza_pil_1", kind: "pillar", x: 370, y: 370, w: 44, h: 44, label: "Plaza Column" },
    { id: "plaza_pil_2", kind: "pillar", x: 640, y: 370, w: 44, h: 44, label: "Plaza Column" },
    { id: "plaza_pil_3", kind: "pillar", x: 370, y: 620, w: 44, h: 44, label: "Plaza Column" },
    { id: "plaza_pil_4", kind: "pillar", x: 640, y: 620, w: 44, h: 44, label: "Plaza Column" },
    { id: "plaza_bench", kind: "desk", x: 475, y: 485, w: 105, h: 56, label: "Prompt Kiosk" }
  );

  // 10. Seeded Tactical Cover (Bookshelves, Desks, Server Cubes) in Outer Sectors
  for (let i = 0; i < 16; i++) {
    const horizontal = rand() > 0.45;
    const roll = rand();
    const kind: ArenaObstacle["kind"] =
      roll < 0.4 ? "server" : roll < 0.78 ? "desk" : "bookshelf";
    const w = kind === "desk" ? (horizontal ? 92 : 60) : horizontal ? 136 : 40;
    const h = kind === "desk" ? (horizontal ? 60 : 92) : horizontal ? 40 : 136;

    for (let attempt = 0; attempt < 25; attempt++) {
      const x = Math.round(130 + rand() * (ARENA_SIZE - 260 - w));
      const y = Math.round(130 + rand() * (ARENA_SIZE - 260 - h));
      const cx = x + w / 2;
      const cy = y + h / 2;

      if (Math.hypot(cx - center, cy - center) < 350) continue;
      if (isPointInWater(cx, cy, riverPoints, bridges)) continue;
      if (
        bridges.some((b) => circleIntersectsRect(cx, cy, 85, b)) ||
        (x > 1470 && x < 2110 && y > 180 && y < 760) ||
        (x > 1470 && x < 2110 && y > 1610 && y < 2160) ||
        (x > 140 && x < 720 && y > 1520 && y < 2180)
      ) {
        continue;
      }

      const overlaps = obstacles.some(
        (o) =>
          x < o.x + o.w + 56 &&
          x + w + 56 > o.x &&
          y < o.y + o.h + 56 &&
          y + h + 56 > o.y
      );
      if (!overlaps) {
        obstacles.push({
          id: `obs_extra_${i}`,
          kind,
          x,
          y,
          w,
          h,
          label:
            kind === "bookshelf"
              ? "Data Archive"
              : kind === "server"
              ? "Relay Server"
              : "Tactical Desk",
        });
        break;
      }
    }
  }

  // 11. 4 Shockwave Launch Pads & 4 Gbozz Recharge Shrines
  const jumpPads: JumpPad[] = [
    { id: "pad_nw", x: 760, y: 760, radius: 30, label: "Shockwave Pad NW" },
    { id: "pad_ne", x: 1640, y: 840, radius: 30, label: "Shockwave Pad NE" },
    { id: "pad_sw", x: 780, y: 1720, radius: 30, label: "Shockwave Pad SW" },
    { id: "pad_se", x: 1640, y: 1560, radius: 30, label: "Shockwave Pad SE" },
  ];

  const shrines: HealingShrine[] = [
    { id: "shrine_plaza", x: 525, y: 315, radius: 28, label: "Shield Shrine" },
    { id: "shrine_nexus", x: 1790, y: 145, radius: 28, label: "Shield Shrine" },
    { id: "shrine_docks", x: 520, y: 1995, radius: 28, label: "Shield Shrine" },
    { id: "shrine_vault", x: 1785, y: 1985, radius: 28, label: "Shield Shrine" },
  ];

  // 12. 30 Stealth Bushes & Trees
  const bushes: BushCover[] = [];
  for (let i = 0; i < 30; i++) {
    const isTree = i % 4 === 0;
    const radius = isTree ? 44 : 36;
    for (let attempt = 0; attempt < 24; attempt++) {
      const preferPlaza = i < 12;
      const x = Math.round(
        preferPlaza ? 110 + rand() * 940 : 110 + rand() * (ARENA_SIZE - 220)
      );
      const y = Math.round(
        preferPlaza ? 110 + rand() * 940 : 110 + rand() * (ARENA_SIZE - 220)
      );
      if (isPointInWater(x, y, riverPoints, bridges)) continue;
      if (obstacles.some((o) => circleIntersectsRect(x, y, radius + 18, o))) continue;
      if (bushes.some((b) => Math.hypot(b.x - x, b.y - y) < 105)) continue;
      if (jumpPads.some((p) => Math.hypot(p.x - x, p.y - y) < 85)) continue;
      bushes.push({
        id: `bush_${i}`,
        kind: isTree ? "tree" : "bush",
        x,
        y,
        radius,
      });
      break;
    }
  }

  // 13. 39 Data Crates & High-Yield Gbozz Terminals
  const crates: ArenaCrate[] = [];
  const fixedPoiCrates: Array<{ x: number; y: number; kind: "crate" | "terminal"; label: string }> = [
    { x: center, y: center, kind: "terminal", label: "Bozz Citadel Terminal" },
    { x: nexX + 270, y: nexY + 125, kind: "terminal", label: "Neural Nexus Terminal" },
    { x: labX + 265, y: labY + 218, kind: "terminal", label: "Token Vault Terminal" },
    { x: 525, y: 585, kind: "terminal", label: "Prompt Plaza Terminal" },
    { x: 520, y: 1715, kind: "terminal", label: "Data Docks Terminal" },
  ];

  fixedPoiCrates.forEach((fc, idx) => {
    crates.push({
      id: `term_poi_${idx}`,
      kind: fc.kind,
      x: fc.x,
      y: fc.y,
      radius: fc.kind === "terminal" ? 22 : 19,
      label: fc.label,
    });
  });

  const totalExtra = 34;
  for (let i = 0; i < totalExtra; i++) {
    const isTerminal = i < 6;
    const radius = isTerminal ? 22 : 19;

    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.round(
        isTerminal
          ? center + (rand() - 0.5) * 1450
          : 135 + rand() * (ARENA_SIZE - 270)
      );
      const y = Math.round(
        isTerminal
          ? center + (rand() - 0.5) * 1450
          : 135 + rand() * (ARENA_SIZE - 270)
      );

      if (isPointInWater(x, y, riverPoints, bridges)) continue;
      if (obstacles.some((o) => circleIntersectsRect(x, y, radius + 24, o))) continue;
      if (crates.some((c) => Math.hypot(c.x - x, c.y - y) < 115)) continue;
      if (jumpPads.some((p) => Math.hypot(p.x - x, p.y - y) < 85)) continue;
      if (shrines.some((s) => Math.hypot(s.x - x, s.y - y) < 85)) continue;

      crates.push({
        id: isTerminal ? `term_${i}` : `crate_${i}`,
        kind: isTerminal ? "terminal" : "crate",
        x,
        y,
        radius,
        label: isTerminal ? "Gbozz Terminal" : "Data Crate",
      });
      break;
    }
  }

  const stormTargetX = Math.round(center + (rand() - 0.5) * 420);
  const stormTargetY = Math.round(center + (rand() - 0.5) * 420);

  return {
    biomes,
    roads,
    riverPoints,
    bridges,
    bushes,
    jumpPads,
    shrines,
    obstacles,
    crates,
    stormTargetX,
    stormTargetY,
  };
}

export function getSafeSpawnPosition(
  index: number,
  total: number,
  obstacles: ArenaObstacle[],
  seed: number,
  riverPoints?: RiverPoint[],
  bridges?: BridgeRect[]
): { x: number; y: number } {
  const center = ARENA_SIZE / 2;
  for (let offset = 0; offset < 12; offset++) {
    const angle =
      ((index + offset * 0.37) / Math.max(1, total)) * Math.PI * 2 +
      (seed % 7) * 0.21;
    const ringRadius = 770 + ((index * 137 + offset * 43) % 230);
    const rawX = center + Math.cos(angle) * ringRadius;
    const rawY = center + Math.sin(angle) * ringRadius;
    const resolved = resolveCircleObstacles(rawX, rawY, PLAYER_RADIUS, obstacles);
    if (
      !riverPoints ||
      !bridges ||
      !isPointInWater(resolved.x, resolved.y, riverPoints, bridges)
    ) {
      return resolved;
    }
  }
  return resolveCircleObstacles(center, center - 240, PLAYER_RADIUS, obstacles);
}

export function getPoiSpawnPosition(
  poiId: PoiId,
  obstacles: ArenaObstacle[],
  seed: number,
  riverPoints?: RiverPoint[],
  bridges?: BridgeRect[]
): { x: number; y: number } {
  const poi = ARENA_POIS.find((p) => p.id === poiId) || ARENA_POIS[0];
  for (let attempt = 0; attempt < 18; attempt++) {
    const angle = ((attempt * 137.5 + (seed % 90)) * Math.PI) / 180;
    const dist = 55 + attempt * 14;
    const rawX = poi.dropX + Math.cos(angle) * dist;
    const rawY = poi.dropY + Math.sin(angle) * dist;
    const resolved = resolveCircleObstacles(rawX, rawY, PLAYER_RADIUS, obstacles);
    if (
      !riverPoints ||
      !bridges ||
      !isPointInWater(resolved.x, resolved.y, riverPoints, bridges)
    ) {
      return resolved;
    }
  }
  return resolveCircleObstacles(poi.dropX, poi.dropY, PLAYER_RADIUS, obstacles);
}

export interface StormZoneState {
  phase: number;
  cx: number;
  cy: number;
  currentRadius: number;
  nextRadius: number;
  phaseTimeLeftSec: number;
  damagePerSec: number;
  matchElapsedSec: number;
}

// 5 escalating "System Glitch" storm phases over a 4-minute (240s) match
const STORM_PHASES = [
  { startSec: 0, endSec: 48, startR: 1320, endR: 940, dps: 3 },
  { startSec: 48, endSec: 98, startR: 940, endR: 640, dps: 5 },
  { startSec: 98, endSec: 148, startR: 640, endR: 390, dps: 8 },
  { startSec: 148, endSec: 196, startR: 390, endR: 185, dps: 12 },
  { startSec: 196, endSec: 240, startR: 185, endR: 30, dps: 16 },
] as const;

export function computeStormZoneState(
  matchStartedAtMs: number,
  nowMs: number,
  targetX: number,
  targetY: number
): StormZoneState {
  const elapsedSec = Math.max(0, (nowMs - matchStartedAtMs) / 1000);
  const clamped = Math.min(MATCH_DURATION_SEC, elapsedSec);

  let phaseIdx = STORM_PHASES.length - 1;
  for (let i = 0; i < STORM_PHASES.length; i++) {
    if (clamped <= STORM_PHASES[i].endSec) {
      phaseIdx = i;
      break;
    }
  }

  const p = STORM_PHASES[phaseIdx];
  const phaseRatio = Math.max(
    0,
    Math.min(1, (clamped - p.startSec) / Math.max(1, p.endSec - p.startSec))
  );
  const totalRatio = Math.max(0, Math.min(1, clamped / MATCH_DURATION_SEC));

  const center = ARENA_SIZE / 2;
  const cx = center + (targetX - center) * totalRatio;
  const cy = center + (targetY - center) * totalRatio;
  const currentRadius = p.startR + (p.endR - p.startR) * phaseRatio;

  return {
    phase: phaseIdx + 1,
    cx,
    cy,
    currentRadius,
    nextRadius: p.endR,
    phaseTimeLeftSec: Math.max(0, Math.ceil(p.endSec - clamped)),
    damagePerSec: p.dps,
    matchElapsedSec: elapsedSec,
  };
}

export function generateMiniBozzes(obstacles: ArenaObstacle[]): MiniBozzState[] {
  const defs: Array<{
    id: string;
    name: string;
    title: string;
    poiId: PoiId;
    x: number;
    y: number;
    hp: number;
    shield: number;
  }> = [
    {
      id: "minibozz_citadel",
      name: "Citadel Overlord",
      title: "Boss · Bozz Citadel",
      poiId: "bozz_citadel",
      x: 1200,
      y: 1095,
      hp: 260,
      shield: 140,
    },
    {
      id: "minibozz_nexus",
      name: "Nexus Sentinel",
      title: "Boss · Neural Nexus",
      poiId: "neural_nexus",
      x: 1790,
      y: 560,
      hp: 230,
      shield: 120,
    },
    {
      id: "minibozz_docks",
      name: "Dockside Leviathan",
      title: "Boss · Data Docks",
      poiId: "data_docks",
      x: 520,
      y: 1920,
      hp: 230,
      shield: 120,
    },
  ];

  return defs.map((d) => {
    const pos = resolveCircleObstacles(d.x, d.y, MINI_BOZZ_RADIUS, obstacles);
    return {
      id: d.id,
      name: d.name,
      title: d.title,
      poiId: d.poiId,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      homeX: Math.round(pos.x),
      homeY: Math.round(pos.y),
      hp: d.hp,
      maxHp: d.hp,
      shield: d.shield,
      maxShield: d.shield,
      alive: true,
      aimAngle: 0,
      lastFireMs: 0,
      lastShotId: "",
      lastShotX: 0,
      lastShotY: 0,
      lastShotVx: 0,
      lastShotVy: 0,
      lastShotAtMs: 0,
    };
  });
}

export function generateBackfillBots(params: {
  existingHumanCount: number;
  targetPlayers: number;
  arenaSeed: number;
  obstacles: ArenaObstacle[];
  riverPoints?: RiverPoint[];
  bridges?: BridgeRect[];
}): BotState[] {
  const { existingHumanCount, targetPlayers, arenaSeed, obstacles, riverPoints, bridges } =
    params;
  const needed = Math.max(0, targetPlayers - existingHumanCount);
  const rand = mulberry32(arenaSeed + 991);
  const shuffledNames = [...BOT_USERNAMES].sort(() => rand() - 0.5);
  const archetypes: WeaponArchetype[] = ["blaster", "cannon", "scatter", "railgun"];

  const bots: BotState[] = [];
  for (let i = 0; i < needed; i++) {
    const pos = getSafeSpawnPosition(
      existingHumanCount + i,
      targetPlayers,
      obstacles,
      arenaSeed,
      riverPoints,
      bridges
    );
    const accuracy = Number((0.6 + rand() * 0.2).toFixed(2));
    const sampleMmr = Math.round(850 + rand() * 1450);

    bots.push({
      id: `bot_${arenaSeed}_${i + 1}`,
      name: shuffledNames[i % shuffledNames.length],
      tier: getTierFromMmr(sampleMmr),
      alive: true,
      hp: 100,
      shield: 0,
      ammo: 0,
      kills: 0,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      aimAngle: Number((rand() * Math.PI * 2).toFixed(2)),
      aiState: "loot",
      answerEndMs: 0,
      accuracy,
      targetCrateId: "",
      exposedUntilMs: 0,
      placement: 0,
      speedBoostUntilMs: 0,
      weaponArchetype: archetypes[i % archetypes.length],
      weaponRarity: "Common",
      hasMedallion: false,
      lastFireMs: 0,
      lastShotId: "",
      lastShotX: 0,
      lastShotY: 0,
      lastShotVx: 0,
      lastShotVy: 0,
      lastShotAtMs: 0,
    });
  }
  return bots;
}
