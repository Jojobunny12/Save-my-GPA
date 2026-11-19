"use client";

import React from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { StudyPlayerDocument, StudyRoomDocument } from "./types";

interface PodiumLeaderboardProps {
  room: StudyRoomDocument;
  players: StudyPlayerDocument[];
  currentPlayerId: string;
  isHost: boolean;
  isActionBusy: boolean;
  onHostAdvance: () => Promise<void>;
  onResetToHub: () => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export default function PodiumLeaderboard({
  room,
  players,
  currentPlayerId,
  isHost,
  isActionBusy,
  onHostAdvance,
  onResetToHub,
}: PodiumLeaderboardProps) {
  const isFinished = room.status === "finished";
  const currentQuestion = room.questions[room.currentQuestionIndex];
  const isLastQuestion = room.currentQuestionIndex + 1 >= room.questions.length;

  const sortedPlayers = [...players].sort(
    (a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName)
  );

  const first = sortedPlayers[0] || null;
  const second = sortedPlayers[1] || null;
  const third = sortedPlayers[2] || null;
  const myPlayer = sortedPlayers.find((p) => p.playerId === currentPlayerId);
  const myRank = sortedPlayers.findIndex((p) => p.playerId === currentPlayerId) + 1;

  return (
    <div className="space-y-6">
      {/* Top Round Result or Final Podium Banner */}
      <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 md:p-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-purple-400">
              {isFinished
                ? `Final Results · Room ${room.roomCode}`
                : `Round ${room.currentQuestionIndex + 1} of ${room.questions.length} Complete`}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="h-6 w-6 text-emerald-400 shrink-0" />
              <span>{isFinished ? "Final Study Battle Podium" : "Live Standings"}</span>
            </h2>
          </div>

          {myPlayer && (
            <div className="px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl font-mono text-xs tabular-nums flex items-center gap-4">
              <div>
                <div className="text-[11px] text-zinc-400">Your Rank</div>
                <div className="text-base font-bold text-white">#{myRank}</div>
              </div>
              <div className="h-7 w-px bg-white/10" />
              <div>
                <div className="text-[11px] text-zinc-400">Total Score</div>
                <div className="text-base font-bold text-emerald-400">
                  {myPlayer.score.toLocaleString()}
                </div>
              </div>
              {!isFinished && (
                <>
                  <div className="h-7 w-px bg-white/10" />
                  <div className="inline-flex items-center gap-1.5">
                    {myPlayer.lastAnswerCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span
                      className={
                        myPlayer.lastAnswerCorrect
                          ? "text-emerald-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {myPlayer.lastAnswerCorrect
                        ? `+${myPlayer.lastPointsEarned} pts`
                        : "0 pts"}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Correct Answer Reveal between rounds */}
        {!isFinished && currentQuestion && (
          <div className="p-4 bg-zinc-950/90 border border-emerald-400/30 rounded-xl space-y-1.5">
            <div className="text-xs font-mono text-emerald-400 font-semibold">
              Correct Answer · Option {OPTION_LETTERS[currentQuestion.correctIndex]}
            </div>
            <p className="text-sm font-semibold text-white">
              {currentQuestion.options[currentQuestion.correctIndex]}
            </p>
            {currentQuestion.explanation && (
              <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {/* Top 3 Podium Pedestals */}
        {sortedPlayers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-3">
            {/* #2 Place */}
            <div className="order-2 sm:order-1 bg-zinc-950/85 border border-purple-400/35 rounded-2xl p-4 text-center space-y-2 sm:min-h-[140px] flex flex-col justify-center">
              <div className="text-xs font-mono font-bold text-purple-300">
                2nd Place
              </div>
              {second ? (
                <>
                  <div className="text-base font-bold text-white truncate">
                    {second.displayName}
                  </div>
                  <div className="font-mono text-xl font-extrabold text-purple-400 tabular-nums">
                    {second.score.toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="text-xs font-mono text-zinc-500">Open Spot</div>
              )}
            </div>

            {/* #1 Place */}
            <div className="order-1 sm:order-2 bg-gradient-to-b from-emerald-500/20 to-zinc-950 border border-emerald-400/60 rounded-2xl p-5 text-center space-y-2 sm:min-h-[172px] flex flex-col justify-center shadow-lg shadow-emerald-500/10">
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                <Award className="h-4 w-4" />
                <span>1st Place</span>
              </div>
              {first ? (
                <>
                  <div className="text-lg font-extrabold text-white truncate">
                    {first.displayName}
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-emerald-400 tabular-nums">
                    {first.score.toLocaleString()}
                  </div>
                  {first.streak >= 2 && (
                    <div className="inline-flex items-center justify-center gap-1 text-[11px] font-mono text-zinc-300">
                      <Flame className="h-3.5 w-3.5 text-amber-400" />
                      <span>{first.streak} streak</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs font-mono text-zinc-500">No Players</div>
              )}
            </div>

            {/* #3 Place */}
            <div className="order-3 bg-zinc-950/85 border border-white/15 rounded-2xl p-4 text-center space-y-2 sm:min-h-[124px] flex flex-col justify-center">
              <div className="text-xs font-mono font-bold text-zinc-300">
                3rd Place
              </div>
              {third ? (
                <>
                  <div className="text-base font-bold text-white truncate">
                    {third.displayName}
                  </div>
                  <div className="font-mono text-xl font-extrabold text-zinc-200 tabular-nums">
                    {third.score.toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="text-xs font-mono text-zinc-500">Open Spot</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Ranked Standings Table */}
      <div className="bg-[#0B0B10]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white">Full Player Standings</h3>
          <span className="text-xs font-mono text-zinc-400 tabular-nums">
            {sortedPlayers.length} {sortedPlayers.length === 1 ? "player" : "players"}
          </span>
        </div>

        {sortedPlayers.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            No contestants joined this session.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedPlayers.map((player, idx) => {
              const isMe = player.playerId === currentPlayerId;
              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border ${
                    isMe
                      ? "bg-purple-500/15 border-purple-400/50"
                      : "bg-zinc-950/80 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-400 w-7 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {player.displayName}
                        {isMe ? " (You)" : ""}
                        {player.isHost ? " · Host" : ""}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 tabular-nums">
                        <span>Streak: {player.streak}</span>
                        {!isFinished && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                player.lastAnswerCorrect
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {player.lastAnswerCorrect
                                ? `CORRECT (+${player.lastPointsEarned})`
                                : "MISSED (+0)"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono text-base font-extrabold text-emerald-400 tabular-nums shrink-0">
                    {player.score.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Host Advance or End Controls */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          {isFinished ? (
            <>
              <span className="text-xs font-mono text-zinc-400">
                Session complete. Ready for another Study Battle?
              </span>
              <button
                type="button"
                onClick={onResetToHub}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Play or Host New Battle</span>
              </button>
            </>
          ) : isHost ? (
            <>
              <span className="text-xs font-mono text-zinc-400">
                Host control: advance all connected players to the next phase.
              </span>
              <button
                type="button"
                disabled={isActionBusy}
                onClick={() => void onHostAdvance()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              >
                <span>
                  {isActionBusy
                    ? "Syncing..."
                    : isLastQuestion
                    ? "Show Final Podium"
                    : `Next Question (${room.currentQuestionIndex + 2}/${room.questions.length})`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="text-xs font-mono text-purple-300">
              Waiting for host ({room.hostName}) to advance to the next round...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
