/**
 * Was die Klasse sehen darf – und was nur die Lehrkraft.
 *
 * Diese Auswahl liegt bewusst an einer einzigen Stelle. Bühne und
 * Projektionsfenster rendern ausschließlich das, was hier zurückgegeben wird;
 * so kann keine erstsprachliche Hilfe und keine Lehrkraftnotiz versehentlich an
 * die Wand geraten.
 *
 * Regel:
 * - Die Klasse bekommt zielsprachliche Inhalte, Medien und ausdrücklich
 *   freigegebene Hilfen.
 * - Erstsprachliches (interne Bedeutung, Übersetzung, vereinfachte Erklärung)
 *   ist Reserve der Lehrkraft. Im Modus `strict` erreicht es die Projektion nie,
 *   im Modus `reserve` nur nach Freigabe, im Modus `flexible` ebenso – dort
 *   zusätzlich die interne Bedeutung.
 */
import type { ConceptCheck, Lexeme, TeachingLanguageMode } from './model';
import { resolveCcqQuestion, type PhraseFn } from './ccq';
import type { StepDefinition, StepVisibility } from './steps';
import { firstFilled } from './text';

export type StageAudience = 'teacher' | 'class';

export interface StageOptions {
  lexeme: Lexeme;
  step: StepDefinition;
  visibility: StepVisibility;
  /** Erstsprachliche Reserve ausdrücklich für die Klasse freigegeben. */
  releaseL1: boolean;
  /** Lösung im Abruf sichtbar machen. */
  showSolution: boolean;
  mode: TeachingLanguageMode;
  audience: StageAudience;
}

export interface StageView {
  expression: string;
  utterance: string;
  /** Zielsprachliche Erklärung – projizierbar. */
  explanation: string;
  /** Zielsprachlicher Unterrichtsimpuls – projizierbar. */
  targetPrompt: string;
  /** Erstsprachliche Hilfen; leer, wenn sie hier nicht erscheinen dürfen. */
  translation: string;
  internalMeaning: string;
  simplified: string;
  supportLines: string[];
  patternAnchor: string;
  /** Nur für die Lehrkraft bestimmte Hinweise. */
  teacherNotes: string[];
  /** Ist erstsprachliche Reserve vorhanden – und in diesem Modus freigebbar? */
  l1Available: boolean;
}

/** Darf Erstsprachliches an die Klasse? */
export function l1VisibleToClass(mode: TeachingLanguageMode, released: boolean): boolean {
  if (mode === 'strict') return false;
  return released;
}

export function buildStageView(options: StageOptions): StageView {
  const { lexeme, step, visibility, releaseL1, showSolution, mode, audience } = options;
  const teacher = audience === 'teacher';
  const showL1 = teacher || l1VisibleToClass(mode, releaseL1);
  // Die interne Bedeutung ist Arbeitsmaterial der Lehrkraft; für die Klasse
  // wird sie nur im ausdrücklich mehrsprachigen Modus freigegeben.
  const showInternal = teacher || (mode === 'flexible' && releaseL1);

  const showForm = visibility.form || showSolution;
  const supportLines = [lexeme.pronunciationHint, lexeme.prosodyNote, lexeme.ipa, lexeme.morphology]
    .map((line) => line.trim())
    .filter(Boolean);

  const teacherNotes: string[] = [];
  if (teacher) {
    if (lexeme.teacherNote.trim()) teacherNotes.push(lexeme.teacherNote.trim());
    if (visibility.support && lexeme.extraHint.trim()) teacherNotes.push(lexeme.extraHint.trim());
  }

  return {
    expression: showForm ? lexeme.expression : '',
    utterance: showForm && step.id !== 'form' ? lexeme.modelUtterance : '',
    explanation: visibility.meaning || showSolution ? lexeme.targetExplanation : '',
    targetPrompt: lexeme.targetPrompt,
    translation: showL1 ? lexeme.translation : '',
    internalMeaning: showInternal ? lexeme.coreMeaning : '',
    simplified: showL1 ? lexeme.simplifiedExplanation : '',
    supportLines: visibility.support ? supportLines : [],
    patternAnchor: visibility.support && step.id !== 'fokus' ? lexeme.sentenceFrame : '',
    teacherNotes,
    l1Available: mode !== 'strict' && Boolean(firstFilled(lexeme.translation, lexeme.simplifiedExplanation, lexeme.coreMeaning)),
  };
}

/* ------------------------------------------------------- Bedeutungsprüfung */

export interface CcqOptions {
  check: ConceptCheck;
  lexeme: Lexeme;
  audience: StageAudience;
  /** Erwartete Antwort für die Klasse aufgedeckt. */
  showAnswer: boolean;
  /** Alternative Klärung für die Klasse freigegeben. */
  showAlternative?: boolean;
  phrase: PhraseFn;
}

export interface CcqView {
  /** Zielsprachliche Frage. */
  question: string;
  /** Antwortoptionen für die Klasse. */
  options: string[];
  /** Kurze zielsprachliche Arbeitsanweisung. */
  instruction: string;
  /** Erwartete Antwort – leer, solange sie verborgen bleibt. */
  expectedAnswer: string;
  /** Kennung des geprüften Merkmals; nur für die Lehrkraft. */
  feature: string;
  /** Mögliches Missverständnis; nur für die Lehrkraft. */
  misconception: string;
  /** Alternative Klärung; nur für die Lehrkraft. */
  alternative: string;
}

/** Zielsprachliche Arbeitsanweisung passend zum Antwortformat. */
function instructionKey(check: ConceptCheck): string {
  switch (check.format) {
    case 'auswahl-bild':
    case 'a-b':
      return 'learner.choose';
    case 'zeigen':
      return 'learner.show';
    case 'sortieren':
      return 'learner.sort';
    case 'beispiel-nichtbeispiel':
      return 'learner.compare';
    default:
      return 'step.prompt.ccq';
  }
}

export function buildCcqView(options: CcqOptions): CcqView {
  const { check, lexeme, audience, showAnswer, showAlternative = false, phrase } = options;
  const teacher = audience === 'teacher';

  return {
    question: resolveCcqQuestion(check, lexeme, phrase),
    options: check.options.filter((option) => option.trim()),
    instruction: phrase(instructionKey(check)),
    expectedAnswer: teacher || showAnswer ? check.expectedAnswer.trim() : '',
    feature: teacher ? check.feature : '',
    misconception: teacher ? check.misconception.trim() : '',
    // Die alternative Klärung liegt bei der Lehrkraft bereit und geht erst auf
    // ausdrücklichen Wunsch an die Klasse.
    alternative: teacher || showAlternative ? check.alternativeClarification.trim() : '',
  };
}
