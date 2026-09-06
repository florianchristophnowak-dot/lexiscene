/**
 * Datenmodell von LexiScène (Schemaversion 4).
 *
 * Verwaltet werden nicht einzelne Vokabeln, sondern kommunikativ nutzbare
 * lexiko-grammatische Einheiten ("Lexikeinheiten"). Das Schema ist versioniert
 * und in `docs/schema.md` dokumentiert.
 *
 * Version 2 ordnet die Mikro-Schritte sechs didaktischen Phasen zu
 * (Kontext – Klarheit – Muster – Abruf – Gebrauch – Wiederbegegnung) und ersetzt
 * den linearen Klassenstatus durch mehrdimensionale Beobachtungsereignisse.
 *
 * Version 3 ergänzt je Lexikeinheit eine optionale Korpusminiatur.
 *
 * Version 4 trennt die Bedeutungsprüfung (CCQs) vom Abruf und unterscheidet die
 * Inhaltsfelder nach Sprache: interne Bedeutung für die Lehrkraft,
 * zielsprachliche Erklärung, erstsprachliche Übersetzung, zielsprachlicher
 * Unterrichtsimpuls und Lehrkraftnotiz.
 *
 * Bezeichnungen für die Oberfläche stehen bewusst nicht mehr in diesem Modul,
 * sondern im Sprachkatalog (`src/i18n`). Hier liegen ausschließlich stabile
 * Kennungen; die Schlüssel werden daraus abgeleitet.
 */

export const SCHEMA_VERSION = 4;
export const APP_VERSION = '0.4.0';
export const APP_NAME = 'LexiScène';

/* ------------------------------------------------------------- Zielsprachen */

export interface LanguageOption {
  code: string;
  bcp47: string;
}

/** Zielsprachen einer Sequenz. Die Bezeichnung liefert `language.<code>`. */
export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'fr', bcp47: 'fr-FR' },
  { code: 'en', bcp47: 'en-GB' },
  { code: 'es', bcp47: 'es-ES' },
  { code: 'it', bcp47: 'it-IT' },
  { code: 'ru', bcp47: 'ru-RU' },
  { code: 'la', bcp47: 'la' },
];

export const LANGUAGE_CODES: readonly string[] = LANGUAGES.map((language) => language.code);

export function languageBcp47(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.bcp47 ?? code;
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

export const LEXICAL_TYPES: readonly LexicalType[] = [
  'gegenstand',
  'handlung',
  'eigenschaft',
  'gefuehl',
  'abstrakt',
  'sprechakt',
  'kollokation',
  'polysem',
  'falscher-freund',
  'sonstige',
];

/* ------------------------------------------------------------- Repertoire */

export type Repertoire = 'kern' | 'stuetze' | 'erweiterung';

export const REPERTOIRES: readonly Repertoire[] = ['kern', 'stuetze', 'erweiterung'];

/* ------------------------------------------------------- Lernziel und Profil */

export type LearningGoal = 'receptive' | 'productive';

export const LEARNING_GOALS: readonly LearningGoal[] = ['receptive', 'productive'];

export type LearnerLevel = 'anfaenger' | 'mittelstufe' | 'fortgeschritten';

export const LEARNER_LEVELS: readonly LearnerLevel[] = ['anfaenger', 'mittelstufe', 'fortgeschritten'];

/** Wie gut lässt sich die Einheit bildlich zeigen? */
export type Imageability = 'hoch' | 'mittel' | 'gering';

export const IMAGEABILITIES: readonly Imageability[] = ['hoch', 'mittel', 'gering'];

/** Taugt die Einheit dafür, die Bedeutung aus dem Kontext zu erschließen? */
export type InferenceSuitability = 'ungeeignet' | 'bedingt' | 'geeignet';

export const INFERENCE_SUITABILITIES: readonly InferenceSuitability[] = ['ungeeignet', 'bedingt', 'geeignet'];

/** Risiko durch Übertragung aus der Erstsprache oder Verwechslung. */
export type TransferRisk = 'gering' | 'mittel' | 'hoch';

export const TRANSFER_RISKS: readonly TransferRisk[] = ['gering', 'mittel', 'hoch'];

/** Umgang mit dem Erschließen der Bedeutung auf Sequenzebene. */
export type InferenceMode = 'off' | 'optional' | 'planned';

export const INFERENCE_MODES: readonly InferenceMode[] = ['off', 'optional', 'planned'];

/* --------------------------------------------------- Beobachtungsereignisse */

export type ObservationDimension = 'meaning' | 'form' | 'pattern' | 'use';

export const OBSERVATION_DIMENSIONS: readonly ObservationDimension[] = ['meaning', 'form', 'pattern', 'use'];

export type ObservationResult = 'secure' | 'supported' | 'not-yet';

export const OBSERVATION_RESULTS: readonly ObservationResult[] = ['secure', 'supported', 'not-yet'];

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
  | 'ccq'
  | 'form'
  | 'fokus'
  | 'korpusminiatur'
  | 'kontrolle'
  | 'hilfen-ausblenden'
  | 'abruf'
  | 'aufgabe';

/** Die sechs didaktischen Phasen als übergeordnete Ebene über den Schritten. */
export type PhaseId = 'kontext' | 'klarheit' | 'muster' | 'abruf' | 'gebrauch' | 'wiederbegegnung';

/* ------------------------------------------------------- Korpusminiaturen */

/** Didaktischer Schwerpunkt einer Korpusminiatur. */
export type CorpusFocus = 'pattern' | 'collocation' | 'meaning' | 'register';

export const CORPUS_FOCUSES: readonly CorpusFocus[] = ['pattern', 'collocation', 'meaning', 'register'];

/** Herkunft der Belege – für die Klasse und für die Lehrkraft transparent. */
export type CorpusProvenance = 'corpus' | 'teacher-created' | 'mixed';

export const CORPUS_PROVENANCES: readonly CorpusProvenance[] = ['teacher-created', 'corpus', 'mixed'];

/** Ein einzelner Sprachbeleg innerhalb einer Miniatur. */
export interface CorpusExample {
  id: string;
  /** Vollständiger Beleg, unverändert so, wie ihn die Lehrkraft einträgt. */
  text: string;
  /** Textteil, der im Unterricht hervorgehoben wird; leer = keine Markierung. */
  highlight: string;
  /** Optionale Lösungsgruppe, z. B. „Sport/Spiel“ oder „Instrument“. */
  category: string;
  /** Nur für die Lehrkraft sichtbar – erscheint nie in der Projektion. */
  teacherNote: string;
}

/**
 * Eine Korpusminiatur: wenige kuratierte Belege, an denen ein wiederkehrendes
 * Muster gelenkt entdeckt werden kann. Immer optional; alle Felder außer
 * `enabled` und den Kennungen dürfen leer bleiben.
 */
export interface CorpusMiniature {
  enabled: boolean;
  title: string;
  /** Beobachtungsauftrag für die Lernenden. */
  guidingQuestion: string;
  focus: CorpusFocus;
  examples: CorpusExample[];
  /** Auftrag zum Vergleichen, Sortieren oder Ableiten. */
  discoveryPrompt: string;
  /** Gesicherter Musteranker oder die gemeinsam formulierte Regel. */
  ruleOrFinding: string;
  /** Kurze anschließende Anwendungsaufgabe. */
  transferPrompt: string;
  provenance: CorpusProvenance;
  /** Quellenangabe – wird ausschließlich als lokaler Text gespeichert. */
  sourceNote: string;
}

/* -------------------------------------------- Bedeutungsprüfung (CCQs) */

/**
 * Geprüftes Bedeutungsmerkmal. Eine CCQ zielt auf genau ein Merkmal – daran
 * entscheidet sich, ob die Frage wirklich das Konzept prüft.
 */
export type CcqFeature =
  | 'kernbedeutung'
  | 'begriffsgrenze'
  | 'beispiel'
  | 'person'
  | 'zeit'
  | 'absicht'
  | 'wertung'
  | 'modalitaet'
  | 'register'
  | 'funktion'
  | 'sonstiges';

export const CCQ_FEATURES: readonly CcqFeature[] = [
  'kernbedeutung',
  'begriffsgrenze',
  'beispiel',
  'person',
  'zeit',
  'absicht',
  'wertung',
  'modalitaet',
  'register',
  'funktion',
  'sonstiges',
];

/** Antwortformat – bestimmt, wie die Klasse antwortet. */
export type CcqFormat =
  | 'ja-nein'
  | 'a-b'
  | 'kurzantwort'
  | 'beispiel-nichtbeispiel'
  | 'auswahl-bild'
  | 'zeigen'
  | 'sortieren';

export const CCQ_FORMATS: readonly CcqFormat[] = [
  'ja-nein',
  'a-b',
  'kurzantwort',
  'beispiel-nichtbeispiel',
  'auswahl-bild',
  'zeigen',
  'sortieren',
];

/** Worauf die CCQ zielt: auf die Bedeutung oder auf den Gebrauch. */
export type CcqTarget = 'meaning' | 'use';

export const CCQ_TARGETS: readonly CcqTarget[] = ['meaning', 'use'];

/**
 * Eine Concept Checking Question: prüft das Konzept hinter der Einheit, nicht
 * die sprachliche Form. Formuliert wird sie in der Zielsprache; die erwartete
 * Antwort bleibt im Unterricht zunächst bei der Lehrkraft.
 */
export interface ConceptCheck {
  id: string;
  /**
   * Vorlage, aus der die Frage stammt. Ist `question` leer, wird der
   * zielsprachliche Fragerahmen der Vorlage gezeigt.
   */
  templateId: string;
  /** Frage oder Impuls – in der Sprache aus `language`. */
  question: string;
  /** Erwartete Kurzantwort; nur auf dem Lehrkraftbildschirm. */
  expectedAnswer: string;
  /** Antwortoptionen, die der Klasse gezeigt werden dürfen (A/B, Auswahl …). */
  options: string[];
  feature: CcqFeature;
  format: CcqFormat;
  /** Gezieltes Missverständnis, das die Frage aufdecken soll. */
  misconception: string;
  /** Alternative Klärung, wenn die Antwort ausbleibt. */
  alternativeClarification: string;
  /** Sprachcode der Frage – in der Regel die Zielsprache der Sequenz. */
  language: string;
  target: CcqTarget;
}

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
  /** Interne Bedeutung für die Lehrkraft (Erstsprache) – nie projiziert. */
  coreMeaning: string;
  /** Kommunikative Funktion, z. B. „einen Vorschlag machen“. */
  communicativeFunction: string;
  /** Modelläußerung im Kontext (Zielsprache). */
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

  /* --- Sprachlich getrennte Inhaltsfelder --- */
  /** Lerngruppengerechte Erklärung in der Zielsprache – projizierbar. */
  targetExplanation: string;
  /** Kurzer zielsprachlicher Unterrichtsimpuls – projizierbar. */
  targetPrompt: string;
  /** Notiz für die Lehrkraft aus der Vorbereitung – nie projiziert. */
  teacherNote: string;

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

  /** Optionale Korpusminiatur – standardmäßig deaktiviert und leer. */
  corpus: CorpusMiniature;

  /** Bedeutungsprüfung: Concept Checking Questions in der Zielsprache. */
  ccqs: ConceptCheck[];

  // Bedeutungssicherung
  example: string;
  nonExample: string;
  contrastExample: string;
  confusionRisk: string;
  checkTemplateId: string;
  /** Zweite Aufgabe in der Gegenrichtung; leer = Vorschlag der App verwenden. */
  checkTemplateIdSecondary: string;
  checkPrompt: string;

  // Differenzierung
  extraHint: string;
  /** Vereinfachte Erklärung in der Erstsprache – Reserve der Lehrkraft. */
  simplifiedExplanation: string;
  /** Erstsprachliche Übersetzung – Reserve der Lehrkraft. */
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

/**
 * Bediensprache der Lehrkraftoberfläche. `sequence` folgt der Zielsprache der
 * aktuellen Sequenz, soweit dafür eine vollständige Übersetzung vorliegt.
 */
export type UiLanguageSetting = 'de' | 'fr' | 'sequence';

/**
 * Wie viel Erstsprache im Unterricht sichtbar wird.
 * - `reserve`: zielsprachlich, erstsprachliche Hilfen liegen bei der Lehrkraft
 *   bereit und lassen sich bewusst freigeben (Standard);
 * - `strict`: erstsprachliche Inhalte erscheinen nie in der Projektion;
 * - `flexible`: die Lehrkraft entscheidet Schritt für Schritt.
 */
export type TeachingLanguageMode = 'reserve' | 'strict' | 'flexible';

export const TEACHING_LANGUAGE_MODES: readonly TeachingLanguageMode[] = ['reserve', 'strict', 'flexible'];

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  detailPaneVisible: boolean;
  lastSequenceId: string | null;
  reactivationOffsets: number[];
  /** Verhindert, dass die Beispielsequenz nach dem Löschen erneut angelegt wird. */
  demoSeeded: boolean;
  /** Bediensprache der Lehrkraftoberfläche. */
  uiLanguage: UiLanguageSetting;
  /** Sprachmodus des Unterrichts. */
  teachingLanguageMode: TeachingLanguageMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  detailPaneVisible: true,
  lastSequenceId: null,
  reactivationOffsets: [1, 3, 7, 14],
  demoSeeded: false,
  uiLanguage: 'de',
  teachingLanguageMode: 'reserve',
};
