/**
 * Concept Checking Questions (CCQs).
 *
 * Eine CCQ prüft das Konzept hinter einer lexikalischen Einheit – die
 * Bedeutung, ihre Grenzen, den Bezug, die Zeit, die Absicht oder das Register.
 * Sie prüft ausdrücklich **nicht** die sprachliche Form; dafür ist die
 * Abrufkontrolle da.
 *
 * Vorlagen sind bearbeitbare Gerüste. Es wird nie automatisch eine fertige,
 * inhaltlich behauptende Frage erzeugt: Die Lehrkraft formuliert Frage und
 * erwartete Antwort selbst. Übersetzt oder abgefragt wird nichts.
 */
import type {
  CcqFeature,
  CcqFormat,
  CcqTarget,
  ConceptCheck,
  Lexeme,
  LexicalType,
  ObservationDimension,
} from './model';
import { CCQ_FEATURES, CCQ_FORMATS, CCQ_TARGETS } from './model';
import { createId } from './ids';
import { firstFilled } from './text';

/** Auflösung eines zielsprachlichen Textbausteins aus dem Sprachkatalog. */
export type PhraseFn = (key: string, params?: Record<string, string>) => string;

/* ------------------------------------------------------------- Factories */

export function createConceptCheck(partial: Partial<ConceptCheck> = {}): ConceptCheck {
  return {
    id: createId('ccq'),
    templateId: '',
    question: '',
    expectedAnswer: '',
    options: [],
    feature: 'kernbedeutung',
    format: 'ja-nein',
    misconception: '',
    alternativeClarification: '',
    language: '',
    target: 'meaning',
    ...partial,
  };
}

/* --------------------------------------------------------- Normalisierung */

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

export function normalizeConceptCheck(raw: unknown): ConceptCheck | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const options = Array.isArray(source.options)
    ? source.options.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
    : [];

  return createConceptCheck({
    id: asString(source.id) || createId('ccq'),
    templateId: asString(source.templateId),
    question: asString(source.question),
    expectedAnswer: asString(source.expectedAnswer),
    options,
    feature: CCQ_FEATURES.includes(source.feature as CcqFeature) ? (source.feature as CcqFeature) : 'kernbedeutung',
    format: CCQ_FORMATS.includes(source.format as CcqFormat) ? (source.format as CcqFormat) : 'ja-nein',
    misconception: asString(source.misconception),
    alternativeClarification: asString(source.alternativeClarification),
    language: asString(source.language),
    target: CCQ_TARGETS.includes(source.target as CcqTarget) ? (source.target as CcqTarget) : 'meaning',
  });
}

export function normalizeConceptChecks(raw: unknown): ConceptCheck[] {
  if (!Array.isArray(raw)) return [];
  const checks = raw.map(normalizeConceptCheck).filter((entry): entry is ConceptCheck => entry !== null);

  const seen = new Set<string>();
  for (const check of checks) {
    if (seen.has(check.id)) check.id = createId('ccq');
    seen.add(check.id);
  }
  return checks;
}

/* ------------------------------------------------------------- Auswertung */

/** Trägt der Eintrag eine Frage – eigene Formulierung oder Vorlage? */
export function hasQuestion(check: ConceptCheck): boolean {
  return Boolean(check.question.trim() || ccqTemplate(check.templateId));
}

/**
 * Die im Unterricht gezeigte Frage: die eigene Formulierung, sonst der
 * zielsprachliche Fragerahmen der Vorlage.
 */
export function resolveCcqQuestion(check: ConceptCheck, lexeme: Lexeme, phrase: PhraseFn): string {
  if (check.question.trim()) return check.question.trim();
  const template = ccqTemplate(check.templateId);
  if (!template) return '';
  return phrase(template.scaffold, {
    expression: lexeme.expression,
    utterance: firstFilled(lexeme.modelUtterance, lexeme.expression),
    example: firstFilled(lexeme.example, lexeme.modelUtterance, lexeme.expression),
  });
}

/** CCQs mit Frage – leere Einträge werden im Unterricht übergangen. */
export function usableCcqs(lexeme: Lexeme): ConceptCheck[] {
  return lexeme.ccqs.filter(hasQuestion);
}

export function hasUsableCcq(lexeme: Lexeme): boolean {
  return usableCcqs(lexeme).length > 0;
}

/**
 * Wissensdimension der Rückmeldung nach den CCQs: Bedeutung, sobald eine CCQ
 * darauf zielt; sonst Gebrauch.
 */
export function ccqDimension(lexeme: Lexeme): ObservationDimension {
  const checks = usableCcqs(lexeme);
  if (checks.length === 0) return 'meaning';
  return checks.some((check) => check.target === 'meaning') ? 'meaning' : 'use';
}

export function moveCcq(checks: ConceptCheck[], from: number, to: number): ConceptCheck[] {
  if (from < 0 || from >= checks.length) return checks;
  const target = Math.min(Math.max(to, 0), checks.length - 1);
  if (target === from) return checks;
  const next = [...checks];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/* -------------------------------------------------------------- Vorlagen */

/**
 * Gerüst für eine CCQ. `scaffold` verweist auf einen zielsprachlichen
 * Fragerahmen im Sprachkatalog; eingesetzt wird höchstens der Ausdruck selbst.
 */
export interface CcqTemplate {
  id: string;
  feature: CcqFeature;
  format: CcqFormat;
  target: CcqTarget;
  /** Schlüssel des zielsprachlichen Fragerahmens (`src/i18n/prompts.ts`). */
  scaffold: string;
  /** Empfohlen für diese lexikalischen Typen – nur als Hinweis. */
  recommendedFor?: LexicalType[];
  /** Braucht die Vorlage Material, das die Einheit haben muss? */
  requires?: 'image' | 'situation' | 'utterance' | 'example';
}

/**
 * Echte CCQ-Vorlagen. Sie stammen aus den früheren Kontrollvorlagen, prüfen
 * aber ausdrücklich das Konzept – nicht die Form.
 */
export const CCQ_TEMPLATES: readonly CcqTemplate[] = [
  {
    id: 'welches-bild',
    feature: 'kernbedeutung',
    format: 'auswahl-bild',
    target: 'meaning',
    scaffold: 'ccq.scaffold.welches-bild',
    recommendedFor: ['gegenstand', 'handlung', 'eigenschaft'],
    requires: 'image',
  },
  {
    id: 'welche-situation',
    feature: 'funktion',
    format: 'a-b',
    target: 'use',
    scaffold: 'ccq.scaffold.welche-situation',
    recommendedFor: ['sprechakt', 'abstrakt', 'kollokation'],
  },
  {
    id: 'beispiel-nichtbeispiel',
    feature: 'begriffsgrenze',
    format: 'beispiel-nichtbeispiel',
    target: 'meaning',
    scaffold: 'ccq.scaffold.beispiel-nichtbeispiel',
    recommendedFor: ['abstrakt', 'eigenschaft', 'gefuehl'],
    requires: 'example',
  },
  {
    id: 'welche-bedeutung',
    feature: 'begriffsgrenze',
    format: 'a-b',
    target: 'meaning',
    scaffold: 'ccq.scaffold.welche-bedeutung',
    recommendedFor: ['polysem', 'falscher-freund'],
  },
  {
    id: 'sprechhandlung',
    feature: 'absicht',
    format: 'a-b',
    target: 'use',
    scaffold: 'ccq.scaffold.sprechhandlung',
    recommendedFor: ['sprechakt'],
    requires: 'utterance',
  },
];

export function ccqTemplate(id: string): CcqTemplate | undefined {
  return CCQ_TEMPLATES.find((template) => template.id === id);
}

/** Ist diese Kennung eine CCQ-Vorlage (und keine Abrufvorlage)? */
export function isCcqTemplateId(id: string): boolean {
  return CCQ_TEMPLATES.some((template) => template.id === id);
}

/** Hat die Einheit das Material, das die Vorlage voraussetzt? */
export function ccqTemplateFits(template: CcqTemplate, lexeme: Lexeme): boolean {
  switch (template.requires) {
    case 'image':
      return Boolean(lexeme.imageId);
    case 'situation':
      return Boolean(lexeme.situation.trim() || lexeme.example.trim());
    case 'utterance':
      return Boolean(lexeme.modelUtterance.trim());
    case 'example':
      return Boolean(lexeme.example.trim() || lexeme.modelUtterance.trim());
    default:
      return true;
  }
}

export function recommendedCcqTemplates(lexeme: Lexeme): CcqTemplate[] {
  return CCQ_TEMPLATES.filter((template) => template.recommendedFor?.includes(lexeme.lexicalType));
}

/**
 * Freie Fragestämme als Startpunkt. Sie behaupten nichts über die Einheit und
 * müssen von der Lehrkraft vervollständigt werden.
 */
export const CCQ_STEMS: readonly { id: string; feature: CcqFeature; format: CcqFormat; target: CcqTarget }[] = [
  { id: 'entweder-oder', feature: 'begriffsgrenze', format: 'a-b', target: 'meaning' },
  { id: 'jetzt-oder-spaeter', feature: 'zeit', format: 'a-b', target: 'meaning' },
  { id: 'noetig-oder-moeglich', feature: 'modalitaet', format: 'a-b', target: 'meaning' },
  { id: 'nein-sagen', feature: 'absicht', format: 'ja-nein', target: 'use' },
  { id: 'positiv-negativ', feature: 'wertung', format: 'a-b', target: 'meaning' },
  { id: 'freunde-oder-formell', feature: 'register', format: 'a-b', target: 'use' },
  { id: 'passt-beispiel', feature: 'beispiel', format: 'ja-nein', target: 'meaning' },
  { id: 'wer-handelt', feature: 'person', format: 'kurzantwort', target: 'meaning' },
];

/* -------------------------------------------------------- Qualitätshinweise */

export interface CcqWarning {
  id: string;
  /** Übersetzungsschlüssel; der Text steht im Sprachkatalog. */
  key: string;
  ccqId?: string;
}

/** Wortlaute, die nach Verständnisabfrage statt nach Bedeutungsprüfung klingen. */
const COMPREHENSION_PATTERNS = [
  /habt ihr (das )?verstanden/i,
  /alles klar\s*\?/i,
  /verstanden\s*\?/i,
  /vous avez compris/i,
  /c'?est clair\s*\?/i,
  /do you understand/i,
  /is that clear\s*\?/i,
  /¿?entend[éi]is/i,
  /avete capito/i,
];

/** Wortlaute, die auf die Form statt auf das Konzept zielen. */
const FORM_PATTERNS = [
  /wie (sagt|schreibt|heißt) man/i,
  /übersetz/i,
  /wie lautet/i,
  /comment (dit|écrit)-on/i,
  /traduction|traduis/i,
  /how do you (say|spell|write)/i,
  /translate/i,
  /c[óo]mo se (dice|escribe)/i,
  /come si (dice|scrive)/i,
];

const YES_WORDS = ['ja', 'oui', 'yes', 'si', 'sí', 'sì', 'да'];

const MAX_QUESTION_LENGTH = 120;

function isYes(answer: string): boolean {
  const value = answer.trim().toLowerCase().replace(/[.!]+$/, '');
  return YES_WORDS.includes(value);
}

/**
 * Dezente Qualitätshinweise für die Vorbereitung. Sie blockieren nichts und
 * beurteilen keine Inhalte – geprüft werden nur formale Auffälligkeiten.
 */
export function ccqWarnings(checks: ConceptCheck[]): CcqWarning[] {
  const warnings: CcqWarning[] = [];
  const usable = checks.filter((check) => check.question.trim());

  for (const check of checks) {
    const question = check.question.trim();
    if (!question) continue;

    if (COMPREHENSION_PATTERNS.some((pattern) => pattern.test(question))) {
      warnings.push({ id: `verstaendnisfrage-${check.id}`, key: 'ccq.warning.comprehension', ccqId: check.id });
    }
    if (FORM_PATTERNS.some((pattern) => pattern.test(question))) {
      warnings.push({ id: `formfrage-${check.id}`, key: 'ccq.warning.form', ccqId: check.id });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      warnings.push({ id: `lang-${check.id}`, key: 'ccq.warning.long', ccqId: check.id });
    }
    if (!check.expectedAnswer.trim()) {
      warnings.push({ id: `ohne-antwort-${check.id}`, key: 'ccq.warning.noAnswer', ccqId: check.id });
    }
  }

  // Wenn jede Ja/Nein-Frage mit „ja“ beantwortet wird, prüft die Reihe nichts ab.
  const yesNo = usable.filter((check) => check.format === 'ja-nein' && check.expectedAnswer.trim());
  if (yesNo.length >= 2 && yesNo.every((check) => isYes(check.expectedAnswer))) {
    warnings.push({ id: 'immer-ja', key: 'ccq.warning.allYes' });
  }

  return warnings;
}
