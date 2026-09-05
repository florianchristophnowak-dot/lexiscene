/**
 * Datenmodell von LexiScène (Schemaversion 2).
 *
 * Verwaltet werden nicht einzelne Vokabeln, sondern kommunikativ nutzbare
 * lexiko-grammatische Einheiten ("Lexikeinheiten"). Das Schema ist versioniert
 * und in `docs/schema.md` dokumentiert.
 *
 * Version 2 ordnet die Mikro-Schritte sechs didaktischen Phasen zu
 * (Kontext – Klarheit – Muster – Abruf – Gebrauch – Wiederbegegnung) und ersetzt
 * den linearen Klassenstatus durch mehrdimensionale Beobachtungsereignisse.
 */

export const SCHEMA_VERSION = 2;
export const APP_VERSION = '0.2.0';
export const APP_NAME = 'LexiScène';

/* ------------------------------------------------------------- Zielsprachen */

export interface LanguageOption {
  code: string;
  label: string;
  bcp47: string;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'fr', label: 'Französisch', bcp47: 'fr-FR' },
  { code: 'en', label: 'Englisch', bcp47: 'en-GB' },
  { code: 'es', label: 'Spanisch', bcp47: 'es-ES' },
  { code: 'it', label: 'Italienisch', bcp47: 'it-IT' },
  { code: 'ru', label: 'Russisch', bcp47: 'ru-RU' },
  { code: 'la', label: 'Latein', bcp47: 'la' },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

export interface LabeledOption<T extends string> {
  id: T;
  label: string;
  description?: string;
}

/* --------------------------------------------------------- Lexikalische Typen */

export type LexicalType =
  | 'gegenstand'
  | 'handlung'
  | 'eigenschaft'
  | 'gefuehl'
  | 'abstrakt'
  | 'sprechakt'
  | 'kollokation'
  | 'polysem'
  | 'falscher-freund'
  | 'sonstige';

export const LEXICAL_TYPES: readonly LabeledOption<LexicalType>[] = [
  { id: 'gegenstand', label: 'Konkreter Gegenstand' },
  { id: 'handlung', label: 'Handlung oder Bewegung' },
  { id: 'eigenschaft', label: 'Eigenschaft' },
  { id: 'gefuehl', label: 'Gefühl' },
  { id: 'abstrakt', label: 'Abstrakter Begriff' },
  { id: 'sprechakt', label: 'Sprechakt oder Chunk' },
  { id: 'kollokation', label: 'Kollokation oder Valenzmuster' },
  { id: 'polysem', label: 'Polysemes Wort' },
  { id: 'falscher-freund', label: 'Falscher Freund' },
  { id: 'sonstige', label: 'Sonstige Einheit' },
];

export function lexicalTypeLabel(type: LexicalType): string {
  return LEXICAL_TYPES.find((entry) => entry.id === type)?.label ?? 'Sonstige Einheit';
}

/* ------------------------------------------------------------- Repertoire */

export type Repertoire = 'kern' | 'stuetze' | 'erweiterung';

export const REPERTOIRES: readonly LabeledOption<Repertoire>[] = [
  { id: 'kern', label: 'Kernrepertoire', description: 'Muss aktiv verfügbar sein.' },
  { id: 'stuetze', label: 'Stützrepertoire', description: 'Wird angeboten und unterstützt das Sprachhandeln.' },
  { id: 'erweiterung', label: 'Erweiterungsrepertoire', description: 'Angebot für schnellere Lernende.' },
];

export function repertoireLabel(repertoire: Repertoire): string {
  return REPERTOIRES.find((entry) => entry.id === repertoire)?.label ?? repertoire;
}

/* ------------------------------------------------------- Lernziel und Profil */

export type LearningGoal = 'receptive' | 'productive';

export const LEARNING_GOALS: readonly LabeledOption<LearningGoal>[] = [
  { id: 'receptive', label: 'rezeptiv', description: 'Verstehen beim Hören und Lesen genügt.' },
  { id: 'productive', label: 'produktiv', description: 'Die Einheit soll selbst verwendet werden können.' },
];

export function learningGoalLabel(goal: LearningGoal): string {
  return LEARNING_GOALS.find((entry) => entry.id === goal)?.label ?? goal;
}

export type LearnerLevel = 'anfaenger' | 'mittelstufe' | 'fortgeschritten';

export const LEARNER_LEVELS: readonly LabeledOption<LearnerLevel>[] = [
  { id: 'anfaenger', label: 'Anfänger' },
  { id: 'mittelstufe', label: 'Mittelstufe' },
  { id: 'fortgeschritten', label: 'Fortgeschrittene' },
];

/** Wie gut lässt sich die Einheit bildlich zeigen? */
export type Imageability = 'hoch' | 'mittel' | 'gering';

export const IMAGEABILITIES: readonly LabeledOption<Imageability>[] = [
  { id: 'hoch', label: 'hoch', description: 'Bild oder Realie zeigt die Bedeutung weitgehend eindeutig.' },
  { id: 'mittel', label: 'mittel', description: 'Ein Bild hilft, bleibt aber mehrdeutig.' },
  { id: 'gering', label: 'gering', description: 'Kaum darstellbar – Kontext oder Klärung tragen die Bedeutung.' },
];

/** Taugt die Einheit dafür, die Bedeutung aus dem Kontext zu erschließen? */
export type InferenceSuitability = 'ungeeignet' | 'bedingt' | 'geeignet';

export const INFERENCE_SUITABILITIES: readonly LabeledOption<InferenceSuitability>[] = [
  { id: 'ungeeignet', label: 'ungeeignet', description: 'Der Kontext gibt die Bedeutung nicht her.' },
  { id: 'bedingt', label: 'bedingt', description: 'Erschließbar, aber mehrdeutig – Klärung unbedingt nötig.' },
  { id: 'geeignet', label: 'geeignet', description: 'Der Kontext ist informativ genug für einen Erschließungsversuch.' },
];

/** Risiko durch Übertragung aus der Erstsprache oder Verwechslung. */
export type TransferRisk = 'gering' | 'mittel' | 'hoch';

export const TRANSFER_RISKS: readonly LabeledOption<TransferRisk>[] = [
  { id: 'gering', label: 'gering' },
  { id: 'mittel', label: 'mittel' },
  { id: 'hoch', label: 'hoch', description: 'Falscher Freund oder abweichende Struktur in der Erstsprache.' },
];

/** Umgang mit dem Erschließen der Bedeutung auf Sequenzebene. */
export type InferenceMode = 'off' | 'optional' | 'planned';

export const INFERENCE_MODES: readonly LabeledOption<InferenceMode>[] = [
  { id: 'off', label: 'nicht vorgesehen', description: 'Die Bedeutung wird direkt geklärt.' },
  {
    id: 'optional',
    label: 'wo es sich anbietet',
    description: 'Erschließen nur bei Einheiten, deren Kontext dafür informativ genug ist.',
  },
  {
    id: 'planned',
    label: 'als Strategietraining geplant',
    description: 'Erschließen wird bewusst geübt – die Klärung folgt immer.',
  },
];

/* --------------------------------------------------- Beobachtungsereignisse */

export type ObservationDimension = 'meaning' | 'form' | 'pattern' | 'use';

export const OBSERVATION_DIMENSIONS: readonly LabeledOption<ObservationDimension>[] = [
  { id: 'meaning', label: 'Bedeutung' },
  { id: 'form', label: 'Form' },
  { id: 'pattern', label: 'Muster' },
  { id: 'use', label: 'Gebrauch' },
];

export function dimensionLabel(dimension: ObservationDimension): string {
  return OBSERVATION_DIMENSIONS.find((entry) => entry.id === dimension)?.label ?? dimension;
}

export type ObservationResult = 'secure' | 'supported' | 'not-yet';

export const OBSERVATION_RESULTS: readonly LabeledOption<ObservationResult>[] = [
  { id: 'secure', label: 'sicher' },
  { id: 'supported', label: 'mit Hilfe' },
  { id: 'not-yet', label: 'noch nicht' },
];

export function resultLabel(result: ObservationResult): string {
  return OBSERVATION_RESULTS.find((entry) => entry.id === result)?.label ?? result;
}

export type ObservationSource = 'introduction' | 'reactivation';

/**
 * Eine Beobachtung der Lerngruppe – nicht einzelner Lernender.
 * `dimension` und `result` sind null, wenn nur ein Ereignis festgehalten wird
 * (etwa eine frühere Reaktivierung), aus dem sich keine Kompetenz ableiten lässt.
 */
export interface LexemeObservation {
  id: string;
  at: number;
  dimension: ObservationDimension | null;
  result: ObservationResult | null;
  source: ObservationSource;
  /** Art des Reaktivierungsimpulses, sofern die Beobachtung dort entstand. */
  impulseKind?: string;
  /** Reaktivierungsrunde, sofern zutreffend. */
  round?: number;
}

/* ------------------------------------------------- Dramaturgie (Schritte) */

export type StepId =
  | 'situation'
  | 'impuls'
  | 'audio'
  | 'vermuten'
  | 'klaeren'
  | 'form'
  | 'fokus'
  | 'kontrolle'
  | 'hilfen-ausblenden'
  | 'abruf'
  | 'aufgabe';

/** Die sechs didaktischen Phasen als übergeordnete Ebene über den Schritten. */
export type PhaseId = 'kontext' | 'klarheit' | 'muster' | 'abruf' | 'gebrauch' | 'wiederbegegnung';

/* --------------------------------------------------------------- Medien */

export type MediaKind = 'image' | 'audio' | 'video';

export interface MediaMeta {
  id: string;
  name: string;
  mimeType: string;
  kind: MediaKind;
  size: number;
  createdAt: number;
}

export interface MediaRecord extends MediaMeta {
  blob: Blob;
}

/* ---------------------------------------------------------- Lexikeinheit */

export interface Lexeme {
  id: string;

  /* --- Für den Erstkontakt --- */
  /** Ausdruck oder Chunk, z. B. „Ça te dit de… ?“ */
  expression: string;
  /** Kernbedeutung in Alltagssprache. */
  coreMeaning: string;
  /** Kommunikative Funktion, z. B. „einen Vorschlag machen“. */
  communicativeFunction: string;
  /** Modelläußerung im Kontext. */
  modelUtterance: string;
  /** Musteranker (im Datenmodell weiterhin `sentenceFrame`). */
  sentenceFrame: string;
  lexicalType: LexicalType;
  learningGoal: LearningGoal;

  semantisationMethod: string;
  repertoire: Repertoire;

  imageId?: string;
  audioId?: string;
  videoId?: string;

  /* --- Profil für den Methodenberater --- */
  imageability: Imageability;
  inferenceSuitability: InferenceSuitability;
  transferRisk: TransferRisk;
  /** Frei gewählte Bezeichnung einer Verwechslungsgruppe, z. B. „Kleidung“. */
  confusionGroup: string;

  // Aussprache und Form
  pronunciationHint: string;
  prosodyNote: string;
  ipa: string;
  morphology: string;

  // Sprachliches Muster
  valency: string;
  collocations: string;
  wordFamily: string;
  register: string;
  culturalNote: string;

  // Bedeutungssicherung
  example: string;
  nonExample: string;
  contrastExample: string;
  confusionRisk: string;
  checkTemplateId: string;
  checkPrompt: string;

  // Differenzierung
  extraHint: string;
  simplifiedExplanation: string;
  translation: string;
  multilingualComparison: string;
  extensionTask: string;

  // Unterricht
  situation: string;
  communicativeTask: string;
  stepOverrides: Partial<Record<StepId, boolean>>;
  /** Eigene Schrittreihenfolge; null bedeutet: Reihenfolge der Sequenz gilt. */
  stepOrderOverride: StepId[] | null;
  skipped: boolean;
  /** Beobachtungen der Lerngruppe, chronologisch. */
  observations: LexemeObservation[];
  liveNote: string;

  createdAt: number;
  updatedAt: number;
}

/* -------------------------------------------------------------- Sequenz */

/** Eine abgeschlossene Reaktivierungsrunde. */
export interface ReactivationRound {
  round: number;
  completedAt: number;
  /** Anzahl der Impulse je Ergebnis – ohne Punktwerte oder Noten. */
  secure: number;
  supported: number;
  notYet: number;
}

export interface ReactivationPlan {
  enabled: boolean;
  /** Relative Abstände in Tagen, frei konfigurierbar. */
  offsetsDays: number[];
  /** Zeitpunkt, ab dem die Abstände gerechnet werden. */
  anchor: number | null;
  completedRounds: number;
  /** Verlauf der abgeschlossenen Runden. */
  history: ReactivationRound[];
  /** Einheiten mit „mit Hilfe“ oder „noch nicht“ zuerst zeigen. */
  prioritiseUnsure: boolean;
}

export interface TeachSession {
  lexemeIndex: number;
  stepIndex: number;
  updatedAt: number;
}

export interface Sequence {
  id: string;
  schemaVersion: number;
  title: string;
  targetLanguage: string;
  learningGroup: string;
  learnerLevel: LearnerLevel;
  topic: string;
  canDoGoal: string;
  teacherNote: string;
  archived: boolean;
  steps: Record<StepId, boolean>;
  /** Reihenfolge der Dramaturgie – frei sortierbar. */
  stepOrder: StepId[];
  /** Umgang mit dem Erschließen der Bedeutung. */
  inferenceMode: InferenceMode;
  lexemes: Lexeme[];
  reactivation: ReactivationPlan;
  session: TeachSession | null;
  createdAt: number;
  updatedAt: number;
}

/* ------------------------------------------------------------ Einstellungen */

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  detailPaneVisible: boolean;
  lastSequenceId: string | null;
  reactivationOffsets: number[];
  /** Verhindert, dass die Beispielsequenz nach dem Löschen erneut angelegt wird. */
  demoSeeded: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  detailPaneVisible: true,
  lastSequenceId: null,
  reactivationOffsets: [1, 3, 7, 14],
  demoSeeded: false,
};
