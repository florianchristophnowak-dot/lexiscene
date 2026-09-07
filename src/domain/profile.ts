/**
 * Wortprofil: die sieben Dimensionen, die vor dem Unterricht geklärt sein
 * sollten – Bedeutung, Konnotation, Form, Wortbildung, Aussprache, Kollokation
 * und Verwendung.
 *
 * Geprüft wird ausschließlich, ob die Lehrkraft dazu etwas eingetragen hat. Es
 * findet keine inhaltliche Analyse statt, nichts wird bewertet und nichts
 * blockiert. Leitfrage und Bezeichnung stehen im Sprachkatalog unter
 * `profile.dimension.<id>` und `profile.question.<id>`.
 */
import type { Lexeme } from './model';
import { firstFilled } from './text';

export type AnalysisDimension =
  | 'bedeutung'
  | 'konnotation'
  | 'form'
  | 'wortbildung'
  | 'aussprache'
  | 'kollokation'
  | 'verwendung';

export const ANALYSIS_DIMENSIONS: readonly AnalysisDimension[] = [
  'bedeutung',
  'konnotation',
  'form',
  'wortbildung',
  'aussprache',
  'kollokation',
  'verwendung',
];

/** Welche Felder eine Dimension tragen können – eines genügt. */
function fields(dimension: AnalysisDimension, lexeme: Lexeme): string[] {
  switch (dimension) {
    case 'bedeutung':
      return [lexeme.coreMeaning, lexeme.targetExplanation];
    case 'konnotation':
      return [lexeme.connotation === 'unbestimmt' ? '' : lexeme.connotation, lexeme.register];
    case 'form':
      return [lexeme.wordClass === 'unbestimmt' ? '' : lexeme.wordClass, lexeme.morphology];
    case 'wortbildung':
      return [lexeme.wordFamily];
    case 'aussprache':
      return [lexeme.pronunciationHint, lexeme.prosodyNote, lexeme.ipa];
    case 'kollokation':
      return [lexeme.keyCollocation, lexeme.collocations, lexeme.sentenceFrame];
    case 'verwendung':
      return [lexeme.situation, lexeme.modelUtterance, lexeme.communicativeTask];
    default:
      return [];
  }
}

export interface AnalysisEntry {
  id: AnalysisDimension;
  filled: boolean;
}

export function analyseLexeme(lexeme: Lexeme): AnalysisEntry[] {
  return ANALYSIS_DIMENSIONS.map((id) => ({ id, filled: Boolean(firstFilled(...fields(id, lexeme))) }));
}

export function analysisGaps(lexeme: Lexeme): AnalysisDimension[] {
  return analyseLexeme(lexeme)
    .filter((entry) => !entry.filled)
    .map((entry) => entry.id);
}

/**
 * Dimensionen, die für einen tragfähigen Erstkontakt wirklich gebraucht werden.
 * Die übrigen sind Vertiefung – auch sie bleiben freiwillig.
 */
export const CORE_ANALYSIS_DIMENSIONS: readonly AnalysisDimension[] = ['bedeutung', 'aussprache', 'verwendung'];
