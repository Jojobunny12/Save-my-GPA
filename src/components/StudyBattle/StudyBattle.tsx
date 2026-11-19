"use client";

import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  Check,
  Clock,
  Copy,
  Crosshair,
  Crown,
  Flame,
  Link as LinkIcon,
  LogOut,
  MapPin,
  Play,
  PlusCircle,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  ARENA_POIS,
  ARENA_SIZE,
  LOBBY_COUNTDOWN_SEC,
  TARGET_LOBBY_SIZE,
  TIER_CONFIG,
  generateArenaLayout,
  getPoiSpawnPosition,
  getTierMeta,
  getTierProgress,
} from "./arenaEngine";
import { playBattleSfx } from "./battleSfx";
import { getStudyBattleDb } from "./firebaseConfig";
import {
  calibrateStudyQuestionsWithAI,
  createBattleRoom,
  getOrCreateClientToken,
  hostExtendLobbyCountdown,
  hostLaunchRoyaleMatch,
  joinBattleRoom,
  loadOrCreateBattleProfile,
  parseStudyQuestionsJson,
  recordMatchRankResult,
  subscribeToBattleRoom,
  updatePlayerDropPoi,
} from "./roomService";
import {
  BattleProfileDocument,
  MatchResultSummary,
  PoiId,
  StudyBattleProps,
  StudyBattleQuestion,
  StudyPlayerDocument,
  StudyRoomDocument,
  StudyWorldStateDocument,
} from "./types";
import BattleRoyaleCanvas from "./BattleRoyaleCanvas";

const SAMPLE_QUESTIONS: StudyBattleQuestion[] = [
  {
    question:
      "Which mechanism explains why spaced active recall outperforms passive re-reading?",
    options: [
      "Testing strengthens retrieval pathways via desirable difficulty",
      "Re-reading increases short-term iconic visual persistence only",
      "Spacing prevents synaptic consolidation during sleep",
      "Passive exposure eliminates interference across unrelated units",
    ],
    correctIndex: 0,
    explanation:
      "Retrieval practice forces effortful reconstruction of memory traces, slowing forgetting.",
    unitTag: "Cognitive Science",
    memoryHook:
      "Effort builds neural muscle: testing is lifting weights; re-reading is watching someone else lift.",
    learningMethod: "Desirable Difficulty",
  },
  {
    question: "If sin(θ) = 1/2 and θ lies in Quadrant II, what is cos(θ)?",
    options: ["√3 / 2", "-√3 / 2", "-1 / 2", "1 / √2"],
    correctIndex: 1,
    explanation:
      "In Quadrant II cosine is negative, and √(1 - (1/2)²) = √3 / 2.",
    unitTag: "AP Precalculus · Trig",
    memoryHook:
      "All Students Take Calculus: Quadrant II keeps Sine positive and forces Cosine negative.",
    learningMethod: "Dual-Coding Quadrant Rule",
  },
  {
    question:
      "In the Feynman Technique, what signals a genuine conceptual blind spot?",
    options: [
      "Explaining a cause using plain everyday vocabulary",
      "Relying on memorized jargon when asked 'why' or 'how'",
      "Drawing a diagram showing cause and effect",
      "Testing yourself without looking at notes",
    ],
    correctIndex: 1,
    explanation:
      "Hiding behind technical buzzwords usually masks an incomplete mental model.",
    unitTag: "Meta-Learning",
    memoryHook:
      "If you can't explain it in plain English without buzzwords, you found the blind spot.",
    learningMethod: "Feynman Simplification",
  },
];

function serializeBattleQuestions(list: StudyBattleQuestion[]): string {
  return JSON.stringify(
    list.map((q) => ({
      question: q.question,
      options: q.options.slice(0, 4),
      correctIndex: q.correctIndex,
      ...(q.explanation ? { explanation: q.explanation } : {}),
      ...(q.unitTag ? { unitTag: q.unitTag } : {}),
      ...(q.memoryHook ? { memoryHook: q.memoryHook } : {}),
      ...(q.learningMethod ? { learningMethod: q.learningMethod } : {}),
    })),
    null,
    2
  );
}

interface DropZoneMapSelectorProps {
  selectedPoiId: PoiId;
  onSelectPoi: (poiId: PoiId) => void;
  arenaSeed?: number;
  compact?: boolean;
}

function DropZoneMapSelector({
  selectedPoiId,
  onSelectPoi,
  arenaSeed = 1337,
  compact = false,
}: DropZoneMapSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedPoi =
    ARENA_POIS.find((p) => p.id === selectedPoiId) || ARENA_POIS[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 280;
    const scale = size / ARENA_SIZE;
    const layout = generateArenaLayout(arenaSeed);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#080B10";
    ctx.fillRect(0, 0, size, size);

    // Biome regions
    for (const biome of layout.biomes) {
      ctx.fillStyle = biome.floorColor;
      ctx.fillRect(
        biome.x * scale,
        biome.y * scale,
        biome.w * scale,
        biome.h * scale
      );
      ctx.strokeStyle = `${biome.accentColor}44`;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        biome.x * scale,
        biome.y * scale,
        biome.w * scale,
        biome.h * scale
      );
    }

    // Roads
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineCap = "round";
    for (const road of layout.roads) {
      ctx.lineWidth = Math.max(2, road.width * scale);
      ctx.beginPath();
      ctx.moveTo(road.x1 * scale, road.y1 * scale);
      ctx.lineTo(road.x2 * scale, road.y2 * scale);
      ctx.stroke();
    }

    // River / Data Canal
    if (layout.riverPoints.length > 1) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
      ctx.lineWidth = 10;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(layout.riverPoints[0].x * scale, layout.riverPoints[0].y * scale);
      for (let i = 1; i < layout.riverPoints.length; i++) {
        ctx.lineTo(layout.riverPoints[i].x * scale, layout.riverPoints[i].y * scale);
      }
      ctx.stroke();
    }

    // Bridges
    ctx.fillStyle = "#94A3B8";
    for (const b of layout.bridges) {
      ctx.fillRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
    }

    // Obstacles preview
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    for (const obs of layout.obstacles) {
      ctx.fillRect(
        obs.x * scale,
        obs.y * scale,
        Math.max(1.5, obs.w * scale),
        Math.max(1.5, obs.h * scale)
      );
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let g = 1; g < 4; g++) {
      const p = (size / 4) * g;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }, [arenaSeed]);

  return (
    <div className="bg-zinc-950/90 border border-white/10 rounded-xl p-4 space-y-3 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>Pre-Match Drop Selector</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          Click POI to Drop
        </span>
      </div>

      <div
        className={`relative mx-auto rounded-xl overflow-hidden border border-white/15 bg-zinc-950 ${
          compact ? "w-56 h-56" : "w-64 h-64 sm:w-72 sm:h-72"
        }`}
      >
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="w-full h-full block"
        />

        {ARENA_POIS.map((poi) => {
          const leftPct = Math.round((poi.dropX / ARENA_SIZE) * 100);
          const topPct = Math.round((poi.dropY / ARENA_SIZE) * 100);
          const isSelected = poi.id === selectedPoiId;
          return (
            <button
              key={poi.id}
              type="button"
              onClick={() => onSelectPoi(poi.id)}
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              className={`-translate-x-1/2 -translate-y-1/2 absolute px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                isSelected
                  ? "bg-emerald-400 text-zinc-950 border-white scale-105 z-10 shadow-lg"
                  : "bg-zinc-950/90 text-zinc-100 border-white/25 hover:border-emerald-400"
              }`}
            >
              {poi.hasMiniBozz && (
                <Crown
                  className={`h-2.5 w-2.5 ${
                    isSelected ? "text-zinc-950" : "text-amber-400"
                  }`}
                />
              )}
              <span>{poi.name}</span>
            </button>
          );
        })}
      </div>

      <div className="p-2.5 bg-zinc-900/80 border border-white/10 rounded-lg flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedPoi.color }}
            />
            <span className="truncate">{selectedPoi.name}</span>
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            {selectedPoi.subtitle}
          </div>
        </div>
        {selectedPoi.hasMiniBozz && (
          <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
            Mini-Bozz
          </span>
        )}
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

const TypedComponent = Component as unknown as {
  new (props: ErrorBoundaryProps): {
    props: ErrorBoundaryProps;
    state: ErrorBoundaryState;
    setState: (next: Partial<ErrorBoundaryState>) => void;
    render(): React.ReactNode;
  };
};

class StudyBattleErrorBoundary extends TypedComponent {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "Unexpected Bozz Battles error.",
    };
  }

  render() {
    if (this.state.hasError) {
      let readableMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error)
          readableMessage = `${parsed.error} (${parsed.operationType} ${parsed.path || ""})`;
      } catch {
        // Keep raw message
      }
      return (
        <div className="bg-[#0B0B10] border border-red-500/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3 text-red-300">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Bozz Battles Connection Error
              </h3>
              <p className="text-xs text-red-200/90 leading-relaxed">
                {readableMessage}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: "" });
              this.props.onReset();
            }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white rounded-xl cursor-pointer"
          >
            Return to Bozz Battles Setup
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StudyBattleInner({
  initialQuestions,
  initialTitle,
  initialJoinCode,
  firebaseConfig,
  onBack,
}: StudyBattleProps) {
  const [activeTab, setActiveTab] = useState<"host" | "join">(
    initialJoinCode ? "join" : "host"
  );

  // Persistent identity tokens for authoritative host, player & ranked profile
  const [hostId] = useState(() =>
    getOrCreateClientToken("bozz_study_battle_host_id", "host")
  );
  const [playerId] = useState(() =>
    getOrCreateClientToken("bozz_study_battle_player_id", "player")
  );

  // Ranked ELO/MMR profile state
  const [profile, setProfile] = useState<BattleProfileDocument | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResultSummary | null>(null);
  const [animatedRankBarPct, setAnimatedRankBarPct] = useState<number>(0);
  const recordedMatchRoomRef = useRef<string | null>(null);

  // Host & Join form state + POI drop selection
  const [hostName, setHostName] = useState("ScholarOne");
  const [roomTitle, setRoomTitle] = useState(
    initialTitle || "Gbozz GPT · Bozz Battles Arena"
  );
  const [selectedDropPoiId, setSelectedDropPoiId] =
    useState<PoiId>("prompt_plaza");
  const [questionsJson, setQuestionsJson] = useState(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return serializeBattleQuestions(initialQuestions);
    }
    return serializeBattleQuestions(SAMPLE_QUESTIONS);
  });

  const [playerName, setPlayerName] = useState("Challenger");
  const [joinCode, setJoinCode] = useState(
    initialJoinCode ? initialJoinCode.toUpperCase().slice(0, 4) : ""
  );

  // Live Firestore room state
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<StudyRoomDocument | null>(null);
  const [players, setPlayers] = useState<StudyPlayerDocument[]>([]);
  const [worldState, setWorldState] = useState<StudyWorldStateDocument | null>(null);
  const [lobbySecLeft, setLobbySecLeft] = useState<number>(LOBBY_COUNTDOWN_SEC);

  const [isBusy, setIsBusy] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);
  const [muted, setMuted] = useState(false);

  const autoLaunchingRef = useRef(false);

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestionsJson(serializeBattleQuestions(initialQuestions));
    }
  }, [initialQuestions]);

  useEffect(() => {
    if (initialTitle) setRoomTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase().slice(0, 4));
      setActiveTab("join");
    }
  }, [initialJoinCode]);

  // Animate rank progress bar smoothly on post-match Victory Bozz screen
  useEffect(() => {
    if (!matchResult) return;
    const prevTierProgress = getTierProgress(matchResult.previousMmr);
    const nextTierProgress = getTierProgress(matchResult.newMmr);
    const startPct =
      matchResult.newTier === matchResult.previousTier
        ? prevTierProgress.progressPct
        : 0;
    setAnimatedRankBarPct(startPct);
    const timer = setTimeout(() => {
      setAnimatedRankBarPct(nextTierProgress.progressPct);
    }, 90);
    return () => clearTimeout(timer);
  }, [matchResult]);

  // Hydrate persistent Competitive Profile from Firestore
  useEffect(() => {
    let active = true;
    try {
      const db = getStudyBattleDb(firebaseConfig);
      void loadOrCreateBattleProfile(db, playerId, hostName)
        .then((loaded) => {
          if (!active) return;
          setProfile(loaded);
          if (loaded.displayName && loaded.displayName !== "Scholar") {
            setHostName(loaded.displayName);
            setPlayerName(loaded.displayName);
          }
        })
        .catch(() => {
          // Safe local fallback if offline
        });
    } catch {
      // Ignore config errors here; surfaced on action
    }
    return () => {
      active = false;
    };
  }, [firebaseConfig, playerId]);

  const parsedHostQuestions = useMemo(
    () => parseStudyQuestionsJson(questionsJson),
    [questionsJson]
  );

  // Real-time Firestore room + players + world/state subscription
  useEffect(() => {
    if (!activeRoomCode) return;

    let unsubscribe = () => {};
    try {
      const db = getStudyBattleDb(firebaseConfig);
      unsubscribe = subscribeToBattleRoom(db, activeRoomCode, {
        onRoom: (nextRoom) => setRoom(nextRoom),
        onPlayers: (nextPlayers) => setPlayers(nextPlayers),
        onWorld: (nextWorld) => setWorldState(nextWorld),
        onError: (err) => {
          let msg = err.message;
          try {
            const parsed = JSON.parse(msg);
            if (parsed?.error) msg = parsed.error;
          } catch {
            // Keep message
          }
          setErrorMsg(msg);
        },
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to connect to Firestore."
      );
    }

    return () => unsubscribe();
  }, [activeRoomCode, firebaseConfig]);

  const isHost = Boolean(room && room.hostId === hostId);

  // 15-second pre-match countdown + Automatic 20-player AI bot backfill launch
  useEffect(() => {
    if (!room || room.status !== "lobby") {
      autoLaunchingRef.current = false;
      return;
    }

    const updateTimer = () => {
      const sec = Math.max(0, Math.ceil((room.countdownEndsAtMs - Date.now()) / 1000));
      setLobbySecLeft(sec);

      if (sec <= 0 && isHost && !autoLaunchingRef.current) {
        autoLaunchingRef.current = true;
        try {
          const db = getStudyBattleDb(firebaseConfig);
          void hostLaunchRoyaleMatch({ db, room, players }).catch((err) => {
            autoLaunchingRef.current = false;
            setErrorMsg(
              err instanceof Error ? err.message : "Failed to auto-launch arena."
            );
          });
        } catch (err) {
          autoLaunchingRef.current = false;
          setErrorMsg(err instanceof Error ? err.message : "Launch failed.");
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [room, isHost, players, firebaseConfig]);

  const handleSelectDropPoi = async (poiId: PoiId) => {
    setSelectedDropPoiId(poiId);
    playBattleSfx("crate", muted);
    if (room && room.status === "lobby") {
      try {
        const db = getStudyBattleDb(firebaseConfig);
        await updatePlayerDropPoi({
          db,
          roomCode: room.roomCode,
          playerId,
          arenaSeed: room.arenaSeed,
          poiId,
        });
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to lock drop POI."
        );
      }
    }
  };

  const handleEnrichQuestions = async () => {
    setErrorMsg(null);
    if (parsedHostQuestions.error || parsedHostQuestions.questions.length === 0) {
      setErrorMsg(parsedHostQuestions.error || "Provide valid questions first.");
      return;
    }
    setIsCalibrating(true);
    try {
      const enriched = await calibrateStudyQuestionsWithAI(
        parsedHostQuestions.questions,
        roomTitle
      );
      setQuestionsJson(serializeBattleQuestions(enriched));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to enrich questions with AI."
      );
    } finally {
      setIsCalibrating(false);
    }
  };

  const createAndOptionallyDrop = async (instantDrop: boolean) => {
    setErrorMsg(null);

    if (parsedHostQuestions.error || parsedHostQuestions.questions.length === 0) {
      setErrorMsg(parsedHostQuestions.error || "Provide valid questions first.");
      return;
    }

    setIsBusy(true);
    setMatchResult(null);
    recordedMatchRoomRef.current = null;
    try {
      const db = getStudyBattleDb(firebaseConfig);
      const ensuredProfile =
        profile || (await loadOrCreateBattleProfile(db, playerId, hostName));
      setProfile(ensuredProfile);

      const code = await createBattleRoom({
        db,
        hostId,
        hostName,
        title: roomTitle,
        questions: parsedHostQuestions.questions,
        hostPlayerId: playerId,
        hostMmr: ensuredProfile.mmr,
        hostTier: ensuredProfile.tier,
        dropPoiId: selectedDropPoiId,
      });

      if (instantDrop) {
        autoLaunchingRef.current = true;
        playBattleSfx("jumppad", muted);
        const { doc: fsDoc, getDoc: fsGetDoc } = await import("firebase/firestore");
        const createdSnap = await fsGetDoc(fsDoc(db, "studyRooms", code));
        const createdRoom = createdSnap.exists()
          ? (createdSnap.data() as StudyRoomDocument)
          : {
              roomCode: code,
              hostId,
              hostName,
              title: roomTitle,
              status: "lobby" as const,
              targetPlayers: TARGET_LOBBY_SIZE,
              countdownEndsAtMs: Date.now(),
              matchStartedAtMs: 0,
              arenaSeed: 1337,
              questions: parsedHostQuestions.questions,
              winnerId: "",
              winnerName: "",
            };
        const layout = generateArenaLayout(createdRoom.arenaSeed);
        const dropSpawn = getPoiSpawnPosition(
          selectedDropPoiId,
          layout.obstacles,
          createdRoom.arenaSeed,
          layout.riverPoints,
          layout.bridges
        );
        await hostLaunchRoyaleMatch({
          db,
          room: createdRoom,
          players: [
            {
              playerId,
              displayName: hostName.trim().slice(0, 24) || "Host",
              mmr: ensuredProfile.mmr,
              tier: ensuredProfile.tier,
              isHost: true,
              alive: true,
              hp: 100,
              shield: 0,
              ammo: 0,
              kills: 0,
              hasMedallion: false,
              questionsCorrect: 0,
              questionsAttempted: 0,
              x: Math.round(dropSpawn.x),
              y: Math.round(dropSpawn.y),
              aimAngle: 0,
              exposedUntilMs: 0,
              placement: 0,
              lastShotId: "",
              lastShotX: 0,
              lastShotY: 0,
              lastShotVx: 0,
              lastShotVy: 0,
              lastShotAtMs: 0,
            },
          ],
        });
      } else {
        playBattleSfx("crate", muted);
      }
      setActiveRoomCode(code);
    } catch (err) {
      autoLaunchingRef.current = false;
      setErrorMsg(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAndOptionallyDrop(false);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) {
      setErrorMsg("Enter a valid 4-letter uppercase room code (e.g. BOZZ).");
      return;
    }
    if (!playerName.trim()) {
      setErrorMsg("Enter your display name to join the lobby.");
      return;
    }

    setIsBusy(true);
    setMatchResult(null);
    recordedMatchRoomRef.current = null;
    try {
      const db = getStudyBattleDb(firebaseConfig);
      const ensuredProfile =
        profile || (await loadOrCreateBattleProfile(db, playerId, playerName));
      setProfile(ensuredProfile);

      await joinBattleRoom({
        db,
        roomCode: code,
        playerId,
        displayName: playerName,
        mmr: ensuredProfile.mmr,
        tier: ensuredProfile.tier,
        dropPoiId: selectedDropPoiId,
      });
      setActiveRoomCode(code);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to join room.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async (kind: "code" | "link") => {
    if (!activeRoomCode || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", activeRoomCode);
    const text = kind === "code" ? activeRoomCode : url.toString();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setErrorMsg(`Copy manually: ${text}`);
    }
  };

  const handleDropNow = async () => {
    if (!room || !isHost) return;
    setErrorMsg(null);
    setIsBusy(true);
    autoLaunchingRef.current = true;
    try {
      const db = getStudyBattleDb(firebaseConfig);
      await hostLaunchRoyaleMatch({ db, room, players });
    } catch (err) {
      autoLaunchingRef.current = false;
      setErrorMsg(err instanceof Error ? err.message : "Could not launch arena.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExtendTimer = async () => {
    if (!room || !isHost) return;
    setErrorMsg(null);
    try {
      const db = getStudyBattleDb(firebaseConfig);
      await hostExtendLobbyCountdown(db, room.roomCode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to extend timer.");
    }
  };

  const handleMatchComplete = useCallback(
    async (stats: {
      placement: number;
      totalPlayers: number;
      kills: number;
      miniBozzKills: number;
      medallionSecured: boolean;
      questionsCorrect: number;
      questionsAttempted: number;
      winnerName: string;
    }) => {
      if (!activeRoomCode || recordedMatchRoomRef.current === activeRoomCode) {
        return;
      }
      recordedMatchRoomRef.current = activeRoomCode;

      try {
        const db = getStudyBattleDb(firebaseConfig);
        const activeName =
          players.find((p) => p.playerId === playerId)?.displayName ||
          hostName ||
          playerName;
        const { profile: updatedProfile, summary } = await recordMatchRankResult({
          db,
          profileId: playerId,
          displayName: activeName,
          placement: stats.placement,
          totalPlayers: stats.totalPlayers,
          kills: stats.kills,
          miniBozzKills: stats.miniBozzKills,
          medallionSecured: stats.medallionSecured,
          questionsCorrect: stats.questionsCorrect,
          questionsAttempted: stats.questionsAttempted,
          winnerName: stats.winnerName,
        });
        setProfile(updatedProfile);
        setMatchResult(summary);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to save ranked MMR."
        );
      }
    },
    [activeRoomCode, firebaseConfig, players, playerId, hostName, playerName]
  );

  const handleLeaveRoom = () => {
    setActiveRoomCode(null);
    setRoom(null);
    setPlayers([]);
    setWorldState(null);
    setMatchResult(null);
    setErrorMsg(null);
    autoLaunchingRef.current = false;
  };

  // POST-MATCH "VICTORY BOZZ" SUMMARY SCREEN
  if (matchResult) {
    const isVictory = matchResult.placement === 1;
    const tierMeta = getTierMeta(matchResult.newTier);
    const tierProgress = getTierProgress(matchResult.newMmr);
    const accuracyPct =
      matchResult.questionsAttempted > 0
        ? Math.round(
            (matchResult.questionsCorrect / matchResult.questionsAttempted) * 100
          )
        : 0;

    return (
      <div className="space-y-6 animate-reveal-pop max-w-4xl mx-auto">
        <div
          className={`specular-panel backdrop-blur-2xl rounded-2xl p-6 md:p-8 border space-y-6 ${
            isVictory ? "border-emerald-400/60" : "border-purple-400/40"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1">
              <div className="text-xs font-mono text-purple-400">
                Bozz Battles Match Complete · Champion: {matchResult.winnerName}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <Trophy
                  className={`h-7 w-7 ${
                    isVictory ? "text-emerald-400" : "text-purple-400"
                  }`}
                />
                <span>
                  {isVictory
                    ? "#1 Victory Bozz!"
                    : `Eliminated · Placement #${matchResult.placement} / ${matchResult.totalPlayers}`}
                </span>
              </h1>
            </div>

            <div className="text-right font-mono tabular-nums">
              <div className="text-xs text-zinc-400">Gbozz Rank</div>
              <div className="text-xl font-black" style={{ color: tierMeta.color }}>
                {matchResult.newTier} · {matchResult.newMmr} MMR
              </div>
              <div
                className={`text-xs font-bold ${
                  matchResult.mmrDelta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {matchResult.mmrDelta >= 0
                  ? `+${matchResult.mmrDelta} MMR Gained`
                  : `${matchResult.mmrDelta} MMR Lost`}
                {matchResult.newTier !== matchResult.previousTier
                  ? ` · Promoted to ${matchResult.newTier}!`
                  : ""}
              </div>
            </div>
          </div>

          {/* 5 Match Performance Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono tabular-nums">
            <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Placement</div>
              <div className="text-2xl font-extrabold text-white mt-0.5">
                #{matchResult.placement}
              </div>
            </div>
            <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Eliminations</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                {matchResult.kills}
              </div>
            </div>
            <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Mini-Bozzes</div>
              <div className="text-2xl font-extrabold text-amber-300 mt-0.5 flex items-center gap-1.5">
                <span>{matchResult.miniBozzKills}</span>
                {matchResult.medallionSecured && (
                  <Crown className="h-4 w-4 text-amber-400" />
                )}
              </div>
            </div>
            <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-xl">
              <div className="text-[11px] text-zinc-400">Crates Acing</div>
              <div className="text-2xl font-extrabold text-purple-300 mt-0.5">
                {matchResult.questionsCorrect}/{matchResult.questionsAttempted}
              </div>
            </div>
            <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-xl col-span-2 sm:col-span-1">
              <div className="text-[11px] text-zinc-400">Quiz Accuracy</div>
              <div className="text-2xl font-extrabold text-white mt-0.5">
                {accuracyPct}%
              </div>
            </div>
          </div>

          {/* Animated Tier Progress Bar */}
          <div className="p-4 bg-zinc-950/90 border border-white/10 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold" style={{ color: tierMeta.color }}>
                {tierProgress.currentTier} Tier
                {matchResult.medallionSecured ? " · Bozz Medallion Holder" : ""}
              </span>
              <span className="text-zinc-400">
                {tierProgress.nextTier
                  ? `Next: ${tierProgress.nextTier} (${tierProgress.nextThreshold} MMR)`
                  : "Maximum Tier Reached · Grand Gbozz"}
              </span>
            </div>
            <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-emerald-400 to-amber-300 transition-all duration-700 ease-out"
                style={{ width: `${animatedRankBarPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs font-mono text-zinc-400">
              Survive late System Glitch circles, defeat POI Mini-Bozzes, and ace crates to hit Grand Gbozz.
            </span>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-extrabold text-xs rounded-xl cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Play Another Match</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE ROOM VIEW: lobby -> active 2D canvas
  if (activeRoomCode && room) {
    if (room.status === "active" || room.status === "finished") {
      const db = getStudyBattleDb(firebaseConfig);
      return (
        <BattleRoyaleCanvas
          db={db}
          room={room}
          players={players}
          worldState={worldState}
          currentPlayerId={playerId}
          isHost={isHost}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onLeaveRoom={handleLeaveRoom}
          onMatchComplete={handleMatchComplete}
        />
      );
    }

    // STAGING LOBBY WITH 15s AUTO-COUNTDOWN, INTERACTIVE DROP SELECTOR & 20-PLAYER AI BOT BACKFILL
    const slotsRemaining = Math.max(0, (room.targetPlayers || TARGET_LOBBY_SIZE) - players.length);

    return (
      <div className="space-y-5 animate-reveal-pop">
        {/* Room Header Strip */}
        <div className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Swords className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono text-zinc-400">
                Room <strong className="text-white">{room.roomCode}</strong> · Host:{" "}
                {room.hostName} · Target:{" "}
                <strong className="text-emerald-400">{room.targetPlayers} Players</strong>
              </div>
              <h1 className="text-base font-bold text-white truncate">{room.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
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
              onClick={() => void handleCopy("code")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/15 rounded-lg text-xs font-mono text-zinc-200 cursor-pointer whitespace-nowrap"
            >
              {copiedType === "code" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-purple-400" />
              )}
              <span>{copiedType === "code" ? "Code Copied" : `Code: ${room.roomCode}`}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopy("link")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/15 rounded-lg text-xs font-mono text-zinc-200 cursor-pointer whitespace-nowrap"
            >
              {copiedType === "link" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <LinkIcon className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>{copiedType === "link" ? "Link Copied" : "Copy Link"}</span>
            </button>

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-red-950/50 border border-white/10 hover:border-red-500/40 rounded-lg text-xs font-mono text-zinc-400 hover:text-red-300 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Room Code, Countdown + Interactive POI Drop Selector */}
          <div className="lg:col-span-5 specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-4 text-center">
            <div className="text-xs font-mono text-purple-400">
              Bozz Battles Staging · Choose Drop Zone
            </div>

            <div className="py-3.5 px-4 bg-zinc-950 border border-emerald-400/35 rounded-2xl space-y-1">
              <div className="text-[11px] font-mono text-zinc-400">Join Code</div>
              <div className="font-mono text-4xl font-black tracking-[0.28em] text-emerald-400 tabular-nums pl-[0.28em]">
                {room.roomCode}
              </div>
            </div>

            <DropZoneMapSelector
              selectedPoiId={selectedDropPoiId}
              onSelectPoi={(poiId) => void handleSelectDropPoi(poiId)}
              arenaSeed={room.arenaSeed}
              compact
            />

            <div className="p-3.5 bg-zinc-950/90 border border-purple-400/35 rounded-xl space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-300 font-bold">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>
                  {lobbySecLeft > 0
                    ? `Drop & Bot Backfill in ${lobbySecLeft}s`
                    : "Backfilling AI Bots & Launching Arena..."}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {slotsRemaining > 0
                  ? `${slotsRemaining} slots backfill automatically with adaptive AI bots at 0s.`
                  : "Full 20/20 human lobby ready!"}
              </p>
            </div>

            {isHost ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDropNow()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-45 text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>
                    {isBusy
                      ? "Deploying Arena..."
                      : `Drop Now (Backfill ${slotsRemaining} Bots)`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleExtendTimer()}
                  className="w-full py-2 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 rounded-xl cursor-pointer"
                >
                  +15s Wait for Friends
                </button>
              </div>
            ) : (
              <div className="p-3 bg-purple-500/10 border border-purple-400/30 rounded-xl text-xs font-mono text-purple-200">
                Locked in staging. Dropping automatically in {lobbySecLeft}s...
              </div>
            )}
          </div>

          {/* Right: 20-Player Human + AI Backfill Roster + Tactical Brief */}
          <div className="lg:col-span-7 space-y-4">
            <div className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-bold">Squad Lobby Roster</h2>
                </div>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  {players.length} Human + {slotsRemaining} AI Bots = 20 Total
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {players.map((p) => {
                  const tm = getTierMeta(p.tier);
                  return (
                    <div
                      key={p.playerId}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-2 ${
                        p.playerId === playerId
                          ? "bg-emerald-500/10 border-emerald-400/45"
                          : "bg-zinc-950/80 border-white/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {p.displayName}
                          {p.playerId === playerId ? " (You)" : ""}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          {p.isHost ? "Host" : "Human"} · {p.mmr} MMR
                        </div>
                      </div>
                      <span
                        className="font-mono text-[11px] font-bold shrink-0"
                        style={{ color: tm.color }}
                      >
                        {p.tier}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-zinc-950/85 border border-white/10 rounded-xl space-y-1">
                <div className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  <span>3 AI Mini-Bozzes</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Contest Bozz Citadel, Neural Nexus &amp; Data Docks. Shoot Mini-Bozzes or press [R] for rapid-fire bonus questions to claim Mythic gear &amp; a Bozz Medallion!
                </p>
              </div>
              <div className="p-3 bg-zinc-950/85 border border-white/10 rounded-xl space-y-1">
                <div className="font-mono font-bold text-purple-300 flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>5 Rarities &amp; 4 Guns</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Loot Data Crates &amp; Gbozz Terminals [E] for Rapid-Fire Blasters, Heavy Prompt Cannons, Scatter Shots &amp; Railguns from Common to Mythic.
                </p>
              </div>
              <div className="p-3 bg-zinc-950/85 border border-white/10 rounded-xl space-y-1">
                <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" />
                  <span>Firewall &amp; Glitch Storm</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Spend Tokens with [F] to deploy Firewall Cover walls, Dash with [Shift], heal with [H]/[Q], and outlast the 5-phase System Glitch Storm!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ROOM SETUP HUB + PERSISTENT GBOZZ RANKS BANNER
  const activeProfile = profile || {
    profileId: playerId,
    displayName: hostName,
    mmr: 1000,
    peakMmr: 1000,
    tier: "Silver" as const,
    matchesPlayed: 0,
    wins: 0,
    totalKills: 0,
    questionsCorrect: 0,
    questionsAttempted: 0,
  };
  const tierMeta = getTierMeta(activeProfile.tier);
  const tierProgress = getTierProgress(activeProfile.mmr);
  const careerQuizPct =
    activeProfile.questionsAttempted > 0
      ? Math.round(
          (activeProfile.questionsCorrect / activeProfile.questionsAttempted) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-emerald-400">
            Gbozz GPT · 2D Top-Down Battle Royale · 20 Players + Bot Backfill
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Swords className="h-6 w-6 text-purple-400 shrink-0" />
            <span>Bozz Battles</span>
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Drop into Bozz Citadel, Prompt Plaza, Neural Nexus, or Data Docks. Crack Data Crates &amp; Gbozz Terminals for Common-to-Mythic weapons, defeat AI Mini-Bozzes for the Bozz Medallion, deploy Firewall Cover, and climb to Grand Gbozz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("host");
                setErrorMsg(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "host"
                  ? "bg-emerald-400 text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Host Study Room
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("join");
                setErrorMsg(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === "join"
                  ? "bg-purple-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Join with Code
            </button>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 rounded-xl cursor-pointer whitespace-nowrap shrink-0"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Persistent Ranked ELO / MMR & Gbozz Ranks Strip */}
      <div className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-zinc-950 border border-white/15 flex items-center justify-center">
              <Shield className="h-6 w-6" style={{ color: tierMeta.color }} />
            </div>
            <div>
              <div className="text-[11px] font-mono text-zinc-400">
                Gbozz Rank Rating · Peak {activeProfile.peakMmr} MMR
              </div>
              <div className="text-lg font-extrabold font-mono tabular-nums flex items-center gap-2">
                <span style={{ color: tierMeta.color }}>{activeProfile.tier}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-white">{activeProfile.mmr} MMR</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-mono text-xs tabular-nums">
            <div>
              <span className="text-zinc-400">Matches: </span>
              <strong className="text-white">{activeProfile.matchesPlayed}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Victory Bozzes: </span>
              <strong className="text-emerald-400">{activeProfile.wins}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Eliminations: </span>
              <strong className="text-purple-300">{activeProfile.totalKills}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Crate Accuracy: </span>
              <strong className="text-white">{careerQuizPct}%</strong>
            </div>
          </div>
        </div>

        {/* Tier Ladder & Next Tier Bar */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${tierProgress.progressPct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
            <div className="flex flex-wrap items-center gap-2.5">
              {TIER_CONFIG.map((t) => (
                <span
                  key={t.tier}
                  className={
                    t.tier === activeProfile.tier ? "font-bold text-white" : "text-zinc-500"
                  }
                >
                  {t.tier} ({t.minMmr}+)
                </span>
              ))}
            </div>
            <span>
              {tierProgress.nextTier
                ? `${(tierProgress.nextThreshold || 0) - activeProfile.mmr} MMR to ${tierProgress.nextTier}`
                : "Grand Gbozz Pinnacle"}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === "host" ? (
        <form
          onSubmit={(e) => void handleCreateRoom(e)}
          className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="sb-host-name"
                    className="text-xs font-semibold text-zinc-200 block"
                  >
                    Your Combat Callsign
                  </label>
                  <input
                    id="sb-host-name"
                    type="text"
                    maxLength={24}
                    required
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. ScholarOne"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="sb-room-title"
                    className="text-xs font-semibold text-zinc-200 block"
                  >
                    Arena Session Title
                  </label>
                  <input
                    id="sb-room-title"
                    type="text"
                    maxLength={120}
                    required
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="e.g. AP Chemistry Unit 4 Bozz Battles"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="sb-questions-json"
                    className="text-xs font-semibold text-zinc-200"
                  >
                    Crate &amp; Terminal Quiz Bank JSON{" "}
                    <span className="font-mono text-zinc-400">
                      {`([{ question, options, correctIndex }])`}
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        parsedHostQuestions.error ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {parsedHostQuestions.error
                        ? "Invalid JSON"
                        : `${parsedHostQuestions.questions.length} crate questions ready`}
                    </span>
                    <button
                      type="button"
                      disabled={isCalibrating || Boolean(parsedHostQuestions.error)}
                      onClick={() => void handleEnrichQuestions()}
                      className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isCalibrating ? "Enriching..." : "AI Add Memory Hooks"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestionsJson(serializeBattleQuestions(SAMPLE_QUESTIONS))
                      }
                      className="text-xs font-mono text-purple-400 hover:text-purple-300 cursor-pointer whitespace-nowrap"
                    >
                      Load Sample JSON
                    </button>
                  </div>
                </div>

                <textarea
                  id="sb-questions-json"
                  rows={8}
                  value={questionsJson}
                  onChange={(e) => setQuestionsJson(e.target.value)}
                  spellCheck={false}
                  className="w-full p-4 bg-zinc-950 border border-white/10 focus:border-purple-400 rounded-xl font-mono text-xs text-zinc-100 leading-relaxed focus:outline-none"
                />
                {parsedHostQuestions.error && (
                  <p className="text-xs text-red-400 font-mono">
                    {parsedHostQuestions.error}
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <DropZoneMapSelector
                selectedPoiId={selectedDropPoiId}
                onSelectPoi={(poiId) => {
                  setSelectedDropPoiId(poiId);
                  playBattleSfx("crate", muted);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
            <span className="text-xs font-mono text-zinc-400">
              5 POIs · 3 Mini-Bozzes · 4-min 5-phase System Glitch Storm · 20-player backfill
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isBusy || Boolean(parsedHostQuestions.error)}
                onClick={() => void createAndOptionallyDrop(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-400 disabled:opacity-45 text-white font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>{isBusy ? "Launching..." : "Instant Drop (vs 19 Bots)"}</span>
              </button>

              <button
                type="submit"
                disabled={isBusy || Boolean(parsedHostQuestions.error)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-45 text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{isBusy ? "Deploying Room..." : "Create Room"}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => void handleJoinRoom(e)}
          className="specular-panel backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">
                  Join a Live Bozz Battles Arena
                </h2>
                <p className="text-xs text-zinc-400">
                  Enter your callsign, the 4-letter uppercase room code, and select your landing POI.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="sb-player-name"
                    className="text-xs font-semibold text-zinc-200 block"
                  >
                    Combat Callsign
                  </label>
                  <input
                    id="sb-player-name"
                    type="text"
                    maxLength={24}
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-zinc-950 border border-white/10 focus:border-purple-400 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="sb-join-code"
                    className="text-xs font-semibold text-zinc-200 block"
                  >
                    4-Letter Room Code
                  </label>
                  <input
                    id="sb-join-code"
                    type="text"
                    maxLength={4}
                    required
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(
                        e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4)
                      )
                    }
                    placeholder="BOZZ"
                    className="w-full px-4 py-3.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl font-mono text-2xl font-black tracking-[0.25em] text-center text-emerald-400 uppercase focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy || joinCode.length !== 4 || !playerName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 bg-purple-500 hover:bg-purple-400 disabled:opacity-45 text-white font-extrabold text-sm rounded-xl cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>{isBusy ? "Joining Staging..." : "Join Bozz Battles"}</span>
              </button>
            </div>

            <div className="md:col-span-6">
              <DropZoneMapSelector
                selectedPoiId={selectedDropPoiId}
                onSelectPoi={(poiId) => {
                  setSelectedDropPoiId(poiId);
                  playBattleSfx("crate", muted);
                }}
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export function StudyBattle(props: StudyBattleProps) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <StudyBattleErrorBoundary onReset={() => setResetKey((k) => k + 1)}>
      <div key={resetKey}>
        <StudyBattleInner {...props} />
      </div>
    </StudyBattleErrorBoundary>
  );
}

export default StudyBattle;
