"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Lock, ShieldCheck, Users } from "lucide-react";
import {
  StudyAnswerDocument,
  StudyPlayerDocument,
  StudyRoomDocument,
} from "./types";

interface QuestionArenaProps {
  room: StudyRoomDocument;
  players: StudyPlayerDocument[];
  answers: StudyAnswerDocument[];
  currentPlayerId: string;
  isHost: boolean;
  isActionBusy: boolean;
  onSelectAnswer: (optionIndex: number) => Promise<void>;
  onHostLockAndScore: () => Promise<void>;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export default function QuestionArena({
  room,
  players,
  answers,
  currentPlayerId,
  isHost,
  isActionBusy,
  onSelectAnswer,
  onHostLockAndScore,
}: QuestionArenaProps) {
  const currentQuestion = room.questions[room.currentQuestionIndex];
  const durationSec = room.questionDurationSec || 15;

  const [secondsLeft, setSecondsLeft] = useState<number>(durationSec);
  const [submittingIndex, setSubmittingIndex] = useState<number | null>(null);
  const autoLockedQuestionRef = useRef<number | null>(null);

  const myAnswer = useMemo(
    () =>
      answers.find(
        (a) =>
          a.questionIndex === room.currentQuestionIndex &&
          a.playerId === currentPlayerId
      ),
    [answers, room.currentQuestionIndex, currentPlayerId]
  );

  const isParticipant = useMemo(
    () => players.some((p) => p.playerId === currentPlayerId),
    [players, currentPlayerId]
  );

  const roundAnswersCount = useMemo(() => {
    const uniquePlayers = new Set(
      answers
        .filter((a) => a.questionIndex === room.currentQuestionIndex)
        .map((a) => a.playerId)
    );
    return uniquePlayers.size;
  }, [answers, room.currentQuestionIndex]);

  const allPlayersAnswered =
    players.length > 0 && roundAnswersCount >= players.length;

  // Synchronized 15-second countdown derived from questionStartedAtMs
  useEffect(() => {
    autoLockedQuestionRef.current = null;

    const updateCountdown = () => {
      const elapsedSec = Math.max(
        0,
        (Date.now() - room.questionStartedAtMs) / 1000
      );
      const remaining = Math.max(0, Math.min(durationSec, durationSec - elapsedSec));
      setSecondsLeft(remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 100);
    return () => clearInterval(timer);
  }, [room.currentQuestionIndex, room.questionStartedAtMs, durationSec]);

  // Host-authoritative auto-lock when timer expires or everyone has answered
  useEffect(() => {
    if (!isHost || room.answersLocked || room.status !== "question") return;
    if (autoLockedQuestionRef.current === room.currentQuestionIndex) return;

    if (secondsLeft <= 0 || allPlayersAnswered) {
      autoLockedQuestionRef.current = room.currentQuestionIndex;
      void onHostLockAndScore();
    }
  }, [
    isHost,
    room.answersLocked,
    room.status,
    room.currentQuestionIndex,
    secondsLeft,
    allPlayersAnswered,
    onHostLockAndScore,
  ]);

  if (!currentQuestion) return null;

  const progressPct = Math.max(0, Math.min(100, (secondsLeft / durationSec) * 100));
  const isUrgent = secondsLeft <= 5;
  const isLocked = room.answersLocked || secondsLeft <= 0 || Boolean(myAnswer);
  const potentialPoints = Math.round(500 + 500 * (secondsLeft / durationSec));

  const handleChoose = async (idx: number) => {
    if (!isParticipant || isLocked || submittingIndex !== null) return;
    setSubmittingIndex(idx);
    try {
      await onSelectAnswer(idx);
    } finally {
      setSubmittingIndex(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Round Telemetry Bar */}
      <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 tabular-nums">
            <span className="text-purple-400 font-semibold">
              Question {room.currentQuestionIndex + 1} / {room.questions.length}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              {roundAnswersCount} / {players.length} answered
            </span>
            {currentQuestion.unitTag && (
              <>
                <span className="text-zinc-600 hidden sm:inline">·</span>
                <span className="text-zinc-400 hidden sm:inline truncate max-w-[200px]">
                  {currentQuestion.unitTag}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 font-mono tabular-nums">
            {!myAnswer && isParticipant && (
              <span className="text-xs text-emerald-400">
                Up to {potentialPoints} pts
              </span>
            )}
            <div
              className={`inline-flex items-center gap-1.5 text-lg font-extrabold ${
                isUrgent ? "text-red-400" : "text-white"
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>{Math.ceil(secondsLeft)}s</span>
            </div>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              isUrgent
                ? "bg-red-500"
                : "bg-gradient-to-r from-purple-500 to-emerald-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question Prompt Card */}
      <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-mono text-zinc-400">
            Room {room.roomCode} · Live Active Recall
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
            {currentQuestion.question}
          </h2>
        </div>

        {/* 4 Multiple-Choice Answer Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentQuestion.options.slice(0, 4).map((optionText, idx) => {
            const isSelected = myAnswer?.selectedIndex === idx;
            const isSubmitting = submittingIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isParticipant || isLocked || submittingIndex !== null}
                onClick={() => void handleChoose(idx)}
                className={`group text-left min-h-[64px] p-4 rounded-xl border transition-all duration-150 flex items-center gap-3.5 ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/10"
                    : isLocked || !isParticipant
                    ? "bg-zinc-950/60 border-white/10 text-zinc-400 cursor-not-allowed opacity-75"
                    : "bg-zinc-950 hover:bg-zinc-900 border-white/15 hover:border-purple-400 text-zinc-100 cursor-pointer active:scale-[0.99]"
                }`}
              >
                <span
                  className={`h-9 w-9 rounded-lg font-mono text-sm font-bold flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-emerald-400 text-zinc-950"
                      : "bg-zinc-900 border border-white/10 text-purple-300 group-hover:border-purple-400"
                  }`}
                >
                  {OPTION_LETTERS[idx]}
                </span>
                <span className="text-sm font-medium leading-snug flex-1">
                  {optionText}
                </span>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                )}
                {isSubmitting && (
                  <span className="text-xs font-mono text-emerald-400 shrink-0">
                    Saving...
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Footer + Host Authoritative Override */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
            {myAnswer ? (
              <>
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">
                  Answer Locked In · Waiting for round grading
                </span>
              </>
            ) : !isParticipant ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>Host Spectating Mode · Players answering live</span>
              </>
            ) : (
              <span>Select the fastest accurate option to maximize speed points (max 1,000 pts).</span>
            )}
          </div>

          {isHost && (
            <button
              type="button"
              disabled={isActionBusy}
              onClick={() => void onHostLockAndScore()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isActionBusy ? "Scoring Round..." : "Lock & Score Round"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
