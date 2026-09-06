/**
 * Korpusminiaturen: kleine, von der Lehrkraft kuratierte Belegsammlungen.
 *
 * Eine Miniatur zeigt bewusst wenige ausgewählte Belege statt einer
 * ungefilterten Trefferliste. Alle Belege trägt die Lehrkraft selbst ein oder
 * kopiert sie hinein – es gibt keine Verbindung zu Onlinekorpora, keine
 * Netzabfrage und keine automatische Auswertung. Auch eine Quellenangabe wird
 * ausschließlich als lokaler Text gespeichert.
 *
 * Die Verarbeitung ist durchgehend deterministisch: Belege werden nie
 * sprachlich verändert, und eine Markierung wird als exakte Zeichenfolge
 * gesucht – einschließlich Akzenten, Apostrophen und Groß-/Kleinschreibung.
 */
import { CORPUS_FOCUSES, CORPUS_PROVENANCES, type CorpusExample, type CorpusFocus, type CorpusMiniature, type CorpusProvenance } from './model';
import { createId } from './ids';

/** Ab dieser Anzahl brauchbarer Belege wird der Unterrichtsschritt angeboten. */
export const CORPUS_MIN_EXAMPLES = 3;

/* ------------------------------------------------------------- Factories */

export function createCorpusExample(partial: Partial<CorpusExample> = {}): CorpusExample {
  return {
    id: createId('beleg'),
    text: '',
    highlight: '',
    category: '',
    teacherNote: '',
    ...partial,
  };
}

export function createCorpusMiniature(partial: Partial<CorpusMiniature> = {}): CorpusMiniature {
  return {
    enabled: false,
    title: '',
    guidingQuestion: '',
    focus: 'pattern',
    examples: [],
    discoveryPrompt: '',
    ruleOrFinding: '',
    transferPrompt: '',
    provenance: 'teacher-created',
    sourceNote: '',
    ...partial,
  };
}

/* --------------------------------------------------------- Normalisierung */

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

function normalizeExample(raw: unknown): CorpusExample | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  return createCorpusExample({
    id: asString(source.id) || createId('beleg'),
    text: asString(source.text),
    highlight: asString(source.highlight),
    category: asString(source.category),
    teacherNote: asString(source.teacherNote),
  });
}

/**
 * Liest eine Korpusminiatur tolerant ein. Fehlt sie ganz – etwa in Dateien der
 * Schemaversion 2 –, entsteht eine leere, deaktivierte Miniatur.
 */
export function normalizeCorpusMiniature(raw: unknown): CorpusMiniature {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createCorpusMiniature();
  const source = raw as Record<string, unknown>;

  const examples = Array.isArray(source.examples)
    ? source.examples.map(normalizeExample).filter((entry): entry is CorpusExample => entry !== null)
    : [];

  // Doppelte Kennungen würden die Bearbeitung mehrdeutig machen.
  const seen = new Set<string>();
  for (const example of examples) {
    if (seen.has(example.id)) example.id = createId('beleg');
    seen.add(example.id);
  }

  return createCorpusMiniature({
    enabled: source.enabled === true,
    title: asString(source.title),
    guidingQuestion: asString(source.guidingQuestion),
    focus: CORPUS_FOCUSES.includes(source.focus as CorpusFocus) ? (source.focus as CorpusFocus) : 'pattern',
    examples,
    discoveryPrompt: asString(source.discoveryPrompt),
    ruleOrFinding: asString(source.ruleOrFinding),
    transferPrompt: asString(source.transferPrompt),
    provenance: CORPUS_PROVENANCES.includes(source.provenance as CorpusProvenance)
      ? (source.provenance as CorpusProvenance)
      : 'teacher-created',
    sourceNote: asString(source.sourceNote),
  });
}

/* ------------------------------------------------------------- Auswertung */

/** Belege mit Text – leere Zeilen zählen nicht mit. */
export function usableExamples(miniature: CorpusMiniature): CorpusExample[] {
  return miniature.examples.filter((example) => example.text.trim().length > 0);
}

/** Wird der Unterrichtsschritt für diese Einheit überhaupt angeboten? */
export function corpusMiniatureReady(miniature: CorpusMiniature | undefined): boolean {
  if (!miniature?.enabled) return false;
  return usableExamples(miniature).length >= CORPUS_MIN_EXAMPLES;
}

/** Lösungsgruppen in der Reihenfolge ihres ersten Auftretens. */
export function corpusCategories(miniature: CorpusMiniature): string[] {
  const categories: string[] = [];
  for (const example of usableExamples(miniature)) {
    const category = example.category.trim();
    if (category && !categories.includes(category)) categories.push(category);
  }
  return categories;
}

/* -------------------------------------------------------------- Markierung */

export interface HighlightSegment {
  text: string;
  mark: boolean;
}

/**
 * Zerlegt einen Beleg in markierte und unmarkierte Abschnitte.
 * Gesucht wird die exakte Zeichenfolge; alle Vorkommen werden markiert. Der
 * Beleg selbst bleibt unverändert – es wird nichts ergänzt, ersetzt oder
 * normalisiert.
 */
export function splitHighlight(text: string, highlight: string): HighlightSegment[] {
  const needle = highlight.trim();
  if (!text) return [];
  if (!needle) return [{ text, mark: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let found = text.indexOf(needle, cursor);

  while (found >= 0) {
    if (found > cursor) segments.push({ text: text.slice(cursor, found), mark: false });
    segments.push({ text: text.slice(found, found + needle.length), mark: true });
    cursor = found + needle.length;
    found = text.indexOf(needle, cursor);
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), mark: false });
  return segments;
}

/** Anzahl der Fundstellen einer Markierung im Beleg. */
export function highlightCount(text: string, highlight: string): number {
  return splitHighlight(text, highlight).filter((segment) => segment.mark).length;
}

/** Ist eine hinterlegte Markierung im Beleg auffindbar? */
export function highlightMatches(example: CorpusExample): boolean {
  if (!example.highlight.trim()) return false;
  return highlightCount(example.text, example.highlight) > 0;
}

/* ------------------------------------------------------------ Bearbeitung */

/**
 * Zerlegt eingefügten Text in einzelne Belege – eine Zeile, ein Beleg.
 * Leere Zeilen werden übergangen.
 */
export function parseExampleLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Hängt eingefügte Zeilen als neue Belege an. Vorhandene Belege bleiben
 * unangetastet; es wird nie überschrieben.
 */
export function appendExampleLines(examples: CorpusExample[], text: string): CorpusExample[] {
  const added = parseExampleLines(text).map((line) => createCorpusExample({ text: line }));
  return added.length > 0 ? [...examples, ...added] : examples;
}

export function moveCorpusExample(examples: CorpusExample[], from: number, to: number): CorpusExample[] {
  if (from < 0 || from >= examples.length) return examples;
  const target = Math.min(Math.max(to, 0), examples.length - 1);
  if (target === from) return examples;
  const next = [...examples];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/* ------------------------------------------------- Gestufte Präsentation */

/** Welche Stufen der Präsentation haben überhaupt Inhalt? */
export interface CorpusStages {
  highlight: boolean;
  groups: boolean;
  rule: boolean;
  transfer: boolean;
}

export function corpusStages(miniature: CorpusMiniature): CorpusStages {
  return {
    highlight: usableExamples(miniature).some(highlightMatches),
    groups: corpusCategories(miniature).length > 0 || miniature.discoveryPrompt.trim().length > 0,
    rule: miniature.ruleOrFinding.trim().length > 0,
    transfer: miniature.transferPrompt.trim().length > 0,
  };
}

/** Sichtbarkeit der Stufen im Unterricht – beim Betreten alles verborgen. */
export interface CorpusReveal {
  highlight: boolean;
  groups: boolean;
  rule: boolean;
  transfer: boolean;
}

export const CLOSED_CORPUS_REVEAL: CorpusReveal = {
  highlight: false,
  groups: false,
  rule: false,
  transfer: false,
};

/* ------------------------------------------------------------- Hinweise */

export interface CorpusWarning {
  id: string;
  /** Übersetzungsschlüssel; der Text steht im Sprachkatalog. */
  key: string;
  params?: Record<string, string>;
  exampleId?: string;
}

/**
 * Hinweise für die Vorbereitung – rein formal und ohne Inhaltsanalyse.
 * Sie blockieren nichts.
 */
export function corpusWarnings(miniature: CorpusMiniature): CorpusWarning[] {
  if (!miniature.enabled) return [];
  const warnings: CorpusWarning[] = [];
  const usable = usableExamples(miniature);

  if (usable.length < CORPUS_MIN_EXAMPLES) {
    warnings.push({
      id: 'zu-wenige-belege',
      key: 'corpus.warning.tooFew',
      params: { min: String(CORPUS_MIN_EXAMPLES), count: String(usable.length) },
    });
  }

  for (const example of miniature.examples) {
    if (!example.highlight.trim() || !example.text.trim()) continue;
    if (highlightMatches(example)) continue;
    warnings.push({
      id: `markierung-${example.id}`,
      exampleId: example.id,
      key: 'corpus.warning.highlightMissing',
      params: { highlight: example.highlight.trim() },
    });
  }

  return warnings;
}
