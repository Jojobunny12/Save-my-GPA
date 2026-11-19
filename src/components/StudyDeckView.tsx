import React, { useState } from "react";
import { motion } from "motion/react";
import { StudyDeck, QuizQuestion, WorkspaceRoute } from "../types";
import { deduceCourse } from "../utils/courseDeducer";
import { downloadMockExamPdf } from "../utils/pdfExporter";
import { postJsonOrNdjson } from "../utils/streamFetch";
import { cleanMathFormula } from "../utils/mathFormat";
import {
  appendTelemetrySession,
  recordQuestionOutcome,
} from "../utils/fsrsEngine";
import { SPRING_CARD_FLIP } from "../utils/motionPresets";
import {
  FileText,
  Calendar,
  Layers,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  Bookmark,
  HelpCircle,
  Sparkles,
  Loader2,
  FileDown,
  Download,
  CheckCircle2,
  Lightbulb,
  Scissors,
  BookOpen,
  BarChart2,
  AlertCircle,
  Search,
  Palette,
  Swords,
  GitBranch,
} from "lucide-react";

interface StudyDeckViewProps {
  deck: StudyDeck;
  initialTab?: "summary" | "timeline" | "flashcards" | "quiz";
  redBlueMemoryTint?: boolean;
  onToggleRedBlueTint?: () => void;
  onBack: () => void;
  onUpdateDeck?: (updatedDeck: StudyDeck) => void;
  onTelemetryChange?: () => void;
  onNavigateModule?: (route: WorkspaceRoute) => void;
}

export default function StudyDeckView({
  deck,
  initialTab = "summary",
  redBlueMemoryTint = true,
  onToggleRedBlueTint,
  onBack,
  onUpdateDeck,
  onTelemetryChange,
  onNavigateModule,
}: StudyDeckViewProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "timeline" | "flashcards" | "quiz">(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const flashcards = deck.flashcards || [];
  const timeline = deck.timeline || [];
  const topTips = deck.summary?.topTipsForFinal || [];

  const organizedQuiz = React.useMemo(() => {
    return [...(deck.quiz || [])];
  }, [deck.quiz]);

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<number[]>([]);

  // Quiz state
  const [submittedQuiz, setSubmittedQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Study Hints / Lifelines state
  const [lifelines, setLifelines] = useState({
    autoSolve: 1,
    fiftyFifty: 2,
    explanationHint: 1,
    classPoll: 2,
  });
  const [eliminatedOptions, setEliminatedOptions] = useState<{ [key: number]: number[] }>({});
  const [crowdPollResult, setCrowdPollResult] = useState<{ [key: number]: { [optIdx: number]: number } }>({});

  // Interactive Matching Mode states
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [matchingAnswers, setMatchingAnswers] = useState<{ [qIdx: number]: string }>({});
  const [matchedCardUids, setMatchedCardUids] = useState<{ [qIdx: number]: string }>({});
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);
  const [matchingSearchQuery, setMatchingSearchQuery] = useState("");
  const [wrongAttemptAnswer, setWrongAttemptAnswer] = useState<string | null>(null);
  const [itemFocusTime, setItemFocusTime] = useState<number>(Date.now());

  // AI More Questions state
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setMasteredCards([]);
    setSubmittedQuiz(false);
    setQuizScore(0);
    setEliminatedOptions({});
    setCrowdPollResult({});
    setCurrentSectionIndex(0);
    setMatchingAnswers({});
    setMatchedCardUids({});
    setFocusedRowIdx(null);
    setMatchingSearchQuery("");
    setWrongAttemptAnswer(null);
    setGeneratorError(null);
    setItemFocusTime(Date.now());
  }, [deck.id]);

  // PDF Export Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [includeKeyInPdf, setIncludeKeyInPdf] = useState(true);
  const [includeBubbleInPdf, setIncludeBubbleInPdf] = useState(true);
  const [includeExplanationsInPdf, setIncludeExplanationsInPdf] = useState(true);
  const [pdfExportSuccess, setPdfExportSuccess] = useState(false);

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      downloadMockExamPdf(deck, organizedQuiz, {
        includeAnswerKey: includeKeyInPdf,
        includeBubbleSheet: includeBubbleInPdf,
        includeExplanations: includeExplanationsInPdf,
      });
      setPdfExportSuccess(true);
      setTimeout(() => setPdfExportSuccess(false), 3500);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleGenerateMoreQuestions = async () => {
    setIsGeneratingMore(true);
    setGeneratorError(null);
    try {
      const courseMeta = deduceCourse(deck.courseCode || "");
      const data = await postJsonOrNdjson<{ quiz: QuizQuestion[] }>(
        "/api/generate-more-questions",
        {
          courseCode: deck.courseCode,
          courseName: deck.courseName,
          department: courseMeta.department,
          curriculumDetails: courseMeta.curriculumDetails,
          examFocus: courseMeta.examFocus,
          units: deck.units && deck.units.length > 0 ? deck.units : courseMeta.units,
          existingQuestions: deck.quiz || [],
        },
        { timeoutMs: 120_000 }
      );

      if (!data || !data.quiz || !Array.isArray(data.quiz) || data.quiz.length === 0) {
        throw new Error("No additional questions were generated by live AI. Please try again.");
      }

      const updatedQuiz = [...(deck.quiz || []), ...data.quiz];
      const updatedDeck = { ...deck, quiz: updatedQuiz };
      onUpdateDeck?.(updatedDeck);

      const startOfNewQuestions = (deck.quiz || []).length;
      const newSectionIndex = Math.floor(startOfNewQuestions / 10);

      setMatchingAnswers({});
      setMatchedCardUids({});
      setCurrentSectionIndex(newSectionIndex);
      setFocusedRowIdx(startOfNewQuestions);
      setSubmittedQuiz(false);
      setQuizScore(0);
      setEliminatedOptions({});
      setCrowdPollResult({});
      setWrongAttemptAnswer(null);
      setItemFocusTime(Date.now());
    } catch (err: any) {
      console.error("More questions error:", err);
      setGeneratorError(err?.message || "Failed to generate additional live AI questions. Please try again.");
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleSetSectionIndex = (secIdx: number) => {
    setCurrentSectionIndex(secIdx);
    const start = secIdx * 10;
    const end = Math.min((secIdx + 1) * 10, organizedQuiz.length);
    let firstUnmatched = start;
    for (let i = start; i < end; i++) {
      if (!matchingAnswers[i]) {
        firstUnmatched = i;
        break;
      }
    }
    setFocusedRowIdx(firstUnmatched);
    setWrongAttemptAnswer(null);
    setMatchingSearchQuery("");
    setItemFocusTime(Date.now());
  };

  const toggleMastered = (index: number) => {
    if (masteredCards.includes(index)) {
      setMasteredCards(masteredCards.filter((i) => i !== index));
    } else {
      setMasteredCards([...masteredCards, index]);
    }
  };

  const submitQuiz = () => {
    let score = 0;
    organizedQuiz.forEach((q, idx) => {
      const userMatched = matchingAnswers[idx];
      const correctVal = q.options[q.correctIndex];
      if (userMatched === correctVal) {
        score++;
      }
    });
    setQuizScore(score);
    setSubmittedQuiz(true);

    const acc = organizedQuiz.length > 0 ? Math.round((score / organizedQuiz.length) * 100) : 0;
    appendTelemetrySession({
      mode: "exam",
      courseCode: deck.courseCode,
      accuracyPct: acc,
      avgLatencyMs: 6000,
      conceptsReviewed: Object.keys(matchingAnswers).length,
      xpEarned: score * 12,
    });
    onTelemetryChange?.();
  };

  const resetQuiz = () => {
    setMatchingAnswers({});
    setMatchedCardUids({});
    setFocusedRowIdx(null);
    setCurrentSectionIndex(0);
    setMatchingSearchQuery("");
    setWrongAttemptAnswer(null);
    setSubmittedQuiz(false);
    setQuizScore(0);
    setEliminatedOptions({});
    setCrowdPollResult({});
    setItemFocusTime(Date.now());
    setLifelines({
      autoSolve: 1,
      fiftyFifty: 2,
      explanationHint: 1,
      classPoll: 2,
    });
  };

  const calculatedMemoryPct = React.useMemo(() => {
    const totalMatchItems = Object.keys(matchingAnswers).length;
    let correctCount = 0;
    organizedQuiz.forEach((q, idx) => {
      if (matchingAnswers[idx] === q.options[q.correctIndex]) {
        correctCount++;
      }
    });

    const baseContribution = 50 + (masteredCards.length / (flashcards.length || 1)) * 20;
    const evaluationContribution = submittedQuiz
      ? (correctCount / (organizedQuiz.length || 1)) * 30
      : (totalMatchItems / (organizedQuiz.length || 1)) * 15;
    return Math.round(Math.min(100, baseContribution + evaluationContribution));
  }, [matchingAnswers, masteredCards.length, flashcards.length, submittedQuiz, organizedQuiz]);

  const activeMatchingIdx = React.useMemo(() => {
    return focusedRowIdx !== null &&
      focusedRowIdx >= currentSectionIndex * 10 &&
      focusedRowIdx < (currentSectionIndex + 1) * 10
      ? focusedRowIdx
      : currentSectionIndex * 10;
  }, [focusedRowIdx, currentSectionIndex]);

  const placeMatchingAnswer = (qIdx: number, answerText: string, cardUid?: string) => {
    if (submittedQuiz) return;
    const updatedAnswers = { ...matchingAnswers };
    const updatedUids = { ...matchedCardUids };

    if (cardUid) {
      for (const key in updatedUids) {
        if (updatedUids[key] === cardUid) {
          const oldRow = Number(key);
          delete updatedUids[oldRow];
          delete updatedAnswers[oldRow];
        }
      }
      updatedUids[qIdx] = cardUid;
    } else {
      for (const key in updatedAnswers) {
        if (updatedAnswers[key] === answerText) {
          const oldRow = Number(key);
          delete updatedAnswers[oldRow];
          delete updatedUids[oldRow];
        }
      }
    }

    updatedAnswers[qIdx] = answerText;
    setMatchingAnswers(updatedAnswers);
    setMatchedCardUids(updatedUids);
  };

  const clearMatchingAnswer = (qIdx: number) => {
    if (submittedQuiz) return;
    const updatedAnswers = { ...matchingAnswers };
    const updatedUids = { ...matchedCardUids };
    delete updatedAnswers[qIdx];
    delete updatedUids[qIdx];
    setMatchingAnswers(updatedAnswers);
    setMatchedCardUids(updatedUids);
  };

  const findMatchedRowForCard = (cardUid: string, answerText: string) => {
    const startIdx = currentSectionIndex * 10;
    const endIdx = Math.min((currentSectionIndex + 1) * 10, organizedQuiz.length);
    for (let i = startIdx; i < endIdx; i++) {
      if (matchedCardUids[i] === cardUid) return i;
      if (!matchedCardUids[i] && matchingAnswers[i] === answerText) return i;
    }
    return null;
  };

  const handleSelectCard = (card: { uid: string; qIdx: number; text: string }) => {
    const answerText = card.text;
    let targetIdx = focusedRowIdx;
    const startIdx = currentSectionIndex * 10;
    const endIdx = Math.min((currentSectionIndex + 1) * 10, organizedQuiz.length);

    if (targetIdx === null) {
      for (let i = startIdx; i < endIdx; i++) {
        if (!matchingAnswers[i]) {
          targetIdx = i;
          break;
        }
      }
    }
    if (targetIdx === null) targetIdx = startIdx;

    const activeQuestion = organizedQuiz[targetIdx];
    if (!activeQuestion) return;
    const correctAnsText = activeQuestion.options[activeQuestion.correctIndex];
    const latencyMs = Math.max(400, Date.now() - itemFocusTime);

    if (answerText === correctAnsText) {
      setWrongAttemptAnswer(null);
      placeMatchingAnswer(targetIdx, answerText, card.uid);
      setMatchingSearchQuery("");
      recordQuestionOutcome(
        deck,
        targetIdx,
        activeQuestion.question,
        correctAnsText,
        activeQuestion.unitTag,
        activeQuestion.tier,
        true,
        latencyMs
      );
      onTelemetryChange?.();

      let nextEmptyIdx: number | null = null;
      for (let i = targetIdx + 1; i < endIdx; i++) {
        if (!matchingAnswers[i]) {
          nextEmptyIdx = i;
          break;
        }
      }
      if (nextEmptyIdx === null) {
        for (let i = startIdx; i < targetIdx; i++) {
          if (!matchingAnswers[i]) {
            nextEmptyIdx = i;
            break;
          }
        }
      }

      if (nextEmptyIdx !== null) {
        setFocusedRowIdx(nextEmptyIdx);
      } else if (currentSectionIndex < Math.ceil(organizedQuiz.length / 10) - 1) {
        const nextSecIdx = currentSectionIndex + 1;
        setCurrentSectionIndex(nextSecIdx);
        const startOfNext = nextSecIdx * 10;
        const endOfNext = Math.min((nextSecIdx + 1) * 10, organizedQuiz.length);
        let targetForNext = startOfNext;
        for (let j = startOfNext; j < endOfNext; j++) {
          if (!matchingAnswers[j]) {
            targetForNext = j;
            break;
          }
        }
        setFocusedRowIdx(targetForNext);
      } else {
        setFocusedRowIdx(targetIdx);
      }
      setItemFocusTime(Date.now());
    } else {
      setWrongAttemptAnswer(answerText);
      recordQuestionOutcome(
        deck,
        targetIdx,
        activeQuestion.question,
        correctAnsText,
        activeQuestion.unitTag,
        activeQuestion.tier,
        false,
        latencyMs
      );
      onTelemetryChange?.();
    }
  };

  const scrambledSectionOptions = React.useMemo(() => {
    const startIdx = currentSectionIndex * 10;
    const endIdx = Math.min((currentSectionIndex + 1) * 10, organizedQuiz.length);
    const correctCards: Array<{ uid: string; qIdx: number; text: string }> = [];
    for (let i = startIdx; i < endIdx; i++) {
      const q = organizedQuiz[i];
      if (q) {
        correctCards.push({
          uid: `opt-${i}`,
          qIdx: i,
          text: q.options[q.correctIndex],
        });
      }
    }
    return [...correctCards].sort((a, b) => b.text.localeCompare(a.text) || a.qIdx - b.qIdx);
  }, [currentSectionIndex, organizedQuiz]);

  const useAutoSolveMatching = (qIdx: number) => {
    if (lifelines.autoSolve <= 0 || submittedQuiz) return;
    const q = organizedQuiz[qIdx];
    if (!q) return;
    placeMatchingAnswer(qIdx, q.options[q.correctIndex], `opt-${qIdx}`);
    setLifelines((prev) => ({ ...prev, autoSolve: prev.autoSolve - 1 }));
  };

  const useFiftyFiftyMatching = (qIdx: number) => {
    if (lifelines.fiftyFifty <= 0 || submittedQuiz) return;
    const q = organizedQuiz[qIdx];
    if (!q) return;
    const correctAnsText = q.options[q.correctIndex];
    const startIdx = currentSectionIndex * 10;
    const endIdx = Math.min((currentSectionIndex + 1) * 10, organizedQuiz.length);
    const incorrectCards: string[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      if (organizedQuiz[i] && i !== qIdx) {
        if (organizedQuiz[i].options[organizedQuiz[i].correctIndex] !== correctAnsText) {
          incorrectCards.push(`opt-${i}`);
        }
      }
    }
    const eliminated = [...incorrectCards].sort(() => 0.5 - Math.random()).slice(0, 2);
    setEliminatedOptions((prev) => ({ ...prev, [qIdx]: eliminated as any }));
    setLifelines((prev) => ({ ...prev, fiftyFifty: prev.fiftyFifty - 1 }));
  };

  const useExplanationHintMatching = (qIdx: number) => {
    if (lifelines.explanationHint <= 0 || submittedQuiz) return;
    setEliminatedOptions((prev) => ({ ...prev, [`leak_${qIdx}` as any]: [1] }));
    setLifelines((prev) => ({ ...prev, explanationHint: prev.explanationHint - 1 }));
  };

  const useClassPollMatching = (qIdx: number) => {
    if (lifelines.classPoll <= 0 || submittedQuiz) return;
    const q = organizedQuiz[qIdx];
    if (!q) return;
    const correctAnsText = q.options[q.correctIndex];
    const startIdx = currentSectionIndex * 10;
    const endIdx = Math.min((currentSectionIndex + 1) * 10, organizedQuiz.length);
    const sectionCards: Array<{ uid: string; text: string }> = [];
    for (let i = startIdx; i < endIdx; i++) {
      if (organizedQuiz[i]) {
        sectionCards.push({
          uid: `opt-${i}`,
          text: organizedQuiz[i].options[organizedQuiz[i].correctIndex],
        });
      }
    }

    const pollResult: { [uid: string]: number } = {};
    let remaining = 100;
    const correctPercent = Math.floor(Math.random() * 20) + 65;
    pollResult[`opt-${qIdx}`] = correctPercent;
    remaining -= correctPercent;

    const remainingChoices = sectionCards.filter((c) => c.uid !== `opt-${qIdx}` && c.text !== correctAnsText);
    remainingChoices.forEach((c, idx) => {
      const isLast = idx === remainingChoices.length - 1;
      if (isLast) {
        pollResult[c.uid] = remaining;
      } else {
        const pct = Math.floor(Math.random() * (remaining / 1.5));
        pollResult[c.uid] = pct;
        remaining -= pct;
      }
    });

    setCrowdPollResult((prev) => ({ ...prev, [qIdx]: pollResult as any }));
    setLifelines((prev) => ({ ...prev, classPoll: prev.classPoll - 1 }));
  };

  const splitQuestionIntoMatchingSections = (questionText: string) => {
    const cleaned = cleanMathFormula(questionText);
    let splitIndex = -1;
    for (const d of ["?", ",", ":", ";"]) {
      const idx = cleaned.indexOf(d);
      if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
        splitIndex = idx + 1;
      }
    }

    if (splitIndex !== -1 && splitIndex > 10 && splitIndex < cleaned.length - 10) {
      return {
        part1: cleaned.substring(0, splitIndex).trim(),
        part2: cleaned.substring(splitIndex).trim(),
      };
    }

    const words = cleaned.split(" ");
    if (words.length <= 4) return { part1: cleaned, part2: "" };
    const mid = Math.ceil(words.length / 2);
    return {
      part1: words.slice(0, mid).join(" "),
      part2: words.slice(mid).join(" "),
    };
  };

  const splitOptionIntoMatchingSections = (optionText: string) => {
    const cleaned = cleanMathFormula(optionText);
    const prefixMatch = cleaned.match(/^([A-D]\))\s*(.*)/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const rest = prefixMatch[2];
      const words = rest.split(" ");
      if (words.length <= 2) return { prefix, part1: rest, part2: "" };
      const mid = Math.ceil(words.length / 2);
      return { prefix, part1: words.slice(0, mid).join(" "), part2: words.slice(mid).join(" ") };
    }

    const words = cleaned.split(" ");
    if (words.length <= 2) return { prefix: "", part1: cleaned, part2: "" };
    const mid = Math.ceil(words.length / 2);
    return { prefix: "", part1: words.slice(0, mid).join(" "), part2: words.slice(mid).join(" ") };
  };

  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-white">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  const renderCheatSheetHTML = (markdown: string) => {
    if (!markdown) return null;
    return markdown.split("\n").map((line, index) => {
      const trimmed = cleanMathFormula(line.trim());
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={index} className="font-display text-sm font-bold text-cyan-300 mt-5 border-b border-white/10 pb-1.5">
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={index} className="font-display text-base font-bold text-white mt-6 border-b border-white/15 pb-1.5">
            {trimmed.replace(/^##\s*/, "")}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2 key={index} className="font-display text-lg font-extrabold text-white mt-8 mb-3">
            {trimmed.replace(/^#\s*/, "")}
          </h2>
        );
      }
      if (trimmed.startsWith(">")) {
        return (
          <blockquote key={index} className="border border-white/10 bg-zinc-900/80 px-4 py-3 my-4 rounded-xl text-sm text-zinc-200 leading-relaxed">
            {trimmed.replace(/^>\s*/, "")}
          </blockquote>
        );
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const text = trimmed.replace(/^[-*]\s*/, "");
        return (
          <ul key={index} className="list-disc pl-6 space-y-1 my-1">
            <li className="text-sm text-zinc-300 leading-relaxed">{parseBoldText(text)}</li>
          </ul>
        );
      }
      if (!trimmed) return <div key={index} className="h-2" />;
      return (
        <p key={index} className="text-sm text-zinc-300 leading-relaxed my-2">
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-200 bg-[#0B0B10] hover:bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          <ChevronLeft className="h-4 w-4 text-purple-400" />
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onToggleRedBlueTint && (
            <button
              type="button"
              onClick={onToggleRedBlueTint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B0B10] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <Palette className="h-3.5 w-3.5 text-purple-400" />
              <span>{redBlueMemoryTint ? "Red/Blue Tint: On" : "Red/Blue Tint: Off"}</span>
            </button>
          )}
          {onNavigateModule && (
            <>
              <button
                type="button"
                onClick={() => onNavigateModule("battle")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B0B10] border border-emerald-400/45 text-xs font-mono text-emerald-300 hover:border-emerald-400 cursor-pointer whitespace-nowrap"
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Host Bozz Battles</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateModule("boss")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B0B10] border border-purple-500/40 text-xs font-mono text-purple-300 hover:border-purple-400 cursor-pointer whitespace-nowrap"
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Boss Battle</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateModule("map")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B0B10] border border-white/10 text-xs font-mono text-emerald-400 hover:border-emerald-400/50 cursor-pointer whitespace-nowrap"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Concept Map</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Study Deck Container */}
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden">
        {/* Course Deck Banner */}
        <div className="bg-zinc-950/75 border-b border-white/10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
                <span className="font-semibold">{deck.courseCode}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400 tabular-nums">
                  Created {new Date(deck.timestamp).toLocaleDateString()}
                </span>
              </div>
              <h1 id="study-deck-title" className="font-display text-2xl md:text-3xl tracking-tight font-extrabold text-white">
                {cleanMathFormula(deck.summary?.title || "Course Final Study Companion")}
              </h1>
            </div>
            {deck.additionalNotes && (
              <div className="bg-zinc-900/90 border border-white/10 p-4 rounded-xl max-w-sm text-xs text-zinc-300 leading-relaxed">
                <div className="font-mono text-[11px] font-semibold text-emerald-400 mb-1">
                  Target Grade Focus
                </div>
                {deck.additionalNotes}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="bg-zinc-950 border-b border-white/10 flex items-center overflow-x-auto">
          <button
            id="tab-btn-summary"
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === "summary"
                ? "bg-zinc-900/70 text-purple-400 border-purple-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Study Hub</span>
          </button>

          <button
            id="tab-btn-timeline"
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === "timeline"
                ? "bg-zinc-900/70 text-purple-400 border-purple-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>5-Day Plan</span>
          </button>

          <button
            id="tab-btn-flashcards"
            type="button"
            onClick={() => setActiveTab("flashcards")}
            className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === "flashcards"
                ? "bg-zinc-900/70 text-purple-400 border-purple-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="tabular-nums">Flashcards ({flashcards.length})</span>
          </button>

          <button
            id="tab-btn-quiz"
            type="button"
            onClick={() => setActiveTab("quiz")}
            className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === "quiz"
                ? "bg-zinc-900/70 text-emerald-400 border-emerald-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <CheckSquare className="h-4 w-4 shrink-0" />
            <span className="tabular-nums">Matching Exam ({organizedQuiz.length})</span>
          </button>

          <div className="ml-auto flex items-center px-4 py-2 shrink-0">
            <button
              type="button"
              id="btn-quick-export-pdf"
              onClick={() => setShowPdfModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 tabular-nums"
            >
              <FileDown className="h-4 w-4 shrink-0" />
              <span>Export PDF ({organizedQuiz.length} Qs)</span>
            </button>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Cognitive Optimization Panel */}
          <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl text-left">
                <div className="text-[11px] font-mono font-semibold text-emerald-400">
                  Roediger &amp; Karpicke Active Retrieval Protocol
                </div>
                <h2 className="font-display text-lg font-bold tracking-tight text-white">
                  Finals Memory &amp; Retrieval Calibration
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Diagnostic retrieval, spaced intervals, and interleaved matching produce up to a <strong className="text-white">1.5 SD score advantage</strong> over passive re-reading.
                </p>
                <div className="flex flex-wrap gap-4 pt-1 font-mono text-[11px] text-zinc-300">
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> FSRS Stability Tracking
                  </span>
                  <span className="inline-flex items-center gap-1 text-purple-400">
                    <Check className="h-3.5 w-3.5" /> Red/Blue Visual Encoding
                  </span>
                </div>
              </div>

              <div className="shrink-0 bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col justify-center min-w-[230px] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Deck Mastery Rating</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">{calculatedMemoryPct}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${calculatedMemoryPct}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-zinc-400 tabular-nums">
                  Projected Uplift: <strong className="text-emerald-300">+15–20 Percentile</strong>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: STUDY HUB */}
          {activeTab === "summary" && (
            <div id="summary-tab-content" className="space-y-8 text-left">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-950/70 border border-white/10 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-display text-sm font-bold text-white">Curriculum Overview</h3>
                    <span className="text-[11px] font-mono text-cyan-400">Syllabus Alignment</span>
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    {cleanMathFormula(deck.summary?.curriculumExplanation || "No curriculum explanation provided.")}
                  </p>
                </div>

                <div className="bg-zinc-950/70 border border-white/10 p-6 rounded-2xl space-y-4">
                  <h3 className="font-display text-sm font-bold text-emerald-400 border-b border-white/10 pb-3">
                    High-Yield Exam Tips
                  </h3>
                  <ul className="space-y-3.5">
                    {topTips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="font-mono text-xs font-bold text-cyan-400 tabular-nums shrink-0 mt-0.5">
                          0{idx + 1}.
                        </span>
                        <span className="text-xs text-zinc-200 leading-relaxed">{cleanMathFormula(tip)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-display text-sm font-bold text-white">Synthesized Course Notes</h3>
                <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/70 border border-white/10 p-5 rounded-2xl">
                  {cleanMathFormula(deck.summary?.synthesizedNotesParagraph || "No notes synthesis available.")}
                </p>
              </div>

              {(() => {
                const coveredUnits =
                  deck.units && deck.units.length > 0 ? deck.units : deduceCourse(deck.courseCode || "").units;
                if (!coveredUnits || coveredUnits.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-white">Syllabus Units Covered</h3>
                      <span className="text-xs font-mono text-zinc-400 tabular-nums">{coveredUnits.length} units</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-zinc-950/70 border border-white/10 p-5 rounded-2xl">
                      {coveredUnits.map((unit, idx) => (
                        <div key={unit} className="flex items-start gap-2.5 text-xs text-zinc-200 leading-relaxed">
                          <span className="font-mono text-cyan-400 font-semibold tabular-nums shrink-0">
                            {String(idx + 1).padStart(2, "0")}.
                          </span>
                          <span>{unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="font-display text-sm font-bold text-white">Core Formula &amp; Concept Cheat Sheet</h3>
                <div id="cheat-sheet-container" className="bg-zinc-950 border border-white/10 p-6 rounded-2xl overflow-auto text-zinc-200 text-xs leading-relaxed max-h-[520px]">
                  {renderCheatSheetHTML(deck.summary?.coreCheatSheetMarkdown || "")}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 5-DAY PREP PLAN */}
          {activeTab === "timeline" && (
            <div id="timeline-tab-content" className="space-y-6 text-left">
              <div className="max-w-xl">
                <h3 className="font-display text-base font-bold text-white">5-Day Structured Prep Schedule</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Daily retrieval intervals designed to build steady recall heading into exam day.
                </p>
              </div>

              <div className="relative border-l border-white/15 pl-6 ml-3 space-y-6 py-2">
                {timeline.map((day, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[37px] top-4 bg-zinc-950 border border-white/20 text-cyan-400 rounded-full h-6 w-6 flex items-center justify-center font-mono text-[10px] font-bold tabular-nums">
                      {(idx + 1).toString().padStart(2, "0")}
                    </div>

                    <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                      <div className="text-[11px] font-mono font-semibold text-emerald-400">
                        {cleanMathFormula(day.dayName)}
                      </div>
                      <h4 className="font-display text-sm font-bold text-white mt-1.5">
                        {cleanMathFormula(day.activityTitle)}
                      </h4>
                      <p className="text-xs text-zinc-300 mt-2 leading-relaxed pt-2 border-t border-white/10">
                        {cleanMathFormula(day.activityDescription)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 3D FLASHCARDS */}
          {activeTab === "flashcards" && (
            <div id="flashcards-tab-content" className="space-y-6 max-w-xl mx-auto text-center">
              <div>
                <h3 className="font-display text-base font-bold text-white">Active Recall Flashcards</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Recall the answer before flipping. Use 3D Recall &amp; Feynman Studio in the top bar for FSRS scheduling.
                </p>
              </div>

              <div className="space-y-2 text-left bg-zinc-950 border border-white/10 p-3.5 rounded-xl">
                <div className="flex justify-between text-xs font-mono text-zinc-400 tabular-nums">
                  <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                  <span className="text-emerald-400">{masteredCards.length} Mastered</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                    style={{ width: `${flashcards.length > 0 ? ((currentCardIndex + 1) / flashcards.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="perspective-1200 w-full">
                <motion.div
                  id="interactive-flashcard"
                  onClick={() => setIsFlipped(!isFlipped)}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={SPRING_CARD_FLIP}
                  className="preserve-3d relative min-h-64 w-full cursor-pointer select-none"
                >
                  <div
                    className={`backface-hidden absolute inset-0 text-left p-6 rounded-2xl border flex flex-col justify-between ${
                      redBlueMemoryTint
                        ? "bg-gradient-to-br from-red-950/40 via-[#111114] to-blue-950/40 border-white/15"
                        : "bg-[#111114] border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-[11px] font-mono">
                      <span className="text-cyan-400 font-semibold">Prompt</span>
                      <span className="text-zinc-400 tabular-nums">#{currentCardIndex + 1}</span>
                    </div>
                    <div className="grow flex items-center justify-center py-4">
                      {redBlueMemoryTint ? (
                        (() => {
                          const cardParts = splitQuestionIntoMatchingSections(flashcards[currentCardIndex]?.question || "");
                          return (
                            <p className="text-center px-4 font-semibold text-sm md:text-base leading-relaxed">
                              <span className="text-red-300">{cardParts.part1}</span>
                              {cardParts.part2 && <span className="text-blue-300 ml-1">{cardParts.part2}</span>}
                            </p>
                          );
                        })()
                      ) : (
                        <p className="text-center px-4 font-semibold text-sm md:text-base leading-relaxed text-zinc-100">
                          {cleanMathFormula(flashcards[currentCardIndex]?.question || "")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-center text-[11px] font-mono border-t border-white/10 pt-2.5 text-zinc-400">
                      <RefreshCw className="h-3 w-3 mr-1.5 text-cyan-400" />
                      <span>Click card to flip</span>
                    </div>
                  </div>

                  <div
                    className={`backface-hidden rotate-y-180 absolute inset-0 text-left p-6 rounded-2xl border flex flex-col justify-between ${
                      redBlueMemoryTint
                        ? "bg-gradient-to-br from-blue-950/50 via-[#111114] to-red-950/50 border-emerald-400/45"
                        : "bg-[#12161E] border-emerald-400/45"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-[11px] font-mono">
                      <span className="text-emerald-400 font-semibold">Answer</span>
                      <span className="text-zinc-400 tabular-nums">#{currentCardIndex + 1}</span>
                    </div>
                    <div className="grow flex items-center justify-center py-4">
                      <p className="text-center px-4 text-zinc-50 font-bold text-sm md:text-base leading-relaxed">
                        {cleanMathFormula(flashcards[currentCardIndex]?.answer || "")}
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-[11px] font-mono border-t border-white/10 pt-2.5 text-emerald-300">
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      <span>Click card to flip back</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={currentCardIndex === 0}
                  onClick={() => {
                    setCurrentCardIndex(currentCardIndex - 1);
                    setIsFlipped(false);
                  }}
                  className="p-3 rounded-xl border border-white/10 bg-zinc-950 text-zinc-300 cursor-pointer disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  disabled={flashcards.length === 0}
                  onClick={() => toggleMastered(currentCardIndex)}
                  className={`px-5 py-3 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    masteredCards.includes(currentCardIndex)
                      ? "bg-emerald-950/50 text-emerald-300 border-emerald-400/50"
                      : "bg-zinc-950 text-zinc-200 border-white/10 hover:border-cyan-400/60"
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>{masteredCards.includes(currentCardIndex) ? "Mastered" : "Mark as Mastered"}</span>
                </button>

                <button
                  type="button"
                  disabled={flashcards.length === 0 || currentCardIndex === flashcards.length - 1}
                  onClick={() => {
                    setCurrentCardIndex(currentCardIndex + 1);
                    setIsFlipped(false);
                  }}
                  className="p-3 rounded-xl border border-white/10 bg-zinc-950 text-zinc-300 cursor-pointer disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE MATCHING MOCK FINAL EXAM */}
          {activeTab === "quiz" && (
            <div id="quiz-tab-content" className="space-y-6">
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="space-y-1 text-left">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-purple-400">
                    <span>Interactive Mock Final Exam</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-400">10 Questions per Set</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">Match Questions to Answers</h3>
                  <p className="text-xs text-zinc-400 max-w-xl">
                    Select a question slot on the left, then pick the matching answer card from the options pool on the right. Every match updates FSRS Readiness telemetry.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl shrink-0 font-mono tabular-nums">
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-400">Matched</div>
                    <div className="text-sm font-bold text-white">
                      {Object.keys(matchingAnswers).length} / {organizedQuiz.length}
                    </div>
                  </div>
                  <div className="w-px h-7 bg-white/10" />
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-400">Progress</div>
                    <div className={`text-sm font-bold ${
                      Object.keys(matchingAnswers).length === organizedQuiz.length ? "text-emerald-400" : "text-purple-400"
                    }`}>
                      {organizedQuiz.length > 0 ? Math.round((Object.keys(matchingAnswers).length / organizedQuiz.length) * 100) : 0}%
                    </div>
                  </div>
                  {submittedQuiz && (
                    <>
                      <div className="w-px h-7 bg-white/10" />
                      <div className="text-left">
                        <div className="text-[10px] text-zinc-400">Score</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {quizScore}/{organizedQuiz.length} ({Math.round((quizScore / organizedQuiz.length) * 100)}%)
                        </div>
                      </div>
                    </>
                  )}
                  <div className="w-px h-7 bg-white/10" />
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>PDF ({organizedQuiz.length} Qs)</span>
                  </button>
                </div>
              </div>

              {/* Section Selector */}
              <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
                <div className="space-y-0.5 text-left">
                  <h4 className="font-display text-xs font-bold text-white">Exam Sections</h4>
                  <p className="text-xs text-zinc-400">Complete all sets (10 questions per set) to submit</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: Math.ceil(organizedQuiz.length / 10) }, (_, i) => i).map((sectionIndex) => {
                    const start = sectionIndex * 10 + 1;
                    const end = Math.min((sectionIndex + 1) * 10, organizedQuiz.length);
                    const isCurrent = currentSectionIndex === sectionIndex;
                    let matchedCount = 0;
                    for (let qIdx = sectionIndex * 10; qIdx < end; qIdx++) {
                      if (matchingAnswers[qIdx]) matchedCount++;
                    }
                    return (
                      <button
                        key={sectionIndex}
                        type="button"
                        onClick={() => handleSetSectionIndex(sectionIndex)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap tabular-nums ${
                          isCurrent
                            ? "bg-purple-500 text-white border-purple-500 font-bold"
                            : matchedCount === end - start + 1
                            ? "bg-emerald-950/40 border-emerald-400/50 text-emerald-300"
                            : "bg-zinc-900 border-white/10 hover:border-white/30 text-zinc-200"
                        }`}
                      >
                        <span>Set {sectionIndex + 1} ({start}-{end})</span>
                        {matchedCount > 0 && (
                          <span className={`text-[10px] font-mono font-bold ${isCurrent ? "text-white/80" : "text-zinc-400"}`}>
                            {matchedCount}/{end - start + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dual-Column Active Exam Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-950/75 rounded-2xl p-5 border border-white/10 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-display text-xs font-bold text-white">Active Question Workspace</h4>
                    <div className="text-xs font-mono text-zinc-400 tabular-nums">
                      Set {currentSectionIndex + 1} · Item {activeMatchingIdx - currentSectionIndex * 10 + 1}
                    </div>
                  </div>

                  {/* 10-Item Question Dial */}
                  {(() => {
                    const notchesToShow = Math.min(10, organizedQuiz.length - currentSectionIndex * 10);
                    return (
                      <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 border border-white/10 rounded-xl select-none">
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0 hidden sm:inline">Question Dial:</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 w-full justify-between sm:justify-start">
                          {Array.from({ length: notchesToShow }).map((_, idx) => {
                            const absIdx = currentSectionIndex * 10 + idx;
                            const isCurrentActive = activeMatchingIdx === absIdx;
                            const isCurrentMatched = matchingAnswers[absIdx] !== undefined;
                            let btnStyle = "bg-zinc-950 text-zinc-300 border-white/15 hover:border-white/40";
                            if (isCurrentActive) {
                              btnStyle = "bg-purple-500 text-white border-purple-500 font-bold";
                            } else if (isCurrentMatched) {
                              btnStyle = "bg-emerald-500 text-zinc-950 border-emerald-400 font-bold";
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFocusedRowIdx(absIdx);
                                  setWrongAttemptAnswer(null);
                                  setItemFocusTime(Date.now());
                                }}
                                className={`w-8 h-8 rounded-lg border text-xs font-mono tabular-nums transition-colors flex items-center justify-center shrink-0 cursor-pointer ${btnStyle}`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Focused Question Card */}
                  {(() => {
                    const q = organizedQuiz[activeMatchingIdx];
                    if (!q) return null;
                    const userMatchedText = matchingAnswers[activeMatchingIdx];
                    const correctVal = q.options[q.correctIndex];
                    const isMatchCorrect = userMatchedText === correctVal;

                    let rowBorderColor = redBlueMemoryTint
                      ? "border-white/15 bg-gradient-to-r from-red-950/35 via-zinc-900 to-blue-950/35"
                      : "border-white/15 bg-zinc-900/90";
                    if (wrongAttemptAnswer) {
                      rowBorderColor = "border-rose-500/70 bg-rose-950/25";
                    } else if (userMatchedText) {
                      rowBorderColor = "border-emerald-400/60 bg-emerald-950/20";
                    }

                    const promptParts = splitQuestionIntoMatchingSections(q.question);

                    return (
                      <div className="space-y-4">
                        <div className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between ${rowBorderColor}`}>
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-4 select-none">
                            <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                              Question {activeMatchingIdx + 1}
                            </span>
                            <span
                              className={`text-[11px] font-mono font-semibold ${
                                isMatchCorrect ? "text-emerald-400" : wrongAttemptAnswer ? "text-rose-400" : "text-cyan-400"
                              }`}
                            >
                              {isMatchCorrect ? "Matched Correctly" : wrongAttemptAnswer ? "Mismatch — Try Another" : "Awaiting Match"}
                            </span>
                          </div>

                          <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-6 my-2">
                            <div className="flex-1 min-h-[76px] flex flex-col justify-center text-left">
                              <span className="text-[11px] font-mono text-zinc-400 mb-1.5 select-none">Prompt</span>
                              {redBlueMemoryTint ? (
                                <div className="text-sm md:text-base font-semibold leading-relaxed select-text">
                                  <span className="text-red-300">{promptParts.part1}</span>
                                  {promptParts.part2 && <span className="text-blue-300 ml-1">{promptParts.part2}</span>}
                                </div>
                              ) : (
                                <div className="text-sm md:text-base font-semibold leading-relaxed text-zinc-100 select-text">
                                  {cleanMathFormula(q.question)}
                                </div>
                              )}
                            </div>

                            <div className="hidden md:flex items-center justify-center shrink-0 select-none w-8">
                              <div className="w-full h-px bg-white/15" />
                            </div>

                            <div className="flex-1 flex flex-col justify-center min-h-[76px]">
                              <span className="text-[11px] font-mono text-zinc-400 mb-1.5 select-none text-left">Selected Answer</span>
                              {!userMatchedText ? (
                                <div className={`w-full py-4 px-4 text-center rounded-xl border border-dashed text-xs flex flex-col items-center justify-center gap-1 min-h-[60px] select-none ${
                                  wrongAttemptAnswer ? "border-rose-500/70 bg-rose-950/30 text-rose-300" : "border-white/15 bg-zinc-950/60 text-zinc-400"
                                }`}>
                                  <span className="font-mono font-semibold">{wrongAttemptAnswer ? "Not a match" : "Empty answer slot"}</span>
                                  <span className="text-[11px] text-zinc-500">
                                    {wrongAttemptAnswer ? "Choose another card from the options pool" : "Select an answer from the options pool"}
                                  </span>
                                </div>
                              ) : (
                                <div className="w-full relative flex items-center bg-emerald-950/40 border border-emerald-400/50 rounded-xl px-4 py-3.5 gap-2 text-left">
                                  <div className="flex-1 pr-6 flex items-center leading-normal">
                                    {(() => {
                                      const optParts = splitOptionIntoMatchingSections(userMatchedText);
                                      return (
                                        <div className="flex flex-wrap items-baseline gap-1.5 font-semibold text-xs md:text-sm">
                                          {optParts.prefix && (
                                            <span className="text-[11px] font-mono text-emerald-300 shrink-0">{optParts.prefix}</span>
                                          )}
                                          <span className={redBlueMemoryTint ? "text-red-300 underline decoration-red-400/50" : "text-zinc-100"}>
                                            {optParts.part1}
                                          </span>
                                          {optParts.part2 && (
                                            <span className={redBlueMemoryTint ? "text-blue-300 underline decoration-blue-400/50" : "text-zinc-100"}>
                                              {optParts.part2}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  {!submittedQuiz && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearMatchingAnswer(activeMatchingIdx);
                                        setWrongAttemptAnswer(null);
                                      }}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-emerald-900/50 text-emerald-300 hover:text-white p-1 rounded-md cursor-pointer"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {wrongAttemptAnswer && (
                            <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-xl text-xs flex items-start gap-2.5">
                              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-mono font-semibold text-[11px] text-rose-300">Incorrect Match</div>
                                <p className="text-rose-200/90">"{wrongAttemptAnswer}" does not match this question.</p>
                              </div>
                            </div>
                          )}

                          {(eliminatedOptions[`leak_${activeMatchingIdx}` as any] || submittedQuiz) && (
                            <div className="mt-4 p-4 bg-zinc-950 border border-cyan-400/35 rounded-xl space-y-1.5 text-xs text-left">
                              <div className="font-mono font-semibold text-cyan-400 flex items-center gap-1.5">
                                <HelpCircle className="h-3.5 w-3.5" />
                                <span>Step-by-Step Explanation</span>
                              </div>
                              <p className="text-zinc-200 leading-relaxed pt-1">{cleanMathFormula(q.explanation)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                          <button
                            type="button"
                            disabled={activeMatchingIdx === currentSectionIndex * 10}
                            onClick={() => {
                              setFocusedRowIdx(activeMatchingIdx - 1);
                              setWrongAttemptAnswer(null);
                              setItemFocusTime(Date.now());
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 bg-zinc-900 text-zinc-200 disabled:opacity-35 cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Previous Item</span>
                          </button>

                          <div className="text-xs font-mono text-zinc-400 tabular-nums">
                            Item {activeMatchingIdx - currentSectionIndex * 10 + 1} of {Math.min(10, organizedQuiz.length - currentSectionIndex * 10)}
                          </div>

                          <button
                            type="button"
                            disabled={activeMatchingIdx === Math.min((currentSectionIndex + 1) * 10, organizedQuiz.length) - 1}
                            onClick={() => {
                              setFocusedRowIdx(activeMatchingIdx + 1);
                              setWrongAttemptAnswer(null);
                              setItemFocusTime(Date.now());
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 bg-zinc-900 text-zinc-200 disabled:opacity-35 cursor-pointer"
                          >
                            <span>Next Item</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-4">
                    <button
                      type="button"
                      disabled={currentSectionIndex === 0}
                      onClick={() => handleSetSectionIndex(currentSectionIndex - 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 bg-zinc-900 text-zinc-200 disabled:opacity-35 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous Set</span>
                    </button>

                    <button
                      type="button"
                      disabled={currentSectionIndex === Math.ceil(organizedQuiz.length / 10) - 1}
                      onClick={() => handleSetSectionIndex(currentSectionIndex + 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 bg-zinc-900 text-zinc-200 disabled:opacity-35 cursor-pointer"
                    >
                      <span>Next Set</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Right Sidebar: Options Pool + Study Hints + Submission */}
                <div id="quiz-sidebar-right" className="space-y-4">
                  <div className="bg-zinc-950/75 border border-white/10 text-white rounded-2xl p-5 space-y-4 text-left">
                    <div className="border-b border-white/10 pb-2.5 flex items-center justify-between">
                      <h4 className="font-display text-xs font-bold text-white flex items-center gap-2">
                        <Layers className="h-4 w-4 text-cyan-400" />
                        <span>Options Pool</span>
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">Set {currentSectionIndex + 1}</span>
                    </div>

                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Filter terms or answers..."
                        value={matchingSearchQuery}
                        onChange={(e) => setMatchingSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 text-zinc-100 placeholder:text-zinc-500 rounded-xl py-2 pl-8 pr-14 text-xs focus:outline-none focus:border-cyan-400"
                      />
                      {matchingSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMatchingSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-[11px] font-mono px-1.5 py-0.5 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {scrambledSectionOptions
                        .filter((card) =>
                          !matchingSearchQuery.trim()
                            ? true
                            : card.text.toLowerCase().includes(matchingSearchQuery.toLowerCase())
                        )
                        .map((card) => {
                          const matchedRow = findMatchedRowForCard(card.uid, card.text);
                          const isPlaced = matchedRow !== null;
                          const isVaporized = eliminatedOptions[activeMatchingIdx]?.includes(card.uid as any);
                          const optParts = splitOptionIntoMatchingSections(card.text);

                          let cardStyle = redBlueMemoryTint
                            ? "bg-gradient-to-r from-red-950/35 via-zinc-900 to-blue-950/35 border-white/15 hover:border-cyan-400"
                            : "bg-zinc-900 border-white/15 hover:border-cyan-400";

                          if (isPlaced) {
                            cardStyle = "bg-emerald-950/30 border-emerald-400/50 text-zinc-300 opacity-65";
                          } else if (isVaporized) {
                            cardStyle = "bg-zinc-950 border-white/5 text-zinc-600 line-through cursor-not-allowed";
                          }

                          return (
                            <button
                              key={card.uid}
                              type="button"
                              disabled={isVaporized || submittedQuiz}
                              onClick={() => handleSelectCard(card)}
                              className={`w-full text-left rounded-xl p-3 border transition-colors flex flex-col gap-1.5 cursor-pointer ${cardStyle}`}
                            >
                              <div className="flex flex-wrap items-baseline gap-1.5 font-semibold text-xs leading-snug">
                                {optParts.prefix && (
                                  <span className={`text-[11px] font-mono font-semibold ${isPlaced ? "text-emerald-400" : "text-cyan-400"}`}>
                                    {optParts.prefix}
                                  </span>
                                )}
                                <span className={redBlueMemoryTint ? "text-red-300" : "text-zinc-100"}>{optParts.part1}</span>
                                {optParts.part2 && (
                                  <span className={redBlueMemoryTint ? "text-blue-300" : "text-zinc-100"}>{optParts.part2}</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/10 pt-1.5">
                                <span className={isPlaced ? "text-emerald-400" : "text-zinc-400"}>
                                  {isPlaced
                                    ? `Matched to Item ${matchedRow! - currentSectionIndex * 10 + 1}`
                                    : isVaporized
                                    ? "Eliminated"
                                    : `Assign to Item ${activeMatchingIdx - currentSectionIndex * 10 + 1}`}
                                </span>
                                {crowdPollResult[activeMatchingIdx]?.[card.uid as any] !== undefined && (
                                  <span className="text-cyan-400 font-semibold tabular-nums">
                                    Poll: {crowdPollResult[activeMatchingIdx][card.uid as any]}%
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Study Hints */}
                  <div className="bg-zinc-950/75 text-white rounded-2xl p-5 border border-white/10 space-y-3 text-left">
                    <h4 className="font-display text-xs font-bold text-cyan-400 border-b border-white/10 pb-2">Study Hints</h4>
                    <div className="space-y-2 text-xs">
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold"><Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Instant Solve</span>
                        <button
                          type="button"
                          disabled={lifelines.autoSolve <= 0 || submittedQuiz}
                          onClick={() => useAutoSolveMatching(activeMatchingIdx)}
                          className="px-2.5 py-1 bg-amber-400 text-zinc-950 font-mono text-[11px] font-bold rounded-lg disabled:opacity-35 cursor-pointer"
                        >
                          {lifelines.autoSolve} Left
                        </button>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold"><Scissors className="h-3.5 w-3.5 text-cyan-400" /> 50/50 Filter</span>
                        <button
                          type="button"
                          disabled={lifelines.fiftyFifty <= 0 || submittedQuiz || eliminatedOptions[activeMatchingIdx] !== undefined}
                          onClick={() => useFiftyFiftyMatching(activeMatchingIdx)}
                          className="px-2.5 py-1 bg-cyan-400 text-zinc-950 font-mono text-[11px] font-bold rounded-lg disabled:opacity-35 cursor-pointer"
                        >
                          {lifelines.fiftyFifty} Left
                        </button>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold"><BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Explanation</span>
                        <button
                          type="button"
                          disabled={lifelines.explanationHint <= 0 || submittedQuiz}
                          onClick={() => useExplanationHintMatching(activeMatchingIdx)}
                          className="px-2.5 py-1 bg-emerald-400 text-zinc-950 font-mono text-[11px] font-bold rounded-lg disabled:opacity-35 cursor-pointer"
                        >
                          {lifelines.explanationHint} Left
                        </button>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold"><BarChart2 className="h-3.5 w-3.5 text-zinc-300" /> Class Poll</span>
                        <button
                          type="button"
                          disabled={lifelines.classPoll <= 0 || submittedQuiz || crowdPollResult[activeMatchingIdx] !== undefined}
                          onClick={() => useClassPollMatching(activeMatchingIdx)}
                          className="px-2.5 py-1 bg-zinc-200 text-zinc-950 font-mono text-[11px] font-bold rounded-lg disabled:opacity-35 cursor-pointer"
                        >
                          {lifelines.classPoll} Left
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Exam Submission */}
                  <div className="bg-zinc-950/75 border border-white/10 rounded-2xl p-5 space-y-3 text-left">
                    {!submittedQuiz ? (
                      <>
                        <button
                          type="button"
                          onClick={submitQuiz}
                          disabled={Object.keys(matchingAnswers).length === 0}
                          className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-zinc-950 disabled:opacity-40 cursor-pointer"
                        >
                          Submit Final Exam ({Object.keys(matchingAnswers).length}/{organizedQuiz.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPdfModal(true)}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold text-xs rounded-xl cursor-pointer"
                        >
                          <FileDown className="h-4 w-4 text-cyan-400" />
                          <span>Export PDF Exam ({organizedQuiz.length} Qs)</span>
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="bg-zinc-900 border border-emerald-400/35 p-4 rounded-xl text-center">
                          <div className="text-[11px] font-mono text-zinc-400">Exam Score</div>
                          <div className="text-xl font-bold text-white tabular-nums">
                            {quizScore} / {organizedQuiz.length}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={resetQuiz}
                          className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 font-semibold text-white text-xs rounded-xl cursor-pointer"
                        >
                          Reset &amp; Retake
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateMoreQuestions}
                          disabled={isGeneratingMore}
                          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-400 font-bold text-white text-xs rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          <span>{isGeneratingMore ? "Generating 25 Questions..." : "Generate 25 More Questions (AI)"}</span>
                        </button>
                        {generatorError && <p className="text-[11px] text-red-400">{generatorError}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Export Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/15 text-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-cyan-400">Standardized Paper Format</div>
                <h3 className="font-display text-xl font-bold text-white">Export Mock Final Exam (PDF)</h3>
                <p className="text-xs text-zinc-400">{deck.courseName || deck.courseCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10 cursor-pointer">
                <span className="text-xs font-semibold text-zinc-200">Include Official Answer Key</span>
                <input type="checkbox" checked={includeKeyInPdf} onChange={(e) => setIncludeKeyInPdf(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10 cursor-pointer">
                <span className="text-xs font-semibold text-zinc-200">Include Step-by-Step Explanations</span>
                <input type="checkbox" checked={includeExplanationsInPdf} onChange={(e) => setIncludeExplanationsInPdf(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/10 cursor-pointer">
                <span className="text-xs font-semibold text-zinc-200">Include Student Bubble Sheet</span>
                <input type="checkbox" checked={includeBubbleInPdf} onChange={(e) => setIncludeBubbleInPdf(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
              </label>
            </div>

            <button
              type="button"
              id="btn-download-exam-pdf"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : pdfExportSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              <span>{pdfExportSuccess ? "PDF Successfully Downloaded" : `Download PDF Exam (${organizedQuiz.length} Questions)`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
