/**
 * Dramaturgie einer Semantisierung.
 *
 * Über den sechzehn Mikro-Schritten liegen sechs didaktische Phasen:
 * Kontext – Klarheit – Muster – Abruf – Gebrauch – Wiederbegegnung.
 * Die Phasen geben die Grundstruktur; welche Schritte darin vorkommen und in
 * welcher Reihenfolge, entscheidet die Lehrkraft je Sequenz und Einheit.
 *
 * Bezeichnung und Begründung stehen im Sprachkatalog: `phase.<id>`,
 * `phase.<id>.purpose`, `step.<id>` und `step.<id>.purpose`.
 */
import type { Lexeme, ObservationDimension, PhaseId, Sequence, StepId } from './model';
import { checkTemplate } from './checks';
import { corpusMiniatureReady } from './corpus';
import { ccqDimension, hasUsableCcq } from './ccq';
import { recapItems } from './recap';

export interface PhaseDefinition {
  id: PhaseId;
  position: number;
}

export const PHASES: readonly PhaseDefinition[] = [
  { id: 'kontext', position: 1 },
  { id: 'klarheit', position: 2 },
  { id: 'muster', position: 3 },
  { id: 'abruf', position: 4 },
  { id: 'gebrauch', position: 5 },
  { id: 'wiederbegegnung', position: 6 },
];

export function phaseDefinition(id: PhaseId): PhaseDefinition | undefined {
  return PHASES.find((phase) => phase.id === id);
}

export interface StepDefinition {
  id: StepId;
  position: number;
  phase: PhaseId;
}

/**
 * Standardreihenfolge: Sie folgt den Phasen, ist aber nur ein Vorschlag –
 * Reihenfolge und Auswahl sind je Sequenz und Einheit änderbar.
 */
export const STEPS: readonly StepDefinition[] = [
  { id: 'situation', position: 1, phase: 'kontext' },
  { id: 'impuls', position: 2, phase: 'kontext' },
  { id: 'vermuten', position: 3, phase: 'klarheit' },
  { id: 'klaeren', position: 4, phase: 'klarheit' },
  // Bedeutung prüfen: erst nach der Klärung, und ausdrücklich vor der Form.
  { id: 'ccq', position: 5, phase: 'klarheit' },
  // Erst wenn das Konzept steht, wird das Wort selbst herausgelockt.
  { id: 'wort-elizitieren', position: 6, phase: 'muster' },
  { id: 'audio', position: 7, phase: 'muster' },
  { id: 'form', position: 8, phase: 'muster' },
  { id: 'fokus', position: 9, phase: 'muster' },
  // Eine zentrale Kollokation wird als Ganzes ergänzt und gesprochen.
  { id: 'chunk', position: 10, phase: 'muster' },
  { id: 'korpusminiatur', position: 11, phase: 'muster' },
  // Die Abrufkontrolle prüft die sprachliche Form, nicht mehr das Konzept.
  { id: 'kontrolle', position: 12, phase: 'abruf' },
  { id: 'hilfen-ausblenden', position: 13, phase: 'abruf' },
  { id: 'abruf', position: 14, phase: 'abruf' },
  // Kumulative Wiederholung vor dem eigenen Sprachhandeln.
  { id: 'wiederholung', position: 15, phase: 'abruf' },
  { id: 'aufgabe', position: 16, phase: 'gebrauch' },
];

/**
 * Schritte, die bei neuen Sequenzen zunächst abgeschaltet bleiben.
 * Die Korpusminiatur ist ein Angebot: Sie erscheint erst, wenn die Lehrkraft
 * sie für eine Sequenz oder eine einzelne Einheit einschaltet.
 */
export const OPT_IN_STEPS: readonly StepId[] = ['korpusminiatur'];

export const STEP_IDS: readonly StepId[] = STEPS.map((step) => step.id);

export function defaultStepConfig(): Record<StepId, boolean> {
  const config = {} as Record<StepId, boolean>;
  for (const step of STEPS) config[step.id] = !OPT_IN_STEPS.includes(step.id);
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
 * doppelte Einträge fallen weg, fehlende Schritte werden an ihrer
 * Standardposition ergänzt.
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

  /*
   * Fehlende Schritte – etwa ein in einer neueren Version ergänzter – werden
   * an ihrer Standardposition eingefügt: hinter dem nächstgelegenen Vorgänger
   * aus der Standardreihenfolge. Eine selbst gewählte Reihenfolge bleibt so
   * unverändert erhalten, und neue Schritte landen nicht am Ende.
   */
  for (const [defaultIndex, stepId] of STEP_IDS.entries()) {
    if (order.includes(stepId)) continue;
    let insertAt = order.length;
    for (let previous = defaultIndex - 1; previous >= 0; previous -= 1) {
      const position = order.indexOf(STEP_IDS[previous]);
      if (position >= 0) {
        insertAt = position + 1;
        break;
      }
    }
    order.splice(insertAt, 0, stepId);
  }

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
    case 'ccq':
      return hasUsableCcq(lexeme);
    case 'wort-elizitieren':
      return hasText(lexeme.expression);
    case 'chunk':
      return hasText(lexeme.keyCollocation, lexeme.collocations);
    case 'wiederholung':
      // Wiederholt wird kumulativ – vor der ersten Einheit gibt es nichts.
      return recapItems(sequence, lexeme).length > 0;
    case 'korpusminiatur':
      return corpusMiniatureReady(lexeme.corpus);
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
    // Nach den CCQs richtet sich die Rückmeldung danach, worauf sie zielen.
    case 'ccq':
      return lexeme ? ccqDimension(lexeme) : 'meaning';
    case 'audio':
    case 'form':
    case 'wort-elizitieren':
    case 'hilfen-ausblenden':
    case 'abruf':
    case 'wiederholung':
      return 'form';
    case 'fokus':
    case 'chunk':
    case 'korpusminiatur':
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
  return ['ccq', 'kontrolle', 'hilfen-ausblenden', 'abruf', 'wiederholung', 'aufgabe'].includes(id);
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
  // Bei der Bedeutungsprüfung steht die Frage allein; die Erklärung würde sie
  // beantworten, bevor die Klasse antworten kann.
  ccq: { meaning: false, form: false, support: false },
  // Das Wort wird herausgelockt – es steht erst da, wenn die Lehrkraft es zeigt.
  'wort-elizitieren': { meaning: true, form: false, support: false },
  // Beim Chunk trägt die Wendung selbst; die Bedeutung ist geklärt.
  chunk: { meaning: false, form: true, support: false },
  // Die Wiederholung ruft ab: Nichts steht von allein da.
  wiederholung: { meaning: false, form: false, support: false },
  // Innerhalb der Phase „Muster“ kommt das Klangbild vor dem Schriftbild.
  audio: { form: false },
  // Im Fokusschritt stehen Musteranker und Lautung im Vordergrund.
  fokus: { meaning: false, support: true },
  // In der Korpusminiatur tragen die Belege. Bedeutung und Schriftbild sind
  // bereits gesichert und würden die Bühne nur füllen.
  korpusminiatur: { meaning: false, form: false, support: false },
};

export function defaultVisibility(id: StepId): StepVisibility {
  const phase = stepDefinition(id)?.phase ?? 'kontext';
  return { ...PHASE_VISIBILITY[phase], ...(STEP_VISIBILITY_EXCEPTIONS[id] ?? {}) };
}

/**
 * Kurzbeschreibung des Profils für die Vorbereitung. Die Bezeichnungen kommen
 * aus dem Sprachkatalog, damit hier kein fester Text steht.
 */
export function visibilityLabel(
  visibility: StepVisibility,
  label: (prefix: string, id: string) => string,
  nothing: string,
): string {
  const parts = [
    visibility.meaning ? label('teach.toggle', 'meaning') : '',
    visibility.form ? label('teach.toggle', 'form') : '',
    visibility.support ? label('teach.toggle', 'support') : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : nothing;
}
