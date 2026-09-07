/**
 * Reaktivierung – die sechste Phase „Wiederbegegnung“.
 *
 * Bewusst schlicht: relative Abstände in Tagen, frei konfigurierbar. Es wird
 * kein Intervall als „wissenschaftlich richtig“ dargestellt und kein
 * individueller Lernstand berechnet. Die Priorisierung unsicherer Einheiten ist
 * eine transparente didaktische Heuristik, kein Lernalgorithmus.
 */
import type {
  Lexeme,
  ObservationDimension,
  ObservationResult,
  ReactivationPlan,
  ReactivationRound,
  Sequence,
} from './model';
import { hasBeenIntroduced, needsPractice } from './observations';
import { firstFilled, gapText } from './text';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface OffsetPreset {
  /** Bezeichnung und Hinweis stehen im Sprachkatalog unter `reactivate.preset.<id>`. */
  id: string;
  offsets: number[];
}

export const OFFSET_PRESETS: readonly OffsetPreset[] = [
  { id: 'woche', offsets: [1, 3, 7] },
  { id: 'zwei-wochen', offsets: [1, 3, 7, 14] },
  { id: 'gestreckt', offsets: [2, 7, 21] },
  { id: 'folgestunde', offsets: [2] },
];

/** Zeitpunkt der nächsten offenen Reaktivierungsrunde. */
export function nextDueAt(sequence: Sequence): number | null {
  const plan = sequence.reactivation;
  if (!plan.enabled || plan.anchor === null) return null;
  const offset = plan.offsetsDays[plan.completedRounds];
  if (offset === undefined) return null;
  return plan.anchor + offset * DAY_MS;
}

export function isSequenceDue(sequence: Sequence, now = Date.now()): boolean {
  const due = nextDueAt(sequence);
  return due !== null && due <= now;
}

export interface DueEntry {
  sequence: Sequence;
  dueAt: number;
  round: number;
}

export function dueSequences(sequences: Sequence[], now = Date.now()): DueEntry[] {
  return sequences
    .filter((sequence) => !sequence.archived)
    .map((sequence) => ({ sequence, dueAt: nextDueAt(sequence), round: sequence.reactivation.completedRounds + 1 }))
    .filter((entry): entry is DueEntry => entry.dueAt !== null && entry.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

/* ------------------------------------------------------------- Impulse */

export type ImpulseKind =
  | 'bedeutung-erinnern'
  | 'ausdruck-zur-situation'
  | 'chunk-ergaenzen'
  | 'reaktion-formulieren'
  | 'neuer-kontext';

export interface ImpulseKindInfo {
  id: ImpulseKind;
  /** Wissensdimension, auf die sich die Rückmeldung bezieht. */
  dimension: ObservationDimension;
}

/** Bezeichnung und Zweck stehen im Sprachkatalog unter `impulse.<id>`. */
export const IMPULSE_KINDS: readonly ImpulseKindInfo[] = [
  { id: 'bedeutung-erinnern', dimension: 'meaning' },
  { id: 'ausdruck-zur-situation', dimension: 'form' },
  { id: 'chunk-ergaenzen', dimension: 'pattern' },
  { id: 'reaktion-formulieren', dimension: 'use' },
  { id: 'neuer-kontext', dimension: 'use' },
];

export function impulseDimension(kind: ImpulseKind): ObservationDimension {
  return IMPULSE_KINDS.find((entry) => entry.id === kind)?.dimension ?? 'meaning';
}

export interface ReactivationImpulse {
  id: string;
  lexemeId: string;
  kind: ImpulseKind;
  dimension: ObservationDimension;
  /** Zielsprachlicher Impuls für die Klasse. */
  prompt: string;
  /** Stütze für die Lehrkraft. */
  support: string;
  solution: string;
}

/** Auflösung eines zielsprachlichen Textbausteins aus dem Sprachkatalog. */
export type PhraseFn = (key: string, params?: Record<string, string>) => string;

function availableKinds(lexeme: Lexeme): ImpulseKind[] {
  const kinds: ImpulseKind[] = [];
  if (lexeme.coreMeaning.trim()) kinds.push('bedeutung-erinnern');
  if (firstFilled(lexeme.situation, lexeme.example)) kinds.push('ausdruck-zur-situation');
  if (/\s/.test(firstFilled(lexeme.sentenceFrame, lexeme.modelUtterance, lexeme.expression))) kinds.push('chunk-ergaenzen');
  if (lexeme.modelUtterance.trim()) kinds.push('reaktion-formulieren');
  kinds.push('neuer-kontext');
  return kinds;
}

function buildImpulse(
  sequence: Sequence,
  lexeme: Lexeme,
  kind: ImpulseKind,
  phrase: PhraseFn,
): ReactivationImpulse {
  const base = {
    id: `${lexeme.id}:${kind}`,
    lexemeId: lexeme.id,
    kind,
    dimension: impulseDimension(kind),
  };

  switch (kind) {
    case 'bedeutung-erinnern':
      return {
        ...base,
        prompt: phrase('impulse.prompt.bedeutung-erinnern', { expression: lexeme.expression }),
        support: '',
        solution: firstFilled(lexeme.targetExplanation, lexeme.coreMeaning),
      };
    case 'ausdruck-zur-situation':
      return {
        ...base,
        prompt: phrase('impulse.prompt.ausdruck-zur-situation', {
          situation: firstFilled(lexeme.situation, lexeme.example),
        }),
        support: lexeme.communicativeFunction,
        solution: lexeme.expression,
      };
    case 'chunk-ergaenzen':
      return {
        ...base,
        prompt: phrase('impulse.prompt.chunk-ergaenzen', {
          gap: gapText(firstFilled(lexeme.sentenceFrame, lexeme.modelUtterance, lexeme.expression)),
        }),
        support: firstFilled(lexeme.targetExplanation, lexeme.coreMeaning),
        solution: firstFilled(lexeme.sentenceFrame, lexeme.modelUtterance, lexeme.expression),
      };
    case 'reaktion-formulieren':
      return {
        ...base,
        prompt: phrase('impulse.prompt.reaktion-formulieren', { utterance: lexeme.modelUtterance }),
        support: lexeme.sentenceFrame,
        solution: '',
      };
    case 'neuer-kontext':
    default:
      return {
        ...base,
        prompt: sequence.topic
          ? phrase('impulse.prompt.neuer-kontext-thema', { expression: lexeme.expression, topic: sequence.topic })
          : phrase('impulse.prompt.neuer-kontext', { expression: lexeme.expression }),
        support: firstFilled(lexeme.communicativeTask, lexeme.sentenceFrame),
        solution: '',
      };
  }
}

export interface ImpulseOptions {
  /** Runde bestimmt die Rotation der Impulsarten – gleiche Runde, gleiches Ergebnis. */
  round?: number;
  limit?: number;
  /** Unsichere Einheiten zuerst; überschreibt die Einstellung der Sequenz. */
  prioritiseUnsure?: boolean;
}

/**
 * Erzeugt kurze Unterrichtsimpulse aus bereits eingeführten Einheiten.
 * Deterministisch: gleiche Eingaben ergeben dieselben Impulse.
 */
export function buildImpulses(
  sequence: Sequence,
  phrase: PhraseFn,
  options: ImpulseOptions = {},
): ReactivationImpulse[] {
  const round = options.round ?? sequence.reactivation.completedRounds;
  const prioritise = options.prioritiseUnsure ?? sequence.reactivation.prioritiseUnsure;

  const candidates = sequence.lexemes.filter((lexeme) => !lexeme.skipped && lexeme.expression.trim());
  const introduced = candidates.filter(hasBeenIntroduced);
  const pool = introduced.length > 0 ? introduced : candidates;

  // Transparente Heuristik: zuletzt unsichere Einheiten zuerst, sonst Reihenfolge.
  const ordered = prioritise
    ? [...pool].sort((a, b) => Number(needsPractice(b)) - Number(needsPractice(a)))
    : pool;

  const impulses = ordered.map((lexeme, index) => {
    const kinds = availableKinds(lexeme);
    const kind = kinds[(index + round) % kinds.length];
    return buildImpulse(sequence, lexeme, kind, phrase);
  });

  return options.limit ? impulses.slice(0, options.limit) : impulses;
}

/* --------------------------------------------------------- Runden abschließen */

export interface ImpulseOutcome {
  lexemeId: string;
  kind: ImpulseKind;
  dimension: ObservationDimension;
  result: ObservationResult;
}

export function summariseOutcomes(outcomes: ImpulseOutcome[]): Pick<ReactivationRound, 'secure' | 'supported' | 'notYet'> {
  return {
    secure: outcomes.filter((entry) => entry.result === 'secure').length,
    supported: outcomes.filter((entry) => entry.result === 'supported').length,
    notYet: outcomes.filter((entry) => entry.result === 'not-yet').length,
  };
}

/**
 * Schließt eine Runde ab: Sie zählt erst, wenn die Impulse durchgeführt wurden.
 * Der Verlauf bleibt erhalten, damit später nachvollziehbar ist, was wann lief.
 */
export function completeRound(plan: ReactivationPlan, outcomes: ImpulseOutcome[], at = Date.now()): ReactivationPlan {
  const round = plan.completedRounds + 1;
  return {
    ...plan,
    completedRounds: round,
    history: [...plan.history, { round, completedAt: at, ...summariseOutcomes(outcomes) }],
  };
}

/** Anzahl der Einheiten, die zuletzt „mit Hilfe“ oder „noch nicht“ waren. */
export function unsureCount(sequence: Sequence): number {
  return sequence.lexemes.filter((lexeme) => !lexeme.skipped && needsPractice(lexeme)).length;
}
