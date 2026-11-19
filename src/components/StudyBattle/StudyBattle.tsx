"use client";

import React, { Component, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Link as LinkIcon,
  LogOut,
  Play,
  PlusCircle,
  Swords,
  Users,
} from "lucide-react";
import { getStudyBattleDb } from "./firebaseConfig";
import {
  createStudyRoom,
  getOrCreateClientToken,
  hostAdvanceNext,
  hostLockAndScoreRound,
  hostStartGame,
  joinStudyRoom,
  parseStudyQuestionsJson,
  subscribeToRoom,
  submitPlayerAnswer,
} from "./roomService";
import {
  StudyAnswerDocument,
  StudyBattleProps,
  StudyBattleQuestion,
  StudyPlayerDocument,
  StudyRoomDocument,
} from "./types";
import QuestionArena from "./QuestionArena";
import PodiumLeaderboard from "./PodiumLeaderboard";

const SAMPLE_QUESTIONS: StudyBattleQuestion[] = [
  {
    question: "Which mechanism explains why spaced active recall outperforms passive re-reading?",
    options: [
      "Testing strengthens retrieval pathways via desirable difficulty",
      "Re-reading increases short-term iconic visual persistence only",
      "Spacing prevents synaptic consolidation during sleep",
      "Passive exposure eliminates interference across unrelated units",
    ],
    correctIndex: 0,
    explanation:
      "Retrieval practice forces effortful reconstruction of memory traces, slowing forgetting.",
  },
  {
    question: "If sin(θ) = 1/2 and θ lies in Quadrant II, what is cos(θ)?",
    options: ["√3 / 2", "-√3 / 2", "-1 / 2", "1 / √2"],
    correctIndex: 1,
    explanation:
      "In Quadrant II cosine is negative, and √(1 - (1/2)²) = √3 / 2.",
  },
  {
    question: "In the Feynman Technique, what signals a genuine conceptual blind spot?",
    options: [
      "Explaining a cause using plain everyday vocabulary",
      "Relying on memorized jargon when asked 'why' or 'how'",
      "Drawing a diagram showing cause and effect",
      "Testing yourself without looking at notes",
    ],
    correctIndex: 1,
    explanation:
      "Hiding behind technical buzzwords usually masks an incomplete mental model.",
  },
];

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
    return { hasError: true, message: error?.message || "Unexpected Study Battle error." };
  }

  render() {
    if (this.state.hasError) {
      let readableMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) readableMessage = `${parsed.error} (${parsed.operationType} ${parsed.path || ""})`;
      } catch {
        // Keep raw message
      }
      return (
        <div className="bg-[#0B0B10] border border-red-500/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3 text-red-300">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Study Battle Connection Error</h3>
              <p className="text-xs text-red-200/90 leading-relaxed">{readableMessage}</p>
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
            Return to Study Battle Setup
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

  // Persistent local identity tokens for authoritative host & player matching
  const [hostId] = useState(() =>
    getOrCreateClientToken("bozz_study_battle_host_id", "host")
  );
  const [playerId] = useState(() =>
    getOrCreateClientToken("bozz_study_battle_player_id", "player")
  );

  // Host form state
  const [hostName, setHostName] = useState("Host");
  const [roomTitle, setRoomTitle] = useState(
    initialTitle || "Bozz GPT Live Study Battle"
  );
  const [joinHostAsPlayer, setJoinHostAsPlayer] = useState(true);
  const [questionsJson, setQuestionsJson] = useState(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return JSON.stringify(
        initialQuestions.map((q) => ({
          question: q.question,
          options: q.options.slice(0, 4),
          correctIndex: q.correctIndex,
          ...(q.explanation ? { explanation: q.explanation } : {}),
          ...(q.unitTag ? { unitTag: q.unitTag } : {}),
        })),
        null,
        2
      );
    }
    return JSON.stringify(SAMPLE_QUESTIONS, null, 2);
  });

  // Update host JSON automatically if user switches active deck before creating a room
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestionsJson(
        JSON.stringify(
          initialQuestions.map((q) => ({
            question: q.question,
            options: q.options.slice(0, 4),
            correctIndex: q.correctIndex,
            ...(q.explanation ? { explanation: q.explanation } : {}),
            ...(q.unitTag ? { unitTag: q.unitTag } : {}),
          })),
          null,
          2
        )
      );
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

  // Join form state
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState(
    initialJoinCode ? initialJoinCode.toUpperCase().slice(0, 4) : ""
  );

  // Live Firestore room state
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<StudyRoomDocument | null>(null);
  const [players, setPlayers] = useState<StudyPlayerDocument[]>([]);
  const [answers, setAnswers] = useState<StudyAnswerDocument[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<"code" | "link" | null>(null);

  const parsedHostQuestions = useMemo(
    () => parseStudyQuestionsJson(questionsJson),
    [questionsJson]
  );

  // Real-time Firestore onSnapshot sync
  useEffect(() => {
    if (!activeRoomCode) return;

    let unsubscribe = () => {};
    try {
      const db = getStudyBattleDb(firebaseConfig);
      unsubscribe = subscribeToRoom(db, activeRoomCode, {
        onRoom: (nextRoom) => setRoom(nextRoom),
        onPlayers: (nextPlayers) => setPlayers(nextPlayers),
        onAnswers: (nextAnswers) => setAnswers(nextAnswers),
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
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to Firestore.");
    }

    return () => unsubscribe();
  }, [activeRoomCode, firebaseConfig]);

  const isHost = Boolean(room && room.hostId === hostId);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (parsedHostQuestions.error || parsedHostQuestions.questions.length === 0) {
      setErrorMsg(parsedHostQuestions.error || "Provide valid questions first.");
      return;
    }

    setIsBusy(true);
    try {
      const db = getStudyBattleDb(firebaseConfig);
      const code = await createStudyRoom({
        db,
        hostId,
        hostName,
        title: roomTitle,
        questions: parsedHostQuestions.questions,
        joinHostAsPlayer,
        hostPlayerId: playerId,
      });
      setActiveRoomCode(code);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setIsBusy(false);
    }
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
    try {
      const db = getStudyBattleDb(firebaseConfig);
      await joinStudyRoom({
        db,
        roomCode: code,
        playerId,
        displayName: playerName,
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

  const handleStartGame = async () => {
    if (!room || !isHost) return;
    setErrorMsg(null);
    setIsBusy(true);
    try {
      const db = getStudyBattleDb(firebaseConfig);
      await hostStartGame(db, room.roomCode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not start game.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelectAnswer = useCallback(
    async (optionIndex: number) => {
      if (!room) return;
      setErrorMsg(null);
      try {
        const db = getStudyBattleDb(firebaseConfig);
        await submitPlayerAnswer({
          db,
          roomCode: room.roomCode,
          playerId,
          questionIndex: room.currentQuestionIndex,
          selectedIndex: optionIndex,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to submit answer.");
      }
    },
    [room, firebaseConfig, playerId]
  );

  const handleHostLockAndScore = useCallback(async () => {
    if (!room || !isHost) return;
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const db = getStudyBattleDb(firebaseConfig);
      await hostLockAndScoreRound({ db, room, players, answers });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to score round.");
    } finally {
      setIsBusy(false);
    }
  }, [room, isHost, firebaseConfig, players, answers]);

  const handleHostAdvance = async () => {
    if (!room || !isHost) return;
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const db = getStudyBattleDb(firebaseConfig);
      await hostAdvanceNext(db, room);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to advance round.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeaveRoom = () => {
    setActiveRoomCode(null);
    setRoom(null);
    setPlayers([]);
    setAnswers([]);
    setErrorMsg(null);
  };

  // ACTIVE ROOM VIEW: lobby -> question -> leaderboard -> finished
  if (activeRoomCode && room) {
    return (
      <div className="space-y-5">
        {/* Room Header Strip */}
        <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Swords className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono text-zinc-400">
                Room <strong className="text-white">{room.roomCode}</strong> · Host:{" "}
                {room.hostName} · Status:{" "}
                <span className="text-purple-300 uppercase">{room.status}</span>
              </div>
              <h1 className="text-base font-bold text-white truncate">{room.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

        {/* STATE 1: LOBBY */}
        {room.status === "lobby" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Join Code & Share Card */}
            <div className="lg:col-span-5 bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-5 text-center">
              <div className="text-xs font-mono text-purple-400">
                Share Code with Study Squad
              </div>

              <div className="py-5 px-4 bg-zinc-950 border border-emerald-400/35 rounded-2xl">
                <div className="font-mono text-5xl font-black tracking-[0.28em] text-emerald-400 tabular-nums pl-[0.28em]">
                  {room.roomCode}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleCopy("code")}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded-xl text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  {copiedType === "code" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-purple-400" />
                  )}
                  <span>{copiedType === "code" ? "Copied Code" : "Copy Code"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy("link")}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/15 rounded-xl text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  {copiedType === "link" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <LinkIcon className="h-4 w-4 text-emerald-400" />
                  )}
                  <span>{copiedType === "link" ? "Copied Link" : "Copy Link"}</span>
                </button>
              </div>

              <div className="text-xs text-zinc-400 font-mono tabular-nums pt-2 border-t border-white/10">
                {room.questions.length} Questions · 15s Speed Scoring (Max 1,000 pts)
              </div>

              {isHost ? (
                <button
                  type="button"
                  disabled={isBusy || players.length === 0}
                  onClick={() => void handleStartGame()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-45 text-zinc-950 font-extrabold text-sm rounded-xl cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="h-4 w-4" />
                  <span>
                    {isBusy
                      ? "Launching..."
                      : players.length === 0
                      ? "Waiting for at least 1 player..."
                      : `Start Study Battle (${players.length} Ready)`}
                  </span>
                </button>
              ) : (
                <div className="p-3 bg-purple-500/10 border border-purple-400/30 rounded-xl text-xs font-mono text-purple-200">
                  Locked into lobby. Waiting for {room.hostName} to start the match...
                </div>
              )}
            </div>

            {/* Live Player Roster */}
            <div className="lg:col-span-7 bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-bold">Live Lobby Roster</h2>
                </div>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  {players.length} {players.length === 1 ? "player" : "players"} synced
                </span>
              </div>

              {players.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  Share code <strong className="text-white">{room.roomCode}</strong> — players appear here instantaneously as they join.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {players.map((p, idx) => (
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
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          {p.isHost ? "Host Contestant" : "Challenger"}
                          {p.playerId === playerId ? " · You" : ""}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-zinc-500 tabular-nums">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE 2: QUESTION */}
        {room.status === "question" && (
          <QuestionArena
            room={room}
            players={players}
            answers={answers}
            currentPlayerId={playerId}
            isHost={isHost}
            isActionBusy={isBusy}
            onSelectAnswer={handleSelectAnswer}
            onHostLockAndScore={handleHostLockAndScore}
          />
        )}

        {/* STATE 3 & 4: LEADERBOARD & FINISHED PODIUM */}
        {(room.status === "leaderboard" || room.status === "finished") && (
          <PodiumLeaderboard
            room={room}
            players={players}
            currentPlayerId={playerId}
            isHost={isHost}
            isActionBusy={isBusy}
            onHostAdvance={handleHostAdvance}
            onResetToHub={handleLeaveRoom}
          />
        )}
      </div>
    );
  }

  // ROOM SETUP VIEW (Tabs: Host Study Room | Join with Code)
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-emerald-400">
            Real-Time Firestore Multiplayer Quiz Arena
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Swords className="h-6 w-6 text-purple-400 shrink-0" />
            <span>Study Battle</span>
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Turn any study deck or JSON question bank into a live 15-second speed battle with real-time podium standings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Two Required Tabs */}
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

      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === "host" ? (
        <form
          onSubmit={(e) => void handleCreateRoom(e)}
          className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="sb-host-name" className="text-xs font-semibold text-zinc-200 block">
                Host Display Name
              </label>
              <input
                id="sb-host-name"
                type="text"
                maxLength={32}
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Ethan"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sb-room-title" className="text-xs font-semibold text-zinc-200 block">
                Battle Session Title
              </label>
              <input
                id="sb-room-title"
                type="text"
                maxLength={120}
                required
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="e.g. AP Chemistry Unit 4 Finals Battle"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="sb-questions-json" className="text-xs font-semibold text-zinc-200">
                Study Questions JSON Array{" "}
                <span className="font-mono text-zinc-400">
                  {`([{ question, options, correctIndex }])`}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-mono tabular-nums ${
                    parsedHostQuestions.error ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {parsedHostQuestions.error
                    ? "Invalid JSON"
                    : `${parsedHostQuestions.questions.length} valid questions ready`}
                </span>
                <button
                  type="button"
                  onClick={() => setQuestionsJson(JSON.stringify(SAMPLE_QUESTIONS, null, 2))}
                  className="text-xs font-mono text-purple-400 hover:text-purple-300 cursor-pointer whitespace-nowrap"
                >
                  Load Sample JSON
                </button>
              </div>
            </div>

            <textarea
              id="sb-questions-json"
              rows={9}
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              spellCheck={false}
              className="w-full p-4 bg-zinc-950 border border-white/10 focus:border-purple-400 rounded-xl font-mono text-xs text-zinc-100 leading-relaxed focus:outline-none"
            />
            {parsedHostQuestions.error && (
              <p className="text-xs text-red-400 font-mono">{parsedHostQuestions.error}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
            <label className="inline-flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={joinHostAsPlayer}
                onChange={(e) => setJoinHostAsPlayer(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-400 cursor-pointer"
              />
              <span>Also play along as a contestant on the leaderboard</span>
            </label>

            <button
              type="submit"
              disabled={isBusy || Boolean(parsedHostQuestions.error)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-45 text-zinc-950 font-extrabold text-xs sm:text-sm rounded-xl cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isBusy ? "Creating Room..." : "Create Room"}</span>
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => void handleJoinRoom(e)}
          className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-8 max-w-xl mx-auto space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Join a Live Study Room</h2>
            <p className="text-xs text-zinc-400">
              Enter your display name and the 4-letter uppercase room code from your host.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="sb-player-name" className="text-xs font-semibold text-zinc-200 block">
                Display Name
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
              <label htmlFor="sb-join-code" className="text-xs font-semibold text-zinc-200 block">
                4-Letter Room Code
              </label>
              <input
                id="sb-join-code"
                type="text"
                maxLength={4}
                required
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))
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
            <span>{isBusy ? "Joining Lobby..." : "Join Live Lobby"}</span>
          </button>
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
