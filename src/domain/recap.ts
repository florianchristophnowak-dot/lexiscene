/**
 * Kumulative Wiederholung.
 *
 * Am Ende einer Einführung wird nicht nur die letzte Einheit abgerufen, sondern
 * alles, was in dieser Sequenz schon eingeführt wurde: Ausdruck und – wenn
 * vorhanden – die zentrale Kollokation. Die Liste entsteht ausschließlich aus
 * den Einheiten der Sequenz; es wird nichts berechnet und nichts bewertet.
 */
import type { Lexeme, Sequence } from './model';

export interface RecapItem {
  lexemeId: string;
  /** Ausdruck der Einheit – zielsprachlich. */
  expression: string;
  /** Zentrale Kollokation, falls hinterlegt. */
  chunk: string;
}

/**
 * Alle Einheiten, die vor dieser Einheit eingeführt wurden – einschließlich
 * ihrer selbst, damit die Wiederholung wirklich kumulativ ist. Übersprungene
 * Einheiten und solche ohne Ausdruck bleiben außen vor.
 */
export function recapItems(sequence: Sequence | undefined, lexeme: Lexeme): RecapItem[] {
  if (!sequence) return [];
  const teachable = sequence.lexemes.filter((entry) => !entry.skipped);
  const position = teachable.findIndex((entry) => entry.id === lexeme.id);
  if (position < 1) return [];

  return teachable
    .slice(0, position + 1)
    .filter((entry) => entry.expression.trim())
    .map((entry) => ({
      lexemeId: entry.id,
      expression: entry.expression.trim(),
      chunk: entry.keyCollocation.trim(),
    }));
}
