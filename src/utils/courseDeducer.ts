import { PRESET_COURSES } from "../data/courses";

export interface DeducedCourseInfo {
  code: string;
  name: string;
  department: 'English' | 'Social Studies' | 'Foreign Language' | 'Mathematics' | 'Science' | 'Fine Arts' | 'Electives';
  description: string;
  curriculumDetails: string;
  examFocus: string;
  studyStrategy: string;
  units: string[];
}

const LEGACY_CODE_ALIASES: Record<string, string> = {
  CS_COMP_SCI: "10157H05012",
  SCI_CHEM: "SCI_CHEM_H",
  LATIN_IV_AP: "LATIN_AP",
  MATH_ALG2_TRIG: "MATH_ALG2",
  APUSH: "HIST_APUSH",
  AP_CHEM: "AP_CHEM",
  AP_BIO: "SCI_AP_BIO",
  AP_CALC_AB: "MATH_AP_CALC_AB",
  AP_CALC_BC: "MATH_AP_CALC_BC",
  AP_STATS: "MATH_AP_STATS",
  AP_GOV: "HIST_AP_GOV",
  AP_MACRO: "HIST_AP_MACRO",
  AP_PSYCH: "HIST_AP_PSYCH",
  AP_LANG: "ENG_AP_LANG",
  AP_LIT: "ENG_AP_LIT"
};

export function deduceCourse(inputCode: string): DeducedCourseInfo {
  const code = (inputCode || "").trim();
  const upper = code.toUpperCase();

  const aliasCode = LEGACY_CODE_ALIASES[upper] || upper;
  const presetMatch = PRESET_COURSES.find(
    (c) =>
      c.code.toUpperCase() === aliasCode ||
      c.code.toUpperCase() === upper ||
      c.name.toUpperCase() === upper
  );

  if (presetMatch) {
    return {
      code: inputCode,
      name: presetMatch.name,
      department: presetMatch.department,
      description: presetMatch.description,
      curriculumDetails: presetMatch.curriculumDetails,
      examFocus: presetMatch.examFocus,
      studyStrategy: presetMatch.studyStrategy,
      units: presetMatch.units
    };
  }

  let department: DeducedCourseInfo['department'] = 'Electives';
  let name = "";
  let description = "";
  let curriculumDetails = "";
  let examFocus = "";
  let studyStrategy = "";
  let units: string[] = [];

  let scedSubject = "";
  if (/^\d{2}/.test(upper)) {
    scedSubject = upper.substring(0, 2);
  }

  const hasWord = (word: string) => upper.includes(word);
  const hasAnyWord = (words: string[]) => words.some(word => upper.includes(word));

  // MATHEMATICS
  if (
    scedSubject === "02" ||
    hasAnyWord(["ALG", "CALC", "TRIG", "GEOM", "MATH", "STAT", "ALGEBRA", "CALCULUS", "GEOMETRY", "TRIGONOMETRY", "STATISTICS", "PRECALC", "PROBABILITY", "MATH_"])
  ) {
    department = "Mathematics";
    if (hasWord("ALG") || hasWord("ALGEBRA")) {
      const isNum3 = hasWord("3") || hasWord("III");
      const isNum2 = hasWord("2") || hasWord("II") || hasWord("02056");
      name = `Algebra ${isNum3 ? "III" : isNum2 ? "II" : "I"}`;
    } else if (hasWord("CALC") || hasWord("CALCULUS")) {
      name = hasWord("BC") ? "Calculus BC" : "Calculus AB";
    } else if (hasWord("TRIG") || hasWord("TRIGONOMETRY")) {
      name = "Trigonometry";
    } else if (hasWord("GEOM") || hasWord("GEOMETRY")) {
      name = "Geometry";
    } else if (hasWord("STAT") || hasWord("STATISTICS")) {
      name = "Statistics";
    } else if (hasWord("PRECALC") || hasWord("PRE CALCULUS") || hasWord("PRE-CALC")) {
      name = "Pre-Calculus";
    } else {
      name = "Mathematics";
    }

    description = `A comprehensive high school ${name} course designed to build mathematical reasoning, formal analytical problem solving, and algebraic fluency.`;
    curriculumDetails = "Axiomatic frameworks, rigorous equation solving, parameter transformations, proof structures, and computational accuracy.";
    examFocus = "Step-by-step problem layout, verifying restrictions, precise algebraic simplifications, and graphing key boundaries.";
    studyStrategy = "Solve target practice problems, verify your steps with active diagnostics, read cheat sheets for core formulas, and keep variables aligned.";
    units = [
      "Unit 1: Core Algebraic & Functional Foundations",
      "Unit 2: Equations, Inequalities & Systems",
      "Unit 3: Coordinate Graphing & Transformations",
      "Unit 4: Proofs, Theorems & Analytical Problem Solving",
      "Unit 5: Cumulative Modeling & Multi-Step Applications"
    ];
  }
  // SCIENCE
  else if (
    scedSubject === "03" ||
    hasAnyWord(["CHEM", "PHYS", "BIO", "SCI", "CHEMISTRY", "PHYSICS", "BIOLOGY", "SCIENCE", "ASTRONOMY", "GEOLOGY", "ECOLOGY", "ANATOMY", "PHYSIOLOGY", "ENVSCI", "EARTH", "COSMO"])
  ) {
    department = "Science";
    if (hasWord("CHEM") || hasWord("CHEMISTRY")) {
      name = "Chemistry";
    } else if (hasWord("PHYS") || hasWord("PHYSICS")) {
      name = "Physics";
    } else if (hasWord("BIO") || hasWord("BIOLOGY")) {
      name = "Biology";
    } else if (hasWord("ENV") || hasWord("ECOLOGY") || hasWord("EARTH")) {
      name = "Environmental Science";
    } else if (hasWord("ANAT") || hasWord("PHYSIOLOGY")) {
      name = "Anatomy & Physiology";
    } else if (hasWord("ASTRO") || hasWord("COSMO")) {
      name = "Astronomy";
    } else {
      name = "Science";
    }

    description = `An intensive, inquiry-driven high school study of ${name} principles, quantitative laboratory equations, and structural material balances.`;
    curriculumDetails = "Stoichiometric calculations, dimensional analysis, reaction mechanisms, biochemical systems, laws of motion, conservation principles, and empirical research modeling.";
    examFocus = "Unit conversions, diagram annotations, equilibrium shifts, formula balancing, and rigorous short-answer reasoning justifications.";
    studyStrategy = "Draft process diagrams from memory, track variable units through all equations, review structural constants, and practice diagnostic exams.";
    units = [
      "Unit 1: Scientific Inquiry, Measurement & Quantitative Foundations",
      "Unit 2: Atomic/Molecular or Cellular Foundations",
      "Unit 3: Energy Transfer, Reactions & Conservation Principles",
      "Unit 4: Systems Dynamics, Equilibrium & Data Analysis",
      "Unit 5: Cumulative Experimental Reasoning & Lab Synthesis"
    ];
  }
  // SOCIAL STUDIES / HISTORY
  else if (
    scedSubject === "04" ||
    hasAnyWord(["HIST", "CIV", "GOV", "EURO", "APUSH", "US_HIST", "WHIST", "ECON", "MACRO", "PSYCH", "REL", "SOC", "HISTORY", "CIVICS", "GOVERNMENT", "EUROPEAN", "GEOGRAPHY", "SOCIOLOGY", "PSYCHOLOGY", "HUMANITIES"])
  ) {
    department = "Social Studies";
    if (hasWord("APUSH") || hasWord("US_HIST") || hasWord("AMER") || hasWord("U.S.") || hasWord("USA")) {
      name = "United States History";
    } else if (hasWord("EURO")) {
      name = "AP European History";
    } else if (hasWord("WORLD") || hasWord("WHIST")) {
      name = "World History";
    } else if (hasWord("CIV") || hasWord("CIVICS")) {
      name = "Civics & Civilization";
    } else if (hasWord("GOV") || hasWord("CONSTITUTION")) {
      name = "U.S. Government & Politics";
    } else if (hasWord("MACRO") || hasWord("ECON")) {
      name = hasWord("MACRO") ? "Macroeconomics" : "Economics";
    } else if (hasWord("PSYCH")) {
      name = "Psychology";
    } else if (hasWord("REL")) {
      name = "World Religions";
    } else if (hasWord("GEOG") || hasWord("GEOGRAPHY")) {
      name = "Geography";
    } else {
      name = "Social Studies";
    }

    description = `A rigorous thematic investigation of ${name}, tracking intellectual, socioeconomic, administrative, and spatial conflicts across historical eras.`;
    curriculumDetails = "Primary source analysis, argument development, geopolitical power balances, socio-economic trends, institutional treaties, and chronological timeline reviews.";
    examFocus = "Interpreting historical documents, comparing ideological schools of thought, causal argumentation, and structured short-essay responses.";
    studyStrategy = "Align major historical conflicts on visual timelines, match conceptual manifestos directly to their philosophical authors, and write quick essay outlines.";
    units = [
      "Unit 1: Early Foundations & Philosophical Roots",
      "Unit 2: Institutional Development & Constitutional/Social Order",
      "Unit 3: Conflict, Reform & Ideological Turning Points",
      "Unit 4: Modern Transformations & Global Connections",
      "Unit 5: Primary Source Synthesis & Argumentation"
    ];
  }
  // ENGLISH / LITERATURE
  else if (
    scedSubject === "01" ||
    hasAnyWord(["ENG", "LIT", "COMP", "WRIT", "JOURN", "MYTH", "RENAIS", "SPEECH", "ENGLISH", "LITERATURE", "WRITING", "COMPOSITION", "RHETORIC"])
  ) {
    department = "English";
    if (hasWord("COMP") || hasWord("WRIT") || hasWord("WRITING") || hasWord("COMPOSITION")) {
      name = "Composition & Rhetoric";
    } else if (hasWord("MYTH")) {
      name = "Mythology";
    } else if (hasWord("SPEECH")) {
      name = "Public Speaking";
    } else if (hasWord("LIT") || hasWord("LITERATURE")) {
      name = "Literature";
    } else if (hasWord("JOURN")) {
      name = "Journalism";
    } else {
      name = "English Language Arts";
    }

    description = "An advanced critical reading and analytical composition course focused on deconstructing literature, analyzing rhetoric, and mastering style syntax.";
    curriculumDetails = "Ethos, pathos, logos, syntax mechanisms, essay patterns, literary terms, reading comprehension, and structured comparative critiques.";
    examFocus = "Rhetorical device identification, reading passage annotations, comparative theme matching, and timed source-argument synthesis essays.";
    studyStrategy = "Annotate sample prompts, rehearse thesis designs under 5-minute constraints, memorize target rhetorical devices, and polish grammar mechanics.";
    units = [
      "Unit 1: Close Reading, Literary Elements & Poetic Devices",
      "Unit 2: Grammar, Syntax & Analytical Paragraph Structure",
      "Unit 3: Core Canonical Novels, Drama & Historical Context",
      "Unit 4: Rhetorical Analysis & Persuasive Argumentation",
      "Unit 5: Multi-Text Thematic Synthesis Essays"
    ];
  }
  // FOREIGN / WORLD LANGUAGES
  else if (
    scedSubject === "06" || upper.startsWith("24") ||
    hasAnyWord(["SPAN", "LAT", "FREN", "GERM", "CHIN", "JAPN", "LANG", "SPANISH", "LATIN", "FRENCH", "GERMAN", "CHINESE", "MANDARIN", "ITALIAN", "PORTUGUESE", "RUSSIAN"])
  ) {
    department = "Foreign Language";
    if (hasWord("SPAN") || hasWord("SPANISH")) {
      name = "Spanish";
    } else if (hasWord("LAT") || hasWord("LATIN")) {
      name = "Latin";
    } else if (hasWord("FREN") || hasWord("FRENCH")) {
      name = "French";
    } else if (hasWord("GERM") || hasWord("GERMAN")) {
      name = "German";
    } else if (hasWord("CHIN") || hasWord("CHINESE") || hasWord("MAND")) {
      name = "Chinese";
    } else {
      name = "World Language";
    }

    description = `An immersive modern and classical language program of ${name} focusing on verb morphological conjugation, syntactic translation, and cultural comprehension.`;
    curriculumDetails = "Grammar declensions/pronouns, verb mood and tense conjugations, syntax parsing, cultural context, and direct vocabulary translation rules.";
    examFocus = "Declension/conjugation matrices, matching vocabulary prompts, parsing multi-clause subjunctive phrases, and active reading translation.";
    studyStrategy = "Recite conjugation and declension ending charts daily, build direct vocabulary recall pairs, and annotate grammar rules.";
    units = [
      "Unit 1: Core Vocabulary & Present-System Structures",
      "Unit 2: Past Tense Narration & Pronoun Syntax",
      "Unit 3: Complex Clauses, Subjunctive Mood & Idioms",
      "Unit 4: Authentic Readings, Translation & Cultural Context"
    ];
  }
  // FINE AND PERFORMING ARTS
  else if (
    scedSubject === "05" ||
    hasAnyWord(["PHOTO", "ART", "DRAW", "PAINT", "CERAM", "JEWEL", "GUITAR", "MUS", "BAND", "CHOIR", "THEAT", "DRAMA", "GRAPH", "DSGN", "DESIGN", "PHOTOGRAPHY", "SCULPTURE", "CERAMICS", "ORCHESTRA", "ACTING", "DANCE"])
  ) {
    department = "Fine Arts";
    if (hasWord("PHOTO") || hasWord("PHOTOGRAPHY")) {
      name = "Photography";
    } else if (hasWord("CERAM") || hasWord("SCULPTURE") || hasWord("CERAMICS")) {
      name = "Ceramics & Sculpture";
    } else if (hasWord("PAINT")) {
      name = "Painting";
    } else if (hasWord("DRAW") || hasWord("ART")) {
      name = "Visual Arts";
    } else if (hasWord("GUITAR")) {
      name = "Guitar";
    } else if (hasWord("BAND") || hasWord("MUS") || hasWord("ORCHESTRA") || hasWord("MUSIC")) {
      name = "Music & Theory";
    } else if (hasWord("CHOIR") || hasWord("VOCAL")) {
      name = "Vocal Music";
    } else if (hasWord("THEAT") || hasWord("DRAMA") || hasWord("ACTING")) {
      name = "Theater & Acting";
    } else if (hasWord("GRAPH") || hasWord("DSGN") || hasWord("DESIGN")) {
      name = "Graphic Design";
    } else {
      name = "Fine Arts";
    }

    description = `A critique-driven studio and historical study of ${name} principles, aesthetic design matrices, technical media mastery, and composition.`;
    curriculumDetails = "Elements and principles of design/composition, technical studio processes, aesthetic theory, and historical/cultural movement analysis.";
    examFocus = "Technical process terminology, compositional critique, historical movement identification, and portfolio/performance analysis.";
    studyStrategy = "Assemble a visual study sheet of technical craft principles, memorize key movement characteristics, and practice formal critique vocabulary.";
    units = [
      "Unit 1: Elements, Principles & Technical Craft Foundations",
      "Unit 2: Studio/Performance Execution & Material Control",
      "Unit 3: Historical Movements & Aesthetic Theory",
      "Unit 4: Portfolio Critique & Cumulative Presentation"
    ];
  }
  // ELECTIVES / COMPUTER SCIENCE / PE
  else {
    department = "Electives";
    if (scedSubject === "10" || hasAnyWord(["10157", "CS", "COMP", "PROGRAM", "CODING", "PYTHON", "JAVA", "HTML", "SOFTWARE", "CSP"])) {
      if (hasAnyWord(["10157", "10157H05012", "CS_COMP_SCI"])) {
        name = "AP Computer Science A";
      } else if (hasWord("CSP")) {
        name = "AP Computer Science Principles";
      } else {
        name = "Computer Science";
      }
      description = "College-prep study of algorithmic computing, programming logic, data structures, and object-oriented software design.";
      curriculumDetails = "Variables, primitive types, conditional operators, iteration loops, classes and objects, 1D/2D arrays, ArrayLists, inheritance, and recursion.";
      examFocus = "Code tracing, nested loop output diagnostics, inheritance & polymorphism behavior, and algorithm implementation.";
      studyStrategy = "Trace variable values step-by-step with state tables, trace recursion call stacks, and practice FRQ algorithms without an IDE.";
      units = [
        "Unit 1: Primitive Types & Variables",
        "Unit 2: Objects, Strings & Boolean Control Flow",
        "Unit 3: Iteration & Loop Algorithms",
        "Unit 4: Classes, Arrays, ArrayLists & 2D Arrays",
        "Unit 5: Inheritance, Polymorphism & Recursion"
      ];
    } else if (hasAnyWord(["BUS", "FIN", "MARK", "BUSINESS", "MARKETING", "FINANCE", "ACCOUNT"])) {
      name = "Business & Finance";
      description = "A practical high school course in financial literacy, commercial markets, operational accounting, and economic systems.";
      curriculumDetails = "Asset calculations, compound interest, basic ledgers, market trends, supply/demand curves, and budget models.";
      examFocus = "Reconciling balances, solving rate multipliers, applying market graphs, and analyzing business scenarios.";
      studyStrategy = "Work compound interest checks on sample ledgers, practice balance sheet equations, and map market curves.";
      units = [
        "Unit 1: Financial Foundations & Compound Interest",
        "Unit 2: Accounting Equations & Ledgers",
        "Unit 3: Markets, Budgeting & Risk Management"
      ];
    } else if (hasAnyWord(["PE", "GYM", "FIT", "WEIGHT", "HEALTH", "NUTRITION", "SPORTS"])) {
      name = "Physical Education & Fitness";
      description = "Active study of physical conditioning, FITT training design, biomechanics, strength programming, and lifelong nutrition.";
      curriculumDetails = "Fitness components, target heart rate zones, progressive overload, lifting safety, muscular anatomy, and nutritional habits.";
      examFocus = "FITT principle parameters, heart-rate & training zone math, major muscle groups, and injury-prevention mechanics.";
      studyStrategy = "Memorize the 5 health-related fitness components, primary muscles per compound lift, and aerobic vs. anaerobic energy systems.";
      units = [
        "Unit 1: Health-Related Fitness Components & Goal Setting",
        "Unit 2: Cardiovascular Zones & FITT Programming",
        "Unit 3: Resistance Biomechanics, Safety & Muscle Groups",
        "Unit 4: Recovery, Hydration & Lifelong Nutrition"
      ];
    } else {
      name = inputCode.length <= 15 ? inputCode : "Academic Elective";
      description = `A cumulative high school course focused on structured research, cognitive skill building, and thematic problem solving in ${name}.`;
      curriculumDetails = "Foundational frameworks, concept maps, step-by-step reasoning structures, and technical terminology mastery.";
      examFocus = "Technical matching questions, analytical responses, and applied problem-solving scenarios.";
      studyStrategy = "Outline core course units chronologically or thematically and test recall with active practice quizzes.";
      units = [
        "Unit 1: Core Concepts & Terminology",
        "Unit 2: Methods, Processes & Frameworks",
        "Unit 3: Applied Analysis & Synthesis"
      ];
    }
  }

  const isAP = hasWord("AP") || hasWord("ADVANCED PLACEMENT") || (scedSubject === "05" && upper.includes("A")) || upper.endsWith("AP") || upper.startsWith("AP");
  const isHonors = hasWord("HONORS") || hasWord("HONOR") || hasWord("HON") || (scedSubject !== "" && upper.charAt(5) === "H") || upper.endsWith("H") || upper.startsWith("H");
  const isIB = hasWord("IB") || hasWord("INTERNATIONAL BACCALAUREATE") || upper.startsWith("IB") || upper.endsWith("IB");

  let finalName = name;
  if (isAP && !finalName.startsWith("AP")) {
    finalName = "AP " + finalName;
  } else if (isIB && !finalName.startsWith("IB")) {
    finalName = "IB " + finalName;
  } else if (isHonors && !finalName.includes("Honors")) {
    finalName = finalName + " Honors";
  }

  const numRegex = /\b(1|2|3|4|I|II|III|IV)\b/;
  const match = upper.match(numRegex);
  if (match && !finalName.includes(match[1]) && finalName !== "Calculus BC" && finalName !== "Calculus AB") {
    finalName = finalName + " " + match[1];
  }

  return {
    code: inputCode,
    name: finalName,
    department,
    description,
    curriculumDetails,
    examFocus,
    studyStrategy,
    units
  };
}
