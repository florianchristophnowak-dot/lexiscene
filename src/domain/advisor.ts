/**
 * Methodenberater.
 *
 * Der Berater schlägt vor, wie die Bedeutung zuerst angeboten und anschließend
 * eindeutig bestätigt werden kann. Er entscheidet nicht allein nach dem
 * lexikalischen Typ, sondern bezieht Lernniveau, Lernziel, Bildhaftigkeit,
 * Eignung zur Erschließung und Transferrisiko ein.
 *
 * Alle Vorschläge sind unverbindlich. Die Evidenzkennzeichnung sagt, wie gut ein
 * Vorgehen allgemein gestützt ist – sie ist keine Erfolgsgarantie für den
 * Einzelfall und ersetzt die fachliche Entscheidung der Lehrkraft nicht.
 */
import type {
  Imageability,
  InferenceSuitability,
  LearnerLevel,
  LearningGoal,
  Lexeme,
  LexicalType,
  Sequence,
  TransferRisk,
} from './model';

export type EvidenceGrade = 'robust' | 'bedingt' | 'heuristik';

export const EVIDENCE_GRADES: readonly EvidenceGrade[] = ['robust', 'bedingt', 'heuristik'];

/**
 * Ein Vorschlag besteht nur aus Kennung und Evidenzgrad. Methode, Begründung,
 * Bestätigung und Risiko stehen im Sprachkatalog unter `advisor.<id>.method`,
 * `.rationale`, `.confirmation` und `.risk`.
 */
export interface MethodRecommendation {
  id: string;
  evidence: EvidenceGrade;
}

export interface AdvisorContext {
  lexicalType: LexicalType;
  learningGoal: LearningGoal;
  level: LearnerLevel;
  imageability: Imageability;
  inferenceSuitability: InferenceSuitability;
  transferRisk: TransferRisk;
}

export function advisorContextFromLexeme(lexeme: Lexeme, sequence?: Sequence): AdvisorContext {
  return {
    lexicalType: lexeme.lexicalType,
    learningGoal: lexeme.learningGoal,
    level: sequence?.learnerLevel ?? 'mittelstufe',
    imageability: lexeme.imageability,
    inferenceSuitability: lexeme.inferenceSuitability,
    transferRisk: lexeme.transferRisk,
  };
}

interface Rule extends MethodRecommendation {
  /** Höhere Werte erscheinen weiter oben. */
  weight: number;
  applies: (context: AdvisorContext) => boolean;
}

const CONCRETE_TYPES: LexicalType[] = ['gegenstand', 'handlung', 'eigenschaft'];

const RULES: Rule[] = [
  {
    id: 'realie',
    evidence: 'robust',
    weight: 90,
    applies: (context) => context.imageability === 'hoch',
  },
  {
    id: 'bewegung',
    evidence: 'bedingt',
    weight: 85,
    applies: (context) => context.lexicalType === 'handlung',
  },
  {
    id: 'kontrast',
    evidence: 'bedingt',
    weight: 80,
    applies: (context) => context.lexicalType === 'eigenschaft',
  },
  {
    id: 'situation-gefuehl',
    evidence: 'bedingt',
    weight: 80,
    applies: (context) => context.lexicalType === 'gefuehl',
  },
  {
    id: 'mikrokontext',
    evidence: 'bedingt',
    weight: 75,
    applies: (context) => context.imageability !== 'hoch' && !CONCRETE_TYPES.includes(context.lexicalType),
  },
  {
    id: 'kurze-l1',
    evidence: 'robust',
    weight: 70,
    applies: (context) =>
      context.imageability === 'gering' || context.lexicalType === 'abstrakt' || context.level === 'anfaenger',
  },
  {
    id: 'l2-umschreibung',
    evidence: 'bedingt',
    weight: 65,
    applies: (context) => context.level !== 'anfaenger',
  },
  {
    id: 'dialog',
    evidence: 'bedingt',
    weight: 88,
    applies: (context) => context.lexicalType === 'sprechakt',
  },
  {
    id: 'musteranker',
    evidence: 'bedingt',
    weight: 88,
    applies: (context) => context.lexicalType === 'kollokation',
  },
  {
    id: 'polysem-staffeln',
    evidence: 'heuristik',
    weight: 92,
    applies: (context) => context.lexicalType === 'polysem',
  },
  {
    id: 'falscher-freund',
    evidence: 'bedingt',
    weight: 95,
    applies: (context) => context.lexicalType === 'falscher-freund' || context.transferRisk === 'hoch',
  },
  {
    id: 'erschliessen',
    evidence: 'bedingt',
    weight: 60,
    applies: (context) => context.inferenceSuitability === 'geeignet',
  },
  {
    id: 'transfer-vergleich',
    evidence: 'heuristik',
    weight: 55,
    applies: (context) => context.transferRisk !== 'gering' && context.lexicalType !== 'falscher-freund',
  },
  {
    id: 'produktiv-muster',
    evidence: 'bedingt',
    weight: 50,
    applies: (context) => context.learningGoal === 'productive',
  },
];

const FALLBACK: MethodRecommendation = { id: 'kontext-klaerung', evidence: 'heuristik' };

const MAX_RECOMMENDATIONS = 4;

export function recommendMethods(context: AdvisorContext): MethodRecommendation[] {
  const matching = RULES.filter((rule) => rule.applies(context))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ weight: _weight, applies: _applies, ...recommendation }) => recommendation);

  return matching.length > 0 ? matching : [FALLBACK];
}

/** Kennungen aller bekannten Methoden – für die Auswahlliste in der Vorbereitung. */
export const SEMANTISATION_METHOD_IDS: readonly string[] = [...RULES.map((rule) => rule.id), FALLBACK.id];
