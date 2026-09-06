/**
 * Erzeugung, Normalisierung und Migration der Datenstrukturen.
 *
 * Import-Daten werden absichtlich tolerant gelesen (fehlende Felder werden mit
 * Standardwerten gefüllt), aber niemals ungeprüft übernommen. Dateien der
 * Schemaversionen 1 und 2 werden vollständig nach Version 3 überführt, ohne
 * Inhalte zu verlieren.
 */
import {
  DEFAULT_SETTINGS,
  IMAGEABILITIES,
  INFERENCE_SUITABILITIES,
  LEARNER_LEVELS,
  LEARNING_GOALS,
  LEXICAL_TYPES,
  OBSERVATION_DIMENSIONS,
  OBSERVATION_RESULTS,
  REPERTOIRES,
  SCHEMA_VERSION,
  TEACHING_LANGUAGE_MODES,
  TRANSFER_RISKS,
  type AppSettings,
  type Imageability,
  type InferenceMode,
  type InferenceSuitability,
  type LearnerLevel,
  type LearningGoal,
  type Lexeme,
  type LexemeObservation,
  type LexicalType,
  type MediaMeta,
  type ConceptCheck,
  type ObservationDimension,
  type ObservationResult,
  type ReactivationRound,
  type Repertoire,
  type Sequence,
  type StepId,
  type TeachingLanguageMode,
  type TransferRisk,
  type UiLanguageSetting,
} from './model';
import { STEP_IDS, defaultStepConfig, normalizeStepOrder } from './steps';
import { migrateLegacyStatus } from './observations';
import { createCorpusMiniature, normalizeCorpusMiniature } from './corpus';
import { ccqTemplate, createConceptCheck, isCcqTemplateId, normalizeConceptChecks } from './ccq';
import { createId } from './ids';

export { createId };

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);
const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function asOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/* ------------------------------------------------- Didaktische Vorbelegung */

/** Vorschlag für die Bildhaftigkeit – nur als Startwert, jederzeit änderbar. */
export function defaultImageability(type: LexicalType): Imageability {
  switch (type) {
    case 'gegenstand':
    case 'handlung':
      return 'hoch';
    case 'eigenschaft':
    case 'gefuehl':
    case 'sonstige':
      return 'mittel';
    default:
      return 'gering';
  }
}

/** Vorschlag für die Eignung zur Erschließung – bewusst zurückhaltend. */
export function defaultInferenceSuitability(type: LexicalType): InferenceSuitability {
  return type === 'falscher-freund' ? 'ungeeignet' : 'bedingt';
}

export function defaultTransferRisk(type: LexicalType, confusionRisk = ''): TransferRisk {
  if (type === 'falscher-freund') return 'hoch';
  return confusionRisk.trim() ? 'mittel' : 'gering';
}

/** Kernrepertoire wird in der Regel produktiv gebraucht, das Übrige rezeptiv. */
export function defaultLearningGoal(repertoire: Repertoire): LearningGoal {
  return repertoire === 'kern' ? 'productive' : 'receptive';
}

/* ------------------------------------------------------------- Factories */

export function createLexeme(partial: Partial<Lexeme> = {}): Lexeme {
  const now = Date.now();
  const lexicalType = partial.lexicalType ?? 'sprechakt';
  const repertoire = partial.repertoire ?? 'kern';

  return {
    id: createId('lex'),
    expression: '',
    coreMeaning: '',
    communicativeFunction: '',
    modelUtterance: '',
    sentenceFrame: '',
    lexicalType,
    learningGoal: defaultLearningGoal(repertoire),
    semantisationMethod: '',
    repertoire,
    targetExplanation: '',
    targetPrompt: '',
    teacherNote: '',
    ccqs: [],
    imageability: defaultImageability(lexicalType),
    inferenceSuitability: defaultInferenceSuitability(lexicalType),
    transferRisk: defaultTransferRisk(lexicalType),
    confusionGroup: '',
    pronunciationHint: '',
    prosodyNote: '',
    ipa: '',
    morphology: '',
    valency: '',
    collocations: '',
    wordFamily: '',
    register: '',
    culturalNote: '',
    example: '',
    nonExample: '',
    contrastExample: '',
    confusionRisk: '',
    checkTemplateId: '',
    checkTemplateIdSecondary: '',
    checkPrompt: '',
    extraHint: '',
    simplifiedExplanation: '',
    translation: '',
    multilingualComparison: '',
    extensionTask: '',
    situation: '',
    communicativeTask: '',
    corpus: createCorpusMiniature(),
    stepOverrides: {},
    stepOrderOverride: null,
    skipped: false,
    observations: [],
    liveNote: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function createReactivationPlan(partial: Partial<Sequence['reactivation']> = {}): Sequence['reactivation'] {
  return {
    enabled: false,
    offsetsDays: [...DEFAULT_SETTINGS.reactivationOffsets],
    anchor: null,
    completedRounds: 0,
    history: [],
    prioritiseUnsure: true,
    ...partial,
  };
}

export function createSequence(partial: Partial<Sequence> = {}): Sequence {
  const now = Date.now();
  return {
    id: createId('seq'),
    schemaVersion: SCHEMA_VERSION,
    title: 'Neue Sequenz',
    targetLanguage: 'fr',
    learningGroup: '',
    learnerLevel: 'mittelstufe',
    topic: '',
    canDoGoal: '',
    teacherNote: '',
    archived: false,
    steps: defaultStepConfig(),
    stepOrder: [...STEP_IDS],
    // Neue Sequenzen setzen nicht auf Raten: Erschließen nur, wo es trägt.
    inferenceMode: 'optional',
    lexemes: [],
    reactivation: createReactivationPlan(),
    session: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/* --------------------------------------------------------- Normalisierung */

function normalizeObservations(raw: unknown): LexemeObservation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const source = asRecord(entry);
      const at = asNumber(source.at, 0);
      if (!at) return null;
      const dimension = OBSERVATION_DIMENSIONS.includes(source.dimension as ObservationDimension)
        ? (source.dimension as ObservationDimension)
        : null;
      const result = OBSERVATION_RESULTS.includes(source.result as ObservationResult)
        ? (source.result as ObservationResult)
        : null;
      const observation: LexemeObservation = {
        id: asString(source.id) || createId('obs'),
        at,
        dimension,
        result,
        source: source.source === 'reactivation' ? 'reactivation' : 'introduction',
      };
      if (typeof source.impulseKind === 'string') observation.impulseKind = source.impulseKind;
      if (typeof source.round === 'number') observation.round = source.round;
      return observation;
    })
    .filter((entry): entry is LexemeObservation => entry !== null)
    .sort((a, b) => a.at - b.at);
}

export function normalizeLexeme(raw: unknown, targetLanguage = ''): Lexeme {
  const source = asRecord(raw);
  const base = createLexeme({ id: asString(source.id) || createId('lex') });

  const stepOverrides: Partial<Record<StepId, boolean>> = {};
  const rawOverrides = asRecord(source.stepOverrides);
  for (const stepId of STEP_IDS) {
    const value = rawOverrides[stepId];
    if (typeof value === 'boolean') stepOverrides[stepId] = value;
  }

  const lexicalType = asOption<LexicalType>(source.lexicalType, LEXICAL_TYPES, base.lexicalType);
  const repertoire = asOption<Repertoire>(source.repertoire, REPERTOIRES, base.repertoire);
  const confusionRisk = asString(source.confusionRisk);

  /*
   * Migration Schema 3 → 4: Fünf frühere Kontrollvorlagen prüfen das Konzept,
   * nicht die Form. Sie werden in den CCQ-Bereich überführt, damit die
   * Abrufkontrolle wirklich nur noch den Abruf prüft. Eine eigene Formulierung
   * wandert als Frage mit; nichts geht verloren, und ein zweiter Durchlauf
   * ändert nichts mehr, weil die Felder danach leer sind.
   */
  const rawCheckTemplateId = asString(source.checkTemplateId);
  const rawSecondaryId = asString(source.checkTemplateIdSecondary);
  const rawCheckPrompt = asString(source.checkPrompt);
  const migratedChecks: ConceptCheck[] = [];

  const adopt = (templateId: string, question: string): void => {
    const template = ccqTemplate(templateId);
    if (!template) return;
    migratedChecks.push(
      createConceptCheck({
        templateId,
        question,
        feature: template.feature,
        format: template.format,
        target: template.target,
        language: targetLanguage,
      }),
    );
  };

  const primaryIsCcq = isCcqTemplateId(rawCheckTemplateId);
  const secondaryIsCcq = isCcqTemplateId(rawSecondaryId);
  if (primaryIsCcq) adopt(rawCheckTemplateId, rawCheckPrompt);
  if (secondaryIsCcq) adopt(rawSecondaryId, '');

  // Schema 1 kannte nur einen linearen Status; er wird zu einem Ereignis.
  const observations =
    'observations' in source
      ? normalizeObservations(source.observations)
      : migrateLegacyStatus(source.status, source.statusUpdatedAt);

  return {
    ...base,
    expression: asString(source.expression, base.expression),
    coreMeaning: asString(source.coreMeaning, base.coreMeaning),
    communicativeFunction: asString(source.communicativeFunction, base.communicativeFunction),
    modelUtterance: asString(source.modelUtterance, base.modelUtterance),
    sentenceFrame: asString(source.sentenceFrame),
    lexicalType,
    learningGoal: asOption<LearningGoal>(source.learningGoal, LEARNING_GOALS, defaultLearningGoal(repertoire)),
    semantisationMethod: asString(source.semantisationMethod, base.semantisationMethod),
    repertoire,
    imageability: asOption<Imageability>(source.imageability, IMAGEABILITIES, defaultImageability(lexicalType)),
    inferenceSuitability: asOption<InferenceSuitability>(
      source.inferenceSuitability,
      INFERENCE_SUITABILITIES,
      defaultInferenceSuitability(lexicalType),
    ),
    transferRisk: asOption<TransferRisk>(source.transferRisk, TRANSFER_RISKS, defaultTransferRisk(lexicalType, confusionRisk)),
    confusionGroup: asString(source.confusionGroup),
    targetExplanation: asString(source.targetExplanation),
    targetPrompt: asString(source.targetPrompt),
    teacherNote: asString(source.teacherNote),
    imageId: typeof source.imageId === 'string' ? source.imageId : undefined,
    audioId: typeof source.audioId === 'string' ? source.audioId : undefined,
    videoId: typeof source.videoId === 'string' ? source.videoId : undefined,
    pronunciationHint: asString(source.pronunciationHint),
    prosodyNote: asString(source.prosodyNote),
    ipa: asString(source.ipa),
    morphology: asString(source.morphology),
    valency: asString(source.valency),
    collocations: asString(source.collocations),
    wordFamily: asString(source.wordFamily),
    register: asString(source.register),
    culturalNote: asString(source.culturalNote),
    example: asString(source.example),
    nonExample: asString(source.nonExample),
    contrastExample: asString(source.contrastExample),
    confusionRisk,
    checkTemplateId: primaryIsCcq ? '' : rawCheckTemplateId,
    checkTemplateIdSecondary: secondaryIsCcq ? '' : rawSecondaryId,
    checkPrompt: primaryIsCcq ? '' : rawCheckPrompt,
    ccqs: [...normalizeConceptChecks(source.ccqs), ...migratedChecks],
    extraHint: asString(source.extraHint),
    simplifiedExplanation: asString(source.simplifiedExplanation),
    translation: asString(source.translation),
    multilingualComparison: asString(source.multilingualComparison),
    extensionTask: asString(source.extensionTask),
    situation: asString(source.situation),
    communicativeTask: asString(source.communicativeTask),
    // Schema 2 kannte keine Korpusminiatur – ältere Einheiten erhalten eine
    // leere, deaktivierte Miniatur und bleiben damit unverändert.
    corpus: normalizeCorpusMiniature(source.corpus),
    stepOverrides,
    stepOrderOverride: Array.isArray(source.stepOrderOverride) ? normalizeStepOrder(source.stepOrderOverride) : null,
    skipped: asBoolean(source.skipped),
    observations,
    liveNote: asString(source.liveNote),
    createdAt: asNumber(source.createdAt, base.createdAt),
    updatedAt: asNumber(source.updatedAt, base.updatedAt),
  };
}

function normalizeRounds(raw: unknown): ReactivationRound[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const source = asRecord(entry);
      const completedAt = asNumber(source.completedAt, 0);
      if (!completedAt) return null;
      return {
        round: Math.max(1, asNumber(source.round, 1)),
        completedAt,
        secure: Math.max(0, asNumber(source.secure, 0)),
        supported: Math.max(0, asNumber(source.supported, 0)),
        notYet: Math.max(0, asNumber(source.notYet, 0)),
      } satisfies ReactivationRound;
    })
    .filter((entry): entry is ReactivationRound => entry !== null)
    .sort((a, b) => a.round - b.round);
}

export function normalizeSequence(raw: unknown): Sequence {
  const source = asRecord(raw);
  if (Object.keys(source).length === 0) throw new SchemaError('Die Sequenz enthält keine Daten.');

  const version = asNumber(source.schemaVersion, SCHEMA_VERSION);
  if (version > SCHEMA_VERSION) {
    throw new SchemaError(
      `Diese Datei stammt aus einer neueren Version (Schema ${version}). Bitte LexiScène aktualisieren.`,
    );
  }

  /*
   * Migration Schema 2 → 3: Der Schritt „Korpusminiatur“ ist ein Angebot und
   * in `defaultStepConfig()` abgeschaltet. Ältere Dateien kennen ihn nicht und
   * behalten ihn deshalb aus – keine Sequenz erhält ungefragt einen
   * zusätzlichen Unterrichtsschritt. Nur eine ausdrückliche Angabe schaltet
   * ihn ein.
   */
  const steps = defaultStepConfig();
  const rawSteps = asRecord(source.steps);
  for (const stepId of STEP_IDS) {
    const value = rawSteps[stepId];
    if (typeof value === 'boolean') steps[stepId] = value;
  }

  const rawLexemes = Array.isArray(source.lexemes) ? source.lexemes : [];
  const rawReactivation = asRecord(source.reactivation);
  const offsets = Array.isArray(rawReactivation.offsetsDays)
    ? rawReactivation.offsetsDays.filter((value): value is number => typeof value === 'number' && value > 0)
    : [...DEFAULT_SETTINGS.reactivationOffsets];

  const rawSession = asRecord(source.session);
  const hasSession = typeof rawSession.lexemeIndex === 'number' && typeof rawSession.stepIndex === 'number';

  /*
   * Migration Schema 1 → 2: Der frühere Pflichtschritt „Bedeutung vermuten“
   * wird zur Einstellung. War er aktiv, bleibt Erschließen möglich.
   */
  const inferenceMode: InferenceMode =
    source.inferenceMode === 'off' || source.inferenceMode === 'optional' || source.inferenceMode === 'planned'
      ? source.inferenceMode
      : steps.vermuten === false
        ? 'off'
        : 'optional';

  const base = createSequence({ id: asString(source.id) || createId('seq') });
  const targetLanguage = asString(source.targetLanguage, base.targetLanguage);
  return {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    title: asString(source.title, base.title).trim() || base.title,
    targetLanguage,
    learningGroup: asString(source.learningGroup),
    learnerLevel: asOption<LearnerLevel>(source.learnerLevel, LEARNER_LEVELS, base.learnerLevel),
    topic: asString(source.topic),
    canDoGoal: asString(source.canDoGoal),
    teacherNote: asString(source.teacherNote),
    archived: asBoolean(source.archived),
    steps,
    stepOrder: normalizeStepOrder(source.stepOrder),
    inferenceMode,
    lexemes: rawLexemes.map((lexeme) => normalizeLexeme(lexeme, targetLanguage)),
    reactivation: createReactivationPlan({
      enabled: asBoolean(rawReactivation.enabled),
      offsetsDays: offsets.length > 0 ? offsets : [...DEFAULT_SETTINGS.reactivationOffsets],
      anchor: typeof rawReactivation.anchor === 'number' ? rawReactivation.anchor : null,
      completedRounds: Math.max(0, asNumber(rawReactivation.completedRounds, 0)),
      history: normalizeRounds(rawReactivation.history),
      prioritiseUnsure: asBoolean(rawReactivation.prioritiseUnsure, true),
    }),
    session: hasSession
      ? {
          lexemeIndex: Math.max(0, asNumber(rawSession.lexemeIndex, 0)),
          stepIndex: Math.max(0, asNumber(rawSession.stepIndex, 0)),
          updatedAt: asNumber(rawSession.updatedAt, Date.now()),
        }
      : null,
    createdAt: asNumber(source.createdAt, base.createdAt),
    updatedAt: asNumber(source.updatedAt, base.updatedAt),
  };
}

export function normalizeMediaMeta(raw: unknown): MediaMeta | null {
  const source = asRecord(raw);
  const id = asString(source.id);
  if (!id) return null;
  const kind = source.kind === 'audio' || source.kind === 'video' ? source.kind : 'image';
  return {
    id,
    name: asString(source.name, id),
    mimeType: asString(source.mimeType, 'application/octet-stream'),
    kind,
    size: Math.max(0, asNumber(source.size, 0)),
    createdAt: asNumber(source.createdAt, Date.now()),
  };
}

export function normalizeSettings(raw: unknown): AppSettings {
  const source = asRecord(raw);
  const theme = source.theme === 'light' || source.theme === 'dark' ? source.theme : 'system';
  const uiLanguage: UiLanguageSetting =
    source.uiLanguage === 'fr' || source.uiLanguage === 'sequence' || source.uiLanguage === 'de'
      ? source.uiLanguage
      : DEFAULT_SETTINGS.uiLanguage;
  const offsets = Array.isArray(source.reactivationOffsets)
    ? source.reactivationOffsets.filter((value): value is number => typeof value === 'number' && value > 0)
    : [...DEFAULT_SETTINGS.reactivationOffsets];
  return {
    theme,
    detailPaneVisible: asBoolean(source.detailPaneVisible, true),
    lastSequenceId: typeof source.lastSequenceId === 'string' ? source.lastSequenceId : null,
    reactivationOffsets: offsets.length > 0 ? offsets : [...DEFAULT_SETTINGS.reactivationOffsets],
    demoSeeded: asBoolean(source.demoSeeded),
    uiLanguage,
    teachingLanguageMode: asOption<TeachingLanguageMode>(
      source.teachingLanguageMode,
      TEACHING_LANGUAGE_MODES,
      DEFAULT_SETTINGS.teachingLanguageMode,
    ),
  };
}

/** Sammelt alle Medien-Ids, die von einer Sequenz referenziert werden. */
export function collectMediaIds(sequences: Sequence[]): Set<string> {
  const ids = new Set<string>();
  for (const sequence of sequences) {
    for (const lexeme of sequence.lexemes) {
      if (lexeme.imageId) ids.add(lexeme.imageId);
      if (lexeme.audioId) ids.add(lexeme.audioId);
      if (lexeme.videoId) ids.add(lexeme.videoId);
    }
  }
  return ids;
}
