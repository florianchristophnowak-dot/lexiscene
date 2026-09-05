/**
 * Serienimport lexikalischer Einheiten aus einer eingefügten Tabelle.
 *
 * Erwartet wird, was beim Kopieren aus einer Tabellenkalkulation oder einem
 * Textdokument entsteht: Zeilen mit Tabulator, Semikolon oder Komma als
 * Trennzeichen. Es findet keine Netzabfrage und keine automatische Ergänzung
 * statt – übernommen wird ausschließlich, was in der Tabelle steht.
 */
import type { Lexeme } from './model';

export type ImportField =
  | 'ignore'
  | 'expression'
  | 'coreMeaning'
  | 'communicativeFunction'
  | 'modelUtterance'
  | 'translation'
  | 'example'
  | 'situation'
  | 'sentenceFrame';

export interface ImportFieldOption {
  id: ImportField;
  label: string;
  /** Begriffe, an denen eine Überschrift erkannt wird. */
  keywords: string[];
}

export const IMPORT_FIELDS: readonly ImportFieldOption[] = [
  { id: 'ignore', label: 'nicht übernehmen', keywords: [] },
  { id: 'expression', label: 'Ausdruck oder Chunk', keywords: ['ausdruck', 'chunk', 'wendung', 'einheit', 'wort', 'expression'] },
  { id: 'coreMeaning', label: 'Kernbedeutung', keywords: ['kernbedeutung', 'bedeutung', 'erklärung', 'erklaerung'] },
  {
    id: 'communicativeFunction',
    label: 'Kommunikative Funktion',
    keywords: ['funktion', 'kommunikativ', 'sprechabsicht', 'intention'],
  },
  { id: 'modelUtterance', label: 'Modelläußerung', keywords: ['modell', 'modelläußerung', 'modellaeusserung', 'satz'] },
  { id: 'translation', label: 'Übersetzung', keywords: ['übersetzung', 'uebersetzung', 'deutsch', 'translation'] },
  { id: 'example', label: 'Beispiel', keywords: ['beispiel', 'kontext', 'example'] },
  { id: 'situation', label: 'Einstiegssituation', keywords: ['situation', 'anlass', 'szene'] },
  { id: 'sentenceFrame', label: 'Satzrahmen', keywords: ['satzrahmen', 'rahmen', 'muster', 'struktur'] },
];

export type Delimiter = '\t' | ';' | ',';

/** Wählt das Trennzeichen, das in den meisten Zeilen gleich häufig vorkommt. */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const candidates: Delimiter[] = ['\t', ';', ','];
  let best: Delimiter = '\t';
  let bestScore = -1;

  for (const candidate of candidates) {
    const counts = lines.map((line) => line.split(candidate).length - 1);
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total === 0) continue;
    // Gleichmäßige Verteilung spricht für eine echte Spaltentrennung.
    const first = counts[0];
    const consistent = counts.filter((count) => count === first).length / counts.length;
    const score = total * consistent;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/** Zerlegt Text in Zeilen und Spalten; Anführungszeichen nach CSV-Regeln. */
export function parseTable(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(field.trim());
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((entry) => entry.length > 0)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.trim() === '') {
      quoted = true;
    } else if (character === delimiter) {
      endField();
    } else if (character === '\n') {
      endRow();
    } else if (character !== '\r') {
      field += character;
    }
  }

  endRow();
  return rows;
}

export function looksLikeHeader(row: string[]): boolean {
  const known = row.filter((cell) => guessField(cell) !== 'ignore').length;
  return known >= Math.max(1, Math.ceil(row.length / 2));
}

function guessField(heading: string): ImportField {
  const value = heading.trim().toLowerCase();
  if (!value) return 'ignore';
  for (const field of IMPORT_FIELDS) {
    if (field.id === 'ignore') continue;
    if (field.keywords.some((keyword) => value.includes(keyword))) return field.id;
  }
  return 'ignore';
}

/** Standardzuordnung: erkannte Überschriften, sonst Ausdruck / Kernbedeutung / Übersetzung. */
export function guessMapping(rows: string[][], hasHeader: boolean): ImportField[] {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const fallback: ImportField[] = ['expression', 'coreMeaning', 'translation', 'modelUtterance'];

  if (hasHeader && rows.length > 0) {
    const guessed = rows[0].map(guessField);
    if (guessed.some((field) => field === 'expression')) {
      return Array.from({ length: columnCount }, (_, index) => guessed[index] ?? 'ignore');
    }
  }

  return Array.from({ length: columnCount }, (_, index) => fallback[index] ?? 'ignore');
}

export interface ImportPreview {
  rows: string[][];
  hasHeader: boolean;
  mapping: ImportField[];
  /** Zeilen ohne Ausdruck werden übersprungen. */
  usableCount: number;
}

export function buildPreview(text: string, options: { hasHeader?: boolean; mapping?: ImportField[] } = {}): ImportPreview {
  const rows = parseTable(text);
  const hasHeader = options.hasHeader ?? (rows.length > 1 && looksLikeHeader(rows[0]));
  const mapping = options.mapping ?? guessMapping(rows, hasHeader);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const expressionColumn = mapping.indexOf('expression');
  const usableCount =
    expressionColumn < 0 ? 0 : dataRows.filter((row) => (row[expressionColumn] ?? '').trim().length > 0).length;

  return { rows, hasHeader, mapping, usableCount };
}

/** Wandelt die Tabelle in Vorlagen für neue Einheiten um. */
export function rowsToLexemes(rows: string[][], mapping: ImportField[], hasHeader: boolean): Partial<Lexeme>[] {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const expressionColumn = mapping.indexOf('expression');
  if (expressionColumn < 0) return [];

  return dataRows
    .filter((row) => (row[expressionColumn] ?? '').trim().length > 0)
    .map((row) => {
      const lexeme: Partial<Lexeme> = {};
      mapping.forEach((field, index) => {
        if (field === 'ignore') return;
        const value = (row[index] ?? '').trim();
        if (value) lexeme[field] = value;
      });
      return lexeme;
    });
}
