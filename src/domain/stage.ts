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
import { drillItem, type DrillStage } from './drill';
import type { RecapItem } from './recap';
import type { StepDefinition, StepVisibility } from './steps';
import { firstFilled } from './text';

/**
 * Stufen beim Herauslocken des Wortes: erst warten, dann einen Anlaut geben,
 * zuletzt das Wort nennen. Vorher steht es nirgends geschrieben.
 */
export type WordReveal = 'hidden' | 'cue' | 'full';

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
  /** Stufe beim Herauslocken des Wortes (Schritt „Wort herauslocken“). */
  wordReveal?: WordReveal;
  /** Aktuelle Stufe der Aussprachearbeit, sonst `null`. */
  drillStage?: DrillStage | null;
  /** Kumulative Wiederholung: bereits eingeführte Einheiten. */
  recap?: RecapItem[];
  /** Wie viele davon für die Klasse aufgedeckt sind. */
  recapRevealed?: number;
}

export interface RecapLine {
  lexemeId: string;
  /** Ausdruck – leer, solange er für diese Ansicht verdeckt bleibt. */
  text: string;
  chunk: string;
  revealed: boolean;
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
  /** Anlaut oder erste Buchstaben beim Herauslocken – zielsprachlich. */
  wordCue: string;
  /** Zentrale Kollokation im Schritt „Kollokation ergänzen“. */
  chunk: string;
  /** Was gerade gesprochen wird, während die Aussprache geübt wird. */
  drillItem: string;
  /** Kumulative Wiederholung – verdeckte Einträge tragen keinen Text. */
  recap: RecapLine[];
  /** Beiträge der Lerngruppe – zielsprachlich, projizierbar. */
  contributions: string[];
}

/** Darf Erstsprachliches an die Klasse? */
export function l1VisibleToClass(mode: TeachingLanguageMode, released: boolean): boolean {
  if (mode === 'strict') return false;
  return released;
}

export function buildStageView(options: StageOptions): StageView {
  const {
    lexeme,
    step,
    visibility,
    releaseL1,
    showSolution,
    mode,
    audience,
    wordReveal = 'hidden',
    drillStage = null,
    recap = [],
    recapRevealed = 0,
  } = options;
  const teacher = audience === 'teacher';
  const showL1 = teacher || l1VisibleToClass(mode, releaseL1);
  // Die interne Bedeutung ist Arbeitsmaterial der Lehrkraft; für die Klasse
  // wird sie nur im ausdrücklich mehrsprachigen Modus freigegeben.
  const showInternal = teacher || (mode === 'flexible' && releaseL1);

  /*
   * Beim Herauslocken entscheidet allein die Stufe, ob das Wort dasteht – auch
   * dann, wenn das Schriftbild sonst eingeblendet wäre. Sonst wäre die Frage
   * schon beantwortet, bevor die Klasse überlegen konnte.
   */
  const eliciting = step.id === 'wort-elizitieren';
  const showForm = eliciting ? wordReveal === 'full' : visibility.form || showSolution;
  const supportLines = [lexeme.pronunciationHint, lexeme.prosodyNote, lexeme.ipa, lexeme.morphology]
    .map((line) => line.trim())
    .filter(Boolean);

  const teacherNotes: string[] = [];
  if (teacher) {
    if (lexeme.teacherNote.trim()) teacherNotes.push(lexeme.teacherNote.trim());
    if (visibility.support && lexeme.extraHint.trim()) teacherNotes.push(lexeme.extraHint.trim());
  }

  /*
   * Während der Aussprachearbeit trägt die geübte Wendung die Bühne allein.
   * Schriftbild, Modelläußerung und Hilfen würden sie nur verdoppeln.
   */
  const drilling = step.id === 'fokus' && Boolean(drillStage);
  const drillTarget = drilling ? drillItem(lexeme) : '';

  return {
    expression: showForm && !drilling ? lexeme.expression : '',
    utterance: showForm && step.id !== 'form' && !eliciting && !drilling ? lexeme.modelUtterance : '',
    explanation: (visibility.meaning || showSolution) && !drilling ? lexeme.targetExplanation : '',
    /*
     * In der Wiederholung trägt der eigene Impuls die Bühne; der Impuls der
     * laufenden Einheit gehört zu ihrer Einführung und würde hier irritieren.
     */
    targetPrompt: drilling || step.id === 'wiederholung' ? '' : lexeme.targetPrompt,
    // Beim Drill geht es um den Klang: Erstsprachliche Hilfen treten zurück.
    translation: showL1 && !drilling ? lexeme.translation : '',
    internalMeaning: showInternal && !drilling ? lexeme.coreMeaning : '',
    simplified: showL1 && !drilling ? lexeme.simplifiedExplanation : '',
    supportLines: visibility.support && !drilling ? supportLines : [],
    patternAnchor: visibility.support && step.id !== 'fokus' ? lexeme.sentenceFrame : '',
    teacherNotes,
    l1Available: mode !== 'strict' && Boolean(firstFilled(lexeme.translation, lexeme.simplifiedExplanation, lexeme.coreMeaning)),
    // Der Anlaut ist eine zielsprachliche Hilfe und darf an die Wand.
    wordCue: eliciting && wordReveal === 'cue' ? wordCue(lexeme) : '',
    chunk: step.id === 'chunk' ? firstFilled(lexeme.keyCollocation, lexeme.collocations.split(/\r?\n/)[0] ?? '') : '',
    drillItem: drillTarget,
    /*
     * In der Wiederholung ruft die Klasse ab: Verdeckte Einträge tragen für sie
     * keinen Text. Die Lehrkraft sieht die ganze Liste und weiß, was noch fehlt.
     */
    recap: recap.map((item, index) => {
      const revealed = index < recapRevealed;
      return {
        lexemeId: item.lexemeId,
        text: revealed || teacher ? item.expression : '',
        chunk: revealed || teacher ? item.chunk : '',
        revealed,
      };
    }),
    contributions: lexeme.classContributions.filter((entry) => entry.trim()),
  };
}

/**
 * Anlauthilfe: die eigene Angabe der Lehrkraft, sonst die ersten Zeichen des
 * Ausdrucks. Es wird nichts geraten – nur abgeschnitten.
 */
export function wordCue(lexeme: Lexeme): string {
  const own = lexeme.wordCue.trim();
  if (own) return own;
  const expression = lexeme.expression.trim();
  if (!expression) return '';
  const head = expression.slice(0, expression.length > 4 ? 2 : 1);
  return `${head}…`;
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
