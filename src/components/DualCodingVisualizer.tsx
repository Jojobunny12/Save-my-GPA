import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  BrainCircuit,
  GitBranch,
  Loader2,
  Sparkles,
  Swords,
} from "lucide-react";
import { ConceptGraphData, ConceptNode, StudyDeck } from "../types";
import {
  computeRetrievability,
  daysBetween,
  loadFSRSStates,
} from "../utils/fsrsEngine";
import { cleanMathFormula } from "../utils/mathFormat";
import { postJsonOrNdjson } from "../utils/streamFetch";
import { BUTTON_TAP, PANEL_FADE } from "../utils/motionPresets";

interface DualCodingVisualizerProps {
  deck: StudyDeck | null;
  onUpdateDeck: (updated: StudyDeck) => void;
  onDrillRecall: () => void;
  onDrillRoyale: () => void;
  onGoToBuilder: () => void;
}

function buildImmediateGraphFromDeck(deck: StudyDeck): ConceptGraphData {
  const units =
    deck.units && deck.units.length > 0
      ? deck.units.slice(0, 6)
      : (deck.flashcards || []).slice(0, 6).map((f) => f.unitTag || deck.courseName);

  const uniqueUnits = Array.from(new Set(units));
  const nodes: ConceptNode[] = [
    {
      id: "hub",
      label: deck.courseCode,
      summary: deck.summary?.curriculumExplanation || deck.courseName,
      unitTag: deck.courseName,
      tier: "synthesis",
      x: 50,
      y: 20,
    },
  ];

  const count = Math.max(1, uniqueUnits.length);
  uniqueUnits.forEach((u, idx) => {
    const x = count === 1 ? 50 : 14 + (idx / (count - 1)) * 72;
    const y = idx % 2 === 0 ? 52 : 76;
    const matchedCard = (deck.flashcards || []).find(
      (fc) => (fc.unitTag || "").toLowerCase() === u.toLowerCase()
    ) || deck.flashcards?.[idx];

    nodes.push({
      id: `u${idx + 1}`,
      label: u.length > 28 ? `${u.slice(0, 26)}...` : u,
      summary: matchedCard
        ? `${matchedCard.question} -> ${matchedCard.answer}`
        : `Core exam concepts and problem patterns for ${u}.`,
      unitTag: u,
      tier: idx % 2 === 0 ? "core" : "mechanism",
      x: Number(x.toFixed(1)),
      y,
    });
  });

  const edges = uniqueUnits.map((_, idx) => ({
    from: "hub",
    to: `u${idx + 1}`,
    relation: "tests",
  }));

  for (let i = 1; i < uniqueUnits.length; i++) {
    edges.push({
      from: `u${i}`,
      to: `u${i + 1}`,
      relation: "builds to",
    });
  }

  const timelineEvents = (deck.timeline || []).map((t) => ({
    sequence: t.dayName,
    title: t.activityTitle,
    detail: t.activityDescription,
  }));

  return {
    title: `${deck.courseName} Concept Architecture`,
    nodes,
    edges,
    timelineEvents,
  };
}

export default function DualCodingVisualizer({
  deck,
  onUpdateDeck,
  onDrillRecall,
  onDrillRoyale,
  onGoToBuilder,
}: DualCodingVisualizerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graph: ConceptGraphData | null = useMemo(() => {
    if (!deck) return null;
    return deck.conceptGraph || buildImmediateGraphFromDeck(deck);
  }, [deck]);

  const fsrsByUnit = useMemo(() => {
    const states = Object.values(loadFSRSStates()).filter(
      (s) => !deck || s.deckId === deck.id
    );
    const map = new Map<string, { avgRetention: number; count: number }>();
    for (const s of states) {
      const r = s.lastReviewAt
        ? computeRetrievability(daysBetween(s.lastReviewAt), s.stability)
        : 0.35;
      const prev = map.get(s.unitTag) || { avgRetention: 0, count: 0 };
      const nextCount = prev.count + 1;
      map.set(s.unitTag, {
        avgRetention: (prev.avgRetention * prev.count + r) / nextCount,
        count: nextCount,
      });
    }
    return map;
  }, [deck?.id, deck?.conceptGraph]);

  const selectedNode = useMemo(() => {
    if (!graph) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) || graph.nodes[0] || null;
  }, [graph, selectedNodeId]);

  const handleExtractAiMap = async () => {
    if (!deck) return;
    setIsExtracting(true);
    setError(null);
    try {
      const aiGraph = await postJsonOrNdjson<ConceptGraphData>(
        "/api/concept-map",
        {
          courseCode: deck.courseCode,
          courseName: deck.courseName,
          units: deck.units,
          sourceNotes: deck.pastedTextSnippet || deck.summary?.synthesizedNotesParagraph,
          cheatSheetMarkdown: deck.summary?.coreCheatSheetMarkdown,
        },
        { timeoutMs: 45_000 }
      );
      onUpdateDeck({ ...deck, conceptGraph: aiGraph });
      setSelectedNodeId(aiGraph.nodes[0]?.id || null);
    } catch (err: any) {
      setError(err?.message || "Failed to extract deep AI concept graph. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  if (!deck || !graph) {
    return (
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 text-center space-y-4">
        <GitBranch className="h-9 w-9 text-purple-400 mx-auto" />
        <h2 className="font-display text-xl font-bold text-white">
          No Active Deck to Visualize
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Ingest notes or pick a D&apos;Evelyn course to generate interactive Dual-Coding concept graphs and causal timelines.
        </p>
        <button
          type="button"
          onClick={onGoToBuilder}
          className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
        >
          Open Note Ingestion Studio
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={PANEL_FADE}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-purple-400">
            Dual-Coding Spatial Architecture · {deck.courseCode}
          </div>
          <h2 className="font-display text-xl font-bold text-white tracking-tight mt-0.5">
            {cleanMathFormula(graph.title)}
          </h2>
        </div>

        <motion.button
          type="button"
          whileTap={BUTTON_TAP}
          disabled={isExtracting}
          onClick={handleExtractAiMap}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Synthesizing Node Map...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{deck.conceptGraph ? "Regenerate AI Concept Map" : "Extract Deep AI Concept Map"}</span>
            </>
          )}
        </motion.button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Graph + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span>Interactive SVG Concept Topology (Click any node)</span>
            <span>{graph.nodes.length} nodes · {graph.edges.length} links</span>
          </div>

          <div className="bg-zinc-950/90 border border-white/10 rounded-xl overflow-hidden">
            <svg viewBox="0 0 800 440" className="w-full h-auto block">
              <defs>
                <marker
                  id="arrow-purple"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(139,92,246,0.65)" />
                </marker>
              </defs>

              {/* Edges */}
              {graph.edges.map((edge, idx) => {
                const fromNode = graph.nodes.find((n) => n.id === edge.from);
                const toNode = graph.nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const x1 = (fromNode.x / 100) * 800;
                const y1 = (fromNode.y / 100) * 440;
                const x2 = (toNode.x / 100) * 800;
                const y2 = (toNode.y / 100) * 440;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;

                return (
                  <g key={`${edge.from}-${edge.to}-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(139,92,246,0.34)"
                      strokeWidth="1.6"
                      markerEnd="url(#arrow-purple)"
                    />
                    <text
                      x={mx}
                      y={my - 4}
                      textAnchor="middle"
                      fill="rgba(161,161,170,0.85)"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {edge.relation}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const cx = (node.x / 100) * 800;
                const cy = (node.y / 100) * 440;
                const isSelected = selectedNode?.id === node.id;
                const strokeColor =
                  node.tier === "synthesis"
                    ? "#10B981"
                    : node.tier === "mechanism"
                    ? "#8B5CF6"
                    : "#94A3B8";

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={cx - 72}
                      y={cy - 22}
                      width="144"
                      height="44"
                      rx="10"
                      fill={isSelected ? "rgba(139,92,246,0.22)" : "rgba(11,11,16,0.95)"}
                      stroke={isSelected ? "#10B981" : strokeColor}
                      strokeWidth={isSelected ? "2.4" : "1.2"}
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="#F4F4F5"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="DM Sans, sans-serif"
                    >
                      {cleanMathFormula(
                        node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label
                      )}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side: Selected Concept Inspector & Quick Drill */}
        <aside className="lg:col-span-4 space-y-4">
          {selectedNode && (
            <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="space-y-1 border-b border-white/10 pb-3">
                <div className="text-[11px] font-mono text-purple-400">
                  {selectedNode.unitTag} · {selectedNode.tier}
                </div>
                <h3 className="font-display text-base font-bold text-white">
                  {cleanMathFormula(selectedNode.label)}
                </h3>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {cleanMathFormula(selectedNode.summary)}
              </p>

              {(() => {
                const stat = fsrsByUnit.get(selectedNode.unitTag);
                const pct = stat ? Math.round(stat.avgRetention * 100) : null;
                return (
                  <div className="p-3 bg-zinc-950 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-zinc-400">Unit Retention</span>
                    <span className={pct !== null && pct >= 75 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {pct !== null ? `${pct}% (${stat?.count} items)` : "Not drilled yet"}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onDrillRecall}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer"
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  <span>3D Recall</span>
                </button>
                <button
                  type="button"
                  onClick={onDrillRoyale}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-purple-300 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>Weakness Drills</span>
                </button>
              </div>
            </div>
          )}

          {/* Chronological / Causal Timeline */}
          <div className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-white border-b border-white/10 pb-2.5">
              Concept Sequence Timeline
            </h3>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {graph.timelineEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-950/75 border border-white/10 rounded-xl space-y-1"
                >
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    {cleanMathFormula(ev.sequence)}
                  </div>
                  <div className="text-xs font-bold text-zinc-100">
                    {cleanMathFormula(ev.title)}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {cleanMathFormula(ev.detail)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
