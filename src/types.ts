export interface Course {
  code: string;
  name: string;
  department: 'English' | 'Social Studies' | 'Foreign Language' | 'Mathematics' | 'Science' | 'Fine Arts' | 'Electives';
  gradeLevel?: string;
  credit?: string;
  description: string;
  curriculumDetails: string;
  examFocus: string;
  studyStrategy: string;
  units: string[];
}

export interface StudySummary {
  title: string;
  curriculumExplanation: string;
  topTipsForFinal: string[];
  synthesizedNotesParagraph: string;
  coreCheatSheetMarkdown: string;
}

export interface TimelineDay {
  dayName: string;
  activityTitle: string;
  activityDescription: string;
}

export type AssessmentTier = 'definition' | 'why_how' | 'ap_stimulus';

export interface Flashcard {
  question: string;
  answer: string;
  unitTag?: string;
  tier?: AssessmentTier;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  unitTag?: string;
  tier?: AssessmentTier;
}

export interface ConceptNode {
  id: string;
  label: string;
  summary: string;
  unitTag: string;
  tier: 'core' | 'mechanism' | 'synthesis';
  x: number;
  y: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
  relation: string;
}

export interface ConceptTimelineEvent {
  sequence: string;
  title: string;
  detail: string;
}

export interface ConceptGraphData {
  title: string;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  timelineEvents: ConceptTimelineEvent[];
}

export interface StudyDeck {
  id: string;
  timestamp: string;
  schoolName?: string;
  courseCode: string;
  courseName: string;
  units?: string[];
  testDate?: string; // ISO YYYY-MM-DD anchored by student
  summary: StudySummary;
  timeline: TimelineDay[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  conceptGraph?: ConceptGraphData;
  additionalNotes?: string;
  pastedTextSnippet?: string;
}

// ==========================================
// FSRS SPACED REPETITION & TELEMETRY SCHEMAS
// ==========================================

export type FSRSRating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

export interface FSRSCardState {
  conceptId: string; // deterministic key: `${deckId}::fc::${index}`
  deckId: string;
  courseCode: string;
  courseName: string;
  question: string;
  answer: string;
  unitTag: string;
  tier: AssessmentTier;
  stability: number; // memory stability in days
  difficulty: number; // 1..10
  reps: number;
  lapses: number;
  errorCount: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  lastRating?: FSRSRating;
  lastReviewAt: string | null;
  dueAt: string; // ISO timestamp
}

export interface FeynmanEvaluation {
  overallScore: number; // 0-100
  logicalPrecision: number; // 0-100
  nuanceScore: number; // 0-100
  verdict: 'Mastered' | 'Partial' | 'Needs Review';
  strengths: string[];
  blindSpots: string[];
  refinedModelExplanation: string;
}

export interface SocraticRubric {
  claimScore: number; // 0-25
  evidenceScore: number; // 0-25
  reasoningScore: number; // 0-25
  counterargumentScore: number; // 0-25
  overallScore: number; // 0-100
}

export interface SocraticTurn {
  id: string;
  role: 'student' | 'moderator';
  content: string;
  challengeType?: 'Evidence Demand' | 'Counterargument' | 'Logical Precision' | 'Synthesis';
  probingQuestion?: string;
  textualEvidenceCheck?: string;
  rubric?: SocraticRubric;
  feedbackBullets?: string[];
  timestamp: string;
}

export interface SocraticSession {
  id: string;
  courseCode: string;
  courseName: string;
  topicPrompt: string;
  thesisStatement: string;
  turns: SocraticTurn[];
  latestRubric?: SocraticRubric;
  updatedAt: string;
}

export interface TelemetrySession {
  id: string;
  timestamp: string;
  mode: 'recall' | 'feynman' | 'royale' | 'boss' | 'socratic' | 'exam';
  courseCode: string;
  accuracyPct: number;
  avgLatencyMs: number;
  conceptsReviewed: number;
  xpEarned: number;
}

export interface ExamReadinessMetrics {
  examReadinessPct: number;
  currentRetentionPct: number;
  projectedTestDayRetentionPct: number;
  avgLatencySec: number;
  interleavedAccuracyPct: number;
  totalTrackedConcepts: number;
  dueNowCount: number;
  masteredCount: number;
  criticalWeakCount: number;
  totalXp: number;
  currentStreak: number;
  weakestConcepts: FSRSCardState[];
}

export type WorkspaceRoute =
  | 'command'
  | 'builder'
  | 'recall'
  | 'royale'
  | 'boss'
  | 'battle'
  | 'socratic'
  | 'map';

