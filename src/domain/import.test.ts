import { describe, expect, it } from 'vitest';
import { buildPreview, detectDelimiter, guessMapping, looksLikeHeader, parseTable, rowsToLexemes } from './import';

const TAB_TABLE = [
  'Ausdruck\tKernbedeutung\tFunktion',
  'Ça te dit de… ?\tHast du Lust, …?\teinen Vorschlag machen',
  'Pourquoi pas !\tGerne!\tzustimmen',
].join('\n');

describe('detectDelimiter', () => {
  it('erkennt Tabulatoren aus der Tabellenkalkulation', () => {
    expect(detectDelimiter(TAB_TABLE)).toBe('\t');
  });

  it('erkennt Semikolon und Komma', () => {
    expect(detectDelimiter('a;b;c\nd;e;f')).toBe(';');
    expect(detectDelimiter('a,b,c\nd,e,f')).toBe(',');
  });
});

describe('parseTable', () => {
  it('zerlegt Zeilen und Spalten und entfernt Leerraum', () => {
    expect(parseTable(TAB_TABLE)).toEqual([
      ['Ausdruck', 'Kernbedeutung', 'Funktion'],
      ['Ça te dit de… ?', 'Hast du Lust, …?', 'einen Vorschlag machen'],
      ['Pourquoi pas !', 'Gerne!', 'zustimmen'],
    ]);
  });

  it('beachtet Anführungszeichen samt Trennzeichen im Feld', () => {
    expect(parseTable('"aller au cinéma; au parc";ins Kino gehen')).toEqual([
      ['aller au cinéma; au parc', 'ins Kino gehen'],
    ]);
  });

  it('behandelt doppelte Anführungszeichen als Zeichen', () => {
    expect(parseTable('"sagt ""bonjour""";grüßt')).toEqual([['sagt "bonjour"', 'grüßt']]);
  });

  it('überspringt leere Zeilen', () => {
    expect(parseTable('a;b\n\n\nc;d')).toHaveLength(2);
  });
});

describe('Überschriften und Zuordnung', () => {
  it('erkennt eine Überschriftenzeile', () => {
    expect(looksLikeHeader(['Ausdruck', 'Bedeutung'])).toBe(true);
    expect(looksLikeHeader(['Ça te dit de… ?', 'Hast du Lust?'])).toBe(false);
  });

  it('ordnet Spalten nach den Überschriften zu', () => {
    const rows = parseTable(TAB_TABLE);
    expect(guessMapping(rows, true)).toEqual(['expression', 'coreMeaning', 'communicativeFunction']);
  });

  it('nutzt ohne Überschrift eine sinnvolle Standardreihenfolge', () => {
    expect(guessMapping([['a', 'b', 'c']], false)).toEqual(['expression', 'coreMeaning', 'translation']);
  });
});

describe('buildPreview', () => {
  it('zählt nur Zeilen mit Ausdruck', () => {
    const preview = buildPreview(`${TAB_TABLE}\n\t nur Bedeutung \t`);
    expect(preview.hasHeader).toBe(true);
    expect(preview.usableCount).toBe(2);
  });

  it('meldet 0 übernehmbare Zeilen ohne Ausdrucksspalte', () => {
    const preview = buildPreview(TAB_TABLE, { mapping: ['ignore', 'ignore', 'ignore'] });
    expect(preview.usableCount).toBe(0);
  });
});

describe('rowsToLexemes', () => {
  it('erzeugt Vorlagen mit den zugeordneten Feldern', () => {
    const rows = parseTable(TAB_TABLE);
    const lexemes = rowsToLexemes(rows, ['expression', 'coreMeaning', 'communicativeFunction'], true);
    expect(lexemes).toEqual([
      { expression: 'Ça te dit de… ?', coreMeaning: 'Hast du Lust, …?', communicativeFunction: 'einen Vorschlag machen' },
      { expression: 'Pourquoi pas !', coreMeaning: 'Gerne!', communicativeFunction: 'zustimmen' },
    ]);
  });

  it('überspringt ignorierte Spalten und leere Felder', () => {
    const lexemes = rowsToLexemes([['le pain', '', 'das Brot']], ['expression', 'ignore', 'translation'], false);
    expect(lexemes).toEqual([{ expression: 'le pain', translation: 'das Brot' }]);
  });

  it('liefert ohne Ausdrucksspalte nichts', () => {
    expect(rowsToLexemes([['a', 'b']], ['ignore', 'translation'], false)).toEqual([]);
  });
});
