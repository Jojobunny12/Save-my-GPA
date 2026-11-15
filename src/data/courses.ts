import { Course } from "../types";
export type { Course };

export const PRESET_COURSES: Course[] = [
  // =========================================================================
  // ENGLISH (12 Courses)
  // =========================================================================
  {
    code: "ENG09",
    name: "Literature & Composition 9",
    department: "English",
    gradeLevel: "Grade 9",
    credit: "1.0 Credit · Required",
    description:
      "Foundational freshman English integrating literary genres, classical drama, grammar mechanics (BK English I), vocabulary, and structured analytical composition.",
    curriculumDetails:
      "Core works: Sophocles' Oedipus Rex & Antigone, Shakespeare's Julius Caesar, Hesse's Siddhartha, Buck's The Good Earth; summer reading: Hemingway's The Old Man and the Sea and Cather's O Pioneers!; BK English Language Handbook Level I & Adventures in Appreciation.",
    examFocus:
      "Literary genre & term identification, classical tragedy & Aristotelian dramatic irony, grammar/usage mechanics, close-reading passages, and timed analytical essays.",
    studyStrategy:
      "Map tragic flaws and character foils across Sophocles and Shakespeare, memorize BK English clause/comma/modifier rules, and practice outlining thesis statements from prompt quotes.",
    units: [
      "Unit 1: Summer Reading Synthesis — The Old Man and the Sea & O Pioneers!",
      "Unit 2: Grammar, Parts of Speech, Clauses & Sentence Mechanics (BK English I)",
      "Unit 3: Short Fiction & Narrative Craft (Adventures in Appreciation)",
      "Unit 4: Greek Tragedy — Sophocles' Oedipus Rex & Antigone",
      "Unit 5: Shakespearean Drama & Rhetoric — Julius Caesar",
      "Unit 6: Spiritual & Philosophical Quest — Hermann Hesse's Siddhartha",
      "Unit 7: Historical & Cultural Novel — Pearl S. Buck's The Good Earth",
      "Unit 8: Poetry Analysis, Figurative Language & Structured Composition"
    ]
  },
  {
    code: "ENG10",
    name: "British Literature & Composition",
    department: "English",
    gradeLevel: "Grade 10",
    credit: "1.0 Credit · Required",
    description:
      "Chronological survey of British literature examining how historical eras, moral values, and social institutions shape poetry, drama, satire, and the novel.",
    curriculumDetails:
      "Core works: Beowulf, Chaucer's Canterbury Tales, Milton's Paradise Lost, Pope, Swift's satire, Shakespeare's Macbeth, Brontë's Jane Eyre, Wordsworth, Arnold; summer reading: Orwell's 1984; BK English Language Handbook Level II & Adventures in English Literature.",
    examFocus:
      "Historical-period author matching, Shakespearean close reading in Macbeth, Victorian & Romantic themes, satire analysis, grammar/usage, and comparative essays.",
    studyStrategy:
      "Build a timeline linking Anglo-Saxon, Medieval, Renaissance, Neoclassical, Romantic, and Victorian values directly to representative quotes and texts.",
    units: [
      "Unit 1: Dystopian Summer Reading & Authoritarian Rhetoric — Orwell's 1984",
      "Unit 2: Anglo-Saxon Epic & Heroic Code — Beowulf",
      "Unit 3: Medieval Frame Narrative & Estate Satire — Chaucer's The Canterbury Tales",
      "Unit 4: Elizabethan Tragedy & Ambition — Shakespeare's Macbeth",
      "Unit 5: Seventeenth-Century Epic & Sonnet Tradition — John Milton & Metaphysical Poets",
      "Unit 6: Restoration & Eighteenth-Century Satire — Alexander Pope & Jonathan Swift",
      "Unit 7: Romanticism & Victorian Poetry — Wordsworth & Matthew Arnold",
      "Unit 8: The Victorian Gothic & Moral Autonomy Novel — Charlotte Brontë's Jane Eyre",
      "Unit 9: Advanced Grammar, Parallelism & Analytical Essay Writing (BK English II)"
    ]
  },
  {
    code: "ENG11",
    name: "American Literature & Composition",
    department: "English",
    gradeLevel: "Grade 11",
    credit: "1.0 Credit · Required",
    description:
      "Survey of American literature tracing Puritan foundations, Revolutionary rhetoric, Romanticism, Transcendentalism, Realism, and Modernism.",
    curriculumDetails:
      "Core texts: Bradford, Franklin, Paine, Hawthorne's The Scarlet Letter, Poe, Emerson, Thoreau, Crane's The Red Badge of Courage, Dickinson, Sandburg, Frost, Fitzgerald's The Great Gatsby (summer reading), Wilder, and Anderson (Adventures in American Literature).",
    examFocus:
      "Literary movement identification, historical-cultural context matching, passage explication, and thematic essay synthesis on American ideals.",
    studyStrategy:
      "Contrast Puritanism, Rationalism, Transcendentalism, Realism/Naturalism, and Modernism through primary excerpts and motif comparisons.",
    units: [
      "Unit 1: The American Dream & Modernist Illusion — Fitzgerald's The Great Gatsby",
      "Unit 2: Colonial & Puritan Voices — William Bradford & Early American Prose",
      "Unit 3: Age of Reason & Revolutionary Rhetoric — Benjamin Franklin & Thomas Paine",
      "Unit 4: Dark Romanticism & Moral Allegory — Hawthorne's The Scarlet Letter & Edgar Allan Poe",
      "Unit 5: Transcendentalism & Self-Reliance — Ralph Waldo Emerson & Henry David Thoreau",
      "Unit 6: Civil War Realism & Naturalism — Stephen Crane's The Red Badge of Courage",
      "Unit 7: American Poetic Voices — Emily Dickinson, Carl Sandburg & Robert Frost",
      "Unit 8: Early Twentieth-Century Fiction & Drama — Sherwood Anderson & Thornton Wilder",
      "Unit 9: Sophisticated Argumentative & Literary Synthesis Composition"
    ]
  },
  {
    code: "ENG_AP_LANG",
    name: "AP English Language & Composition",
    department: "English",
    gradeLevel: "Grade 11",
    credit: "1.0 Credit · AP",
    description:
      "Introductory college-level rhetoric and composition integrating D'Evelyn's American Literature canon with nonfiction speeches, essays, and visual arguments.",
    curriculumDetails:
      "Rhetorical situation (exigence, audience, purpose), claims & evidence, reasoning & organization, style/syntax, plus American Literature works (The Scarlet Letter, The Red Badge of Courage, The Great Gatsby, Emerson, Thoreau, Paine).",
    examFocus:
      "AP Language MCQ reading & writing/revision questions plus three timed FRQs: Synthesis Essay, Rhetorical Analysis Essay, and Argument Essay.",
    studyStrategy:
      "Practice SPACECAT rhetorical breakdowns on speeches, build a versatile evidence bank across history/literature, and drill line-of-reasoning thesis statements.",
    units: [
      "Unit 1: Rhetorical Situation, Claims & Evidence (Nonfiction & Gatsby Foundation)",
      "Unit 2: Persuasive Appeals (Ethos, Pathos, Logos) & Revolutionary Rhetoric",
      "Unit 3: Reasoning, Organization & Argument Structure (Toulmin & Rogerian Models)",
      "Unit 4: Style, Diction, Syntax & Tone in American Romanticism & Transcendentalism",
      "Unit 5: Synthesis Essay — Evaluating & Integrating Multi-Source Evidence",
      "Unit 6: Rhetorical Analysis — Deconstructing Speeches, Letters & Visual Arguments",
      "Unit 7: Open Argumentation — Defending, Challenging & Qualifying Claims",
      "Unit 8: American Literature Core Integration (Scarlet Letter, Red Badge, Frost/Dickinson)"
    ]
  },
  {
    code: "ENG12",
    name: "Classic Literature & Composition",
    department: "English",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · Required",
    description:
      "Senior capstone study of timeless world novels, tragedy, modern drama, and rhetorical essays from The Norton Reader alongside logical argumentation.",
    curriculumDetails:
      "Core texts: Dickens's A Tale of Two Cities, Turgenev's Fathers and Sons, Ellison's Invisible Man, Shakespeare's Othello & King Lear, Miller's Death of a Salesman, Ibsen's A Doll's House, The Norton Reader; summer reading: Steinbeck's The Grapes of Wrath & Salinger's The Catcher in the Rye.",
    examFocus:
      "Cross-text thematic comparison, Aristotelian & Shakespearean tragedy, essay analysis, logical fallacies & argumentation, and multi-text synthesis essays.",
    studyStrategy:
      "Trace recurring motifs of justice, alienation, generational conflict, and tragic blindness across Dickens, Turgenev, Ellison, Shakespeare, Ibsen, and Miller.",
    units: [
      "Unit 1: Summer Reading Synthesis — The Grapes of Wrath & The Catcher in the Rye",
      "Unit 2: Historical Novel & Revolution — Charles Dickens's A Tale of Two Cities",
      "Unit 3: Russian Realism & Nihilism — Ivan Turgenev's Fathers and Sons",
      "Unit 4: Shakespearean Tragedy — Othello & King Lear",
      "Unit 5: Modern Social Drama — Henrik Ibsen's A Doll's House & Arthur Miller's Death of a Salesman",
      "Unit 6: Identity, Race & Existentialism — Ralph Ellison's Invisible Man",
      "Unit 7: Nonfiction Essay & Rhetoric Study (The Norton Reader)",
      "Unit 8: Formal Logic, Argumentation & Senior Analytical Composition"
    ]
  },
  {
    code: "ENG_AP_LIT",
    name: "AP English Literature & Composition",
    department: "English",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · AP",
    description:
      "College-level literary analysis combining D'Evelyn's Classic Literature canon with postmodern fiction, Romantic odes, and AP prose/poetry explication.",
    curriculumDetails:
      "All Classic Literature 12 works (Tale of Two Cities, Fathers and Sons, Invisible Man, Othello, King Lear, Death of a Salesman, A Doll's House, Grapes of Wrath, Catcher in the Rye) plus Don DeLillo's White Noise, John Keats's Odes, and James Joyce's 'The Dead'.",
    examFocus:
      "55 AP Literature MCQ passages (poetry & prose) and 3 FRQs: Poetry Analysis, Prose Fiction Analysis, and Literary Argument (Open Question).",
    studyStrategy:
      "Master poetic form, meter, shift/volta, and imagery in Keats; prepare 4–5 deeply analyzed novels/plays (Othello, King Lear, Invisible Man, White Noise) for FRQ3.",
    units: [
      "Unit 1: Short Fiction & Narrative Complexity (James Joyce's 'The Dead' & Modern Short Prose)",
      "Unit 2: Poetry I — Metaphor, Imagery, Tone & John Keats's Odes",
      "Unit 3: Longer Fiction — Dickens's A Tale of Two Cities & Turgenev's Fathers and Sons",
      "Unit 4: Shakespearean Tragedy & Dramatic Irony — Othello & King Lear",
      "Unit 5: Modernist & Social Tragedy — A Doll's House & Death of a Salesman",
      "Unit 6: Identity & Structural Symbolism — Ralph Ellison's Invisible Man",
      "Unit 7: Postmodern Satire & Consumer Culture — Don DeLillo's White Noise",
      "Unit 8: Timed Poetry, Prose & Open Literary Argumentation Practice (FRQ 1–3)"
    ]
  },
  {
    code: "ENG_CREATIVE",
    name: "Creative Writing",
    department: "English",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Elective",
    description:
      "Workshop-based writing course developing craft, revision discipline, and peer critique across poetry, short fiction, and personal narrative.",
    curriculumDetails:
      "Texts: Michael Bugeja's The Art and Craft of Poetry, Janet Burrow's Writing Fiction, and Tania Runyan's How to Write a College Application Essay. Covers poetic meter/imagery, characterization, point of view, dialogue, and workshopping.",
    examFocus:
      "Literary craft terminology (prosody, meter, POV, scene vs. summary), diagnostic critique of drafts, and polished original portfolio pieces.",
    studyStrategy:
      "Memorize key poetic forms and fiction narrative techniques, and practice identifying concrete sensory detail versus abstract exposition.",
    units: [
      "Unit 1: Poetic Craft, Sound Devices & Imagery (Bugeja)",
      "Unit 2: Formal Verse, Meter & Free-Verse Lineation",
      "Unit 3: Fiction Characterization, Point of View & Conflict (Burrow)",
      "Unit 4: Scene Construction, Setting & Authentic Dialogue",
      "Unit 5: Creative Nonfiction & Personal Narrative (College Application Essay)",
      "Unit 6: Peer Workshop Critique, Revision & Portfolio Publishing"
    ]
  },
  {
    code: "ENG_ADV_CREATIVE",
    name: "Advanced Creative Writing: Fiction & Poetry",
    department: "English",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Elective",
    description:
      "Advanced genre-focused workshop in fiction or poetry culminating in editorial curation and publication of D'Evelyn's literary magazine, Voices and Visions.",
    curriculumDetails:
      "Deep study of published short fiction and poetic forms (Bugeja, Burrow, Runyan's How to Write a Poem), manuscript selection, copyediting, layout, and advanced revision craft.",
    examFocus:
      "Advanced prosody & narrative architecture analysis, editorial rubric evaluation, and publication-grade manuscript revision.",
    studyStrategy:
      "Analyze structural techniques in model published poems/stories and apply concrete revision lenses (compression, pacing, motif resonance).",
    units: [
      "Unit 1: Advanced Genre Study — Narrative Arc & Experimental Fiction / Poetic Forms",
      "Unit 2: Voice, Subtext, Pacing & Symbolism in Published Works",
      "Unit 3: Intensive Writing Workshops & Multi-Draft Revision",
      "Unit 4: Literary Magazine Curation, Copyediting & Voices and Visions Production"
    ]
  },
  {
    code: "ENG_MYTH",
    name: "Mythology",
    department: "English",
    gradeLevel: "Grades 11–12",
    credit: "0.5 Credit · Elective",
    description:
      "Three-unit comparative literature course examining Greco-Roman myth, Arthurian legend, and world mythological traditions.",
    curriculumDetails:
      "Base texts: Edith Hamilton's Mythology, Homer's The Odyssey, Andrea Hopkins's Chronicles of King Arthur, plus supplementary Norse, Middle/Far Eastern, and Judeo-Christian traditions.",
    examFocus:
      "Identification of Olympian/Norse pantheons, heroic archetypes (Joseph Campbell / epic conventions), Arthurian chivalric motifs, and comparative essay prompts.",
    studyStrategy:
      "Build lineage charts for Greek gods/heroes, trace Odysseus's episodes and xenia, and compare creation/flood/hero myths across cultures.",
    units: [
      "Unit 1: Greco-Roman Mythology & Archetypes (Edith Hamilton)",
      "Unit 2: Homeric Epic & Heroic Journey — Homer's The Odyssey",
      "Unit 3: Medieval Romance & Arthurian Legend (Andrea Hopkins)",
      "Unit 4: Comparative World Mythologies — Norse, Middle/Far Eastern & Judeo-Christian Traditions"
    ]
  },
  {
    code: "ENG_RENAISSANCE",
    name: "Literature of a Period: Renaissance",
    department: "English",
    gradeLevel: "Grades 11–12",
    credit: "0.5 Credit · Elective",
    description:
      "Immersion in Elizabethan England and the European Renaissance across Shakespearean drama, lyric poetry, humanist philosophy, and early empirical thought.",
    curriculumDetails:
      "Four Shakespeare plays across history, tragedy, and comedy (Hamlet, Richard III, Twelfth Night, The Tempest), plus Wyatt, Sidney, Spenser, Marlowe, Jonson, Lanyer, Wroth, Castiglione, Machiavelli, Petrarch, and Francis Bacon.",
    examFocus:
      "Play genre distinctions (tragedy, history, comedy/romance), sonnet conventions, Renaissance humanism vs. Machiavellian politics, and textual passage identification.",
    studyStrategy:
      "Compare political power in Richard III & Machiavelli with philosophical skepticism in Hamlet & Bacon, and trace sonnet structure across Petrarch, Wyatt, Sidney, and Wroth.",
    units: [
      "Unit 1: Renaissance Humanism & Political Philosophy (Petrarch, Castiglione, Machiavelli)",
      "Unit 2: English Lyric & Sonnet Tradition (Wyatt, Sidney, Spenser, Lanyer, Wroth)",
      "Unit 3: Shakespearean History & Stagecraft — Richard III",
      "Unit 4: Elizabethan Tragedy & Dramatic Soliloquy — Hamlet (plus Marlowe & Jonson)",
      "Unit 5: Shakespearean Comedy, Illusion & Late Romance — Twelfth Night & The Tempest",
      "Unit 6: Empirical Skepticism & Renaissance Visual/Musical Arts (Sir Francis Bacon)"
    ]
  },
  {
    code: "ENG_SPEECH",
    name: "Public Speaking",
    department: "English",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Elective",
    description:
      "Practical and theoretical training in informative, persuasive, parliamentary, ceremonial, and business speaking grounded in classical-to-modern rhetorical theory.",
    curriculumDetails:
      "Text: Stephen Lucas's The Art of Public Speaking (11th ed.). Covers speech anxiety, audience analysis, Monroe's Motivated Sequence, Toulmin reasoning, parliamentary procedure, and verbal/nonverbal delivery.",
    examFocus:
      "Rhetorical canons (invention, arrangement, style, memory, delivery), organizational patterns, logical fallacies, and speech critique criteria.",
    studyStrategy:
      "Memorize organizational structures (chronological, topical, problem-solution, Monroe's Motivated Sequence) and rhetorical ethos/pathos/logos markers.",
    units: [
      "Unit 1: Foundations of Communication & Classical Rhetorical Theory",
      "Unit 2: Informative Speaking, Research & Audience Analysis",
      "Unit 3: Persuasive Speaking, Reasoning & Logical Fallacies",
      "Unit 4: Parliamentary Procedure, Debate & Business Communication",
      "Unit 5: Commemorative, Laudatory & Special-Occasion Speeches",
      "Unit 6: Verbal & Nonverbal Delivery, Vocal Variety & Visual Aids"
    ]
  },
  {
    code: "ENG_ORAL_INTERP",
    name: "Oral Interpretation",
    department: "English",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Elective",
    description:
      "Study of prose, drama, and poetry through live individual and ensemble performance, vocal technique, kinesics, and literary text analysis.",
    curriculumDetails:
      "Text: Benjamin Powell & Timothy Gura's Oral Interpretation (13th ed.). Emphasizes scansion/rhythm in poetry, character focal points in prose/drama, vocal inflection, posture/kinesics, and cutting scripts.",
    examFocus:
      "Literary analysis for performance (persona, locus, climax, pause, pitch/rate/volume), kinesic blocking terms, and poetic/dramatic scansion.",
    studyStrategy:
      "Connect textual clues (tone shifts, punctuation, imagery) directly to specific vocal and physical performance choices.",
    units: [
      "Unit 1: Foundations of Performance Analysis, Voice & Kinesics",
      "Unit 2: Interpreting Prose & Narrative Point of View",
      "Unit 3: Interpreting Poetry — Meter, Imagery & Enjambment",
      "Unit 4: Dramatic Literature, Dialogue & Characterization",
      "Unit 5: Ensemble Readers' Theater & Programmed Performance"
    ]
  },

  // =========================================================================
  // MATHEMATICS (11 Courses — Saxon & AP Track)
  // =========================================================================
  {
    code: "MATH_PREALG",
    name: "Pre-Algebra",
    department: "Mathematics",
    gradeLevel: "Grades 8–9",
    credit: "1.0 Credit",
    description:
      "Saxon Algebra 1/2 foundation building algebraic equation solving, number theory, proportional reasoning, consumer math, and core geometric measurement.",
    curriculumDetails:
      "Text: Saxon Algebra 1/2 (3rd ed.). Covers order of operations, prime factorization, radicals, scientific notation, linear equations & inequalities, proportions, simple/compound interest, commission/profit, surface area, volume, and angle relationships.",
    examFocus:
      "Multi-step integer & fraction evaluations without calculators, solving linear equations/inequalities, percent/interest word problems, and area/volume geometry.",
    studyStrategy:
      "Write every step vertically when solving equations, check unit conversions in word problems, and memorize area/volume formulas for cylinders, cones, and prisms.",
    units: [
      "Unit 1: Whole Numbers, Fractions, Decimals & Order of Operations",
      "Unit 2: Prime Factorization, Exponents, Radicals & Scientific Notation",
      "Unit 3: Algebraic Expressions, Linear Equations & Inequalities",
      "Unit 4: Ratios, Proportions, Unit Multipliers & Word Problems",
      "Unit 5: Consumer Math — Percents, Commission, Profit & Simple/Compound Interest",
      "Unit 6: Geometry — Complementary/Supplementary Angles, Surface Area, Semicircles & Volume"
    ]
  },
  {
    code: "MATH_ALG1",
    name: "Algebra/Geometry 1",
    department: "Mathematics",
    gradeLevel: "Grades 8–9",
    credit: "1.0 Credit · Required",
    description:
      "Saxon Algebra 1 course integrating linear systems, polynomials, factoring, quadratic equations, rational expressions, functions, and Euclidean/solid geometry.",
    curriculumDetails:
      "Text: Saxon Algebra 1 (3rd ed.). Covers perimeter/area/volume/surface area (cones, spheres), linear graphing, 2-variable linear systems, polynomials, factoring, rational algebraic expressions, quadratics, functions, sets, conjunctions/disjunctions, direct/inverse variation, and coordinate geometry.",
    examFocus:
      "Solving 2-variable systems by substitution/elimination, factoring trinomials & difference of squares, quadratic roots, rational equations, and solid geometry.",
    studyStrategy:
      "Drill factoring patterns until automatic, graph linear inequalities carefully with boundary checks, and keep direct vs. inverse variation formulas distinct.",
    units: [
      "Unit 1: Algebraic Foundations, Exponents, Sets & Evaluating Expressions",
      "Unit 2: Linear Equations, Slope-Intercept Graphing & Coordinate Geometry",
      "Unit 3: Systems of Two Linear Equations (Substitution & Elimination)",
      "Unit 4: Polynomial Operations, Factoring & Rational Algebraic Expressions",
      "Unit 5: Radicals, Conjunctions, Disjunctions & Direct/Inverse Variation",
      "Unit 6: Quadratic Equations, Functions & Parabola Intercepts",
      "Unit 7: Applied Geometry — Perimeter, Area, Surface Area & Volume (Cones & Spheres)"
    ]
  },
  {
    code: "MATH_GEOM",
    name: "Geometry",
    department: "Mathematics",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit",
    description:
      "Saxon Geometry covering plane and solid geometry, transformations, constructions, right-triangle trigonometry, and inductive/deductive two-column proofs.",
    curriculumDetails:
      "Text: Saxon Geometry (HMH). Lines, angles, parallel/perpendicular theorems, triangle congruence & similarity, polygons, circles, transformations, compass constructions, trigonometry, and formal inductive/deductive proofs.",
    examFocus:
      "Formal two-column proofs (representing major exam credit), parallel transversal angle solving, circle chord/secant/tangent theorems, and 3D solid measurements.",
    studyStrategy:
      "Maintain an organized postulate/theorem reference sheet; never assume congruence from a diagram without citing SSS, SAS, ASA, AAS, or HL.",
    units: [
      "Unit 1: Points, Lines, Planes, Angles & Parallel Line Transversals",
      "Unit 2: Inductive/Deductive Reasoning & Two-Column Geometric Proofs",
      "Unit 3: Triangle Congruence (SSS, SAS, ASA, AAS, HL) & Triangle Inequalities",
      "Unit 4: Polygons, Quadrilaterals & Similarity Ratios",
      "Unit 5: Right Triangles, Pythagorean Theorem & Basic Trigonometry",
      "Unit 6: Circles — Chords, Arcs, Secants, Tangents & Inscribed Angles",
      "Unit 7: Coordinate Transformations, Compass Constructions & 3D Solid Volume/Surface Area"
    ]
  },
  {
    code: "MATH_ALG2",
    name: "Algebra/Geometry 2",
    department: "Mathematics",
    gradeLevel: "Grades 9–11",
    credit: "1.0 Credit · Required Track",
    description:
      "Saxon Algebra 2 integrating complex numbers, 3-variable systems, logarithms, right-triangle trigonometry, polar coordinates, and formal triangle/circle geometry proofs.",
    curriculumDetails:
      "Text: Saxon Algebra 2 (3rd ed.). Covers irrational & complex numbers, quadratic equations/inequalities & graphing, 3-equation systems, linear inequalities, joint/combined variation, logarithms & exponentials, Venn diagrams, permutations, right-triangle trig, polar coordinates, chemistry/physics algebra, transversals, sectors, chords/secants, and triangle proofs.",
    examFocus:
      "Solving quadratics & complex roots, 3x3 linear systems, polar/rectangular conversions, geometric circle proofs, and chemistry/physics algebraic applications.",
    studyStrategy:
      "Practice converting between polar (R∠θ) and rectangular (x, y) coordinates cleanly, drill log/exponent laws, and rehearse formal triangle congruence/similarity proofs.",
    units: [
      "Unit 1: Quadratic Equations, Inequalities & Parabolic Graphing",
      "Unit 2: Irrational Numbers, Complex Numbers (a + bi) & Completing the Square",
      "Unit 3: Systems of Three Equations, Linear Inequalities & Joint/Combined Variation",
      "Unit 4: Exponential Functions, Logarithms, Venn Diagrams & Permutations",
      "Unit 5: Right-Triangle Trigonometry, Polar Coordinates & Force/Vector Conversions",
      "Unit 6: Geometry Proofs — Transversals, Congruent & Similar Triangles",
      "Unit 7: Circles — Sectors, Central/Inscribed Angles, Chords, Arcs, Secants & Polygons",
      "Unit 8: Quantitative Word Problems from Chemistry & Physics"
    ]
  },
  {
    code: "MATH_ALG3_TRIG",
    name: "Algebra 3/Trigonometry",
    department: "Mathematics",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit · Required Track",
    description:
      "Saxon Advanced Mathematics first half emphasizing deductive geometric proofs, circular trigonometry, exponential/logarithmic functions, and conic sections.",
    curriculumDetails:
      "Text: Saxon Advanced Mathematics (2nd ed.). Covers two-column proofs, inductive/deductive logic, trigonometric functions & unit circle values, common and natural logarithms, exponential modeling, conic sections, functions & transformations, and abstract word problems.",
    examFocus:
      "Non-calculator unit-circle values, two-column Euclidean & algebraic proofs, logarithmic/exponential equations, and standard-form conic sections.",
    studyStrategy:
      "Memorize all exact unit-circle radians/degrees and Pythagorean identities; practice completing the square on ellipses and hyperbolas.",
    units: [
      "Unit 1: Deductive/Inductive Logic & Two-Column Geometric Proofs",
      "Unit 2: Functions, Transformations, Domain/Range & Abstract Word Problems",
      "Unit 3: Trigonometric Ratios, Unit Circle & Circular Functions",
      "Unit 4: Trigonometric Graphs, Identities & Equation Solving",
      "Unit 5: Common & Natural Logarithms and Exponential Growth/Decay",
      "Unit 6: Conic Sections — Circles, Parabolas, Ellipses & Hyperbolas",
      "Unit 7: Complex Roots, Vectors & Polar Graphing"
    ]
  },
  {
    code: "02064H05022",
    name: "Algebra 3/Trigonometry Honors",
    department: "Mathematics",
    gradeLevel: "Grades 10–11",
    credit: "1.0 Credit · Honors",
    description:
      "Accelerated Saxon Advanced Mathematics course combining Algebra 3/Trigonometry with early Pre-Calculus topics, analytic trig proofs, matrices, and conics.",
    curriculumDetails:
      "Text: Saxon Advanced Mathematics (2nd ed.). Covers formal proofs, analytic trigonometry (sum/difference, double/half-angle identities), matrices & determinants, conic sections, logarithms, rational expressions, and early Pre-Calculus/Trig units.",
    examFocus:
      "Non-calculator trigonometric identity proofs and exact root solving, conic section transformations, matrix determinants, and logarithmic systems.",
    studyStrategy:
      "Derive double-angle and half-angle identities from sum identities rather than brute memorization, and verify every logarithmic solution for extraneous roots.",
    units: [
      "Unit 1: Formal Deductive Proofs, Logic & Advanced Algebraic Systems",
      "Unit 2: Polynomial Root Theorems, Rational Functions & Graphing",
      "Unit 3: Unit Circle, Radian Measure & Circular Trigonometric Functions",
      "Unit 4: Analytic Trigonometry — Sum/Difference, Double & Half-Angle Proofs",
      "Unit 5: Common/Natural Logarithms & Exponential Equations",
      "Unit 6: Conic Sections — Translations, Eccentricity & Standard Forms",
      "Unit 7: Matrices, Determinants, Binomial Theorem & Early Pre-Calculus"
    ]
  },
  {
    code: "MATH_PRECALC",
    name: "Pre-Calculus/Trigonometry",
    department: "Mathematics",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit",
    description:
      "Advanced Saxon Mathematics expanding into trigonometric equations, inverse trig, translated conics, matrices, combinatorics/statistics, and sequences/series.",
    curriculumDetails:
      "Text: Saxon Advanced Mathematics (2nd ed.). Covers trigonometric equations, identities & graphs, inverse trig functions, translated conic sections, common/natural logs, matrices & determinants, statistical analysis, arithmetic/geometric sequences & series, and graphing calculator analysis of polynomial, rational, and piecewise functions.",
    examFocus:
      "Inverse trig domain restrictions, translated conics, matrix solutions, arithmetic/geometric series sums, and rational function asymptote analysis.",
    studyStrategy:
      "Review restricted ranges of arcsin, arccos, and arctan, and practice both algebraic and graphing-calculator analysis of rational discontinuities.",
    units: [
      "Unit 1: Polynomial, Rational & Piecewise Functions (Asymptotes & End Behavior)",
      "Unit 2: Exponential & Logarithmic Modeling",
      "Unit 3: Trigonometric Equations, Graphs & Advanced Identities",
      "Unit 4: Inverse Trigonometric Functions & Oblique Triangles (Laws of Sines/Cosines)",
      "Unit 5: Translated Conic Sections & Polar/Parametric Equations",
      "Unit 6: Matrices, Determinants & Linear Systems",
      "Unit 7: Arithmetic & Geometric Sequences, Series & Statistical Analysis"
    ]
  },
  {
    code: "MATH_PRECALC_CALC_H",
    name: "Pre-Calculus/Trig Honors & Calculus Honors",
    department: "Mathematics",
    gradeLevel: "Grade 11",
    credit: "1.0 Credit · Honors",
    description:
      "Two-part accelerated honors sequence covering intensive Pre-Calculus/Trigonometry in Semester 1 and Differential & Integral Calculus in Semester 2.",
    curriculumDetails:
      "Texts: Saxon Advanced Mathematics (2nd ed.) & Saxon Calculus (2nd ed.). Sem 1: advanced algebra, analytic trig & analytic geometry; Sem 2: limits, continuity, differentiability, derivatives & applications, transcendental functions, integration, and definite integrals.",
    examFocus:
      "Semester 1 analytic trig & conics; Semester 2 limits, derivative rules (product/quotient/chain), optimization, related rates, u-substitution & definite integrals.",
    studyStrategy:
      "Bridge trig/log fluency directly into derivative and antiderivative templates; check differentiability vs. continuity conditions on every piecewise problem.",
    units: [
      "Unit 1: Intensive Pre-Calculus — Polynomial, Rational & Transcendental Functions",
      "Unit 2: Analytic Trigonometry, Inverse Functions & Conic Sections",
      "Unit 3: Limits, Continuity & Squeeze/Intermediate Value Theorems",
      "Unit 4: The Derivative, Differentiability & Differentiation Rules (Power, Product, Quotient, Chain)",
      "Unit 5: Applications of the Derivative — Implicit, Related Rates, Extrema & Optimization",
      "Unit 6: Transcendental Derivatives (Exponential, Logarithmic & Inverse Trig)",
      "Unit 7: Antiderivatives, Definite Integrals & Fundamental Theorem of Calculus"
    ]
  },
  {
    code: "MATH_AP_CALC_AB",
    name: "AP Calculus AB",
    department: "Mathematics",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level Calculus I course aligned to College Board AP Calculus AB and Saxon Calculus through Set 104, emphasizing limits, derivatives, and integration.",
    curriculumDetails:
      "Text: Saxon Calculus (2nd ed., Sets 1–104). Covers limits & continuity, derivative techniques & applications, Mean Value Theorem, related rates, optimization, Riemann sums, Fundamental Theorem of Calculus, differential equations/slope fields, and area/volume of solids.",
    examFocus:
      "AP Exam Section I (No-Calculator & Calculator MCQ) and Section II (6 Free Response Questions requiring exact theorems, units, and justification steps).",
    studyStrategy:
      "Write explicit theorem hypotheses (continuous on [a,b], differentiable on (a,b)) for IVT, MVT, and Rolle's Theorem, and state units on all accumulation FRQs.",
    units: [
      "Unit 1: Limits and Continuity (Algebraic, Graphical & Asymptotic Behavior)",
      "Unit 2: Differentiation — Definition and Fundamental Properties",
      "Unit 3: Differentiation — Composite, Implicit & Inverse Functions",
      "Unit 4: Contextual Applications of Differentiation (Related Rates & Linearization)",
      "Unit 5: Analytical Applications of Differentiation (MVT, Extrema, Concavity & Optimization)",
      "Unit 6: Integration and Accumulation of Change (Riemann Sums, FTC & u-Substitution)",
      "Unit 7: Differential Equations (Slope Fields & Separation of Variables)",
      "Unit 8: Applications of Integration (Average Value, Area Between Curves & Volumes of Revolution)"
    ]
  },
  {
    code: "MATH_AP_CALC_BC",
    name: "AP Calculus BC",
    department: "Mathematics",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level Calculus I & II sequence completing AB foundations before advancing into Calculus II integration techniques, polar/parametric calculus, and infinite series.",
    curriculumDetails:
      "Text: Saxon Calculus (2nd ed.) & College Board AP Calculus BC Units 1–10. Adds integration by parts, partial fractions, improper integrals, Euler's method, logistic growth, arc length, parametric/vector/polar derivatives & area, and Taylor/Maclaurin series with Lagrange error bounds.",
    examFocus:
      "AP BC Exam (yielding both BC score and AB subscore): Parametric/polar/vector FRQs, series convergence tests, Taylor polynomial approximations, and error bounds.",
    studyStrategy:
      "Create a master convergence-test flowchart (nth-term, geometric, p-series, integral, comparison, ratio, alternating) and memorize the 4 core Maclaurin series (e^x, sin x, cos x, 1/(1-x)).",
    units: [
      "Unit 1–5: Calculus I Review — Limits, Derivatives, MVT & Optimization",
      "Unit 6: Advanced Integration — By Parts, Linear Partial Fractions & Improper Integrals",
      "Unit 7: Differential Equations — Euler's Method & Logistic Growth Models",
      "Unit 8: Arc Length & Applications of Integration in Physics/Geometry",
      "Unit 9: Parametric Equations, Polar Coordinates & Vector-Valued Functions",
      "Unit 10: Infinite Sequences & Series — Convergence Tests & Absolute/Conditional Convergence",
      "Unit 11: Taylor & Maclaurin Polynomials, Radius/Interval of Convergence & Lagrange Error Bound"
    ]
  },
  {
    code: "MATH_AP_STATS",
    name: "AP Statistics",
    department: "Mathematics",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP Elective",
    description:
      "College-level non-calculus statistics covering exploratory data analysis, study design, probability distributions, and statistical inference.",
    curriculumDetails:
      "Text: Starnes/Tabor/Yates/Moore The Practice of Statistics (5th ed.). Covers univariate/bivariate data, regression, sampling/experimental design, probability & simulation, random variables, sampling distributions, confidence intervals, and significance tests.",
    examFocus:
      "40 AP MCQ + 6 FRQs (including the Investigative Task). Requires strict 4-step inference structure (State, Plan, Do, Conclude in context).",
    studyStrategy:
      "Always verify conditions (Random, 10%, Normal/Large Counts) before running z, t, or chi-square procedures, and write every conclusion in full context of the problem.",
    units: [
      "Unit 1: Exploring One-Variable Data (SOCS, Normal Distribution & Z-Scores)",
      "Unit 2: Exploring Two-Variable Data (Scatterplots, LSRL, Residuals & R²)",
      "Unit 3: Collecting Data — Sampling Methods, Bias & Experimental Design",
      "Unit 4: Probability, Random Variables & Probability Distributions (Binomial/Geometric)",
      "Unit 5: Sampling Distributions (Central Limit Theorem for Proportions & Means)",
      "Unit 6: Inference for Categorical Data — Proportions (1- & 2-Sample z Intervals/Tests)",
      "Unit 7: Inference for Quantitative Data — Means (1- & 2-Sample & Paired t Procedures)",
      "Unit 8: Inference for Categorical Data — Chi-Square Tests (GOF, Homogeneity, Independence)",
      "Unit 9: Inference for Quantitative Data — Slopes of Regression Lines"
    ]
  },

  // =========================================================================
  // SCIENCE (6 Courses)
  // =========================================================================
  {
    code: "SCI_BIO",
    name: "Biology Honors",
    department: "Science",
    gradeLevel: "Grade 9",
    credit: "1.0 Credit · Required",
    description:
      "Foundational freshman pillar science surveying cellular biology, biochemistry, genetics, evolution across the three domains of life, ecology, and human physiology.",
    curriculumDetails:
      "Text: Miller & Levine Biology (Pearson). Covers cell structure & transport, biomolecules & enzymes, cellular energetics, genetics/DNA, evolution across Archaea, Bacteria, and Eukarya, ecological interactions, and human body systems supported by lab work.",
    examFocus:
      "Diagram labeling (organelles, cell membrane, DNA replication), Punnett squares & pedigrees, cellular respiration vs. photosynthesis equations, and experimental lab reasoning.",
    studyStrategy:
      "Trace energy and matter flow from ATP/NADPH in photosynthesis to glycolysis/Krebs/ETC in respiration, and contrast mitosis vs. meiosis stages visually.",
    units: [
      "Unit 1: The Nature of Science & Biochemistry (Water, Macromolecules & Enzymes)",
      "Unit 2: Cell Structure, Organelles & Membrane Transport (Osmosis/Diffusion)",
      "Unit 3: Cellular Energetics — Photosynthesis & Cellular Respiration",
      "Unit 4: Cell Division (Mitosis/Meiosis) & Mendelian Genetics",
      "Unit 5: Molecular Genetics — DNA Replication, Transcription & Translation",
      "Unit 6: Evolution, Natural Selection & Classification (Archaea, Bacteria, Eukarya)",
      "Unit 7: Ecology, Nutrient Cycles & Population Dynamics",
      "Unit 8: Human Anatomy & Physiological Body Systems"
    ]
  },
  {
    code: "SCI_CHEM_H",
    name: "Chemistry Honors",
    department: "Science",
    gradeLevel: "Grades 10–11",
    credit: "1.0 Credit · Required",
    description:
      "Quantitative sophomore/junior pillar science covering atomic theory, chemical bonding, stoichiometry, gas laws, solutions, equilibrium, acids/bases, and electrochemistry.",
    curriculumDetails:
      "Text: Holt-McDougal Modern Chemistry. Covers matter & energy, atomic structure, periodic trends, ionic/covalent compounds, the mole, chemical reactions, stoichiometry, states of matter, intermolecular forces, solutions, chemical equilibrium, acids/bases, reaction rates, and electrochemistry.",
    examFocus:
      "Limiting-reactant stoichiometry via dimensional analysis, significant figures, gas law math, VSEPR geometry, pH/pOH calculations, and redox balancing.",
    studyStrategy:
      "Write complete unit-cancellation tracks for every mole/stoichiometry problem, memorize polyatomic ions and solubility rules, and drill significant-figure conventions.",
    units: [
      "Unit 1: Matter, Energy, Measurement & Significant Figures",
      "Unit 2: Atomic Structure, Electron Configurations & The Periodic Table",
      "Unit 3: Chemical Bonding — Ionic, Covalent, Lewis Structures & VSEPR Geometry",
      "Unit 4: Nomenclature, The Mole & Percent Composition",
      "Unit 5: Chemical Reactions, Balancing Equations & Quantitative Stoichiometry",
      "Unit 6: States of Matter, Gas Laws (PV = nRT) & Intermolecular Forces",
      "Unit 7: Solutions, Molarity & Colligative Properties",
      "Unit 8: Chemical Kinetics, Equilibrium & Le Chatelier's Principle",
      "Unit 9: Acids, Bases, pH/Titrations & Electrochemistry (Redox)"
    ]
  },
  {
    code: "SCI_PHYS_H",
    name: "Physics Honors",
    department: "Science",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · Required",
    description:
      "Algebra- and concept-based junior/senior pillar physics spanning mechanics, fluids, thermodynamics, waves/optics, electromagnetism, nuclear physics, and special relativity.",
    curriculumDetails:
      "Text: Holt Physics. Covers scientific measurement & dimensional analysis, vectors, kinematics, Newton's laws, projectile & circular motion, gravitation, torque, work/energy/machines, momentum, fluids, thermodynamics, waves, sound, light/optics, electrostatics, circuits, magnetism, nuclear physics, and special relativity.",
    examFocus:
      "Free-body diagrams, 2D projectile vector splitting, conservation of energy & momentum, Snell's law/ray optics, Ohm's law circuits, and unit conversions.",
    studyStrategy:
      "Always sketch a labeled diagram and choose coordinate axes first; separate horizontal (vx constant) and vertical (ay = -g) motion cleanly.",
    units: [
      "Unit 1: Measurement, Dimensional Analysis & Vector Mathematics",
      "Unit 2: 1D & 2D Kinematics — Motion Graphs & Projectile Motion",
      "Unit 3: Dynamics — Newton's Laws, Friction, Circular Motion & Gravitation",
      "Unit 4: Work, Power, Conservation of Energy & Simple Machines",
      "Unit 5: Impulse, Momentum, Collisions & Rotational Torque",
      "Unit 6: Fluid Mechanics & Thermodynamics (Heat & Entropy)",
      "Unit 7: Wave Mechanics, Sound, Light, Color & Geometric Optics",
      "Unit 8: Electrostatics, Current Electricity (Circuits), Magnetism & Electromagnetism",
      "Unit 9: Modern Physics — Nuclear Reactions & Special Relativity"
    ]
  },
  {
    code: "SCI_AP_BIO",
    name: "AP Biology",
    department: "Science",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level introductory biology course emphasizing molecular/cellular mechanisms, heredity, evolution, organismal systems, and quantitative lab analysis.",
    curriculumDetails:
      "Text: Campbell & Reece Biology. Aligned with College Board AP Biology Units 1–8 plus human anatomy/physiology and intensive AP laboratory investigations.",
    examFocus:
      "60 stimulus-based MCQ + 6 FRQs (Experimental Design, Graphing/Chi-Square/Water Potential math, Conceptual Analysis).",
    studyStrategy:
      "Master water potential (Ψ = Ψs + Ψp), Hardy-Weinberg equilibrium equations, Chi-square goodness of fit, and signaling cascade predictions when a receptor mutates.",
    units: [
      "Unit 1: Chemistry of Life (Water Properties, Macromolecules & Nucleic Acids)",
      "Unit 2: Cell Structure, Function, Compartmentalization & Water Potential",
      "Unit 3: Cellular Energetics — Enzymes, Photosynthesis & Cellular Respiration",
      "Unit 4: Cell Communication (Signal Transduction) & Cell Cycle Regulation",
      "Unit 5: Heredity — Meiosis, Mendelian Genetics, Linked Genes & Non-Nuclear Inheritance",
      "Unit 6: Gene Expression, Regulation (Operons/Epigenetics) & Biotechnology",
      "Unit 7: Natural Selection, Hardy-Weinberg Equilibrium & Phylogeny",
      "Unit 8: Ecology, Organismal Biology & Human Anatomy/Physiology"
    ]
  },
  {
    code: "AP_CHEM",
    name: "AP Chemistry",
    department: "Science",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level general chemistry covering quantum atomic structure, PES/spectroscopy, kinetics mechanisms, equilibrium, acid-base buffers, thermodynamics, and electrochemistry.",
    curriculumDetails:
      "Text: Brown/LeMay Chemistry: The Central Science (12th ed.). Aligned to all 9 College Board AP Chemistry Units.",
    examFocus:
      "60 AP MCQ + 7 FRQs (3 long, 4 short) testing PES interpretation, Beer's Law, RICE equilibrium tables, titration curves/Henderson-Hasselbalch, ΔG° = ΔH° - TΔS°, and galvanic/electrolytic cells.",
    studyStrategy:
      "Use Coulomb's Law and IMF strengths cleanly in explanations—never cite trends alone; practice buffer stoichiometry before using Henderson-Hasselbalch.",
    units: [
      "Unit 1: Atomic Structure & Properties (Moles, PES, Electron Configuration & Periodic Trends)",
      "Unit 2: Molecular & Ionic Compound Structure and Properties (VSEPR, Hybridization, Resonance)",
      "Unit 3: Intermolecular Forces, Gas Laws, Solutions & Spectroscopy (Beer's Law)",
      "Unit 4: Chemical Reactions — Net Ionic Equations, Stoichiometry, Titrations & Redox",
      "Unit 5: Chemical Kinetics (Rate Laws, Integrated Rate Equations & Mechanisms)",
      "Unit 6: Thermochemistry & Enthalpy (Calorimetry, Hess's Law & Bond Enthalpies)",
      "Unit 7: Equilibrium (K vs. Q, RICE Tables, Le Chatelier & Ksp Solubility)",
      "Unit 8: Acids, Bases, Buffer Systems, Henderson-Hasselbalch & Titration Curves",
      "Unit 9: Thermodynamics (Entropy, Gibbs Free Energy) & Electrochemistry (Nernst & Faraday)"
    ]
  },
  {
    code: "SCI_AP_PHYS_C",
    name: "AP Physics C: Mechanics & Electricity and Magnetism",
    department: "Science",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · AP Elective",
    description:
      "Calculus-based senior physics sequence equivalent to two semesters of university engineering physics, preparing students for both AP Physics C exams.",
    curriculumDetails:
      "Text: Tipler & Mosca Physics for Scientists and Engineers (6th ed.). Part I: Mechanics (Kinematics, Newton's Laws, Energy, Momentum, Rotation, Gravitation, Oscillations); Part II: E&M (Electrostatics, Gauss's Law, Conductors/Capacitors, Circuits, Magnetostatics, Ampère's Law, Faraday's Law & Maxwell's Equations).",
    examFocus:
      "Differential & integral calculus derivations on both AP C Mechanics and AP C E&M exams (setting up dm, dq, dB, RC/LR differential equations, and rotational inertia integrals).",
    studyStrategy:
      "Practice setting up calculus integrals from scratch for center of mass, moment of inertia, Gauss's Law symmetry, Biot-Savart/Ampère loops, and RC/RL exponential transients.",
    units: [
      "Mechanics Unit 1: Calculus Kinematics & Motion Graphs",
      "Mechanics Unit 2: Newton's Laws, Drag Forces & Non-Uniform Dynamics",
      "Mechanics Unit 3: Work, Conservative Forces, Potential Energy Functions & Power",
      "Mechanics Unit 4: Systems of Particles, Center of Mass & Linear Momentum",
      "Mechanics Unit 5: Rotational Kinematics, Torque, Moment of Inertia & Angular Momentum",
      "Mechanics Unit 6: Simple Harmonic Oscillations & Universal Gravitation",
      "E&M Unit 1: Electrostatics, Electric Fields (Integration) & Gauss's Law",
      "E&M Unit 2: Electric Potential, Conductors, Capacitors & Dielectrics",
      "E&M Unit 3: DC Electric Circuits, Kirchhoff's Rules & RC Transients",
      "E&M Unit 4: Magnetic Fields, Lorentz Force, Biot-Savart & Ampère's Law",
      "E&M Unit 5: Electromagnetic Induction, Faraday/Lenz's Law, Inductors (LR/LC) & Maxwell's Equations"
    ]
  },

  // =========================================================================
  // SOCIAL STUDIES / HISTORY (11 Courses)
  // =========================================================================
  {
    code: "CIV09",
    name: "Geography / Eastern Civilizations",
    department: "Social Studies",
    gradeLevel: "Grade 9",
    credit: "1.0 Credit · Required",
    description:
      "Freshman history and regional geography surveying the physical landscapes, religions, cultural traditions, and dynastic/modern histories of the Eastern Hemisphere.",
    curriculumDetails:
      "Text: World Cultures: A Global Mosaic. Covers South Asia, East Asia (China), Japan, Korea, Southeast Asia, Northern Eurasia, and Southwest Asia (Middle East).",
    examFocus:
      "Regional physical/political map identifications, comparative Eastern religious beliefs, dynastic timelines, and historical-cultural cause-and-effect responses.",
    studyStrategy:
      "Review regional maps alongside trade routes (Silk Road, Indian Ocean), and contrast major philosophical traditions (Confucianism, Daoism, Hinduism, Buddhism, Islam).",
    units: [
      "Unit 1: Geographic Foundations, Map Skills & Cultural Diffusion",
      "Unit 2: Southwest Asia (Middle East) — River Valleys, Monotheism & Modern Geopolitics",
      "Unit 3: South Asia — Indus Civilization, Hinduism, Buddhism & Modern India",
      "Unit 4: East Asia (China) — Dynastic Cycle, Confucianism, Daoism & Modern China",
      "Unit 5: Japan & The Korean Peninsula — Feudalism, Meiji Restoration & Modern Era",
      "Unit 6: Southeast Asia — Maritime Trade, Colonialism & Independence",
      "Unit 7: Northern Eurasia — Steppe Empires, Russian Expansion & Post-Soviet Transition"
    ]
  },
  {
    code: "CIV10",
    name: "Western Civilization Honors",
    department: "Social Studies",
    gradeLevel: "Grade 10",
    credit: "1.0 Credit · Required",
    description:
      "Hallmark sophomore honors survey tracing the political institutions, cultural achievements, and philosophical ideas of the Western world from Antiquity through World War I.",
    curriculumDetails:
      "Text: A History of Western Society (11th ed.). Covers Ancient Egypt & Mesopotamia, Ancient Greece, Rome, Middle Ages, Renaissance, Reformation, Exploration, Scientific Revolution & Enlightenment, French Revolution, Industrial Revolution, Nationalism & Imperialism, and World War I, plus an independent research paper.",
    examFocus:
      "Primary-source document interpretation, matching thinkers/treaties/artworks to eras, causal chronology, and analytical honors essays.",
    studyStrategy:
      "Track major intellectual turning points (polis democracy, Roman law, Christian Scholasticism, Renaissance Humanism, Enlightenment Natural Rights) chronologically.",
    units: [
      "Unit 1: Ancient Near East — Mesopotamia & Egypt",
      "Unit 2: Classical Antiquity — Ancient Greece (Polis, Philosophy & Hellenistic World)",
      "Unit 3: Ancient Rome — Republic, Empire, Law & Early Christianity",
      "Unit 4: The Middle Ages — Feudalism, Manorialism, the Church & Crusades",
      "Unit 5: Renaissance, Reformation & Age of European Exploration",
      "Unit 6: Absolutism, Scientific Revolution & The Enlightenment",
      "Unit 7: The French Revolution, Napoleon & Congress of Vienna",
      "Unit 8: The Industrial Revolution, Ideologies, Nationalism & Imperialism",
      "Unit 9: Origins, Course & Aftermath of World War I"
    ]
  },
  {
    code: "HIST11",
    name: "United States History Honors",
    department: "Social Studies",
    gradeLevel: "Grade 11",
    credit: "1.0 Credit · Required",
    description:
      "Intellectual, political, and social investigation of American history tracing Old World concepts from colonial settlement through the end of the 20th century.",
    curriculumDetails:
      "Text: The American Pageant (17th ed.). Emphasizes founding ideas, independence & Constitution, sectional crisis & Civil War, industrialization & Progressivism, WWI, WWII & American global power, Cold War, Civil Rights, and U.S. history through the 1990s.",
    examFocus:
      "Detailed historical chronology, Supreme Court landmark decisions, legislative packages, primary-source analysis, and thematic historical essays.",
    studyStrategy:
      "Trace recurring debates over Federal power vs. States' rights, isolationism vs. internationalism, and reform eras across the 18th–20th centuries.",
    units: [
      "Unit 1: Colonial Settlement, Old World Roots & The American Revolution",
      "Unit 2: The U.S. Constitution, Early Republic & Jeffersonian/Jacksonian Eras",
      "Unit 3: Westward Expansion, Sectionalism, Civil War & Reconstruction",
      "Unit 4: Gilded Age Industrialization, Urbanization & The Progressive Era",
      "Unit 5: American Imperialism, World War I & The Roaring Twenties",
      "Unit 6: The Great Depression, New Deal & World War II",
      "Unit 7: The Cold War, Korean/Vietnam Conflicts & Containment Diplomacy",
      "Unit 8: The Civil Rights Movement & Postwar Domestic Transformations",
      "Unit 9: Late 20th-Century America — Conservatism, End of Cold War & the 1990s"
    ]
  },
  {
    code: "HIST_APUSH",
    name: "AP U.S. History",
    department: "Social Studies",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level U.S. history covering all nine College Board historical periods (1491–present) with intensive reading, primary-source analysis, and AP historical writing.",
    curriculumDetails:
      "Text: The American Pageant (17th AP ed.). Structured across College Board Periods 1–9 with intensive SAQ, DBQ, and LEQ practice.",
    examFocus:
      "55 stimulus-based MCQ, 3 Short Answer Questions (SAQ), 1 Document-Based Question (DBQ with HIPP sourcing), and 1 Long Essay Question (LEQ).",
    studyStrategy:
      "Anchor every period with 3 turning-point dates, practice HIPP (Historical situation, Intended audience, Purpose, Point of view) on documents, and frame arguments around continuity/change.",
    units: [
      "Period 1 (1491–1607): Indigenous Societies, Columbian Exchange & European Contact",
      "Period 2 (1607–1754): Colonial Regions, Mercantilism & Transatlantic World",
      "Period 3 (1754–1800): Imperial Crisis, American Revolution & Constitutional Republic",
      "Period 4 (1800–1848): Market Revolution, Democracy, Reform & Manifest Destiny",
      "Period 5 (1844–1877): Sectionalism, Civil War & Reconstruction",
      "Period 6 (1865–1898): Industrial Capitalism, Labor, Gilded Age & Populism",
      "Period 7 (1890–1945): Progressivism, WWI, Great Depression, New Deal & WWII",
      "Period 8 (1945–1980): Cold War Geopolitics, Civil Rights & Great Society",
      "Period 9 (1980–Present): Conservative Resurgence, End of Cold War & Globalization"
    ]
  },
  {
    code: "HIST_GOV_H",
    name: "United States Government Honors",
    department: "Social Studies",
    gradeLevel: "Grade 12",
    credit: "0.5 Credit · Required",
    description:
      "Senior semester study of American constitutionalism, founding philosophical texts, federal separation of powers, civil liberties, and state/local governance.",
    curriculumDetails:
      "Text: Wilson's American Government: Institutions and Policies (16th ed.). Covers Articles of Confederation, Federalist & Anti-Federalist Papers, U.S. Constitution, Bill of Rights, national institutions, and state/local government relationships.",
    examFocus:
      "Constitutional clauses (Supremacy, Commerce, Necessary & Proper), Federalist Papers (10, 51, 70, 78), separation of powers checks, and Bill of Rights protections.",
    studyStrategy:
      "Map specific checks and balances between Congress, the President, and the Judiciary alongside state/local reserved powers under the 10th Amendment.",
    units: [
      "Unit 1: Philosophical Foundations, Articles of Confederation & Constitutional Convention",
      "Unit 2: Federalist & Anti-Federalist Papers and Separation of Powers",
      "Unit 3: Federalism — National, State & Local Government Relationships",
      "Unit 4: The Bill of Rights, Civil Liberties & Civil Rights",
      "Unit 5: National Institutions — Congress, The Presidency & Federal Judiciary",
      "Unit 6: Elections, Political Parties, Public Policy & Civic Responsibility"
    ]
  },
  {
    code: "HIST_AP_GOV",
    name: "AP U.S. Government and Politics",
    department: "Social Studies",
    gradeLevel: "Grade 12",
    credit: "0.5 Credit · AP",
    description:
      "College-level political science analyzing U.S. constitutional principles, institutional interactions, civil rights/liberties, political beliefs, and linkage institutions.",
    curriculumDetails:
      "Text: Wilson/DiIulio/Bose American Government (AP ed.). Covers all 5 College Board Units, 9 Required Foundational Documents, and Required Supreme Court Cases.",
    examFocus:
      "55 AP MCQ + 4 FRQs (Concept Application, Quantitative Analysis, SCOTUS Comparison, and Argument Essay using Foundational Documents).",
    studyStrategy:
      "Know the constitutional clause, holding, and precedent for every required SCOTUS case (Marbury, McCulloch, Lopez, Schenck, Engel, Wisconsin v. Yoder, Tinker, NYT v. US, Gideon, McDonald, Brown, Citizens United, Baker v. Carr, Shaw v. Reno).",
    units: [
      "Unit 1: Foundations of American Democracy (Locke, Federalist 10 & 51, Brutus 1, Federalism)",
      "Unit 2: Interactions Among Branches of Government (Congress, Presidency, Bureaucracy, Courts)",
      "Unit 3: Civil Liberties & Civil Rights (14th Amendment Incorporation & Landmark Cases)",
      "Unit 4: American Political Ideologies & Beliefs (Polling, Political Culture & Policy)",
      "Unit 5: Political Participation (Voting Behavior, Parties, Interest Groups, PACs & Media)"
    ]
  },
  {
    code: "HIST_ECON_H",
    name: "Economics Honors",
    department: "Social Studies",
    gradeLevel: "Grade 12",
    credit: "0.5 Credit · Required",
    description:
      "Senior semester honors course examining core economic laws alongside the rival philosophies of Adam Smith, Marx & Engels, Keynes, Ludwig von Mises, and Milton Friedman.",
    curriculumDetails:
      "Text: Krugman's Macroeconomics for AP (3rd ed.). Covers scarcity, opportunity cost, supply & demand, economic systems & schools of thought (Classical, Marxist, Keynesian, Austrian, Monetarist), macroeconomic indicators, and fiscal/monetary policy.",
    examFocus:
      "Comparative economic philosophies (Smith vs. Marx vs. Keynes vs. Mises/Friedman), supply/demand shifts, GDP/CPI calculations, and policy diagnostics.",
    studyStrategy:
      "Build a comparison matrix contrasting Smith, Marx, Keynes, Mises, and Friedman on markets, government intervention, inflation, and business cycles.",
    units: [
      "Unit 1: Scarcity, Opportunity Cost, PPC & Comparative Advantage",
      "Unit 2: Supply, Demand, Market Equilibrium & Price Controls",
      "Unit 3: Economic Philosophies — Adam Smith, Karl Marx & Friedrich Engels",
      "Unit 4: 20th-Century Schools — John Maynard Keynes, Ludwig von Mises & Milton Friedman",
      "Unit 5: Macroeconomic Indicators — GDP, Unemployment & Inflation",
      "Unit 6: Fiscal Policy, Central Banking, Monetary Policy & Global Trade"
    ]
  },
  {
    code: "HIST_AP_MACRO",
    name: "AP Macroeconomics",
    department: "Social Studies",
    gradeLevel: "Grade 12",
    credit: "0.5 Credit · AP",
    description:
      "College-level macroeconomics studying national income, price-level determination, financial markets, stabilization policies, long-run growth, and international finance.",
    curriculumDetails:
      "Text: Ray & Anderson Krugman's Macroeconomics for AP (3rd ed.). Covers all 6 College Board AP Macroeconomics Units and all core macroeconomic graphs (without graphing calculator).",
    examFocus:
      "60 AP MCQ + 3 FRQs requiring hand-drawn, accurately shifted AD/AS, Money Market, Loanable Funds, Phillips Curve, and Foreign Exchange graphs plus multiplier math.",
    studyStrategy:
      "Practice the 4-graph chain reaction (Money Market -> Investment -> AD/AS -> Phillips Curve) and memorize spending vs. tax vs. money multiplier formulas cleanly.",
    units: [
      "Unit 1: Basic Economic Concepts (Scarcity, PPC, Comparative Advantage & Supply/Demand)",
      "Unit 2: Economic Indicators & The Business Cycle (GDP, Unemployment & CPI/Inflation)",
      "Unit 3: National Income & Price Determination (Multipliers & AD/SRAS/LRAS Model)",
      "Unit 4: Financial Sector (Money, T-Accounts, Money Multiplier, Money Market & Loanable Funds)",
      "Unit 5: Long-Run Consequences of Stabilization Policies (Fiscal/Monetary Mix, Phillips Curve & Crowding Out)",
      "Unit 6: Open Economy — Balance of Payments, Exchange Rates & Capital Flows"
    ]
  },
  {
    code: "HIST_AP_PSYCH",
    name: "AP Psychology",
    department: "Social Studies",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP Elective",
    description:
      "Systematic college-level study of human behavior, neural biology, cognition, development, psychopathology, social dynamics, and research ethics.",
    curriculumDetails:
      "Text: Myers' Psychology for AP. Covers all major psychological subfields, experimental research methodology & APA ethics, biological bases, cognition, learning, development, clinical disorders, and social psychology.",
    examFocus:
      "Concept-application MCQs and FRQs (Article Analysis & Evidence-Based Question) requiring precise definitions paired with scenario application.",
    studyStrategy:
      "Distinguish look-alike terms (proactive vs. retroactive interference, classical vs. operant reinforcement schedules, neurotransmitters, brain structures) using concrete examples.",
    units: [
      "Unit 1: Biological Bases of Behavior (Neurons, Neurotransmitters, Brain Regions & Sleep)",
      "Unit 2: Research Methods, Statistics & APA Ethical Guidelines",
      "Unit 3: Sensation, Perception & States of Consciousness",
      "Unit 4: Learning & Conditioning (Classical, Operant & Observational Learning)",
      "Unit 5: Cognitive Psychology — Memory Encoding/Retrieval, Thinking, Language & Intelligence",
      "Unit 6: Developmental Psychology, Motivation, Emotion & Personality",
      "Unit 7: Clinical Psychology — Psychological Disorders & Evidence-Based Therapies",
      "Unit 8: Social Psychology (Conformity, Obedience, Attribution, Attitude & Group Dynamics)"
    ]
  },
  {
    code: "HIST_REL_EAST",
    name: "Eastern Religions",
    department: "Social Studies",
    gradeLevel: "Grades 11–12",
    credit: "0.5 Credit · Elective",
    description:
      "Semester philosophical survey exploring the foundational ideas, sacred texts, and ethical traditions of major faiths originating in the Eastern Hemisphere.",
    curriculumDetails:
      "Texts: World Religions (6th ed.) & Huston Smith's The World's Religions. Covers Eastern religious philosophy, Hinduism, Buddhism, Taoism, Confucianism, and comparative Asian spiritual practices.",
    examFocus:
      "Sacred texts, core metaphysical concepts (Atman/Brahman, Karma, Four Noble Truths, Eightfold Path, Wu Wei, Ren/Li), and comparative philosophical essays.",
    studyStrategy:
      "Build conceptual maps comparing how Hinduism, Buddhism, Taoism, and Confucianism define suffering, social harmony, and ultimate reality.",
    units: [
      "Unit 1: Foundations of Eastern Religious Philosophy & Comparative Method",
      "Unit 2: Hinduism — Vedas, Upanishads, Atman/Brahman, Dharma, Karma & Yogas",
      "Unit 3: Buddhism — Siddhartha Gautama, Four Noble Truths, Eightfold Path, Theravada & Mahayana",
      "Unit 4: Taoism — Laozi, Tao Te Ching, Yin/Yang & Wu Wei",
      "Unit 5: Confucianism — Analects, Five Relationships, Filial Piety & Social Order",
      "Unit 6: Shinto, Sikhism & Synthesis of Eastern Philosophical Worldviews"
    ]
  },
  {
    code: "HIST_REL_WEST",
    name: "Western Religions",
    department: "Social Studies",
    gradeLevel: "Grades 11–12",
    credit: "0.5 Credit · Elective",
    description:
      "Semester philosophical survey examining indigenous traditions and the great ideas, scriptures, and practices of the Abrahamic faiths.",
    curriculumDetails:
      "Texts: World Religions (6th ed.) & Huston Smith's The World's Religions. Covers Western religious philosophy, indigenous traditions, Judaism, Christianity, and Islam.",
    examFocus:
      "Shared Abrahamic covenants, sacred texts (Torah/Talmud, Christian Bible, Qur'an/Hadith), theological distinctions, and comparative idea-based essays.",
    studyStrategy:
      "Trace the shared monotheistic lineage from Abraham while carefully distinguishing rituals, creeds, and historical branches within Judaism, Christianity, and Islam.",
    units: [
      "Unit 1: Western Religious Philosophy & Indigenous Spiritual Traditions",
      "Unit 2: Judaism — Covenant, Torah, Prophetic Justice & Modern Branches",
      "Unit 3: Christianity — Gospels, Early Church Councils, Theology & Denominational Traditions",
      "Unit 4: Islam — Muhammad, The Qur'an, Five Pillars, Sunni/Shia & Islamic Golden Age",
      "Unit 5: Comparative Abrahamic Ethics, Mysticism & Dialogue"
    ]
  },

  // =========================================================================
  // FOREIGN / WORLD LANGUAGES (16 Courses — French, Latin, Spanish)
  // =========================================================================
  {
    code: "FREN_1",
    name: "French I",
    department: "Foreign Language",
    gradeLevel: "Grades 8–12",
    credit: "1.0 Credit",
    description:
      "Introductory French building foundational listening, speaking, reading, and writing proficiency alongside Francophone cultural literacy.",
    curriculumDetails:
      "Text: D'Accord 1 (Vista Higher Learning). Covers greetings, school & hobbies, family & physical descriptions, café/food, weather/seasons, regular -er verbs, and core irregular verbs (être, avoir, aller, faire).",
    examFocus:
      "Present-tense verb conjugations, definite/indefinite articles, adjective gender/number agreement, question formation, and short reading comprehension.",
    studyStrategy:
      "Drill subject-verb conjugation patterns (je/tu/il/nous/vous/ils) aloud daily and memorize masculine vs. feminine noun articles together.",
    units: [
      "Unité 1: Salutations, L'Alphabet, Les Nombres & La Salle de Classe",
      "Unité 2: La Vie Scolaire, Les Verbes en -ER & La Négation (ne... pas)",
      "Unité 3: Le Verbe Être, Les Adjectifs & Les Professions",
      "Unité 4: La Famille, Les Adjectifs Possessifs & Le Verbe Avoir",
      "Unité 5: Au Café, Les Loisirs & Les Verbes Aller / Faire (Futur Proche)",
      "Unité 6: Les Fêtes, Les Vêtements, Le Temps & Les Verbes en -IR / -RE"
    ]
  },
  {
    code: "FREN_2",
    name: "French II",
    department: "Foreign Language",
    gradeLevel: "Grades 9–12",
    credit: "1.0 Credit",
    description:
      "Intermediate-low French expanding grammatical accuracy with past-tense narration, reflexive verbs, object pronouns, and Francophone cultural study.",
    curriculumDetails:
      "Text: D'Accord 2 (Vista Higher Learning). Reviews Level I before mastering passé composé (avoir & être / DR MRS VANDERTRAMP), imparfait, reflexive daily-routine verbs, direct/indirect object pronouns, and y/en.",
    examFocus:
      "Passé composé vs. imparfait discrimination, past-participle agreement, reflexive pronouns in past tense, and pronoun placement.",
    studyStrategy:
      "Memorize DR MRS VANDERTRAMP verbs with être and write paired timeline sentences contrasting ongoing background (imparfait) with completed events (passé composé).",
    units: [
      "Unité 1: Révision de Français I, Les Fêtes & Les Verbes Irréguliers",
      "Unité 2: La Maison, Le Passé Composé avec Avoir & Être",
      "Unité 3: La Nourriture, Les Articles Partitifs & Les Pronoms d'Objet Direct/Indirect",
      "Unité 4: La Routine Quotidienne & Les Verbes Réfléchis (au Présent et au Passé)",
      "Unité 5: La Santé, L'Imparfait vs. Le Passé Composé",
      "Unité 6: La Technologie, Les Voyages & Les Pronoms Y et En"
    ]
  },
  {
    code: "FREN_3",
    name: "French III (FRE1011/1012)",
    department: "Foreign Language",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit · Concurrent Option",
    description:
      "Intermediate-mid French reviewing and expanding grammar and vocabulary through authentic short stories, discussions, and analytical writing.",
    curriculumDetails:
      "Text: D'Accord 3 (Vista Higher Learning), aligned with FRE1011/1012. Covers futur simple, conditionnel, plus-que-parfait, present subjunctive triggers, relative pronouns (qui, que, dont, où), and Francophone literature.",
    examFocus:
      "Subjunctive vs. indicative mood selection, si-clauses (present/future & imperfect/conditional), relative pronoun syntax, and story summaries.",
    studyStrategy:
      "Organize WEIRDO triggers for the subjunctive and practice stem changes across futur simple, conditionnel, and imparfait.",
    units: [
      "Unité 1: Les Relations Personnelles & Révision des Temps du Passé",
      "Unité 2: La Vie Urbaine, Les Pronoms Relatifs (qui, que, dont, où)",
      "Unité 3: Les Médias, Le Futur Simple & Le Conditionnel Présent",
      "Unité 4: La Justice, La Politique & Le Subjonctif Présent (WEIRDO)",
      "Unité 5: Le Plus-Que-Parfait, Les Phrases avec 'Si' & Le Discours Indirect",
      "Unité 6: Lectures Littéraires & Synthèse Culturelle Francophone"
    ]
  },
  {
    code: "FREN_4_H",
    name: "French IV Honors (FRE2011/2012)",
    department: "Foreign Language",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · Honors / Concurrent",
    description:
      "Advanced honors French developing fluency across six global AP themes through French history, authentic periodicals, literature, and persuasive essays.",
    curriculumDetails:
      "Text: Thèmes (Vista Higher Learning, Section A or B of 6 global themes) & ACC FRE2011/2012 alignment. Reinforces advanced grammar, idioms, French history, authentic audio/video, and essay writing.",
    examFocus:
      "Thematic reading & listening comprehension, idiomatic usage, advanced tense sequencing (past subjunctive, conditional past), and cultural comparison essays.",
    studyStrategy:
      "Summarize authentic Francophone news articles using transition connectors and memorize high-frequency idioms tied to each of the 6 global themes.",
    units: [
      "Thème 1: Les Défis Mondiaux (Global Challenges & Environment)",
      "Thème 2: La Science et la Technologie (Ethics & Innovation)",
      "Thème 3: La Vie Contemporaine (Education, Travel & Leisure)",
      "Thème 4: La Quête de Soi (Personal & Public Identities)",
      "Thème 5: La Famille et la Communauté (Traditions & Social Bonds)",
      "Thème 6: L'Esthétique (French Art, Architecture & Literary Movements)",
      "Unité 7: Grammaire Avancée, Expressions Idiomatiques & Histoire de France"
    ]
  },
  {
    code: "FREN_AP",
    name: "AP French Language and Culture",
    department: "Foreign Language",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level capstone preparing students for the AP French Language & Culture exam across all six global themes using authentic Francophone media.",
    curriculumDetails:
      "Text: Thèmes (Vista Higher Learning, complementary Section A/B). Builds mastery across Interpretive Reading/Listening, Email Reply, Argumentative Essay, Simulated Conversation, and Cultural Comparison.",
    examFocus:
      "AP Exam Section I (Interpretive MCQ) and Section II (Email Reply, 3-Source Argumentative Essay, 5-Turn Conversation, 2-Minute Cultural Comparison).",
    studyStrategy:
      "Practice structuring cultural comparisons with concrete Francophone community examples and memorize formal email registers and argumentative essay transitions.",
    units: [
      "Thème 1: La Famille et la Communauté (Section Complémentaire)",
      "Thème 2: La Science et la Technologie (Section Complémentaire)",
      "Thème 3: L'Esthétique (Section Complémentaire)",
      "Thème 4: La Vie Contemporaine (Section Complémentaire)",
      "Thème 5: Les Défis Mondiaux (Section Complémentaire)",
      "Thème 6: La Quête de Soi (Section Complémentaire)",
      "Unité 7: Préparation Intensive à l'Examen AP (Courriel, Essai, Conversation, Comparaison)"
    ]
  },
  {
    code: "LATIN_I",
    name: "Latin I",
    department: "Foreign Language",
    gradeLevel: "Grades 7–12",
    credit: "1.0 Credit",
    description:
      "Foundational classical Latin introducing declensions, verb conjugations, Roman Monarchy history, Greco-Roman mythology, and English derivatives.",
    curriculumDetails:
      "Text: Latin for the New Millennium, Level 1 (2nd ed.). Covers noun declensions (1st–3rd), noun-adjective agreement, verb conjugations (1st–4th) in present/imperfect/future, mottos/maxims, Trojan War, Roman Monarchy, and National Latin Exam prep.",
    examFocus:
      "Declension & conjugation paradigm tables, noun-adjective agreement across cases, Roman culture/mythology matching, and direct Latin-to-English sentence translation.",
    studyStrategy:
      "Identify every noun's case, number, and gender and every verb's person, number, and tense before translating word order.",
    units: [
      "Unit 1: Pronunciation, 1st & 2nd Declensions, Sum/Esse & Trojan War Mythology",
      "Unit 2: 1st & 2nd Conjugations (Present, Imperfect, Future) & Founding of Rome",
      "Unit 3: Prepositional Phrases, Imperatives, Roman Daily Life & Architecture",
      "Unit 4: 3rd Declension Nouns (M/F/N), Noun-Adjective Agreement & Roman Monarchy",
      "Unit 5: 3rd & 4th Conjugations, Personal Pronouns & Early Republican Authors",
      "Unit 6: Mottos, Maxims, English Derivatives & National Latin Exam Review"
    ]
  },
  {
    code: "LATIN_II",
    name: "Latin II",
    department: "Foreign Language",
    gradeLevel: "Grades 9–12",
    credit: "1.0 Credit",
    description:
      "Intermediate classical Latin expanding case syntax, passive voice, participles, indirect statements, and readings from the Roman Republic through Cicero's letters.",
    curriculumDetails:
      "Texts: Latin for the New Millennium, Levels 1 & 2 (2nd ed.). Expands 4th/5th declensions, perfect/pluperfect/future perfect active & passive systems, participles, ablative absolutes, infinitives/indirect statements, and Roman Republic/Empire history.",
    examFocus:
      "Passive vs. active synopses, participle tense/voice recognition, accusative-infinitive indirect statements, Cicero's letters, and unseen adapted translation.",
    studyStrategy:
      "Drill active vs. passive personal endings (-o/-r, -mus/-mur) and check the tense of an infinitive relative to the head verb in every indirect statement.",
    units: [
      "Unit 1: Level 1 Review, 4th & 5th Declensions & Pronouns (hic, ille, is, qui)",
      "Unit 2: Perfect, Pluperfect & Future Perfect Active Systems",
      "Unit 3: Passive Voice (Present & Perfect Systems) & Ablative of Agent/Means",
      "Unit 4: Participles (Present Active, Perfect Passive, Future) & Ablative Absolutes",
      "Unit 5: Infinitives, Indirect Statements & Roman Republic/Empire Expansion",
      "Unit 6: Introduction to Subjunctive Mood & Adapted Cicero Letters"
    ]
  },
  {
    code: "LATIN_III",
    name: "Latin III (LAT1011/1012)",
    department: "Foreign Language",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit · Concurrent Option",
    description:
      "Advanced grammar completion and unadapted readings spanning Cicero, Cornelius Nepos, Late Antiquity, Medieval Latin, Renaissance humanism (Erasmus/More), and Neo-Latin.",
    curriculumDetails:
      "Text: Latin for the New Millennium, Level 2 (2nd ed., LAT1011/1012). Completes all subjunctive clauses, gerunds/gerundives, deponent verbs, stylistic figures, and historical readings from Nepos/Cicero to Erasmus, Columbus, Sir Thomas More, and Neo-Latin science.",
    examFocus:
      "Subjunctive clause identification (cum, purpose, result, indirect command/question, conditions), deponent verbs, gerundive of obligation, and unadapted prose translation.",
    studyStrategy:
      "Create a clause recognition table keyed by trigger words (ut, ne, cum, tam/ita, verbs of asking/fearing) and parse principal parts carefully for deponents.",
    units: [
      "Unit 1: Deponent & Semi-Deponent Verbs, Comparison of Adjectives/Adverbs",
      "Unit 2: Subjunctive Mood Formation & Independent Subjunctives (Jussive/Hortatory)",
      "Unit 3: Dependent Subjunctive Clauses (Purpose, Result, Cum Clauses & Indirect Questions)",
      "Unit 4: Gerunds, Gerundives, Passive Periphrastic & Conditional Sentences",
      "Unit 5: Classical Prose — Cicero's Letters & Biographies of Cornelius Nepos",
      "Unit 6: Medieval, Renaissance & Neo-Latin Prose (Erasmus, More & Scientific Texts)"
    ]
  },
  {
    code: "LATIN_IV_H",
    name: "Latin IV Honors (LAT2011/2012)",
    department: "Foreign Language",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · Honors / Concurrent",
    description:
      "Honors reading seminar in unadapted Late Republican, Imperial, and Renaissance Latin prose and poetry, emphasizing literary analysis and scansion.",
    curriculumDetails:
      "Text: Latin for the New Millennium, Level 3 (LAT2011/2012, Section A or B). Studies advanced syntactic structures, ancient poetic meter, Roman political history (Late Republic & Early Empire), and post-Roman Latin.",
    examFocus:
      "Literal translation of unadapted authors, metrical scansion, rhetorical figures of speech, and analytical essays in English backed by Latin citations.",
    studyStrategy:
      "Scan lines systematically by marking long syllables by nature/position and track how word order (chiasmus, hyperbaton) reinforces meaning.",
    units: [
      "Unit 1: Late Republican Prose & Oratory (Cicero, Caesar & Sallust Selections)",
      "Unit 2: Augustan & Early Imperial Poetry — Poetic Meter & Stylistic Figures",
      "Unit 3: Roman Political History — Transition from Republic to Principate",
      "Unit 4: Mid-Imperial & Silver Age Prose/Verse Selections",
      "Unit 5: Post-Roman, Medieval & Renaissance Latin Continuity"
    ]
  },
  {
    code: "LATIN_V_H",
    name: "Latin V Honors",
    department: "Foreign Language",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · Honors",
    description:
      "Senior honors capstone completing the complementary author selections in Latin for the New Millennium Level 3 with deep literary and historical analysis.",
    curriculumDetails:
      "Text: Latin for the New Millennium, Level 3 (complementary Section A/B). Surveys classical Latin literary history, late Republic/early Empire politics, poetic meter/figures, and post-classical Latin traditions.",
    examFocus:
      "Sight translation of authentic Latin verse and prose, stylistic & metrical analysis, and historical synthesis essays.",
    studyStrategy:
      "Review high-frequency poetic vocabulary, practice sight-reading whole periodic sentences before rendering English, and annotate rhetorical devices.",
    units: [
      "Unit 1: Complementary Late Republican Authors & Political Crisis",
      "Unit 2: Classical Latin Lyric, Elegy & Epic Poetic Conventions",
      "Unit 3: Early-to-Mid Imperial Historiography & Letters",
      "Unit 4: Post-Roman & Renaissance Neo-Latin Literary Legacy",
      "Unit 5: Comprehensive Sight Translation & Literary Essay Synthesis"
    ]
  },
  {
    code: "LATIN_AP",
    name: "AP Latin (Vergil & Caesar)",
    department: "Foreign Language",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level intensive study of Vergil's Aeneid and Julius Caesar's De Bello Gallico, pairing literal translation with poetic scansion and historical essays.",
    curriculumDetails:
      "Texts: Jenney's Fourth Year Latin (Aeneid) & A Call to Conquest (Caesar). Covers required Latin passages, dactylic hexameter scansion, rhetorical figures, Roman morality/imperialism, and sight reading.",
    examFocus:
      "AP Latin Exam: Syllabus & Sight MCQ, Literal Translations, Analytical Essay comparing Vergil & Caesar, and Short-Answer Text Questions.",
    studyStrategy:
      "Drill dactylic hexameter elisions and caesurae, memorize core Aeneid/Caesar vocabulary, and cite concrete Latin lines in every analytical paragraph.",
    units: [
      "Unit 1: Julius Caesar's De Bello Gallico — Books 1 & 4 (Helvetii & Britain)",
      "Unit 2: Julius Caesar's De Bello Gallico — Books 5 & 6 (Gaul & Druids)",
      "Unit 3: Vergil's Aeneid — Books 1 & 2 (Storm, Carthage & Fall of Troy)",
      "Unit 4: Vergil's Aeneid — Books 4 & 6 (Dido, Pietas & The Underworld)",
      "Unit 5: Dactylic Hexameter Scansion, Rhetorical Devices & Sight Translation Practice"
    ]
  },
  {
    code: "SPAN_1",
    name: "Spanish I",
    department: "Foreign Language",
    gradeLevel: "Grades 8–12",
    credit: "1.0 Credit",
    description:
      "Introductory Spanish developing foundational listening, speaking, reading, and writing fluency across Descubre 1 preliminary through Chapter 5.",
    curriculumDetails:
      "Text: Descubre 1 (Vista Higher Learning, Lección Preliminar – Chapter 5). Covers greetings, school & ser, family & possessive adjectives, pastimes/stem-changing verbs, travel/weather & estar vs. ser, and present progressive.",
    examFocus:
      "Regular -ar/-er/-ir and stem-changing verb conjugations, ser vs. estar rules (DOCTOR/PLACE), gender/number agreement, and basic reading comprehension.",
    studyStrategy:
      "Memorize stem-change shoe verbs (e→ie, o→ue, e→i) and use DOCTOR vs. PLACE cleanly for every ser/estar decision.",
    units: [
      "Lección Preliminar & Ch. 1: Hola, ¿qué tal? — Greetings, Numbers, Time & Ser",
      "Ch. 2: En la clase — School Vocabulary, -AR Verbs & Estar",
      "Ch. 3: La familia — Family, Descriptive/Possessive Adjectives & -ER/-IR Verbs",
      "Ch. 4: Los pasatiempos — Sports, Ir, Stem-Changing Verbs & Irregular Yo Forms",
      "Ch. 5: Las vacaciones — Travel, Weather, Ser vs. Estar & Present Progressive"
    ]
  },
  {
    code: "SPAN_2",
    name: "Spanish II",
    department: "Foreign Language",
    gradeLevel: "Grades 9–12",
    credit: "1.0 Credit",
    description:
      "Intermediate-low Spanish transitioning from Descubre 1 (Chapters 6–9) into Descubre 2 (Chapters 1–3) with focus on preterite vs. imperfect and object pronouns.",
    curriculumDetails:
      "Texts: Descubre 1 (Ch. 6+) & Descubre 2 (through Ch. 3). Covers shopping/clothing, daily routine & reflexive verbs, food, celebrations, health/medical, technology, preterite (regular & irregular), imperfect, and direct/indirect object pronouns.",
    examFocus:
      "Preterite vs. imperfect conjugation and contextual selection, reflexive pronouns, double object pronouns (RID/se lo), and Saber vs. Conocer.",
    studyStrategy:
      "Drill irregular preterite stems (tuv-, estuv-, pud-, pus-, sup-, hic-, quis-, vin-) and practice pairing trigger words (ayer/siempre) with preterite vs. imperfect.",
    units: [
      "Descubre 1 Ch. 6: ¡De compras! — Clothing, Saber vs. Conocer & Direct Object Pronouns",
      "Descubre 1 Ch. 7: La rutina diaria — Reflexive Verbs & Indefinite/Negative Words",
      "Descubre 1 Ch. 8–9: La comida y Las fiestas — Stem-Changing & Irregular Preterite",
      "Descubre 2 Ch. 1: En el consultorio — Health, Imperfect vs. Preterite & Se Constructions",
      "Descubre 2 Ch. 2: La tecnología — Familiar Tú Commands & Por vs. Para",
      "Descubre 2 Ch. 3: La vivienda — Relative Pronouns & Formal Commands"
    ]
  },
  {
    code: "SPAN_3",
    name: "Spanish III",
    department: "Foreign Language",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit",
    description:
      "Intermediate-mid Spanish expanding grammar, subjunctive mood, future/conditional tenses, and cultural fluency across Realidades 3 (Para Empezar – Chapter 7).",
    curriculumDetails:
      "Text: Realidades 3 (Para Empezar – Ch. 7). Covers preterite/imperfect mastery, art/music, health/nutrition, relationships & present subjunctive, work/volunteerism, future & conditional, and National Spanish Exam prep.",
    examFocus:
      "Present subjunctive conjugation & WEIRDO triggers, formal/informal commands, por vs. para, future/conditional irregular stems, and reading comprehension.",
    studyStrategy:
      "Form subjunctive verbs systematically (yo present -> drop -o -> add opposite ending) and check every dependent clause for subjunctive triggers.",
    units: [
      "Para Empezar & Ch. 1: Días inolvidables — Preterite vs. Imperfect Mastery",
      "Ch. 2: Cómo te expresas — Fine Arts, Ser vs. Estar & Past Participles as Adjectives",
      "Ch. 3: ¿Qué haces para estar en forma? — Health, Commands & Present Subjunctive Intro",
      "Ch. 4: ¿Cómo te llevas con los demás? — Relationships & Subjunctive with Emotion/Doubt",
      "Ch. 5: Trabajo y comunidad — Present Perfect, Pluperfect & Subjunctive in Adjective Clauses",
      "Ch. 6–7: ¿Qué nos traerá el futuro? — Future, Conditional & Imperfect Subjunctive Intro"
    ]
  },
  {
    code: "SPAN_4_H",
    name: "Spanish IV Honors (SPA1011/1012)",
    department: "Foreign Language",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · Honors / Concurrent",
    description:
      "College-level thematic honors Spanish analyzing Hispanic literature, award-winning short films, current events, and advanced grammar structures.",
    curriculumDetails:
      "Text: Imagina (3rd ed., Vista Higher Learning), aligned with SPA1011/1012. Thematic chapters integrating imperfect subjunctive, si-clauses, compound tenses, Hispanic authors, short films, and analytical essays.",
    examFocus:
      "Advanced sequence of tenses (past subjunctive + conditional si-clauses), literary/film interpretation, and persuasive Spanish essay writing.",
    studyStrategy:
      "Master the two si-clause formulas (si + imperfect subjunctive -> conditional; si + pluperfect subjunctive -> conditional perfect) and cite film/literary evidence cleanly.",
    units: [
      "Lección 1–2: Sentir y vivir / Vivir en la ciudad — Ser/Estar, Progressive & Pronouns",
      "Lección 3–4: La influencia de los medios / Generaciones — Subjunctive in Noun/Adverbial Clauses",
      "Lección 5–6: Las riquezas naturales / El valor de las ideas — Future, Conditional & Si-Clauses",
      "Lección 7–8: Perspectivas laborales / Ciencia y tecnología — Imperfect Subjunctive & Compound Tenses",
      "Lección 9–10: El arte y la literatura — Hispanic Short Films, Literary Excerpts & Analytical Essays"
    ]
  },
  {
    code: "SPAN_AP",
    name: "AP Spanish Language and Culture",
    department: "Foreign Language",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP",
    description:
      "College-level AP capstone built around all six global themes using exclusive authentic Spanish print, audio, documentary, and literary sources.",
    curriculumDetails:
      "Texts: Temas, AP Spanish (Vista Higher Learning), Triángulo Aprobado, Preparing for the AP Spanish Language & Culture Exam. Prepares all AP interpretive, interpersonal, and presentational tasks.",
    examFocus:
      "AP Exam Section I (Print/Audio Interpretive MCQ) and Section II (Email Reply, 3-Source Argumentative Essay, Simulated Conversation, 2-Minute Cultural Comparison).",
    studyStrategy:
      "Practice formal salutations/closings for email replies, integrate all 3 sources clearly in the argumentative essay, and outline cultural comparisons with two specific Spanish-speaking examples.",
    units: [
      "Tema 1: Las familias y las comunidades (Tradiciones, Educación y Ciudadanía)",
      "Tema 2: La ciencia y la tecnología (Innovación, Ética y Acceso Digital)",
      "Tema 3: La belleza y la estética (Arquitectura, Artes Visuales y Literatura)",
      "Tema 4: La vida contemporánea (Entretenimiento, Trabajo y Ocio)",
      "Tema 5: Los desafíos mundiales (Medio Ambiente, Economía y Derechos Humanos)",
      "Tema 6: Las identidades personales y públicas (Nacionalismo, Lengua e Identidad)",
      "Unidad 7: Estrategias del Examen AP (Correo, Ensayo Argumentativo, Conversación, Comparación Cultural)"
    ]
  },

  // =========================================================================
  // FINE ARTS — VISUAL ARTS, THEATER & MUSIC (18 Courses)
  // =========================================================================
  {
    code: "ARTS_DRAW_1",
    name: "Drawing I",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Introductory observational drawing covering line, shape, space, proportion, linear perspective, value shading, art history, and formal critiques.",
    curriculumDetails:
      "Focuses on observational accuracy, contour, graphite value scales, pen & ink, marker, charcoal, elements & principles of design, art history, aesthetic theory, and written critiques.",
    examFocus:
      "1-point and 2-point linear perspective rules (horizon line, vanishing points), elements & principles of design, value modeling, and critique vocabulary.",
    studyStrategy:
      "Memorize the 7 elements of art and 7 principles of design alongside value modeling terms (highlight, core shadow, reflected light, cast shadow).",
    units: [
      "Unit 1: Observational Sighting, Contour Line & Blind Contour",
      "Unit 2: Value Scales, Light Logic & Shading (Graphite & Charcoal)",
      "Unit 3: Linear Perspective (1-Point & 2-Point Spatial Construction)",
      "Unit 4: Face & Object Proportion and Spatial Composition",
      "Unit 5: Pen & Ink Hatching, Art History & Formal Critique Writing"
    ]
  },
  {
    code: "ARTS_DRAW_2",
    name: "Drawing II (Intermediate)",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Intermediate drawing expanding observational and expressive craft into color theory, colored pencil, pastels, charcoal, and mixed media.",
    curriculumDetails:
      "Covers color drawing media (colored pencil, soft & oil pastel, charcoal, mixed media), color theory, abstraction, expressive line/mark-making, art history, and sketchbook process.",
    examFocus:
      "Color schemes (complementary, analogous, split-complementary, triadic), abstraction vs. representation, pastel/mixed-media layering, and art history movements.",
    studyStrategy:
      "Review color-temperature shadows (cool shadows for warm light) and compare Modernist abstraction styles in art history.",
    units: [
      "Unit 1: Color Theory in Drawing — Temperature, Harmony & Optical Mixing",
      "Unit 2: Colored Pencil Burnishing, Layering & Surface Control",
      "Unit 3: Soft & Oil Pastels, Charcoal & Expressive Mark-Making",
      "Unit 4: Abstraction, Mixed Media Experimentation & Art History Critiques"
    ]
  },
  {
    code: "ARTS_DRAW_3",
    name: "Drawing III (Advanced)",
    department: "Fine Arts",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Advanced observational and imaginative drawing exploring portraiture, expressive interiors, scratchboard, printmaking, and thematic series work.",
    curriculumDetails:
      "Covers expressive interiors & perspective, portraiture, natural forms, gesture, abstraction, artist research, series development, scratchboard, ink, printmaking, fiber, and mixed media.",
    examFocus:
      "Conceptual series coherence, printmaking & scratchboard processes, figure/portrait proportions, and contemporary/historical artist analysis.",
    studyStrategy:
      "Connect technical media choices (scratchboard contrast, intaglio/relief printmaking, gesture line weight) to expressive conceptual intent.",
    units: [
      "Unit 1: Expressive Interiors, Complex Perspective & Gesture",
      "Unit 2: Advanced Portraiture & Natural Form Observation",
      "Unit 3: Specialty Media — Scratchboard, Ink & Printmaking Processes",
      "Unit 4: Artist Research, Thematic Series & Portfolio Critique"
    ]
  },
  {
    code: "ARTS_AP_DRAW",
    name: "AP Drawing (Portfolio)",
    department: "Fine Arts",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · AP",
    description:
      "College-level AP Studio Art Drawing portfolio focusing on mark-making, line, surface, light/shade, and independent sustained investigation.",
    curriculumDetails:
      "Text: Drawing: A Contemporary Approach (6th ed.). Builds a 20–24 piece portfolio across pencil, colored pencil, charcoal, pastel, and ink for College Board Sustained Investigation & Selected Works.",
    examFocus:
      "AP Drawing Portfolio criteria: inquiry-driven Sustained Investigation (15 images + written evidence) and Selected Works (5 physical works demonstrating mark-making & synthesis).",
    studyStrategy:
      "Articulate clearly how materials, processes, and ideas evolved across revisions using formal College Board visual-inquiry vocabulary.",
    units: [
      "Unit 1: Advanced Mark-Making, Surface Sensitivity & Spatial Illusion",
      "Unit 2: Formulating a Visual Sustained Investigation Question",
      "Unit 3: Iterative Practice, Experimentation & Revision Documentation",
      "Unit 4: Selected Works Curation, Artist Statements & Portfolio Submission"
    ]
  },
  {
    code: "ARTS_AP_2D",
    name: "AP 2-D Art and Design (Portfolio)",
    department: "Fine Arts",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · AP",
    description:
      "College-level AP 2-D Design portfolio integrating drawing, painting, photography, printmaking, and mixed media around composition and design principles.",
    curriculumDetails:
      "Text: Launching the Imagination (5th ed.). Develops a 20–24 piece portfolio demonstrating 2-D design principles (unity, balance, contrast, hierarchy, rhythm) for College Board review.",
    examFocus:
      "2-D design organization (figure-ground, focal point, visual hierarchy), Sustained Investigation process evidence, and Selected Works craftsmanship.",
    studyStrategy:
      "Analyze every portfolio piece through the elements and principles of 2-D design and document deliberate experimentation in process photos.",
    units: [
      "Unit 1: 2-D Design Elements, Principles & Visual Hierarchy (Launching the Imagination)",
      "Unit 2: Multi-Media Ideation — Photography, Painting, Print & Mixed Media",
      "Unit 3: Sustained Investigation — Iterative Inquiry & Material Synthesis",
      "Unit 4: Selected Works Refinement, Critique & College Board Submission"
    ]
  },
  {
    code: "ARTS_PAINT_1",
    name: "Painting I",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Introductory watercolor and acrylic painting focusing on color theory, compositional structure, brush control, art history, and critique.",
    curriculumDetails:
      "Covers watercolor washes/glazes, acrylic opacity & layering, color wheel mixing (hue, value, intensity/chroma), composition, art history, aesthetic theory, and critiques.",
    examFocus:
      "Watercolor vs. acrylic properties (transparent vs. opaque, fat-over-lean/layering), color mixing/tints/shades/tones, and historical painting styles.",
    studyStrategy:
      "Distinguish tint (+white), shade (+black), and tone (+complement/gray) and review Impressionist, Post-Impressionist, and Realist brushwork.",
    units: [
      "Unit 1: Color Theory Mastery — Primary/Secondary Mixing, Tints, Shades & Intensity",
      "Unit 2: Watercolor Techniques — Washes, Wet-on-Wet, Dry Brush & Masking",
      "Unit 3: Acrylic Painting — Underpainting, Alla Prima, Scumbling & Layering",
      "Unit 4: Compositional Balance, Art History Movements & Aesthetic Critique"
    ]
  },
  {
    code: "ARTS_PAINT_2",
    name: "Painting II (Intermediate)",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Intermediate watercolor and acrylic painting emphasizing creative experimentation, complex color harmony, historical context, and visual problem solving.",
    curriculumDetails:
      "Expands watercolor and acrylic painting skills with experimental textures, glazing, atmospheric perspective, art history research, and sketchbook ideation.",
    examFocus:
      "Atmospheric perspective, glazing vs. impasto texture, complex color harmony critiques, and modern/contemporary painting history.",
    studyStrategy:
      "Compare how warm/cool color contrast creates depth and examine how historical painters structured focal points.",
    units: [
      "Unit 1: Advanced Color Harmony & Atmospheric Perspective",
      "Unit 2: Experimental Acrylic & Mixed Media Surface Layering",
      "Unit 3: Expressive Watercolor & Visual Metaphor",
      "Unit 4: Art Historical Research, Sketchbook Ideation & Oral/Written Critiques"
    ]
  },
  {
    code: "ARTS_PAINT_3",
    name: "Painting III (Advanced)",
    department: "Fine Arts",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Advanced studio painting exploring acrylic, watercolor, resin, encaustics, and mixed media alongside deep art history and aesthetic theory.",
    curriculumDetails:
      "Covers alternative paint mediums (resin, encaustics, mixed media), conceptual idea development, advanced composition, art history, and aesthetic philosophy.",
    examFocus:
      "Alternative medium safety & chemistry (encaustic wax, two-part resin), aesthetic theories (imitationalism, formalism, emotionalism), and series cohesion.",
    studyStrategy:
      "Contrast formalist, representational, and expressionist aesthetic frameworks in written art critiques.",
    units: [
      "Unit 1: Alternative Paint Mediums — Encaustics, Resin & Mixed Media",
      "Unit 2: Conceptual Ideation & Independent Painting Series",
      "Unit 3: Aesthetic Theory & Art History Contextual Analysis",
      "Unit 4: Portfolio Presentation & Advanced Studio Critiques"
    ]
  },
  {
    code: "ARTS_CERAMICS_1",
    name: "Ceramics I",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Introductory 3-D clay studio covering hand-building, wheel-throwing, glaze application, kiln firing stages, and global ceramic history.",
    curriculumDetails:
      "Covers pinch, coil, slab, and modeling hand-building; centering, pulling, and trimming on the wheel; glaze chemistry/techniques; functional vs. sculptural ceramics; and historical/cultural pottery.",
    examFocus:
      "Stages of clay (slip, plastic, leather-hard, bone-dry/greenware, bisqueware, glazeware), joinery (score-and-slip), kiln cone temperatures, and wheel-throwing steps.",
    studyStrategy:
      "Memorize the exact moisture/firing sequence of clay and why air bubbles or uneven thickness fail during bisque firing.",
    units: [
      "Unit 1: Clay Properties, Firing Stages & Safety (Greenware to Glazeware)",
      "Unit 2: Hand-Building Foundations — Pinch, Coil, Slab & Score-and-Slip",
      "Unit 3: Wheel-Throwing Basics — Wedging, Centering, Pulling & Trimming",
      "Unit 4: Glaze Chemistry, Surface Application & Ceramic Art History"
    ]
  },
  {
    code: "ARTS_CERAMICS_2",
    name: "Ceramics II (Intermediate)",
    department: "Fine Arts",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Intermediate ceramics advancing into figurative sculpture, complex multi-part functional vessels, altered wheel forms, and layered glaze surfaces.",
    curriculumDetails:
      "Builds figurative sculpture, advanced wheel-throwing & hand-building, expanded surface decoration (sgraffito, slip trailing, underglaze), 3-D design principles, and ceramic history.",
    examFocus:
      "3-D sculptural armature/hollowing rules, surface decoration techniques (sgraffito, mishima, oxide washes), and ceramic aesthetics.",
    studyStrategy:
      "Review how wall-thickness balance and structural drying rates prevent cracking in large figurative or multi-section pieces.",
    units: [
      "Unit 1: Figurative Sculpture, Hollowing & Structural 3-D Proportions",
      "Unit 2: Complex Functional Vessels (Lids, Spouts, Handles & Multi-Part Forms)",
      "Unit 3: Surface Decoration — Sgraffito, Slip Trailing, Majolica & Glaze Layering",
      "Unit 4: Three-Dimensional Design Aesthetics & Ceramic History Research"
    ]
  },
  {
    code: "ARTS_CERAMICS_3",
    name: "Ceramics III (Advanced)",
    department: "Fine Arts",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Advanced ceramic studio synthesizing wheel-throwing and hand-building in large-scale sculptural and functional series with complex glaze chemistry.",
    curriculumDetails:
      "Covers large-scale sculptural & functional forms, combined construction techniques, advanced surface & glaze chemistry, historical/contemporary ceramicists, and aesthetic theory.",
    examFocus:
      "Glaze raw materials (silica, alumina, fluxes, colorants), oxidation vs. reduction firing atmospheres, and contemporary sculptural ceramics.",
    studyStrategy:
      "Understand the three chemical components of every glaze (glass-former, flux, stabilizer) and how firing atmosphere alters copper/iron colors.",
    units: [
      "Unit 1: Large-Scale Combined Wheel & Hand-Built Construction",
      "Unit 2: Glaze Chemistry — Silica, Fluxes, Stabilizers & Firing Atmospheres",
      "Unit 3: Expressive Conceptual Series & Contemporary Ceramic Artists",
      "Unit 4: Studio Portfolio Critique & Aesthetic Theory Writing"
    ]
  },
  {
    code: "ARTS_JEWELRY",
    name: "Jewelry/Metals (I–III)",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Metalsmithing progression spanning piercing, sawing, soldering, bezel stone-setting, casting, riveting, hinges, patinas, enameling, and fold-forming.",
    curriculumDetails:
      "Covers beginner (sawing, filing, soldering, forging, bezel-setting), intermediate (lost-wax casting, riveting, hollow box forms, hinges, texturing, patinas, doming, tube setting), and advanced (enameling, fold-forming, complex fabrication).",
    examFocus:
      "Hard/medium/easy silver solder melting flow sequence, pickling & annealing metallurgy, cabochon bezel setting, lost-wax casting steps, and cold connections.",
    studyStrategy:
      "Memorize metalworking sequence rules (clean, flux, fit with zero gaps, heat evenly; anneal after work-hardening) and enamel/casting procedures.",
    units: [
      "Unit 1: Foundational Fabrication — Piercing, Sawing, Filing, Annealing & Soldering",
      "Unit 2: Stone Setting — Cabochon Bezel & Tube Setting Mechanics",
      "Unit 3: Intermediate Forms — Cold Connections (Rivets/Hinges), Doming & Hollow Box Forms",
      "Unit 4: Surface Chemistry & Casting — Lost-Wax Casting, Patinas & Texturing",
      "Unit 5: Advanced Metalsmithing — Enameling, Fold-Forming & Historical Jewelry"
    ]
  },
  {
    code: "ARTS_AP_3D",
    name: "AP 3-D Art and Design (Portfolio)",
    department: "Fine Arts",
    gradeLevel: "Grade 12",
    credit: "1.0 Credit · AP",
    description:
      "College-level 3-D sculpture, ceramics, and metalsmithing portfolio emphasizing spatial activation, form, volume, and sustained inquiry.",
    curriculumDetails:
      "Text: Launching the Imagination (5th ed.). Produces 18–20 sculptural works in clay, metals, and sculpture media for AP Sustained Investigation and Selected Works.",
    examFocus:
      "3-D design principles (occupied vs. unoccupied space, balance, movement, plane/line/mass), craftsmanship, and inquiry documentation.",
    studyStrategy:
      "Evaluate 3-D works from all 360-degree viewpoints and articulate how structural joinery and surface support the inquiry concept.",
    units: [
      "Unit 1: Principles of Three-Dimensional Design — Mass, Plane, Void & Balance",
      "Unit 2: Material Mastery Across Clay, Metals & Assemblage Media",
      "Unit 3: Sustained Investigation — Iterative Prototyping & 3-D Inquiry",
      "Unit 4: Selected Works Photography, Multi-Angle Documentation & Submission"
    ]
  },
  {
    code: "ARTS_PHOTO",
    name: "Photography I",
    department: "Fine Arts",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Foundations of manual SLR 35mm film photography, exposure triangle math, composition, film processing, darkroom enlarger printing, and photo history.",
    curriculumDetails:
      "Covers manual 35mm SLR camera mechanics, exposure triangle (Aperture, Shutter Speed, ISO), composition, negative development (developer, stop, fixer), enlarger anatomy & test strips, and history of photography.",
    examFocus:
      "Equivalent exposures (f-stop & shutter-speed stop math), depth of field vs. motion blur, darkroom chemical sequence, and historical photographic pioneers.",
    studyStrategy:
      "Memorize full f-stops (1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22) and shutter speeds; remember small f-number = wide opening = shallow depth of field.",
    units: [
      "Unit 1: 35mm SLR Camera Mechanics & Film Loading",
      "Unit 2: The Exposure Triangle — Aperture, Shutter Speed & ISO Equivalent Stops",
      "Unit 3: Photographic Composition — Rule of Thirds, Leading Lines & Framing",
      "Unit 4: Black-and-White Film Processing Chemistry (Developer, Stop, Fixer)",
      "Unit 5: Darkroom Enlarger Printing, Test Strips, Contrast Filters & Photo History"
    ]
  },
  {
    code: "ARTS_PHOTO_2",
    name: "Photography II (Intermediate)",
    department: "Fine Arts",
    gradeLevel: "Grades 10–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Intermediate fine-art photography exploring toning, hand coloring, multiple exposures, Sabattier solarization, specialty papers, and photographic history.",
    curriculumDetails:
      "Expands creative darkroom & expressive skills: sepia/selenium toning, hand coloring, double/multiple exposures, Sabattier effect, varied papers/films, and sketchbook journaling.",
    examFocus:
      "Darkroom manipulation physics/chemistry (Sabattier flash re-exposure, toning archivability, dodging & burning) and 20th-century fine-art photographers.",
    studyStrategy:
      "Compare archival permanence effects of selenium vs. sepia toning and track timing variables in Sabattier and multiple-exposure experiments.",
    units: [
      "Unit 1: Precision Darkroom Control — Dodging, Burning & Split-Grade Printing",
      "Unit 2: Chemical Toning & Hand-Coloring Silver Gelatin Prints",
      "Unit 3: Experimental Techniques — Multiple Exposures & Sabattier Solarization",
      "Unit 4: Specialty Papers, Fine-Art Photo History & Journaling"
    ]
  },
  {
    code: "ARTS_PHOTO_3",
    name: "Photography III (Advanced)",
    department: "Fine Arts",
    gradeLevel: "Grades 11–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Advanced fine-art and conceptual photography integrating manual DSLR shooting, Photoshop/Lightroom post-processing, cyanotypes, glass prints, and studio lighting.",
    curriculumDetails:
      "Covers manual digital photography, Adobe Photoshop & Lightroom workflows, alternative cyanotype printing, glass printing, night photography, studio lighting setups, photo history, and oral/written critiques.",
    examFocus:
      "RAW vs. JPEG histograms, Lightroom/Photoshop tonal curves & masking, cyanotype UV chemistry, and studio lighting ratios (Rembrandt, butterfly, key/fill).",
    studyStrategy:
      "Review histogram clipping, studio light modifiers (softbox vs. snoot vs. reflector), and cyanotype ferric ammonium citrate/potassium ferricyanide sensitizing.",
    units: [
      "Unit 1: Manual Digital Shooting, RAW Capture & Histogram Exposure",
      "Unit 2: Adobe Lightroom & Photoshop Post-Production Workflows",
      "Unit 3: Studio Lighting Setups & Night / Long-Exposure Photography",
      "Unit 4: Alternative Processes — Cyanotype Printing & Glass Transfers",
      "Unit 5: Conceptual Portfolio Presentations, Photo History & Oral Critiques"
    ]
  },
  {
    code: "ARTS_THEATER_INTRO",
    name: "Introduction to Theater",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Comprehensive introduction to theater history, dramatic structure, stage production, introductory acting, scene performance, and live play criticism.",
    curriculumDetails:
      "Text: The Stage and the School (6th ed.). Covers theater history across eras, Freytag's dramatic structure, stage areas & technical production, basic acting & representative historical scenes, and written production critiques.",
    examFocus:
      "Stage blocking directions (upstage/downstage/SR/SL), eras of theater history (Greek amphitheater, Medieval pageant, Elizabethan Globe, Realism), and dramatic structure terms.",
    studyStrategy:
      "Remember stage directions are always from the actor's perspective facing the audience, and distinguish thrust, proscenium, and arena stages.",
    units: [
      "Unit 1: Theater Space, Stage Directions & Production Roles",
      "Unit 2: History of Drama — Greek, Roman, Medieval & Elizabethan Theater",
      "Unit 3: Modern Theater Eras — Restoration, Realism & Contemporary Stage",
      "Unit 4: Dramatic Structure, Script Analysis & Play Appreciation",
      "Unit 5: Acting Fundamentals, Representative Scene Work & Production Critique"
    ]
  },
  {
    code: "ARTS_ACTING",
    name: "Acting/Improv",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Performance studio advancing verbal and nonverbal acting craft, improvisation, Stanislavski character motivation, script analysis, and scene work.",
    curriculumDetails:
      "Text: The Stage and the School (6th ed.). Develops verbal/nonverbal acting techniques, improvisation rules, character objective/obstacle/tactics analysis, play analysis, and live scene performances.",
    examFocus:
      "Stanislavski system vocabulary (objective, super-objective, obstacle, tactic, given circumstances, subtext), improv principles ('Yes, and...'), and vocal/physical projection.",
    studyStrategy:
      "Break every character monologue into beats with active transitive-verb tactics rather than emotional adjectives.",
    units: [
      "Unit 1: Improvisation Principles, Ensemble Listening & Spontaneity",
      "Unit 2: Vocal Projection, Articulation & Nonverbal Physicality",
      "Unit 3: Stanislavski Method — Objectives, Obstacles, Tactics & Given Circumstances",
      "Unit 4: Play & Character Analysis, Script Scoring & Subtext",
      "Unit 5: Rehearsal Process, Scene Performance & Production Evaluation"
    ]
  },
  {
    code: "ARTS_BAND_CONCERT",
    name: "Band Level 2 / Marching & Symphonic Band",
    department: "Fine Arts",
    gradeLevel: "Grades 8–12",
    credit: "1.0 Credit · Fine Art",
    description:
      "Instrumental band ensemble progression pairing marching fundamentals and competitive field performance with symphonic concert literature and Master Theory.",
    curriculumDetails:
      "Covers Band Level 2 and Marching Band (Sem 1) / Symphonic & Concert Band (Sem 2), utilizing Master Theory Books 1 & 2 alongside festival and concert repertoire.",
    examFocus:
      "Music theory from Master Theory Books 1–2 (key signatures, major/minor scales, intervals, time signatures, rhythm counting, transposition) and ensemble balance/intonation.",
    studyStrategy:
      "Memorize the Circle of Fifths (order of sharps F-C-G-D-A-E-B and flats B-E-A-D-G-C-F) and drill rhythm subdivision in simple and compound meters.",
    units: [
      "Unit 1: Tone Production, Embouchure, Intonation & Ensemble Blend",
      "Unit 2: Marching Fundamentals, Field Geometry & Leadership (Sem 1)",
      "Unit 3: Symphonic Concert Repertoire, Phrasing & Articulation Styles (Sem 2)",
      "Unit 4: Master Theory Book 1 — Notation, Rhythm, Key Signatures & Scales",
      "Unit 5: Master Theory Book 2 — Intervals, Triads, Compound Meter & Transposition"
    ]
  },
  {
    code: "ARTS_ORCHESTRA",
    name: "Orchestra Level 2 & Advanced Orchestra",
    department: "Fine Arts",
    gradeLevel: "Grades 8–12",
    credit: "1.0 Credit · Fine Art",
    description:
      "String orchestra curriculum building upper-position shifting, bowing articulations, chamber/symphonic ensemble mastery, and Master Theory Books 1 & 2.",
    curriculumDetails:
      "Covers Orchestra Level 2 and Advanced Orchestra (violin, viola, cello, double bass), concert repertoire, intonation/vibrato, bowing styles (detache, spiccato, martelé, legato), and Master Theory Books 1–2.",
    examFocus:
      "Alto/tenor/bass/treble clef reading, string bowing terminology, major/minor scales & intervals (Master Theory Books 1–2), and concert repertoire analysis.",
    studyStrategy:
      "Practice reading across clefs (especially C-clefs and bass clef), review key signatures around the Circle of Fifths, and map bowings to phrasing markings.",
    units: [
      "Unit 1: String Left-Hand Shifting, Vibrato & Pure Intonation",
      "Unit 2: Bowing Articulations (Détaché, Martelé, Spiccato, Slurs & Dynamics)",
      "Unit 3: Orchestral Ensemble Repertoire & Style Periods (Baroque to Modern)",
      "Unit 4: Master Theory Books 1 & 2 — Clefs, Scales, Intervals & Chords"
    ]
  },
  {
    code: "ARTS_CHOIR",
    name: "Concert, Tenor/Bass & Treble Choir",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5–1.0 Credit · Fine Art",
    description:
      "Choral ensembles developing vocal technique, multi-part & a cappella harmony, solfège sight-reading, Alfred/Jackson theory, and diverse repertoire.",
    curriculumDetails:
      "Covers Tenor/Bass Choir, Treble Choir, and auditioned Concert Choir (a cappella emphasis), spanning classical, sacred, folk, Broadway, and contemporary styles with Alfred Theory / Sight-Reading books.",
    examFocus:
      "Rhythmic and melodic sight-reading (solfège movable-do), vocal anatomy/breath support, vowel unification, IPA/diction, and music theory fundamentals.",
    studyStrategy:
      "Practice interval audiation using movable-do solfège and review time/key signatures and dynamic/tempo Italian terms.",
    units: [
      "Unit 1: Vocal Physiology, Breath Support, Resonance & Vowel Modification",
      "Unit 2: Rhythmic & Melodic Sight-Singing (Movable-Do Solfège)",
      "Unit 3: Part-Singing, Intonation & A Cappella Harmonic Blend",
      "Unit 4: Repertoire Across Eras — Sacred, Classical, Folk & Contemporary",
      "Unit 5: Choral Music Theory — Scales, Key Signatures, Triads & Notation"
    ]
  },
  {
    code: "ARTS_GUITAR",
    name: "Intro to Guitar",
    department: "Fine Arts",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Fine Art",
    description:
      "Semester instrumental course introducing guitar anatomy, standard notation and tablature, open/barre chords, strumming, and fingerstyle technique.",
    curriculumDetails:
      "Covers guitar tuning & care, treble clef first-position notes, tablature reading, open major/minor/7th chords, chord progressions, rhythmic strumming, and ensemble playing.",
    examFocus:
      "Fretboard note identification (E-A-D-G-B-E strings), chord diagram reading, treble clef rhythm/pitch notation, and I–IV–V–vi progressions.",
    studyStrategy:
      "Memorize open-string pitches (EADGBE) and half-step/whole-step intervals along each string to locate any note rapidly.",
    units: [
      "Unit 1: Guitar Anatomy, Posture, Tuning & Picking Technique",
      "Unit 2: Standard Treble-Clef Notation (First Position) & Rhythm Reading",
      "Unit 3: Open Chords, Tablature & Strumming Patterns",
      "Unit 4: Diatonic Chord Progressions, Fingerstyle & Ensemble Performance"
    ]
  },
  {
    code: "ARTS_AP_MUSIC",
    name: "AP Music Theory",
    department: "Fine Arts",
    gradeLevel: "Grades 11–12",
    credit: "1.0 Credit · AP Elective",
    description:
      "First-year college music theory covering pitch/rhythm notation, scales/modes, triads/seventh chords, SATB voice leading, harmonic analysis, and aural skills.",
    curriculumDetails:
      "Text: Kostka/Payne/Almén Tonal Harmony (8th ed.). Develops mastery of intervals, scales, chords, Roman-numeral harmonic analysis, non-chord tones, cadences, modulation, 4-part voice leading, melodic/harmonic dictation, and sight-singing.",
    examFocus:
      "AP Music Theory Exam: Aural & Non-Aural MCQ, Melodic & Harmonic Dictation, Realizing a Figured Bass (SATB), Harmonizing a Melody, and 2 Sight-Singing excerpts.",
    studyStrategy:
      "Eliminate parallel 5ths/8ves and doubled leading tones in every 4-part SATB exercise, and drill recognizing cadences (PAC, IAC, HC, PC, DC) by ear and score.",
    units: [
      "Unit 1: Music Fundamentals I — Pitch, Major Scales, Key Signatures & Meter",
      "Unit 2: Music Fundamentals II — Minor Scales, Modes, Intervals & Timbre",
      "Unit 3: Triads, Seventh Chords & Figured-Bass Inversions",
      "Unit 4: Harmony & Four-Part SATB Voice Leading (Root Position & Cadences)",
      "Unit 5: Phrase Structure, Harmonic Progression (Circle-of-Fifths) & Non-Chord Tones",
      "Unit 6: Seventh Chords in Context, Secondary Dominants & Tonicization",
      "Unit 7: Modulation, Binary/Ternary Form & Aural Skills (Dictation & Sight-Singing)"
    ]
  },

  // =========================================================================
  // ELECTIVES — COMPUTER SCIENCE, PHYSICAL EDUCATION & PUBLICATIONS (7 Courses)
  // =========================================================================
  {
    code: "CS_GATEWAY",
    name: "Gateway to Technology (Comp. Apps)",
    department: "Electives",
    gradeLevel: "Grades 7–9",
    credit: "0.5 Credit · Required",
    description:
      "Required foundational computing course building 40+ WPM touch-typing, Microsoft/Google productivity mastery, database search, and computational thinking.",
    curriculumDetails:
      "Covers touch-typing (40+ WPM at 95% accuracy), word processing formatting, spreadsheets & formulas/charts, presentations, search engine operators & source evaluation, and introductory programming logic.",
    examFocus:
      "Spreadsheet formulas (=SUM, =AVERAGE, =IF, relative vs. absolute $A$1 references), boolean search logic, file/cloud literacy, and algorithmic flowcharts.",
    studyStrategy:
      "Practice distinguishing relative vs. absolute spreadsheet cell references and review basic flow-control logic (sequence, selection, loop).",
    units: [
      "Unit 1: Touch Typing Mastery (40+ WPM / 95% Accuracy) & Digital Ergonomics",
      "Unit 2: Word Processing, Academic Formatting & Document Design",
      "Unit 3: Spreadsheets — Formulas, Functions, Cell Referencing & Data Charts",
      "Unit 4: Presentations, Internet Database Searching & Source Evaluation",
      "Unit 5: Computational Thinking & Fundamental Programming Concepts"
    ]
  },
  {
    code: "CS_CODING_1",
    name: "Coding I (Java)",
    department: "Electives",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Elective",
    description:
      "Introductory semester programming course in Java teaching object-oriented design, data types, control flow, methods, and problem solving.",
    curriculumDetails:
      "Text: Lewis/Loftus/Cocking Java Software Solutions for AP Computer Science. Covers Java syntax, primitive types & Strings, boolean logic & conditionals, loops, methods, and introductory classes/objects.",
    examFocus:
      "Tracing Java variables, integer division vs. modulo arithmetic, if/else & loop trace tables, String methods, and writing medium-difficulty class methods.",
    studyStrategy:
      "Trace every loop iteration by hand in a state table and verify Java type rules (int/int truncates decimals; String comparisons use .equals(), not ==).",
    units: [
      "Unit 1: Computer Systems, Java Syntax, Variables & Primitive Data Types",
      "Unit 2: Using Objects, Scanner Input, Math & String Methods",
      "Unit 3: Boolean Expressions, Relational Operators & Conditional Statements",
      "Unit 4: Iteration — While Loops, For Loops & Nested Loop Tracing",
      "Unit 5: Writing Classes, Methods, Parameters & Object-Oriented Design"
    ]
  },
  {
    code: "10157H05012",
    name: "AP Computer Science A (Java)",
    department: "Electives",
    gradeLevel: "Grades 10–12",
    credit: "1.0 Credit · AP Elective",
    description:
      "Official D'Evelyn AP Computer Science A syllabus covering college-level object-oriented programming, data structures, standard algorithms, and recursion in Java.",
    curriculumDetails:
      "Text: Java Software Solutions for AP Computer Science & all 10 College Board AP CSA Units: Primitive Types, Using Objects, Boolean Expressions/if, Iteration, Writing Classes, Array, ArrayList, 2D Array, Inheritance, and Recursion.",
    examFocus:
      "40 AP MCQ code-tracing items + 4 FRQs (Methods & Control Structures, Class Design, Array/ArrayList Traversal, and 2D Array Traversal).",
    studyStrategy:
      "Trace array/ArrayList removals backward or adjust index on remove(), distinguish row-major vs. column-major 2D traversals, and trace recursion with base-case call stacks.",
    units: [
      "Unit 1: Primitive Types, Casting & Arithmetic/Modulo Precedence",
      "Unit 2: Using Objects, Constructors, String & Math Classes",
      "Unit 3: Boolean Expressions, De Morgan's Laws & Conditional Control Flow",
      "Unit 4: Iteration — For/While Loops, String Algorithms & Nested Loop Tracing",
      "Unit 5: Writing Classes — Encapsulation, Accessors/Mutators, Scope & Static",
      "Unit 6: 1D Arrays — Traversals, Shifting & Standard Search/Max-Min Algorithms",
      "Unit 7: ArrayLists, Wrapper Classes & Searching/Sorting (Selection & Insertion)",
      "Unit 8: 2D Arrays — Row-Major, Column-Major & Matrix Algorithms",
      "Unit 9: Inheritance, Polymorphism, super & Object Class Overriding",
      "Unit 10: Recursion, Base Cases, Recursive Call Stacks & Merge Sort"
    ]
  },
  {
    code: "CS_AP_CSP",
    name: "AP Computer Science Principles",
    department: "Electives",
    gradeLevel: "Grades 9–12",
    credit: "1.0 Credit · AP Elective",
    description:
      "Introductory college-level computing course exploring creativity, binary data, algorithms, programming, internet protocols, cybersecurity, and computing impacts.",
    curriculumDetails:
      "Aligned with College Board's 5 Big Ideas: Creative Development, Data, Algorithms & Programming, Computer Systems & Networks, and Impact of Computing (plus Create Performance Task).",
    examFocus:
      "70 AP CSP MCQ (using AP pseudocode reference sheet, binary/hex conversions, logic gates, internet routing/TCP-IP, bias/crowdsourcing) + Create PT written responses.",
    studyStrategy:
      "Practice AP pseudocode 1-based list indexing (unlike 0-based Java/Python!), binary/decimal conversions, and distinguishing lossless vs. lossy compression.",
    units: [
      "Unit 1: Creative Development, Collaboration & Program Design Process",
      "Unit 2: Data — Binary/Hex Representation, Overflow, Compression & Metadata",
      "Unit 3: Algorithms & Programming (AP Pseudocode, Lists, Procedures & Efficiency/Heuristics)",
      "Unit 4: Computer Systems & Networks (Internet, Packets, IP/TCP/UDP, DNS & Fault Tolerance)",
      "Unit 5: Impact of Computing — Digital Divide, Crowdsourcing, Privacy & Cybersecurity"
    ]
  },
  {
    code: "PE_LIFETIME",
    name: "Lifetime Fitness",
    department: "Electives",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Required",
    description:
      "Required high school physical education teaching aerobic and muscular fitness training principles, goal setting, and lifelong wellness habits.",
    curriculumDetails:
      "Covers health-related vs. skill-related fitness components, FITT principle, target heart rate zones, aerobic vs. anaerobic metabolism, resistance safety, and personal fitness goal setting.",
    examFocus:
      "FITT principle (Frequency, Intensity, Time, Type), target heart rate calculation (220 - age), 5 health-related fitness components, and weight-room safety.",
    studyStrategy:
      "Memorize the 5 health-related fitness components (cardiorespiratory endurance, muscular strength, muscular endurance, flexibility, body composition) and FITT metrics.",
    units: [
      "Unit 1: Five Health-Related Fitness Components & Goal Setting",
      "Unit 2: Cardiovascular Conditioning, Aerobic vs. Anaerobic & Target Heart Rate",
      "Unit 3: FITT Principle & Personal Workout Program Design",
      "Unit 4: Muscular Strength, Weight-Room Mechanics & Injury Prevention",
      "Unit 5: Flexibility, Recovery, Nutrition & Lifelong Wellness"
    ]
  },
  {
    code: "PE_WEIGHTS",
    name: "Advanced Weight Training",
    department: "Electives",
    gradeLevel: "Grades 9–12",
    credit: "0.5 Credit · Elective",
    description:
      "Specialized strength and conditioning course focusing on explosive lifts, agility, sport-specific periodization, daily nutrition, and training journals.",
    curriculumDetails:
      "Focuses on individualized strength programming, explosive power & Olympic lift mechanics, agility & speed drills, hypertrophy vs. max-strength programming, and nutrition/progress journaling.",
    examFocus:
      "Training specificity, progressive overload, periodization (hypertrophy/strength/power rep/set schemes), prime-mover anatomy, and macronutrient recovery.",
    studyStrategy:
      "Contrast hypertrophy (8–12 reps), maximal strength (1–5 reps), and power/explosive training parameters alongside primary muscle groups worked by core compound lifts.",
    units: [
      "Unit 1: Biomechanics, Spotting Safety & Core Compound Lift Form",
      "Unit 2: Training Principles — Progressive Overload, Specificity & Periodization",
      "Unit 3: Explosive Power, Plyometrics, Speed & Agility Conditioning",
      "Unit 4: Muscular Anatomy, Recovery & Macronutrient / Hydration Journaling"
    ]
  },
  {
    code: "YEARBOOK",
    name: "Yearbook (Paw Prints)",
    department: "Electives",
    gradeLevel: "Grades 9–12",
    credit: "1.0 Credit · Elective",
    description:
      "Student publication production course developing journalistic writing, visual hierarchy, graphic layout, event photography, and deadline management for Paw Prints.",
    curriculumDetails:
      "Covers journalistic interviewing, feature & caption writing (AP style), typography & grid layout design, photojournalism composition, theme development, and print production deadlines.",
    examFocus:
      "Journalism ethics & libel/copyright law, AP style & ABCD caption formula, column/grid layout hierarchy (eyeline, gutter, bleed), and photojournalism.",
    studyStrategy:
      "Memorize typography/layout terms (pica, gutter, dominant photo, eyeline, spread) and journalistic copyediting rules (active voice, attribution, objective tone).",
    units: [
      "Unit 1: Theme Concept, Ladder Planning & Publication Ethics/Law",
      "Unit 2: Journalistic Interviewing, Feature Copy & ABCD Caption Writing",
      "Unit 3: Graphic Design Principles, Typography & Modular Spread Grids",
      "Unit 4: Photojournalism, Digital Workflow & Deadline Production"
    ]
  }
];
