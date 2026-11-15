/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { StudyDeck } from "./types";
import MaterialUploader from "./components/MaterialUploader";
import StudyDeckView from "./components/StudyDeckView";
import { History, CheckCircle2, ChevronRight, FileText, Trash2, Download, ShieldCheck } from "lucide-react";
import { generateOfflineHtml } from "./utils/htmlExporter";

export default function App() {
  const [activeDeck, setActiveDeck] = useState<StudyDeck | null>(null);
  const [savedDecks, setSavedDecks] = useState<StudyDeck[]>([]);

  const downloadStandaloneApp = () => {
    try {
      const htmlContent = generateOfflineHtml(savedDecks, activeDeck || undefined);
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Finals_Study_Companion_Offline.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate offline export:", err);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dev_study_decks");
      if (stored) {
        setSavedDecks(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Local storage sync failure:", err);
    }
  }, [activeDeck]);

  const loadSavedDeck = (deck: StudyDeck) => {
    setActiveDeck(deck);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateDeck = (updatedDeck: StudyDeck) => {
    setActiveDeck(updatedDeck);
    try {
      const stored = localStorage.getItem("dev_study_decks");
      if (stored) {
        const decks: StudyDeck[] = JSON.parse(stored);
        const updatedList = decks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d));
        localStorage.setItem("dev_study_decks", JSON.stringify(updatedList));
        setSavedDecks(updatedList);
      }
    } catch (err) {
      console.error("Failed to update deck in local storage:", err);
    }
  };

  const deleteDeck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const updated = savedDecks.filter((d) => d.id !== id);
      localStorage.setItem("dev_study_decks", JSON.stringify(updated));
      setSavedDecks(updated);
      if (activeDeck?.id === id) {
        setActiveDeck(null);
      }
    } catch (err) {
      console.error("Failed to delete local state item:", err);
    }
  };

  const clearAllDecks = () => {
    if (window.confirm("Are you sure you want to clear your study history? This cannot be undone.")) {
      localStorage.removeItem("dev_study_decks");
      setSavedDecks([]);
      setActiveDeck(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 antialiased font-sans pb-16">
      {/* Three-Zone Top Navigation */}
      <header className="bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveDeck(null)}
            className="font-display text-lg font-extrabold tracking-tight text-white hover:text-amber-400 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          >
            Finals Studio
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a
              href="#grade-target-section"
              onClick={() => {
                if (activeDeck) setActiveDeck(null);
              }}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              GPA Target
            </a>
            <a
              href="#material-uploader-card"
              onClick={() => {
                if (activeDeck) setActiveDeck(null);
              }}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Deck Builder
            </a>
            <a
              href="#archives-card"
              onClick={() => {
                if (activeDeck) setActiveDeck(null);
              }}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Saved Decks
            </a>
          </nav>

          {/* Zone 3: Primary Header Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={downloadStandaloneApp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 hover:border-amber-500/60 font-semibold text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title="Download standalone school-safe offline companion containing all preloaded and generated decks"
            >
              <Download className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Offline Bundle</span>
              <span className="inline sm:hidden">Offline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeDeck ? (
          <StudyDeckView deck={activeDeck} onBack={() => setActiveDeck(null)} onUpdateDeck={handleUpdateDeck} />
        ) : (
          <div className="space-y-8">
            {/* Hero Command Panel */}
            <section className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 md:p-10 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-amber-400">
                    <span>Honors &amp; AP Curriculum Aligned</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">D'Evelyn &amp; High School Finals</span>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] balance-text max-w-2xl">
                    Protect Your GPA. Lock Down Every Final.
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                    Turn any course code or class review PDF into high-yield formula sheets, a structured 5-day countdown, active recall flashcards, and cumulative mock exams built to raise your final score.
                  </p>
                </div>

                {/* Focused Proof Metrics */}
                <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">25+ Qs</div>
                    <div className="text-xs text-slate-400">Cumulative mock exams with PDF export</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-mono text-xl font-bold text-white tabular-nums">5-Day</div>
                    <div className="text-xs text-slate-400">Spaced-retrieval prep schedule</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">100%</div>
                    <div className="text-xs text-slate-400">Offline Chromebook HTML export</div>
                  </div>
                </div>
              </div>

              {/* Offline Export Action Bar */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Studying on a restricted school Chromebook? Bundle your saved decks and all course presets into a single self-contained HTML file to study offline anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadStandaloneApp}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>Export Offline HTML App</span>
                </button>
              </div>
            </section>

            {/* Primary Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left 2 Columns: GPA Calculator + Course Builder */}
              <div className="lg:col-span-2 space-y-6">
                <MaterialUploader onAnalysisComplete={(deck) => setActiveDeck(deck)} />
              </div>

              {/* Right Column: Saved Decks & Study Principle */}
              <aside className="space-y-6">
                <div id="archives-card" className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                    <div className="flex items-center gap-2.5 text-white">
                      <History className="h-4 w-4 text-amber-400 shrink-0" />
                      <h2 className="font-display font-bold text-sm tracking-tight">Saved Study Decks</h2>
                    </div>
                    {savedDecks.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllDecks}
                        className="text-xs font-medium text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  {savedDecks.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="h-10 w-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mx-auto">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        No study decks generated yet. Enter a course code or select a preset to build your custom study guide and mock final exam.
                      </p>
                    </div>
                  ) : (
                    <div id="archives-list" className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {savedDecks.map((deck) => (
                        <div
                          key={deck.id}
                          onClick={() => loadSavedDeck(deck)}
                          className="p-3.5 bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl cursor-pointer transition-all duration-150 flex items-start justify-between group"
                        >
                          <div className="space-y-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 tabular-nums">
                              <span className="font-semibold">{deck.courseCode}</span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="text-slate-500">{new Date(deck.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                              {deck.summary.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                              {deck.flashcards.length} cards · {deck.quiz.length} questions
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => deleteDeck(e, deck.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                              title="Delete guide"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* High-Yield Study Principle */}
                <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="font-display font-bold text-xs tracking-wide uppercase">Exam Prep Strategy</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Timed active recall and spaced practice over 5 days outperform passive re-reading. Use the target calculator to set your score goal, master the core cheat sheet, and run a full mock exam before test day.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
