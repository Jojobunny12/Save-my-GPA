import React, { useState, useEffect, useMemo } from "react";
import { Course, StudyDeck } from "../types";
import { PRESET_COURSES } from "../data/courses";
import { deduceCourse } from "../utils/courseDeducer";
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
  BookOpen
} from "lucide-react";

interface MaterialUploaderProps {
  onAnalysisComplete: (deck: StudyDeck) => void;
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
  "Electives"
];

const LOADING_PHRASES = [
  "Analyzing D'Evelyn syllabus, textbooks, and selected units...",
  "Predicting high-probability exam formulas, theorems, and traps...",
  "Generating predictive active recall flashcards across every unit...",
  "Writing 25 cumulative mock final exam questions...",
  "Verifying set-unique answer pools and step-by-step explanations...",
  "Formatting your 5-day D'Evelyn finals prep schedule...",
  "Finalizing your live AI study deck..."
];

export default function MaterialUploader({ onAnalysisComplete }: MaterialUploaderProps) {
  const [courseCode, setCourseCode] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<Course | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>("All");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState("D'Evelyn High School");

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
      Electives: 0
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
        base64: base64String
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

  const selectAllUnits = () => {
    setSelectedUnits([...activeCourseUnits]);
  };

  const clearUnits = () => {
    setSelectedUnits([]);
  };

  const calculateEstimate = () => {
    const c = currentGrade / 100;
    const w = finalWeight / 100;
    const t = targetGrade / 100;

    if (w <= 0 || w >= 1) {
      return {
        needed: 0,
        label: "Invalid Weight",
        text: "Enter a final exam weight between 1% and 99%."
      };
    }

    const needed = (t - c * (1 - w)) / w;
    const finalPercent = needed * 100;

    let label = "On Track";
    let text = "";
    if (finalPercent > 100) {
      label = "Stretch Target";
      text = `You would need ${finalPercent.toFixed(1)}% on the final to reach ${targetGrade}%. Aim for extra credit or adjust your target grade—and use this study deck to maximize your final score.`;
    } else if (finalPercent > 90) {
      label = "High Focus Required";
      text = `You need ${finalPercent.toFixed(1)}% on the final to hit ${targetGrade}%. Prioritize active recall flashcards and complete a full timed practice exam.`;
    } else if (finalPercent > 70) {
      label = "Achievable Target";
      text = `You need ${finalPercent.toFixed(1)}% on the final to reach ${targetGrade}%. Review the core cheat sheet and work through the practice questions consistently.`;
    } else if (finalPercent > 40) {
      label = "Strong Position";
      text = `You only need ${finalPercent.toFixed(1)}% on the final to maintain ${targetGrade}%. A focused refresher of key concepts will keep your grade secure.`;
    } else {
      label = "Well Ahead";
      text = `You need ${finalPercent.toFixed(1)}% on the final to reach ${targetGrade}%. You have a strong cushion—use the flashcards for a quick review.`;
    }

    return { needed: finalPercent, label, text };
  };

  const calcResult = calculateEstimate();

  const runGeneration = async () => {
    const targetCode = courseCode.trim();
    if (!targetCode) {
      setError("Please select a D'Evelyn course from the catalog or type a Course Code first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const matchedCourse =
      selectedPreset ||
      PRESET_COURSES.find((c) => c.code.toLowerCase() === targetCode.toLowerCase());
    const deduced = deduceCourse(targetCode);

    const finalCourseName = matchedCourse ? matchedCourse.name : deduced.name;
    const finalDepartment = matchedCourse ? matchedCourse.department : deduced.department;
    const fullUnits = matchedCourse ? matchedCourse.units : deduced.units;
    const unitsToCover = selectedUnits.length > 0 ? selectedUnits : fullUnits;

    const finalCurriculum = matchedCourse
      ? `${matchedCourse.description} | ${matchedCourse.curriculumDetails} | Units: ${unitsToCover.join("; ")}`
      : `${deduced.description} | ${deduced.curriculumDetails} | Units: ${unitsToCover.join("; ")}`;
    const finalExamFocus = matchedCourse ? matchedCourse.examFocus : deduced.examFocus;
    const finalStrategy = matchedCourse ? matchedCourse.studyStrategy : deduced.studyStrategy;

    const payload = {
      schoolName: schoolName,
      courseCode: targetCode,
      courseName: finalCourseName,
      department: finalDepartment,
      curriculumDetails: finalCurriculum,
      examFocus: finalExamFocus,
      studyStrategy: finalStrategy,
      units: unitsToCover,
      pastedText: "",
      additionalNotes: `Student is targeting a grade of ${targetGrade}% and currently holds a ${currentGrade}%. The final exam is worth ${finalWeight}% of the class grade. Predict actual D'Evelyn exam questions and high-trap flashcards across these ${unitsToCover.length} units: ${unitsToCover.join(" | ")}. ${
        attachedFile
          ? `CRITICAL: The student uploaded a custom study sheet PDF called "${attachedFile.name}". Carefully read this file for specific terms, math formulas, equations, facts, or questions, and construct the study deck, timelines, cheat sheets, and flashcards directly around its content. Keep math unicode clean and LaTeX-free.`
          : "No custom study file uploaded; predict cumulative D'Evelyn final exam content from official syllabus & textbooks across every unit listed above."
      }`,
      fileBase64: attachedFile?.base64 || null,
      fileMimeType: attachedFile?.mimeType || null
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 80_000);

    try {
      const response = await fetch("/api/analyze-finals-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        let errMessage = "Failed to generate live AI study deck for this course.";
        try {
          const errData = await response.json();
          if (errData?.error) errMessage = errData.error;
        } catch {
          // ignore non-JSON error body
        }
        throw new Error(errMessage);
      }

      const deckData = await response.json();

      const completeDeck: StudyDeck = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        schoolName: schoolName,
        courseCode: targetCode,
        courseName: finalCourseName,
        units: unitsToCover,
        summary: deckData.summary,
        timeline: deckData.timeline,
        flashcards: deckData.flashcards,
        quiz: deckData.quiz,
        additionalNotes: `Target check: current grade is ${currentGrade}%, need ${calcResult.needed.toFixed(1)}% on the final exam.`
      };

      const prevSaved = localStorage.getItem("dev_study_decks");
      const currentSaved = prevSaved ? JSON.parse(prevSaved) : [];
      localStorage.setItem("dev_study_decks", JSON.stringify([completeDeck, ...currentSaved]));

      onAnalysisComplete(completeDeck);
    } catch (err: any) {
      console.error(err);
      if (err?.name === "AbortError") {
        setError("Live AI generation timed out after 80 seconds. Click Try Again to retry.");
      } else {
        setError(
          err.message ||
            "Live AI generation failed unexpectedly. Please click Try Again."
        );
      }
    } finally {
      clearTimeout(timeoutId);
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
        className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-amber-400">Grade Protection Calculator</div>
              <h2 className="font-display text-base font-bold text-white tracking-tight">
                Final Exam Target Score Estimator
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] font-mono text-slate-400">Required Final Score</div>
              <div
                className={`font-mono text-xl font-bold tabular-nums ${
                  calcResult.needed > 100
                    ? "text-rose-400"
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
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {calculatorOpen ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {calculatorOpen && (
          <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-current-grade" className="font-medium text-slate-300">
                    Current Grade
                  </label>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {currentGrade}%
                  </span>
                </div>
                <input
                  id="slider-current-grade"
                  type="range"
                  min="30"
                  max="100"
                  value={currentGrade}
                  onChange={(e) => setCurrentGrade(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-final-weight" className="font-medium text-slate-300">
                    Final Weight
                  </label>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {finalWeight}%
                  </span>
                </div>
                <input
                  id="slider-final-weight"
                  type="range"
                  min="5"
                  max="50"
                  value={finalWeight}
                  onChange={(e) => setFinalWeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-target-grade" className="font-medium text-slate-300">
                    Target Grade
                  </label>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">
                    {targetGrade}%
                  </span>
                </div>
                <input
                  id="slider-target-grade"
                  type="range"
                  min="50"
                  max="100"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                calcResult.needed > 100
                  ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                  : calcResult.needed > 90
                  ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                  : "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
              }`}
            >
              {calcResult.needed > 90 ? (
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    calcResult.needed > 100 ? "text-rose-400" : "text-amber-400"
                  }`}
                />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              )}
              <div className="text-xs leading-relaxed">
                <span className="font-mono font-bold mr-2">{calcResult.label}:</span>
                <span className="text-slate-200">{calcResult.text}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Course Study Deck Builder */}
      <section
        id="material-uploader-card"
        className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="px-6 py-7 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <Target className="h-4 w-4" />
                <span>Complete D&apos;Evelyn High School Catalog</span>
              </div>
              <h2 className="font-display text-xl md:text-2xl font-extrabold text-white tracking-tight">
                Build Your Course Study Deck &amp; Mock Exam
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Browse all {PRESET_COURSES.length} D&apos;Evelyn Jr./Sr. High School classes across every department and unit, or type any custom course code to generate targeted flashcards, a 5-day plan, and a 25-question mock final exam.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">
          {/* 1. Course Code */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="course-search-field"
                className="text-xs font-semibold text-slate-200 tracking-wide"
              >
                1. Course Code
              </label>
              <span className="text-xs font-mono text-slate-400 truncate max-w-xs">
                {selectedPreset
                  ? `Selected: ${selectedPreset.name}`
                  : courseCode
                  ? `Custom Code: ${courseCode}`
                  : "Enter code or pick from catalog"}
              </span>
            </div>

            <input
              id="course-search-field"
              type="text"
              value={courseCode}
              onChange={(e) => handleCustomCodeChange(e.target.value)}
              placeholder="Type any course code (e.g. 10157H05012, 02064H05022, SCI_CHEM_H, ENG10, CIV10)"
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all duration-150 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-500"
            />
          </div>

          {/* 2. D'Evelyn Full High School Catalog */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
                  2. D&apos;Evelyn High School Course Catalog
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  Showing {filteredCourses.length} of {PRESET_COURSES.length} official high school courses
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter classes or units..."
                  className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors"
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer"
                    aria-label="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              {DEPARTMENTS.map((dept) => {
                const active = selectedDepartment === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                      active
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    {dept} ({departmentCounts[dept]})
                  </button>
                );
              })}
            </div>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  No D&apos;Evelyn courses matched &ldquo;{catalogSearch}&rdquo; in {selectedDepartment}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogSearch("");
                    setSelectedDepartment("All");
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredCourses.map((course) => {
                  const isSelected = selectedPreset?.code === course.code;
                  return (
                    <button
                      key={course.code}
                      type="button"
                      onClick={() => handleSelectPreset(course)}
                      className={`text-left p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-900"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 tabular-nums">
                          <span
                            className={
                              isSelected ? "text-amber-400 font-semibold" : "text-slate-300 font-semibold"
                            }
                          >
                            {course.code}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="truncate">{course.department}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{course.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                        <span className="truncate">{course.gradeLevel || "Grades 9–12"}</span>
                        <span className={isSelected ? "text-amber-400 font-semibold" : "text-slate-400"}>
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
            <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-start gap-2.5">
                  <BookOpen className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {selectedPreset ? selectedPreset.name : deduceCourse(courseCode).name} — Course Units
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      {selectedUnits.length} of {activeCourseUnits.length} units selected for study deck &amp; exam generation
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllUnits}
                    className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-slate-900 border border-slate-800 rounded-md cursor-pointer transition-colors whitespace-nowrap"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearUnits}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-md cursor-pointer transition-colors whitespace-nowrap"
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
                          ? "bg-amber-500/10 border-amber-500/40 text-slate-100"
                          : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">
                        <span className="font-mono text-[11px] text-slate-500 mr-1.5 tabular-nums">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        {unit}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedUnits.length === 0 && (
                <p className="text-[11px] text-amber-400 font-medium">
                  No individual units checked—all {activeCourseUnits.length} course units will be included automatically on generate.
                </p>
              )}
            </div>
          )}

          {/* 3. Target Study Guide / Notes PDF */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
              3. Study Guide or Notes PDF (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-700 hover:border-amber-500/70 bg-slate-950/70 hover:bg-slate-900/90 rounded-xl p-5 transition-all text-center relative cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,text/plain,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-2 py-2">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 group-hover:border-amber-500/50 transition-colors">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-200">
                    Drop PDF or Click to Browse
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Teacher review packets &amp; notes (Max 15MB)
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] font-mono font-semibold text-slate-400">
                    Attached Study Document
                  </h4>
                  {attachedFile ? (
                    <div className="mt-3 flex items-start justify-between bg-slate-900 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-slate-950 border border-slate-800 text-amber-400 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {attachedFile.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                            {attachedFile.size} · Ready for extraction
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="text-slate-400 hover:text-rose-400 p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col items-center justify-center text-center py-3 space-y-1">
                      <p className="text-xs text-slate-300 font-medium">No PDF attached yet</p>
                      <p className="text-[11px] text-slate-500">
                        Attach a review sheet to tailor questions directly to your teacher&apos;s packet.
                      </p>
                    </div>
                  )}
                </div>

                {attachedFile && (
                  <div className="mt-3 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Document attached and ready</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. School Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="school-name-input"
              className="block text-xs font-semibold text-slate-300"
            >
              High School Name (Optional)
            </label>
            <input
              id="school-name-input"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. D'Evelyn High School"
              className="w-full md:max-w-xs px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 text-xs font-medium text-white placeholder:text-slate-500"
            />
          </div>

          {/* Submit Bar */}
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-2.5 text-xs text-slate-400 max-w-lg">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Generates syllabus-aligned formula guides, a 5-day prep schedule, active recall flashcards, and a 25-question mock final exam across every selected unit.
              </p>
            </div>

            <button
              id="analyze-submit-button"
              type="submit"
              disabled={isLoading || !courseCode.trim()}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isLoading
                  ? "bg-amber-500/80 text-slate-950 cursor-not-allowed"
                  : !courseCode.trim()
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/15 active:scale-[0.98]"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-slate-950 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="font-mono text-xs text-slate-950 font-semibold truncate max-w-xs">
                    {LOADING_PHRASES[loadingPhraseIndex]}
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
              className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs font-medium text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button
                type="button"
                onClick={runGeneration}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-100 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-end sm:self-center"
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
