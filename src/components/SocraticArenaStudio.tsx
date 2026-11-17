import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  Loader2,
  MessageSquareQuote,
  Plus,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  SocraticRubric,
  SocraticSession,
  SocraticTurn,
  StudyDeck,
} from "../types";
import {
  appendTelemetrySession,
  loadSocraticSessions,
  saveSocraticSession,
} from "../utils/fsrsEngine";
import { postJsonOrNdjson } from "../utils/streamFetch";
import { BUTTON_TAP, PANEL_FADE, SPRING_HUD } from "../utils/motionPresets";

interface SocraticArenaStudioProps {
  activeDeck: StudyDeck | null;
  onTelemetryChange: () => void;
}

const DEVELYN_PROMPTS = [
  {
    label: "AP Gov · Federalist No. 10 & 51",
    prompt:
      "Evaluate Madison's argument in Federalist No. 10 and No. 51 that an extended republic and ambition counteracting ambition neutralize tyranny better than pure direct democracy.",
  },
  {
    label: "Honors Lit · Classical Tragedy & Hubris",
    prompt:
      "Analyze how tragic hamartia operates not merely as a moral flaw but as a structural collision between civic duty and individual pride.",
  },
  {
    label: "APUSH · Constitutional Compromises",
    prompt:
      "Assess the extent to which the Compromise of 1850 delayed or accelerated the constitutional crisis over slavery's expansion.",
  },
  {
    label: "AP Lang · Rhetorical Appeals & Concessions",
    prompt:
      "Defend how strategic counterargument concession strengthens logos and ethos more effectively than one-sided polemic.",
  },
];

export default function SocraticArenaStudio({
  activeDeck,
  onTelemetryChange,
}: SocraticArenaStudioProps) {
  const [sessions, setSessions] = useState<SocraticSession[]>([]);
  const [topicPrompt, setTopicPrompt] = useState<string>(DEVELYN_PROMPTS[0].prompt);
  const [thesisStatement, setThesisStatement] = useState<string>("");
  const [turns, setTurns] = useState<SocraticTurn[]>([]);
  const [latestRubric, setLatestRubric] = useState<SocraticRubric | undefined>(
    undefined
  );
  const [studentInput, setStudentInput] = useState("");
  const [sessionId, setSessionId] = useState<string>(() => `soc-${Date.now()}`);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadSocraticSessions());
  }, []);

  useEffect(() => {
    if (activeDeck && turns.length === 0) {
      setTopicPrompt(
        `In ${activeDeck.courseName}, defend a core causal thesis connecting ${
          activeDeck.units?.[0] || "the foundational principles"
        } to ${activeDeck.units?.[1] || "cumulative exam synthesis"}, citing specific evidence or theorems.`
      );
    }
  }, [activeDeck?.id]);

  const startFreshSession = (customPrompt?: string) => {
    setSessionId(`soc-${Date.now()}`);
    if (customPrompt) setTopicPrompt(customPrompt);
    setThesisStatement("");
    setTurns([]);
    setLatestRubric(undefined);
    setStudentInput("");
    setError(null);
  };

  const loadExistingSession = (s: SocraticSession) => {
    setSessionId(s.id);
    setTopicPrompt(s.topicPrompt);
    setThesisStatement(s.thesisStatement);
    setTurns(s.turns);
    setLatestRubric(s.latestRubric);
    setError(null);
  };

  const handleSubmitTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInput.trim() || !topicPrompt.trim()) return;

    const cleanInput = studentInput.trim();
    const studentTurn: SocraticTurn = {
      id: `st-${Date.now()}`,
      role: "student",
      content: cleanInput,
      timestamp: new Date().toISOString(),
    };

    const nextTurns = [...turns, studentTurn];
    setTurns(nextTurns);
    setStudentInput("");
    setIsSending(true);
    setError(null);

    try {
      const result = await postJsonOrNdjson<any>(
        "/api/socratic-turn",
        {
          courseCode: activeDeck?.courseCode || "HUMANITIES",
          courseName: activeDeck?.courseName || "D'Evelyn Honors Seminar",
          topicPrompt: topicPrompt.trim(),
          thesisStatement: thesisStatement.trim(),
          history: turns,
          studentMessage: cleanInput,
        },
        { timeoutMs: 45_000 }
      );

      const moderatorTurn: SocraticTurn = {
        id: `mod-${Date.now()}`,
        role: "moderator",
        content: result.moderatorReply,
        challengeType: result.challengeType,
        probingQuestion: result.probingQuestion,
        textualEvidenceCheck: result.textualEvidenceCheck,
        rubric: result.rubric,
        feedbackBullets: result.feedbackBullets,
        timestamp: new Date().toISOString(),
      };

      const fullTurns = [...nextTurns, moderatorTurn];
      setTurns(fullTurns);
      setLatestRubric(result.rubric);

      const updatedSession: SocraticSession = {
        id: sessionId,
        courseCode: activeDeck?.courseCode || "SEMINAR",
        courseName: activeDeck?.courseName || "D'Evelyn Socratic Seminar",
        topicPrompt: topicPrompt.trim(),
        thesisStatement: thesisStatement.trim(),
        turns: fullTurns,
        latestRubric: result.rubric,
        updatedAt: new Date().toISOString(),
      };

      const savedList = saveSocraticSession(updatedSession);
      setSessions(savedList);

      appendTelemetrySession({
        mode: "socratic",
        courseCode: activeDeck?.courseCode || "SEMINAR",
        accuracyPct: result.rubric?.overallScore || 70,
        avgLatencyMs: 8000,
        conceptsReviewed: 1,
        xpEarned: Math.max(15, Math.round((result.rubric?.overallScore || 60) / 2.5)),
      });
      onTelemetryChange();
    } catch (err: any) {
      setError(err?.message || "Socratic moderator request failed. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const rubricAxes = [
    { label: "Claim & Thesis Defensibility", value: latestRubric?.claimScore ?? 0 },
    { label: "Textual & Primary Evidence", value: latestRubric?.evidenceScore ?? 0 },
    { label: "Logical Reasoning & Causation", value: latestRubric?.reasoningScore ?? 0 },
    { label: "Counterargument & Synthesis", value: latestRubric?.counterargumentScore ?? 0 },
  ];

  return (
    <motion.div
      variants={PANEL_FADE}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left Column: Seminar Thread & Argument Input */}
      <div className="lg:col-span-8 space-y-5">
        <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-mono text-emerald-400">
                Bozz GPT Seminar Moderator · AP &amp; Honors Rubric
              </div>
              <h2 className="font-display text-xl font-bold text-white tracking-tight mt-0.5">
                Thesis Defense &amp; Evidence Arena
              </h2>
            </div>

            <button
              type="button"
              onClick={() => startFreshSession()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 text-purple-400" />
              <span>New Seminar</span>
            </button>
          </div>

          {/* Preset Prompts */}
          <div className="flex flex-wrap gap-2">
            {DEVELYN_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => startFreshSession(item.prompt)}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-white/10 hover:border-purple-400/50 rounded-lg text-[11px] font-mono text-zinc-300 cursor-pointer transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Prompt & Thesis Inputs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Seminar Question / Essay Prompt
              </label>
              <textarea
                rows={2}
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                className="w-full p-3 bg-zinc-950 border border-white/10 focus:border-purple-400 rounded-xl text-xs text-zinc-100 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Working Thesis Statement (Optional)
              </label>
              <input
                type="text"
                value={thesisStatement}
                onChange={(e) => setThesisStatement(e.target.value)}
                placeholder="State your defensible line of reasoning before entering the seminar..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Debate Transcript */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {turns.length === 0 ? (
              <div className="p-6 bg-zinc-950/70 border border-white/10 rounded-xl text-center space-y-1.5">
                <MessageSquareQuote className="h-6 w-6 text-purple-400 mx-auto" />
                <p className="text-xs text-zinc-300 font-medium">
                  Present your opening argument with textual or historical evidence below.
                </p>
                <p className="text-[11px] text-zinc-500">
                  The moderator will challenge weak assumptions and grade your defense against an AP/Honors 100-point rubric.
                </p>
              </div>
            ) : (
              turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 ${
                    turn.role === "student"
                      ? "bg-zinc-950 border-white/10 text-zinc-100 ml-6"
                      : "bg-purple-950/20 border-purple-400/35 text-zinc-100 mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span
                      className={
                        turn.role === "student"
                          ? "text-emerald-400 font-bold"
                          : "text-purple-300 font-bold"
                      }
                    >
                      {turn.role === "student"
                        ? "Student Argument"
                        : `Moderator · ${turn.challengeType || "Cross-Examination"}`}
                    </span>
                    {turn.rubric && (
                      <span className="text-amber-300 font-bold tabular-nums">
                        Score: {turn.rubric.overallScore}/100
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-200 whitespace-pre-wrap">{turn.content}</p>

                  {turn.probingQuestion && (
                    <div className="p-3 bg-zinc-950/90 border border-white/10 rounded-lg space-y-1">
                      <div className="font-mono text-[11px] text-amber-400 font-semibold">
                        Moderator Challenge Question
                      </div>
                      <p className="text-zinc-100 font-medium">{turn.probingQuestion}</p>
                    </div>
                  )}

                  {turn.textualEvidenceCheck && (
                    <div className="flex items-start gap-2 text-[11px] text-zinc-400">
                      <ShieldAlert className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>Evidence Check: {turn.textualEvidenceCheck}</span>
                    </div>
                  )}

                  {turn.feedbackBullets && turn.feedbackBullets.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-300">
                      {turn.feedbackBullets.map((fb, idx) => (
                        <li key={idx}>{fb}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSubmitTurn} className="space-y-3 pt-2 border-t border-white/10">
            <textarea
              rows={3}
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="Write your thesis defense, textual citation, or rebuttal to the moderator..."
              className="w-full p-3.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-zinc-500">
                Cite specific authors, articles, chapters, or mechanisms for top scores.
              </span>
              <motion.button
                type="submit"
                whileTap={BUTTON_TAP}
                disabled={isSending || !studentInput.trim() || !topicPrompt.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Moderating...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Defense</span>
                  </>
                )}
              </motion.button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right Column: Live 4-Axis AP/Honors Rubric + Saved Seminars */}
      <aside className="lg:col-span-4 space-y-5">
        <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-display text-sm font-bold text-white">
              AP / Honors Thesis Rubric
            </h3>
            <span className="font-mono text-base font-extrabold text-emerald-400 tabular-nums">
              {latestRubric ? `${latestRubric.overallScore}/100` : "--/100"}
            </span>
          </div>

          <div className="space-y-3.5">
            {rubricAxes.map((axis) => (
              <div key={axis.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{axis.label}</span>
                  <span className="font-mono font-bold text-purple-400 tabular-nums">
                    {axis.value}/25
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(axis.value / 25) * 100}%` }}
                    transition={SPRING_HUD}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-white border-b border-white/10 pb-2.5">
            Recent Seminar Logs ({sessions.length})
          </h3>
          {sessions.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Completed seminar exchanges are persisted here automatically.
            </p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadExistingSession(s)}
                  className="w-full text-left p-3 bg-zinc-950/75 hover:bg-zinc-900 border border-white/10 rounded-xl space-y-1 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-purple-400">{s.courseCode}</span>
                    <span className="text-emerald-400 tabular-nums">
                      {s.latestRubric ? `${s.latestRubric.overallScore}/100` : "Draft"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 line-clamp-2">{s.topicPrompt}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </motion.div>
  );
}
