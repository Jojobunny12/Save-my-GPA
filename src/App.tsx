/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Download } from "lucide-react";
import { StudyDeck, WorkspaceRoute } from "./types";
import { generateOfflineHtml } from "./utils/htmlExporter";
import {
  computeExamReadiness,
  loadPreferences,
  loadTestDates,
  savePreferences,
  saveTestDate,
  syncDeckToFSRS,
} from "./utils/fsrsEngine";
import { PANEL_FADE, SPRING_TACTILE } from "./utils/motionPresets";
import TelemetryCommandCenter from "./components/TelemetryCommandCenter";
import MaterialUploader from "./components/MaterialUploader";
import StudyDeckView from "./components/StudyDeckView";
import RecallFeynmanStudio from "./components/RecallFeynmanStudio";
import WeaknessRoyaleStudio from "./components/WeaknessRoyaleStudio";
import SocraticArenaStudio from "./components/SocraticArenaStudio";
import DualCodingVisualizer from "./components/DualCodingVisualizer";

const NAV_ITEMS: Array<{ id: WorkspaceRoute; label: string }> = [
  { id: "command", label: "Command" },
  { id: "builder", label: "Deck Studio" },
  { id: "recall", label: "Recall & Feynman" },
  { id: "royale", label: "Weakness Royale" },
  { id: "socratic", label: "Socratic" },
  { id: "map", label: "Concept Map" },
];

export default function App() {
  const [route, setRoute] = useState<WorkspaceRoute>("command");
  const [savedDecks, setSavedDecks] = useState<StudyDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<StudyDeck | null>(null);
  const [deckHubOpen, setDeckHubOpen] = useState(false);
  const [deckHubInitialTab, setDeckHubInitialTab] = useState<
    "summary" | "timeline" | "flashcards" | "quiz"
  >("summary");
  const [royaleSubMode, setRoyaleSubMode] = useState<"royale" | "matching">("royale");

  const [telemetryRevision, setTelemetryRevision] = useState(0);
  const [redBlueMemoryTint, setRedBlueMemoryTint] = useState<boolean>(
    () => loadPreferences().redBlueMemoryTint
  );
  const [testDatesMap, setTestDatesMap] = useState<Record<string, string>>(() =>
    loadTestDates()
  );

  // Hydrate saved decks and seed FSRS concepts on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dev_study_decks");
      if (stored) {
        const parsed: StudyDeck[] = JSON.parse(stored);
        setSavedDecks(parsed);
        parsed.forEach((d) => syncDeckToFSRS(d));
        if (parsed.length > 0) {
          setActiveDeck(parsed[0]);
        }
        setTelemetryRevision((r) => r + 1);
      }
    } catch (err) {
      console.error("Failed to load saved decks:", err);
    }
  }, []);

  const bumpTelemetry = () => setTelemetryRevision((r) => r + 1);

  const activeTestDate = useMemo(() => {
    if (activeDeck?.testDate) return activeDeck.testDate;
    if (activeDeck && testDatesMap[activeDeck.id]) return testDatesMap[activeDeck.id];
    return testDatesMap.global || "";
  }, [activeDeck, testDatesMap]);

  const readiness = useMemo(() => {
    return computeExamReadiness(savedDecks, activeDeck?.id, activeTestDate);
  }, [savedDecks, activeDeck?.id, activeTestDate, telemetryRevision]);

  const handleToggleRedBlueTint = () => {
    const next = !redBlueMemoryTint;
    setRedBlueMemoryTint(next);
    savePreferences({ redBlueMemoryTint: next });
  };

  const handleChangeTestDate = (isoDate: string) => {
    const key = activeDeck ? activeDeck.id : "global";
    const updatedMap = saveTestDate(key, isoDate);
    setTestDatesMap(updatedMap);

    if (activeDeck) {
      const updatedDeck: StudyDeck = { ...activeDeck, testDate: isoDate || undefined };
      handleUpdateDeck(updatedDeck);
    }
    bumpTelemetry();
  };

  const handleDeckCreated = (deck: StudyDeck) => {
    syncDeckToFSRS(deck);
    if (deck.testDate) {
      setTestDatesMap(saveTestDate(deck.id, deck.testDate));
    }
    setActiveDeck(deck);
    setSavedDecks((prev) => [deck, ...prev.filter((d) => d.id !== deck.id)]);
    setDeckHubInitialTab("summary");
    setDeckHubOpen(true);
    setRoute("builder");
    bumpTelemetry();
  };

  const handleUpdateDeck = (updatedDeck: StudyDeck) => {
    setActiveDeck(updatedDeck);
    setSavedDecks((prev) => {
      const updatedList = prev.map((d) => (d.id === updatedDeck.id ? updatedDeck : d));
      try {
        localStorage.setItem("dev_study_decks", JSON.stringify(updatedList));
      } catch (err) {
        console.error("Failed to update deck in localStorage:", err);
      }
      return updatedList;
    });
    bumpTelemetry();
  };

  const handleDeleteDeck = (id: string) => {
    const updated = savedDecks.filter((d) => d.id !== id);
    try {
      localStorage.setItem("dev_study_decks", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete deck:", err);
    }
    setSavedDecks(updated);
    if (activeDeck?.id === id) {
      setActiveDeck(updated[0] || null);
      setDeckHubOpen(false);
    }
    bumpTelemetry();
  };

  const navigateTo = (nextRoute: WorkspaceRoute) => {
    setDeckHubOpen(false);
    if (nextRoute === "royale") {
      setRoyaleSubMode("royale");
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const downloadStandaloneApp = () => {
    try {
      const htmlContent = generateOfflineHtml(savedDecks, activeDeck || undefined);
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "GPARoyale_Offline_Companion.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate offline export:", err);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#09090B] obsidian-grid-bg text-zinc-100 antialiased font-sans pb-16">
        {/* Three-Zone Tactical Obsidian Top Bar */}
        <header className="bg-[#09090B]/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Zone 1: Brand Wordmark */}
            <button
              type="button"
              onClick={() => navigateTo("command")}
              className="font-display text-lg font-extrabold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-baseline gap-1.5"
            >
              <span>GPA</span>
              <span className="text-emerald-400">Royale</span>
            </button>

            {/* Zone 2: Shared-Element Motion Navigation */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = route === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`relative px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-lg ${
                      isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="gparoyale-nav-underline"
                        transition={SPRING_TACTILE}
                        className="absolute left-2.5 right-2.5 bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Active Deck Switcher + Offline Export */}
            <div className="flex items-center gap-2.5 shrink-0">
              {savedDecks.length > 0 && (
                <select
                  aria-label="Active Study Deck"
                  value={activeDeck?.id || ""}
                  onChange={(e) => {
                    const found = savedDecks.find((d) => d.id === e.target.value);
                    if (found) setActiveDeck(found);
                  }}
                  className="hidden sm:block max-w-[165px] px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg font-mono text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {savedDecks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.courseCode} · {d.courseName}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={downloadStandaloneApp}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-white/15 hover:border-cyan-400/50 font-semibold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download standalone school-safe offline companion"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Offline Bundle</span>
              </button>
            </div>
          </div>

          {/* Mobile Compact Nav */}
          <div className="md:hidden border-t border-white/10 px-4 py-2 flex items-center gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-cyan-400 text-zinc-950 font-bold"
                      : "bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Main Workspace */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">
          <AnimatePresence mode="wait">
            {route === "command" && (
              <motion.div
                key="route-command"
                variants={PANEL_FADE}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TelemetryCommandCenter
                  decks={savedDecks}
                  activeDeck={activeDeck}
                  readiness={readiness}
                  testDate={activeTestDate}
                  onChangeTestDate={handleChangeTestDate}
                  onSelectDeck={(d) => {
                    setActiveDeck(d);
                    syncDeckToFSRS(d);
                    bumpTelemetry();
                  }}
                  onDeleteDeck={handleDeleteDeck}
                  onNavigate={navigateTo}
                  onLaunchStudyHub={(d) => {
                    setActiveDeck(d);
                    setDeckHubInitialTab("summary");
                    setDeckHubOpen(true);
                    setRoute("builder");
                  }}
                />
              </motion.div>
            )}

            {route === "builder" && (
              <motion.div
                key={deckHubOpen && activeDeck ? `hub-${activeDeck.id}` : "route-builder"}
                variants={PANEL_FADE}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {deckHubOpen && activeDeck ? (
                  <StudyDeckView
                    deck={activeDeck}
                    initialTab={deckHubInitialTab}
                    redBlueMemoryTint={redBlueMemoryTint}
                    onToggleRedBlueTint={handleToggleRedBlueTint}
                    onBack={() => setDeckHubOpen(false)}
                    onUpdateDeck={handleUpdateDeck}
                    onTelemetryChange={bumpTelemetry}
                    onNavigateModule={navigateTo}
                  />
                ) : (
                  <MaterialUploader
                    onAnalysisComplete={handleDeckCreated}
                    defaultTestDate={activeTestDate}
                  />
                )}
              </motion.div>
            )}

            {route === "recall" && (
              <motion.div
                key="route-recall"
                variants={PANEL_FADE}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <RecallFeynmanStudio
                  deck={activeDeck}
                  redBlueMemoryTint={redBlueMemoryTint}
                  onToggleRedBlueTint={handleToggleRedBlueTint}
                  onTelemetryChange={bumpTelemetry}
                  onGoToBuilder={() => navigateTo("builder")}
                />
              </motion.div>
            )}

            {route === "royale" && (
              <motion.div
                key={`route-royale-${royaleSubMode}`}
                variants={PANEL_FADE}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {royaleSubMode === "matching" && activeDeck ? (
                  <StudyDeckView
                    deck={activeDeck}
                    initialTab="quiz"
                    redBlueMemoryTint={redBlueMemoryTint}
                    onToggleRedBlueTint={handleToggleRedBlueTint}
                    onBack={() => setRoyaleSubMode("royale")}
                    onUpdateDeck={handleUpdateDeck}
                    onTelemetryChange={bumpTelemetry}
                    onNavigateModule={navigateTo}
                  />
                ) : (
                  <WeaknessRoyaleStudio
                    decks={savedDecks}
                    activeDeck={activeDeck}
                    onTelemetryChange={bumpTelemetry}
                    onOpenMatchingExam={() => setRoyaleSubMode("matching")}
                    onGoToBuilder={() => navigateTo("builder")}
                  />
                )}
              </motion.div>
            )}

            {route === "socratic" && (
              <motion.div
                key="route-socratic"
                variants={PANEL_FADE}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SocraticArenaStudio
                  activeDeck={activeDeck}
                  onTelemetryChange={bumpTelemetry}
                />
              </motion.div>
            )}

            {route === "map" && (
              <motion.div
                key="route-map"
                variants={PANEL_FADE}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <DualCodingVisualizer
                  deck={activeDeck}
                  onUpdateDeck={handleUpdateDeck}
                  onDrillRecall={() => navigateTo("recall")}
                  onDrillRoyale={() => navigateTo("royale")}
                  onGoToBuilder={() => navigateTo("builder")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}
