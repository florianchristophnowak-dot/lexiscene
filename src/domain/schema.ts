/**
 * Erzeugung, Normalisierung und Prüfung der Datenstrukturen.
 *
 * Import-Daten werden absichtlich tolerant gelesen (fehlende Felder werden mit
 * Standardwerten gefüllt), aber niemals ungeprüft übernommen.
 */
import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type AppSettings,
  type ClassStatus,
  type Lexeme,
  type LexicalType,
  type MediaMeta,
  type Repertoire,
  type Sequence,
  type StepId,
  CLASS_STATUSES,
  LEXICAL_TYPES,
  REPERTOIRES,
} from './model';
import { STEP_IDS, defaultStepConfig, normalizeStepOrder } from './steps';

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

export function createId(prefix = 'id'): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);
const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function asOption<T extends string>(value: unknown, options: readonly { id: T }[], fallback: T): T {
  return options.some((option) => option.id === value) ? (value as T) : fallback;
}

/* ------------------------------------------------------------- Factories */

export function createLexeme(partial: Partial<Lexeme> = {}): Lexeme {
  const now = Date.now();
  return {
    id: createId('lex'),
    expression: '',
    coreMeaning: '',
    communicativeFunction: '',
    modelUtterance: '',
    lexicalType: 'sprechakt',
    semantisationMethod: '',
    repertoire: 'kern',
    pronunciationHint: '',
    prosodyNote: '',
    ipa: '',
    morphology: '',
    valency: '',
    sentenceFrame: '',
    collocations: '',
    wordFamily: '',
    register: '',
    culturalNote: '',
    example: '',
    nonExample: '',
    contrastExample: '',
    confusionRisk: '',
    checkTemplateId: '',
    checkPrompt: '',
    extraHint: '',
    simplifiedExplanation: '',
    translation: '',
    multilingualComparison: '',
    extensionTask: '',
    situation: '',
    communicativeTask: '',
    stepOverrides: {},
    stepOrderOverride: null,
    skipped: false,
    status: null,
    statusUpdatedAt: null,
    liveNote: '',
    createdAt: now,
    updatedAt: now,
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
    topic: '',
    canDoGoal: '',
    teacherNote: '',
    archived: false,
    steps: defaultStepConfig(),
    stepOrder: [...STEP_IDS],
    lexemes: [],
    reactivation: { enabled: false, offsetsDays: [...DEFAULT_SETTINGS.reactivationOffsets], anchor: null, completedRounds: 0 },
    session: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/* --------------------------------------------------------- Normalisierung */

export function normalizeLexeme(raw: unknown): Lexeme {
  const source = asRecord(raw);
  const base = createLexeme({ id: asString(source.id) || createId('lex') });

  const stepOverrides: Partial<Record<StepId, boolean>> = {};
  const rawOverrides = asRecord(source.stepOverrides);
  for (const stepId of STEP_IDS) {
    const value = rawOverrides[stepId];
    if (typeof value === 'boolean') stepOverrides[stepId] = value;
  }

  const status = CLASS_STATUSES.some((entry) => entry.id === source.status) ? (source.status as ClassStatus) : null;

  return {
    ...base,
    expression: asString(source.expression, base.expression),
    coreMeaning: asString(source.coreMeaning, base.coreMeaning),
    communicativeFunction: asString(source.communicativeFunction, base.communicativeFunction),
    modelUtterance: asString(source.modelUtterance, base.modelUtterance),
    lexicalType: asOption<LexicalType>(source.lexicalType, LEXICAL_TYPES, base.lexicalType),
    semantisationMethod: asString(source.semantisationMethod, base.semantisationMethod),
    repertoire: asOption<Repertoire>(source.repertoire, REPERTOIRES, base.repertoire),
    imageId: typeof source.imageId === 'string' ? source.imageId : undefined,
    audioId: typeof source.audioId === 'string' ? source.audioId : undefined,
    videoId: typeof source.videoId === 'string' ? source.videoId : undefined,
    pronunciationHint: asString(source.pronunciationHint),
    prosodyNote: asString(source.prosodyNote),
    ipa: asString(source.ipa),
    morphology: asString(source.morphology),
    valency: asString(source.valency),
    sentenceFrame: asString(source.sentenceFrame),
    collocations: asString(source.collocations),
    wordFamily: asString(source.wordFamily),
    register: asString(source.register),
    culturalNote: asString(source.culturalNote),
    example: asString(source.example),
    nonExample: asString(source.nonExample),
    contrastExample: asString(source.contrastExample),
    confusionRisk: asString(source.confusionRisk),
    checkTemplateId: asString(source.checkTemplateId),
    checkPrompt: asString(source.checkPrompt),
    extraHint: asString(source.extraHint),
    simplifiedExplanation: asString(source.simplifiedExplanation),
    translation: asString(source.translation),
    multilingualComparison: asString(source.multilingualComparison),
    extensionTask: asString(source.extensionTask),
    situation: asString(source.situation),
    communicativeTask: asString(source.communicativeTask),
    stepOverrides,
    stepOrderOverride: Array.isArray(source.stepOrderOverride) ? normalizeStepOrder(source.stepOrderOverride) : null,
    skipped: asBoolean(source.skipped),
    status,
    statusUpdatedAt: typeof source.statusUpdatedAt === 'number' ? source.statusUpdatedAt : null,
    liveNote: asString(source.liveNote),
    createdAt: asNumber(source.createdAt, base.createdAt),
    updatedAt: asNumber(source.updatedAt, base.updatedAt),
  };
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

  const base = createSequence({ id: asString(source.id) || createId('seq') });
  return {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    title: asString(source.title, base.title).trim() || base.title,
    targetLanguage: asString(source.targetLanguage, base.targetLanguage),
    learningGroup: asString(source.learningGroup),
    topic: asString(source.topic),
    canDoGoal: asString(source.canDoGoal),
    teacherNote: asString(source.teacherNote),
    archived: asBoolean(source.archived),
    steps,
    stepOrder: normalizeStepOrder(source.stepOrder),
    lexemes: rawLexemes.map(normalizeLexeme),
    reactivation: {
      enabled: asBoolean(rawReactivation.enabled),
      offsetsDays: offsets.length > 0 ? offsets : [...DEFAULT_SETTINGS.reactivationOffsets],
      anchor: typeof rawReactivation.anchor === 'number' ? rawReactivation.anchor : null,
      completedRounds: Math.max(0, asNumber(rawReactivation.completedRounds, 0)),
    },
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
  const offsets = Array.isArray(source.reactivationOffsets)
    ? source.reactivationOffsets.filter((value): value is number => typeof value === 'number' && value > 0)
    : [...DEFAULT_SETTINGS.reactivationOffsets];
  return {
    theme,
    detailPaneVisible: asBoolean(source.detailPaneVisible, true),
    lastSequenceId: typeof source.lastSequenceId === 'string' ? source.lastSequenceId : null,
    reactivationOffsets: offsets.length > 0 ? offsets : [...DEFAULT_SETTINGS.reactivationOffsets],
    demoSeeded: asBoolean(source.demoSeeded),
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
