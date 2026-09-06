/**
 * Dramaturgie einer Semantisierung.
 *
 * Über den elf Mikro-Schritten liegen sechs didaktische Phasen:
 * Kontext – Klarheit – Muster – Abruf – Gebrauch – Wiederbegegnung.
 * Die Phasen geben die Grundstruktur; welche Schritte darin vorkommen und in
 * welcher Reihenfolge, entscheidet die Lehrkraft je Sequenz und Einheit.
 */
import type { Lexeme, ObservationDimension, PhaseId, Sequence, StepId } from './model';
import { checkTemplate } from './checks';

export interface PhaseDefinition {
  id: PhaseId;
  position: number;
  label: string;
  purpose: string;
}

export const PHASES: readonly PhaseDefinition[] = [
  {
    id: 'kontext',
    position: 1,
    label: 'Kontext',
    purpose: 'Situation und kommunikativen Bedarf aufbauen, bevor Sprache angeboten wird.',
  },
  {
    id: 'klarheit',
    position: 2,
    label: 'Klarheit',
    purpose: 'Die Bedeutung eindeutig sichern – erschlossen oder direkt geklärt.',
  },
  {
    id: 'muster',
    position: 3,
    label: 'Muster',
    purpose: 'Klangbild, Schriftbild und Musteranker verfügbar machen.',
  },
  {
    id: 'abruf',
    position: 4,
    label: 'Abruf',
    purpose: 'Prüfen und üben, was ohne Hilfen abrufbar ist.',
  },
  {
    id: 'gebrauch',
    position: 5,
    label: 'Gebrauch',
    purpose: 'Die Einheit in eigenem Sprachhandeln verwenden.',
  },
  {
    id: 'wiederbegegnung',
    position: 6,
    label: 'Wiederbegegnung',
    purpose: 'Später erneut aktivieren – im Bereich „Reaktivieren“ geplant und durchgeführt.',
  },
];

export function phaseDefinition(id: PhaseId): PhaseDefinition | undefined {
  return PHASES.find((phase) => phase.id === id);
}

export interface StepDefinition {
  id: StepId;
  position: number;
  phase: PhaseId;
  label: string;
  /** Knappe didaktische Begründung – erscheint als Hinweis in der Vorbereitung. */
  purpose: string;
}

/**
 * Standardreihenfolge: Sie folgt den Phasen, ist aber nur ein Vorschlag –
 * Reihenfolge und Auswahl sind je Sequenz und Einheit änderbar.
 */
export const STEPS: readonly StepDefinition[] = [
  {
    id: 'situation',
    position: 1,
    phase: 'kontext',
    label: 'Situation',
    purpose: 'Kommunikativen Bedarf sichtbar machen, bevor Sprache angeboten wird.',
  },
  {
    id: 'impuls',
    position: 2,
    phase: 'kontext',
    label: 'Impuls zeigen',
    purpose: 'Bild, Gegenstand, Geste oder Video als Bedeutungsträger anbieten.',
  },
  {
    id: 'vermuten',
    position: 3,
    phase: 'klarheit',
    label: 'Bedeutung erschließen',
    purpose:
      'Nur sinnvoll, wenn der Kontext informativ genug ist oder Erschließen bewusst geübt wird – die Klärung muss immer folgen.',
  },
  {
    id: 'klaeren',
    position: 4,
    phase: 'klarheit',
    label: 'Bedeutung klären',
    purpose: 'Bedeutung eindeutig sichern, damit keine falsche Hypothese bestehen bleibt.',
  },
  {
    id: 'audio',
    position: 5,
    phase: 'muster',
    label: 'Hören',
    purpose: 'Klangbild anbieten. Ob es vor oder nach dem Schriftbild kommt, ist eine Regieentscheidung.',
  },
  {
    id: 'form',
    position: 6,
    phase: 'muster',
    label: 'Form zeigen',
    purpose: 'Schriftbild einführen. Der Zeitpunkt ist wählbar – früh stützt, spät fordert das Hören.',
  },
  {
    id: 'fokus',
    position: 7,
    phase: 'muster',
    label: 'Aussprache und Muster',
    purpose: 'Lautung, Betonung und Musteranker gezielt fokussieren.',
  },
  {
    id: 'kontrolle',
    position: 8,
    phase: 'abruf',
    label: 'Verständniskontrolle',
    purpose: 'Formative Rückmeldung einholen, ohne zu bewerten.',
  },
  {
    id: 'hilfen-ausblenden',
    position: 9,
    phase: 'abruf',
    label: 'Hilfen ausblenden',
    purpose: 'Stützen entfernen und sehen, was ohne Vorlage abrufbar ist.',
  },
  {
    id: 'abruf',
    position: 10,
    phase: 'abruf',
    label: 'Freier Abruf',
    purpose: 'Abruf ohne Vorlage anregen – erst Denkzeit, dann Lösung.',
  },
  {
    id: 'aufgabe',
    position: 11,
    phase: 'gebrauch',
    label: 'Kommunikative Mini-Aufgabe',
    purpose: 'Erstes eigenes Sprachhandeln mit der neuen Einheit ermöglichen.',
  },
];

export const STEP_IDS: readonly StepId[] = STEPS.map((step) => step.id);

export function defaultStepConfig(): Record<StepId, boolean> {
  const config = {} as Record<StepId, boolean>;
  for (const step of STEPS) config[step.id] = true;
  return config;
}

export function stepDefinition(id: StepId): StepDefinition | undefined {
  return STEPS.find((step) => step.id === id);
}

export function stepPhase(id: StepId): PhaseDefinition | undefined {
  const step = stepDefinition(id);
  return step ? phaseDefinition(step.phase) : undefined;
}

/** Alle Schritte einer Phase in der Standardreihenfolge. */
export function stepsOfPhase(phase: PhaseId): StepDefinition[] {
  return STEPS.filter((step) => step.phase === phase);
}

/**
 * Macht aus beliebigen Eingaben eine gültige Reihenfolge: unbekannte und
 * doppelte Einträge fallen weg, fehlende Schritte werden hinten ergänzt.
 */
export function normalizeStepOrder(raw: unknown): StepId[] {
  const known = new Set<StepId>(STEP_IDS);
  const order: StepId[] = [];

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string' && known.has(entry as StepId) && !order.includes(entry as StepId)) {
        order.push(entry as StepId);
      }
    }
  }

  for (const stepId of STEP_IDS) if (!order.includes(stepId)) order.push(stepId);
  return order;
}

/** Gültige Reihenfolge für diese Einheit: eigene Reihenfolge vor der der Sequenz. */
export function effectiveStepOrder(sequence: Sequence, lexeme?: Lexeme): StepId[] {
  if (lexeme?.stepOrderOverride) return normalizeStepOrder(lexeme.stepOrderOverride);
  return normalizeStepOrder(sequence.stepOrder);
}

/** Verschiebt einen Schritt innerhalb einer Reihenfolge. */
export function moveStep(order: StepId[], from: number, to: number): StepId[] {
  if (from < 0 || from >= order.length) return order;
  const target = Math.min(Math.max(to, 0), order.length - 1);
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

const hasText = (...values: (string | undefined)[]): boolean => values.some((value) => Boolean(value && value.trim()));

/**
 * Ist ein Erschließungsversuch für diese Einheit vorgesehen?
 *
 * Erschließen setzt einen Kontext voraus, der die Bedeutung überhaupt hergibt.
 * Ohne diese Grundlage wird der Schritt nicht angeboten; die Klärung folgt in
 * jedem Fall im nächsten Schritt.
 */
export function inferenceAvailable(lexeme: Lexeme, sequence?: Sequence): boolean {
  const mode = sequence?.inferenceMode ?? 'optional';
  if (mode === 'off') return false;
  if (!hasText(lexeme.situation, lexeme.example, lexeme.modelUtterance)) return false;
  if (mode === 'planned') return true;
  return lexeme.inferenceSuitability !== 'ungeeignet';
}

/** Ein Schritt wird nur angeboten, wenn dafür überhaupt Material vorliegt. */
export function stepHasContent(id: StepId, lexeme: Lexeme, sequence?: Sequence): boolean {
  switch (id) {
    case 'situation':
      return hasText(lexeme.situation, lexeme.example, lexeme.modelUtterance);
    case 'impuls':
      return Boolean(lexeme.imageId || lexeme.videoId) || hasText(lexeme.semantisationMethod);
    case 'audio':
      return Boolean(lexeme.audioId) || hasText(lexeme.modelUtterance);
    case 'vermuten':
      return inferenceAvailable(lexeme, sequence);
    case 'klaeren':
      return hasText(lexeme.coreMeaning, lexeme.translation, lexeme.simplifiedExplanation);
    case 'form':
      return hasText(lexeme.expression);
    case 'fokus':
      return hasText(
        lexeme.pronunciationHint,
        lexeme.prosodyNote,
        lexeme.ipa,
        lexeme.morphology,
        lexeme.sentenceFrame,
        lexeme.valency,
        lexeme.collocations,
      );
    case 'kontrolle':
      return hasText(lexeme.checkTemplateId, lexeme.checkPrompt);
    case 'hilfen-ausblenden':
    case 'abruf':
      return hasText(lexeme.expression);
    case 'aufgabe':
      return hasText(lexeme.communicativeTask, lexeme.extensionTask, lexeme.modelUtterance);
    default:
      return false;
  }
}

export function isStepEnabled(sequence: Sequence, lexeme: Lexeme, id: StepId): boolean {
  const override = lexeme.stepOverrides?.[id];
  if (typeof override === 'boolean') return override;
  return sequence.steps?.[id] !== false;
}

/** Alle Schritte, die für diese Einheit tatsächlich gezeigt werden – in der gewählten Reihenfolge. */
export function resolveSteps(sequence: Sequence, lexeme: Lexeme): StepDefinition[] {
  return effectiveStepOrder(sequence, lexeme)
    .map((stepId) => stepDefinition(stepId))
    .filter((step): step is StepDefinition => Boolean(step))
    .filter((step) => isStepEnabled(sequence, lexeme, step.id) && stepHasContent(step.id, lexeme, sequence));
}

/** Die Phasen, die in dieser Einheit tatsächlich vorkommen. */
export function resolvePhases(sequence: Sequence, lexeme: Lexeme): PhaseDefinition[] {
  const seen = new Set<PhaseId>();
  const phases: PhaseDefinition[] = [];
  for (const step of resolveSteps(sequence, lexeme)) {
    if (seen.has(step.phase)) continue;
    seen.add(step.phase);
    const phase = phaseDefinition(step.phase);
    if (phase) phases.push(phase);
  }
  return phases;
}

/**
 * Wissensdimension, auf die sich eine Rückmeldung in diesem Schritt bezieht.
 * Bei der Verständniskontrolle richtet sie sich nach der gewählten Vorlage.
 */
export function stepDimension(id: StepId, lexeme?: Lexeme): ObservationDimension {
  switch (id) {
    case 'situation':
    case 'impuls':
    case 'vermuten':
    case 'klaeren':
      return 'meaning';
    case 'audio':
    case 'form':
    case 'hilfen-ausblenden':
    case 'abruf':
      return 'form';
    case 'fokus':
      return 'pattern';
    case 'aufgabe':
      return 'use';
    case 'kontrolle':
      return lexeme ? (checkTemplate(lexeme.checkTemplateId)?.target ?? 'meaning') : 'meaning';
    default:
      return 'meaning';
  }
}

/** In diesen Schritten ist eine Rückmeldung der Lerngruppe sinnvoll. */
export function stepInvitesFeedback(id: StepId): boolean {
  return ['kontrolle', 'hilfen-ausblenden', 'abruf', 'aufgabe'].includes(id);
}

/** Sichtbarkeit der Hilfen beim Betreten eines Schritts (gestufte Enthüllung). */
export interface StepVisibility {
  meaning: boolean;
  form: boolean;
  support: boolean;
}

/**
 * Sichtbarkeitsprofil je Phase: Was die Klasse beim Betreten eines Schritts
 * dieser Phase standardmäßig sieht. Die Lehrkraft kann jederzeit umschalten.
 */
export const PHASE_VISIBILITY: Record<PhaseId, StepVisibility> = {
  kontext: { meaning: false, form: false, support: false },
  klarheit: { meaning: true, form: false, support: false },
  muster: { meaning: true, form: true, support: false },
  abruf: { meaning: false, form: false, support: false },
  gebrauch: { meaning: false, form: true, support: false },
  wiederbegegnung: { meaning: false, form: false, support: false },
};

/** Begründete Abweichungen einzelner Schritte vom Profil ihrer Phase. */
const STEP_VISIBILITY_EXCEPTIONS: Partial<Record<StepId, Partial<StepVisibility>>> = {
  // Erst vermuten lassen, dann klären – sonst ist die Frage beantwortet.
  vermuten: { meaning: false },
  // Innerhalb der Phase „Muster“ kommt das Klangbild vor dem Schriftbild.
  audio: { form: false },
  // Im Fokusschritt stehen Musteranker und Lautung im Vordergrund.
  fokus: { meaning: false, support: true },
};

export function defaultVisibility(id: StepId): StepVisibility {
  const phase = stepDefinition(id)?.phase ?? 'kontext';
  return { ...PHASE_VISIBILITY[phase], ...(STEP_VISIBILITY_EXCEPTIONS[id] ?? {}) };
}

/** Kurzbeschreibung des Profils für die Vorbereitung. */
export function visibilityLabel(visibility: StepVisibility): string {
  const parts = [
    visibility.meaning ? 'Bedeutung' : '',
    visibility.form ? 'Schriftbild' : '',
    visibility.support ? 'Hilfen' : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'nichts';
}
