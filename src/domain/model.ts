/**
 * Datenmodell von LexiScène (Schemaversion 1).
 *
 * Verwaltet werden nicht einzelne Vokabeln, sondern kommunikativ nutzbare
 * lexiko-grammatische Einheiten ("Lexikeinheiten"). Das Schema ist versioniert
 * und in `docs/schema.md` dokumentiert.
 */

export const SCHEMA_VERSION = 1;
export const APP_VERSION = '0.1.0';
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

export interface LabeledOption<T extends string> {
  id: T;
  label: string;
  description?: string;
}

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

/* -------------------------------------------------------- Klassenstatus */

export type ClassStatus =
  | 'begegnet'
  | 'bedeutung-erkannt'
  | 'bedeutung-erinnert'
  | 'form-abgerufen'
  | 'im-muster-verwendet'
  | 'kommunikativ-eingesetzt'
  | 'reaktiviert';

export const CLASS_STATUSES: readonly LabeledOption<ClassStatus>[] = [
  { id: 'begegnet', label: 'Begegnet', description: 'Die Einheit war im Unterricht präsent.' },
  { id: 'bedeutung-erkannt', label: 'Bedeutung erkannt', description: 'Die Bedeutung wurde mit Hilfen erschlossen.' },
  { id: 'bedeutung-erinnert', label: 'Bedeutung erinnert', description: 'Die Bedeutung war ohne Hilfen abrufbar.' },
  { id: 'form-abgerufen', label: 'Form abgerufen', description: 'Die fremdsprachliche Form wurde produziert.' },
  { id: 'im-muster-verwendet', label: 'Im Sprachmuster verwendet', description: 'Die Einheit wurde im Satzrahmen genutzt.' },
  { id: 'kommunikativ-eingesetzt', label: 'Kommunikativ eingesetzt', description: 'Die Einheit wurde frei zur Verständigung genutzt.' },
  { id: 'reaktiviert', label: 'Reaktiviert', description: 'Die Einheit wurde später erneut aktiviert.' },
];

export function classStatusLabel(status: ClassStatus | null): string {
  if (!status) return 'Noch kein Status';
  return CLASS_STATUSES.find((entry) => entry.id === status)?.label ?? status;
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

  /** Ausdruck oder Chunk, z. B. „Ça te dit de… ?“ */
  expression: string;
  /** Kernbedeutung in Alltagssprache. */
  coreMeaning: string;
  /** Kommunikative Funktion, z. B. „einen Vorschlag machen“. */
  communicativeFunction: string;
  /** Modelläußerung im Kontext. */
  modelUtterance: string;
  lexicalType: LexicalType;
  semantisationMethod: string;
  repertoire: Repertoire;

  imageId?: string;
  audioId?: string;
  videoId?: string;

  // Aussprache und Form
  pronunciationHint: string;
  prosodyNote: string;
  ipa: string;
  morphology: string;

  // Sprachliches Muster
  valency: string;
  sentenceFrame: string;
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
  skipped: boolean;
  status: ClassStatus | null;
  statusUpdatedAt: number | null;
  liveNote: string;

  createdAt: number;
  updatedAt: number;
}

/* -------------------------------------------------------------- Sequenz */

export interface ReactivationPlan {
  enabled: boolean;
  /** Relative Abstände in Tagen, frei konfigurierbar. */
  offsetsDays: number[];
  /** Zeitpunkt, ab dem die Abstände gerechnet werden. */
  anchor: number | null;
  completedRounds: number;
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
  topic: string;
  canDoGoal: string;
  teacherNote: string;
  archived: boolean;
  steps: Record<StepId, boolean>;
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
