import React, { useState, useEffect, useMemo } from "react";
import { Course, StudyDeck } from "../types";
import { PRESET_COURSES } from "../data/courses";
import { deduceCourse } from "../utils/courseDeducer";
import { postJsonOrNdjson } from "../utils/streamFetch";
import { syncDeckToFSRS } from "../utils/fsrsEngine";
import {
  Calculator,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Target,
  Search,
  CheckSquare,
  Square,
  BookOpen,
  CalendarClock,
  ClipboardPaste,
} from "lucide-react";

interface MaterialUploaderProps {
  onAnalysisComplete: (deck: StudyDeck) => void;
  defaultTestDate?: string;
}

type DepartmentFilter =
  | "All"
  | "English"
  | "Mathematics"
  | "Science"
  | "Social Studies"
  | "Foreign Language"
  | "Fine Arts"
  | "Electives";

const DEPARTMENTS: DepartmentFilter[] = [
  "All",
  "English",
  "Mathematics",
  "Science",
  "Social Studies",
  "Foreign Language",
  "Fine Arts",
  "Electives",
];

const LOADING_PHRASES = [
  "Analyzing D'Evelyn syllabus, textbooks, and pasted notes...",
  "Calibrating definitions, mechanism prompts, and AP stimulus questions...",
  "Generating predictive active recall flashcards across every unit...",
  "Writing 25 cumulative mock final exam questions...",
  "Verifying set-unique answer pools and step-by-step explanations...",
  "Initializing FSRS spaced repetition intervals and 5-day plan...",
];

export default function MaterialUploader({
  onAnalysisComplete,
  defaultTestDate = "",
}: MaterialUploaderProps) {
  const [courseCode, setCourseCode] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<Course | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>("All");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState("D'Evelyn High School");
  const [pastedNotes, setPastedNotes] = useState("");
  const [testDate, setTestDate] = useState(defaultTestDate);

  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
    mimeType: string;
    base64: string;
  } | null>(null);

  const [currentGrade, setCurrentGrade] = useState<number>(83);
  const [finalWeight, setFinalWeight] = useState<number>(15);
  const [targetGrade, setTargetGrade] = useState<number>(90);
  const [calculatorOpen, setCalculatorOpen] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const departmentCounts = useMemo(() => {
    const counts: Record<DepartmentFilter, number> = {
      All: PRESET_COURSES.length,
      English: 0,
      Mathematics: 0,
      Science: 0,
      "Social Studies": 0,
      "Foreign Language": 0,
      "Fine Arts": 0,
      Electives: 0,
    };
    PRESET_COURSES.forEach((c) => {
      counts[c.department] = (counts[c.department] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredCourses = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return PRESET_COURSES.filter((c) => {
      const deptMatch = selectedDepartment === "All" || c.department === selectedDepartment;
      if (!deptMatch) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.units.some((u) => u.toLowerCase().includes(q))
      );
    });
  }, [selectedDepartment, catalogSearch]);

  const activeCourseUnits = useMemo(() => {
    if (selectedPreset) return selectedPreset.units;
    if (!courseCode.trim()) return [];
    const matched = PRESET_COURSES.find(
      (c) => c.code.toLowerCase() === courseCode.trim().toLowerCase()
    );
    if (matched) return matched.units;
    return deduceCourse(courseCode.trim()).units;
  }, [selectedPreset, courseCode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("File exceeds the 15MB limit. Please upload a smaller PDF or excerpt.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setAttachedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        mimeType: file.type || "application/pdf",
        base64: base64String,
      });
      setError(null);
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try a different PDF or course code.");
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (course: Course) => {
    setSelectedPreset(course);
    setCourseCode(course.code);
    setSelectedUnits([...course.units]);
    setError(null);
  };

  const handleCustomCodeChange = (codeValue: string) => {
    setCourseCode(codeValue);
    const trimmed = codeValue.trim().toLowerCase();
    const matched = PRESET_COURSES.find((c) => c.code.toLowerCase() === trimmed) || null;
    setSelectedPreset(matched);
    if (matched) {
      setSelectedUnits([...matched.units]);
    } else if (trimmed) {
      setSelectedUnits([...deduceCourse(codeValue.trim()).units]);
    } else {
      setSelectedUnits([]);
    }
    setError(null);
  };

  const toggleUnit = (unit: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    );
  };

  const selectAllUnits = () => setSelectedUnits([...activeCourseUnits]);
  const clearUnits = () => setSelectedUnits([]);

  const calculateEstimate = () => {
    const c = currentGrade / 100;
    const w = finalWeight / 100;
    const t = targetGrade / 100;

    if (w <= 0 || w >= 1) {
      return {
        needed: 0,
        label: "Invalid Weight",
        text: "Enter a final exam weight between 1% and 99%.",
      };
    }

    const needed = (t - c * (1 - w)) / w;
    const finalPercent = needed * 100;

    let label = "On Track";
    let text = "";
    if (finalPercent > 100) {
      label = "Stretch Target";
      text = `You would need ${finalPercent.toFixed(1)}% on the final to reach ${targetGrade}%. Maximize FSRS active recall + Weakness Royale drills to push your score ceiling.`;
    } else if (finalPercent > 90) {
      label = "High Focus Required";
      text = `You need ${finalPercent.toFixed(1)}% on the final to hit ${targetGrade}%. Prioritize FSRS recall drills and Feynman grading on weak units.`;
    } else if (finalPercent > 70) {
      label = "Achievable Target";
      text = `You need ${finalPercent.toFixed(1)}% on the final to reach ${targetGrade}%. Consistent spaced retrieval and mock exams will lock it in.`;
    } else if (finalPercent > 40) {
      label = "Strong Position";
      text = `You only need ${finalPercent.toFixed(1)}% on the final to maintain ${targetGrade}%. A focused refresher keeps your GPA safe.`;
    } else {
      label = "Well Ahead";
      text = `You need ${finalPercent.toFixed(1)}% on the final to reach ${targetGrade}%. Quick FSRS flashcards keep formulas sharp.`;
    }

    return { needed: finalPercent, label, text };
  };

  const calcResult = calculateEstimate();
  const canSubmit = Boolean(courseCode.trim() || pastedNotes.trim() || attachedFile);

  const runGeneration = async () => {
    const targetCode = courseCode.trim() || (pastedNotes.trim() || attachedFile ? "CUSTOM_NOTES" : "");
    if (!targetCode) {
      setError("Select a D'Evelyn course, enter a course code, or paste class notes first.");
      return;
    }

    setIsLoading(true);
    setLiveStatus(null);
    setError(null);

    const matchedCourse =
      selectedPreset ||
      PRESET_COURSES.find((c) => c.code.toLowerCase() === targetCode.toLowerCase());
    const deduced = targetCode === "CUSTOM_NOTES" ? null : deduceCourse(targetCode);

    const finalCourseName = matchedCourse
      ? matchedCourse.name
      : deduced
      ? deduced.name
      : "Custom Notes & Syllabus Study Deck";
    const finalDepartment = matchedCourse
      ? matchedCourse.department
      : deduced
      ? deduced.department
      : "Academic";
    const fullUnits = matchedCourse
      ? matchedCourse.units
      : deduced
      ? deduced.units
      : [];
    const unitsToCover = selectedUnits.length > 0 ? selectedUnits : fullUnits;

    const finalCurriculum = matchedCourse
      ? `${matchedCourse.description} | ${matchedCourse.curriculumDetails} | Units: ${unitsToCover.join("; ")}`
      : deduced
      ? `${deduced.description} | ${deduced.curriculumDetails} | Units: ${unitsToCover.join("; ")}`
      : "Custom student lecture notes, syllabus, and textbook excerpt.";
    const finalExamFocus = matchedCourse
      ? matchedCourse.examFocus
      : deduced
      ? deduced.examFocus
      : "Tiered definitions, why/how causal prompts, and AP-style stimulus problems.";
    const finalStrategy = matchedCourse
      ? matchedCourse.studyStrategy
      : deduced
      ? deduced.studyStrategy
      : "FSRS active recall, Feynman explanation, and interleaved problem practice.";

    const payload = {
      schoolName,
      courseCode: targetCode,
      courseName: finalCourseName,
      department: finalDepartment,
      curriculumDetails: finalCurriculum,
      examFocus: finalExamFocus,
      studyStrategy: finalStrategy,
      units: unitsToCover,
      pastedText: pastedNotes.trim(),
      additionalNotes: `Student is targeting a grade of ${targetGrade}% and currently holds ${currentGrade}%. Final weight: ${finalWeight}%. ${
        testDate ? `Target Exam Date: ${testDate}. ` : ""
      }${
        attachedFile
          ? `CRITICAL: Student uploaded study sheet "${attachedFile.name}". Extract specific formulas, terms, and exam problems directly from it.`
          : ""
      }`,
      fileBase64: attachedFile?.base64 || null,
      fileMimeType: attachedFile?.mimeType || null,
    };

    try {
      const deckData = await postJsonOrNdjson<any>("/api/analyze-finals-material", payload, {
        timeoutMs: 92_000,
        onProgress: (msg) => setLiveStatus(msg),
      });

      const completeDeck: StudyDeck = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        schoolName,
        courseCode: targetCode,
        courseName: finalCourseName,
        units: unitsToCover,
        testDate: testDate || undefined,
        summary: deckData.summary,
        timeline: deckData.timeline,
        flashcards: deckData.flashcards,
        quiz: deckData.quiz,
        additionalNotes: `Target check: current grade is ${currentGrade}%, need ${calcResult.needed.toFixed(1)}% on the final exam.`,
        pastedTextSnippet: pastedNotes.trim() ? pastedNotes.trim().slice(0, 6000) : undefined,
      };

      const prevSaved = localStorage.getItem("dev_study_decks");
      const currentSaved = prevSaved ? JSON.parse(prevSaved) : [];
      localStorage.setItem("dev_study_decks", JSON.stringify([completeDeck, ...currentSaved]));
      syncDeckToFSRS(completeDeck);

      onAnalysisComplete(completeDeck);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Live AI generation failed unexpectedly. Please click Try Again.");
    } finally {
      setLiveStatus(null);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runGeneration();
  };

  return (
    <div className="space-y-6">
      {/* Final Grade Target Estimator */}
      <section
        id="grade-target-section"
        className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-950 border border-white/10 rounded-xl text-purple-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-purple-400">Grade Protection Calculator</div>
              <h2 className="font-display text-base font-bold text-white tracking-tight">
                Final Exam Target Score Estimator
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] font-mono text-zinc-400">Required Final Score</div>
              <div
                className={`font-mono text-xl font-bold tabular-nums ${
                  calcResult.needed > 100
                    ? "text-red-400"
                    : calcResult.needed > 90
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {calcResult.needed.toFixed(1)}%
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCalculatorOpen(!calculatorOpen)}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {calculatorOpen ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {calculatorOpen && (
          <div className="mt-5 pt-5 border-t border-white/10 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 bg-zinc-950/80 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-current-grade" className="font-medium text-zinc-300">
                    Current Grade
                  </label>
                  <span className="font-mono font-bold text-white tabular-nums">{currentGrade}%</span>
                </div>
                <input
                  id="slider-current-grade"
                  type="range"
                  min="30"
                  max="100"
                  value={currentGrade}
                  onChange={(e) => setCurrentGrade(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div className="space-y-2 bg-zinc-950/80 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-final-weight" className="font-medium text-zinc-300">
                    Final Weight
                  </label>
                  <span className="font-mono font-bold text-white tabular-nums">{finalWeight}%</span>
                </div>
                <input
                  id="slider-final-weight"
                  type="range"
                  min="5"
                  max="50"
                  value={finalWeight}
                  onChange={(e) => setFinalWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div className="space-y-2 bg-zinc-950/80 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-target-grade" className="font-medium text-zinc-300">
                    Target Grade
                  </label>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">{targetGrade}%</span>
                </div>
                <input
                  id="slider-target-grade"
                  type="range"
                  min="50"
                  max="100"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                calcResult.needed > 100
                  ? "bg-red-950/30 border-red-500/40 text-red-200"
                  : calcResult.needed > 90
                  ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                  : "bg-emerald-950/30 border-emerald-400/40 text-emerald-200"
              }`}
            >
              {calcResult.needed > 90 ? (
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    calcResult.needed > 100 ? "text-red-400" : "text-amber-400"
                  }`}
                />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              )}
              <div className="text-xs leading-relaxed">
                <span className="font-mono font-bold mr-2">{calcResult.label}:</span>
                <span className="text-zinc-200">{calcResult.text}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Course Study Deck & Input-to-Quiz Studio */}
      <section
        id="material-uploader-card"
        className="bg-[#0B0B10]/85 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-7 border-b border-white/10 bg-zinc-950/60">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
              <Target className="h-4 w-4" />
              <span>Bozz GPT Note Ingestion &amp; D&apos;Evelyn High School Catalog</span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Build Predictive Exam Deck &amp; FSRS Queue
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Select from all {PRESET_COURSES.length} D&apos;Evelyn Jr./Sr. High School classes across every department and unit, paste raw lecture notes or textbook excerpts, or attach a teacher review PDF.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">
          {/* 1. Course Code + Target Test Date */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="course-search-field" className="text-xs font-semibold text-zinc-200">
                  1. Course Code or Custom Subject
                </label>
                <span className="text-xs font-mono text-zinc-400 truncate max-w-xs">
                  {selectedPreset
                    ? `Selected: ${selectedPreset.name}`
                    : courseCode
                    ? `Custom: ${courseCode}`
                    : "Optional if pasting notes"}
                </span>
              </div>
              <input
                id="course-search-field"
                type="text"
                value={courseCode}
                onChange={(e) => handleCustomCodeChange(e.target.value)}
                placeholder="Type any code (e.g. MATH_PRECALC, 10157H05012, SCI_CHEM_H, ENG10, CIV10)"
                className="w-full px-4 py-3 bg-zinc-950 border border-white/10 focus:border-purple-400 focus:outline-none rounded-xl font-mono text-sm text-white placeholder:font-sans placeholder:text-zinc-500"
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <label htmlFor="deck-test-date" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Target Test Date</span>
              </label>
              <input
                id="deck-test-date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-white/10 focus:border-emerald-400 focus:outline-none rounded-xl font-mono text-sm text-white"
              />
            </div>
          </div>

          {/* 2. D'Evelyn Full Catalog */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200">
                  2. D&apos;Evelyn High School Course Catalog
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-mono tabular-nums">
                  Showing {filteredCourses.length} of {PRESET_COURSES.length} official courses
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter classes or units..."
                  className="w-full pl-8 pr-8 py-2 bg-zinc-950 border border-white/10 focus:border-purple-400 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                    aria-label="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-950/90 border border-white/10 rounded-xl">
              {DEPARTMENTS.map((dept) => {
                const active = selectedDepartment === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                      active
                        ? "bg-purple-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    {dept} ({departmentCounts[dept]})
                  </button>
                );
              })}
            </div>

            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950/60 border border-white/10 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-zinc-300">
                  No D&apos;Evelyn courses matched &ldquo;{catalogSearch}&rdquo; in {selectedDepartment}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogSearch("");
                    setSelectedDepartment("All");
                  }}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {filteredCourses.map((course) => {
                  const isSelected = selectedPreset?.code === course.code;
                  return (
                    <button
                      key={course.code}
                      type="button"
                      onClick={() => handleSelectPreset(course)}
                      className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-purple-400 bg-purple-500/10"
                          : "border-white/10 bg-zinc-950/75 hover:border-white/25 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 tabular-nums">
                          <span className={isSelected ? "text-purple-300 font-semibold" : "text-zinc-300 font-semibold"}>
                            {course.code}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="truncate">{course.department}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{course.name}</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400 tabular-nums">
                        <span className="truncate">{course.gradeLevel || "Grades 9–12"}</span>
                        <span className={isSelected ? "text-emerald-400 font-semibold" : "text-zinc-400"}>
                          {course.units.length} units
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Course Unit Checklist */}
          {activeCourseUnits.length > 0 && (
            <div className="bg-zinc-950/75 border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-start gap-2.5">
                  <BookOpen className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {selectedPreset ? selectedPreset.name : deduceCourse(courseCode).name} — Course Units
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono tabular-nums">
                      {selectedUnits.length} of {activeCourseUnits.length} units selected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllUnits}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold text-purple-400 hover:text-purple-300 bg-zinc-900 border border-white/10 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearUnits}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/10 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeCourseUnits.map((unit, idx) => {
                  const checked = selectedUnits.includes(unit);
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => toggleUnit(unit)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                        checked
                          ? "bg-purple-500/10 border-purple-400/45 text-zinc-100"
                          : "bg-zinc-900/50 border-white/10 text-zinc-400 hover:border-white/25"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">
                        <span className="font-mono text-[11px] text-zinc-500 mr-1.5 tabular-nums">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        {unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Input-to-Quiz Raw Notes + PDF Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-2">
              <label htmlFor="raw-notes-input" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <ClipboardPaste className="h-3.5 w-3.5 text-emerald-400" />
                <span>3. Input-to-Quiz: Paste Class Notes, Syllabus, or Textbook Excerpt (Optional)</span>
              </label>
              <textarea
                id="raw-notes-input"
                rows={6}
                value={pastedNotes}
                onChange={(e) => setPastedNotes(e.target.value)}
                placeholder="Paste raw lecture notes, primary sources, AP rubric prompts, or review outlines here. AI generates tiered definitions, why/how questions, and AP stimulus assessments directly from your text."
                className="w-full p-3.5 bg-zinc-950 border border-white/10 focus:border-emerald-400 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="lg:col-span-5 space-y-2 flex flex-col justify-between">
              <span className="text-xs font-semibold text-zinc-200">
                4. Teacher Review Sheet PDF (Optional)
              </span>
              <div className="border border-white/15 hover:border-purple-400/70 bg-zinc-950/75 hover:bg-zinc-900 rounded-xl p-4 transition-colors text-center relative cursor-pointer group flex-1 flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept=".pdf,text/plain,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-purple-400 mb-2">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-zinc-200">Drop PDF or Click to Browse</div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">Max 15MB · TXT or PDF</div>
              </div>

              {attachedFile && (
                <div className="flex items-center justify-between bg-zinc-950 border border-emerald-400/40 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{attachedFile.name}</p>
                      <p className="text-[10px] font-mono text-zinc-400">{attachedFile.size}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-zinc-400 hover:text-red-400 p-1 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* School Name */}
          <div className="space-y-1.5">
            <label htmlFor="school-name-input" className="block text-xs font-semibold text-zinc-300">
              High School Name (Optional)
            </label>
            <input
              id="school-name-input"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full md:max-w-xs px-3.5 py-2.5 bg-zinc-950 border border-white/10 focus:border-purple-400 rounded-xl focus:outline-none text-xs font-medium text-white"
            />
          </div>

          {/* Submit Bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-2.5 text-xs text-zinc-400 max-w-lg">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Generates unit cheat sheets, a 5-day FSRS-ready schedule, 14–16 predictive flashcards, and a 25-question tiered mock exam.
              </p>
            </div>

            <button
              id="analyze-submit-button"
              type="submit"
              disabled={isLoading || !canSubmit}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                isLoading
                  ? "bg-emerald-400/80 text-zinc-950 cursor-not-allowed"
                  : !canSubmit
                  ? "bg-zinc-800 text-zinc-500 border border-white/10 cursor-not-allowed"
                  : "bg-emerald-400 hover:bg-emerald-300 text-zinc-950 shadow-lg shadow-emerald-400/15 active:scale-[0.98]"
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-zinc-950 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-mono text-xs text-zinc-950 font-semibold truncate max-w-xs">
                    {liveStatus || LOADING_PHRASES[loadingPhraseIndex]}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Generate Study Deck &amp; Mock Exam</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              id="uploader-error-alert"
              className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs font-medium text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button
                type="button"
                onClick={runGeneration}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-100 font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                Try Again
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
