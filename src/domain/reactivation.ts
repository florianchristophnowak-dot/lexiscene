/**
 * Reaktivierungsplanung.
 *
 * Bewusst schlicht: relative Abstände in Tagen, frei konfigurierbar. Es wird
 * kein Intervall als „wissenschaftlich richtig“ dargestellt und kein
 * individueller Lernstand berechnet.
 */
import type { Lexeme, Sequence } from './model';
import { firstFilled, gapText } from './text';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface OffsetPreset {
  label: string;
  offsets: number[];
  note: string;
}

export const OFFSET_PRESETS: readonly OffsetPreset[] = [
  { label: '1 · 3 · 7 Tage', offsets: [1, 3, 7], note: 'Kurzer Rhythmus innerhalb einer Unterrichtswoche.' },
  { label: '1 · 3 · 7 · 14 Tage', offsets: [1, 3, 7, 14], note: 'Standardvorschlag über zwei Wochen.' },
  { label: '2 · 7 · 21 Tage', offsets: [2, 7, 21], note: 'Größere Abstände bei wenigen Wochenstunden.' },
  { label: 'Nur nächste Stunde', offsets: [2], note: 'Einmalige Reaktivierung in der Folgestunde.' },
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
  label: string;
  purpose: string;
}

export const IMPULSE_KINDS: readonly ImpulseKindInfo[] = [
  { id: 'bedeutung-erinnern', label: 'Bedeutung erinnern', purpose: 'Abruf ohne Auswahlmöglichkeit.' },
  { id: 'ausdruck-zur-situation', label: 'Ausdruck zur Situation', purpose: 'Produktion aus der Situation heraus.' },
  { id: 'chunk-ergaenzen', label: 'Chunk ergänzen', purpose: 'Sichert die feste Verbindung als Ganzes.' },
  { id: 'reaktion-formulieren', label: 'Reaktion formulieren', purpose: 'Aktiviert das Paar aus Äußerung und Antwort.' },
  { id: 'neuer-kontext', label: 'Neuer Kontext', purpose: 'Überträgt die Einheit in eine andere Situation.' },
];

export interface ReactivationImpulse {
  id: string;
  lexemeId: string;
  kind: ImpulseKind;
  label: string;
  prompt: string;
  support: string;
  solution: string;
}

function availableKinds(lexeme: Lexeme): ImpulseKind[] {
  const kinds: ImpulseKind[] = [];
  if (lexeme.coreMeaning.trim()) kinds.push('bedeutung-erinnern');
  if (firstFilled(lexeme.situation, lexeme.example)) kinds.push('ausdruck-zur-situation');
  if (/\s/.test(firstFilled(lexeme.modelUtterance, lexeme.expression))) kinds.push('chunk-ergaenzen');
  if (lexeme.modelUtterance.trim()) kinds.push('reaktion-formulieren');
  kinds.push('neuer-kontext');
  return kinds;
}

function buildImpulse(sequence: Sequence, lexeme: Lexeme, kind: ImpulseKind): ReactivationImpulse {
  const info = IMPULSE_KINDS.find((entry) => entry.id === kind);
  const base = { id: `${lexeme.id}:${kind}`, lexemeId: lexeme.id, kind, label: info?.label ?? kind };

  switch (kind) {
    case 'bedeutung-erinnern':
      return { ...base, prompt: `Was bedeutet „${lexeme.expression}“?`, support: '', solution: lexeme.coreMeaning };
    case 'ausdruck-zur-situation':
      return {
        ...base,
        prompt: `Welcher Ausdruck passt hier? ${firstFilled(lexeme.situation, lexeme.example)}`,
        support: lexeme.communicativeFunction,
        solution: lexeme.expression,
      };
    case 'chunk-ergaenzen':
      return {
        ...base,
        prompt: `Ergänzt: ${gapText(firstFilled(lexeme.modelUtterance, lexeme.expression))}`,
        support: lexeme.coreMeaning,
        solution: firstFilled(lexeme.modelUtterance, lexeme.expression),
      };
    case 'reaktion-formulieren':
      return {
        ...base,
        prompt: `Antwortet auf: „${lexeme.modelUtterance}“`,
        support: lexeme.sentenceFrame,
        solution: '',
      };
    case 'neuer-kontext':
    default:
      return {
        ...base,
        prompt: `Verwendet „${lexeme.expression}“ in einer neuen Situation${sequence.topic ? ` zum Thema ${sequence.topic}` : ''}.`,
        support: firstFilled(lexeme.communicativeTask, lexeme.sentenceFrame),
        solution: '',
      };
  }
}

export interface ImpulseOptions {
  /** Runde bestimmt die Rotation der Impulsarten – gleiche Runde, gleiches Ergebnis. */
  round?: number;
  limit?: number;
}

/**
 * Erzeugt kurze Unterrichtsimpulse aus bereits eingeführten Einheiten.
 * Deterministisch: gleiche Eingaben ergeben dieselben Impulse.
 */
export function buildImpulses(sequence: Sequence, options: ImpulseOptions = {}): ReactivationImpulse[] {
  const round = options.round ?? sequence.reactivation.completedRounds;
  const candidates = sequence.lexemes.filter((lexeme) => !lexeme.skipped && lexeme.expression.trim());
  const introduced = candidates.filter((lexeme) => lexeme.status !== null);
  const pool = introduced.length > 0 ? introduced : candidates;

  const impulses = pool.map((lexeme, index) => {
    const kinds = availableKinds(lexeme);
    const kind = kinds[(index + round) % kinds.length];
    return buildImpulse(sequence, lexeme, kind);
  });

  return options.limit ? impulses.slice(0, options.limit) : impulses;
}
