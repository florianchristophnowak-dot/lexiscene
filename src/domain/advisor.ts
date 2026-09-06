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

export const EVIDENCE_LABELS: Record<EvidenceGrade, string> = {
  robust: 'robust gestützt',
  bedingt: 'bedingt geeignet',
  heuristik: 'didaktische Heuristik',
};

export interface MethodRecommendation {
  id: string;
  /** Primärer Bedeutungshinweis. */
  method: string;
  /** Kurze Begründung. */
  rationale: string;
  /** Empfohlene eindeutige Bestätigung. */
  confirmation: string;
  /** Mögliches Risiko. */
  risk: string;
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
    method: 'Realie, Bild oder Geste zeigen und kurz verbal bestätigen',
    rationale: 'Bei gut darstellbaren Einheiten trägt der visuelle Hinweis die Bedeutung; die knappe Bestätigung schließt Deutungslücken.',
    confirmation: 'Bedeutung in einem kurzen Satz nennen oder von der Klasse benennen lassen.',
    risk: 'Das Bild zeigt oft mehr als gemeint ist – Farbe, Anzahl oder Situation können mitgelernt werden.',
    evidence: 'robust',
    weight: 90,
    applies: (context) => context.imageability === 'hoch',
  },
  {
    id: 'bewegung',
    method: 'Ablauf vorführen: kurzes Video, Pantomime oder Handlung mit der Klasse',
    rationale: 'Handlungen werden im Ablauf deutlicher als im Standbild.',
    confirmation: 'Die Handlung benennen lassen und mit der Modelläußerung abgleichen.',
    risk: 'Ohne Benennung bleibt offen, ob die Handlung oder ein Detail gemeint ist.',
    evidence: 'bedingt',
    weight: 85,
    applies: (context) => context.lexicalType === 'handlung',
  },
  {
    id: 'kontrast',
    method: 'Kontrastpaar oder Skala zeigen',
    rationale: 'Eigenschaften werden über den Gegensatz fassbar, nicht über die Einzelabbildung.',
    confirmation: 'Zwei Beispiele zuordnen lassen: passt / passt nicht.',
    risk: 'Der Gegensatz kann als feste Paarbildung mitgelernt werden.',
    evidence: 'bedingt',
    weight: 80,
    applies: (context) => context.lexicalType === 'eigenschaft',
  },
  {
    id: 'situation-gefuehl',
    method: 'Situation erzählen und mit Mimik und Stimme mitspielen',
    rationale: 'Gefühlswörter sind an Situationen gebunden; Prosodie und Mimik tragen die Bedeutung mit.',
    confirmation: 'Eine zweite Situation anbieten und beurteilen lassen, ob sie passt.',
    risk: 'Ähnliche Gefühlswörter bleiben ohne Abgrenzung ununterscheidbar.',
    evidence: 'bedingt',
    weight: 80,
    applies: (context) => context.lexicalType === 'gefuehl',
  },
  {
    id: 'mikrokontext',
    method: 'Mikrokontext anbieten und anschließend knapp klären',
    rationale: 'Ein kurzer, eindeutiger Kontext zeigt die Verwendung; die Klärung sichert, was der Kontext offenlässt.',
    confirmation: 'Kernbedeutung nennen – bei Bedarf mit knapper Übersetzung.',
    risk: 'Ein zu offener Kontext lässt mehrere Deutungen zu.',
    evidence: 'bedingt',
    weight: 75,
    applies: (context) => context.imageability !== 'hoch' && !CONCRETE_TYPES.includes(context.lexicalType),
  },
  {
    id: 'kurze-l1',
    method: 'Knappe Übersetzung als Klärung einsetzen',
    rationale: 'Bei abstrakten oder schwer zeigbaren Einheiten ist die kurze Übersetzung ökonomisch und lässt Zeit für Abruf und Anwendung.',
    confirmation: 'Direkt danach eine Verwendung in der Zielsprache anbieten, damit die Einheit nicht als Wortgleichung stehen bleibt.',
    risk: 'Wird die Übersetzung zum einzigen Zugang, bleiben Gebrauchsbedingungen unklar.',
    evidence: 'robust',
    weight: 70,
    applies: (context) =>
      context.imageability === 'gering' || context.lexicalType === 'abstrakt' || context.level === 'anfaenger',
  },
  {
    id: 'l2-umschreibung',
    method: 'Umschreibung in der Zielsprache anbieten',
    rationale: 'Wenn das Sprachniveau trägt, hält die einsprachige Klärung den Unterricht in der Zielsprache.',
    confirmation: 'Rückfrage in der Zielsprache oder Beispiel/Nichtbeispiel beurteilen lassen.',
    risk: 'Zu anspruchsvolle Umschreibungen verlagern die Schwierigkeit auf das Erklären.',
    evidence: 'bedingt',
    weight: 65,
    applies: (context) => context.level !== 'anfaenger',
  },
  {
    id: 'dialog',
    method: 'Mini-Dialog mit passender Reaktion vorspielen',
    rationale: 'Chunks und Sprechakte werden über ihre Funktion im Gespräch verständlich, nicht über Einzelwörter.',
    confirmation: 'Sprechhandlung benennen lassen: Einladung, Zustimmung, Ablehnung, Information.',
    risk: 'Der Chunk kann als unanalysierte Formel ohne Variationsspielraum hängen bleiben.',
    evidence: 'bedingt',
    weight: 88,
    applies: (context) => context.lexicalType === 'sprechakt',
  },
  {
    id: 'musteranker',
    method: 'Musteranker an die Tafel und Slots variieren',
    rationale: 'Feste Verbindungen werden als Muster mit Leerstellen erkennbar.',
    confirmation: 'Zwei Varianten bilden lassen und eine falsche Verbindung gemeinsam verwerfen.',
    risk: 'Ohne Variation bleibt das Muster ein Einzelsatz.',
    evidence: 'bedingt',
    weight: 88,
    applies: (context) => context.lexicalType === 'kollokation',
  },
  {
    id: 'polysem-staffeln',
    method: 'Bedeutungen zeitlich staffeln und über unterschiedliche Muster klären',
    rationale: 'Gleichzeitig eingeführte Lesarten überlagern sich; getrennte Muster halten sie auseinander.',
    confirmation: 'Je Lesart einen eindeutigen Kontext zuordnen lassen.',
    risk: 'Werden beide Lesarten sofort gezeigt, verschwimmen sie.',
    evidence: 'heuristik',
    weight: 92,
    applies: (context) => context.lexicalType === 'polysem',
  },
  {
    id: 'falscher-freund',
    method: 'Erst die Kernbedeutung sichern, dann den Sprachvergleich gezielt anschließen',
    rationale: 'Der Vergleich wirkt, wenn die richtige Bedeutung bereits steht – sonst verstärkt er die falsche Erwartung.',
    confirmation: 'Richtige und falsche Verwendung gegenüberstellen und begründen lassen.',
    risk: 'Ein zu früher Vergleich prägt gerade die Fehlform ein.',
    evidence: 'bedingt',
    weight: 95,
    applies: (context) => context.lexicalType === 'falscher-freund' || context.transferRisk === 'hoch',
  },
  {
    id: 'erschliessen',
    method: 'Erschließungsversuch anbieten – mit anschließender Klärung',
    rationale: 'Wenn der Kontext informativ genug ist, lohnt der Versuch als Strategietraining; die Klärung muss unmittelbar folgen.',
    confirmation: 'Vermutungen sammeln und die Bedeutung anschließend eindeutig festhalten.',
    risk: 'Ohne Verifikation bleiben falsche Hypothesen bestehen.',
    evidence: 'bedingt',
    weight: 60,
    applies: (context) => context.inferenceSuitability === 'geeignet',
  },
  {
    id: 'transfer-vergleich',
    method: 'Abweichung von der Erstsprache offen ansprechen',
    rationale: 'Bekannte Interferenzen wirken weiter, wenn sie unbenannt bleiben.',
    confirmation: 'Einen typischen Übertragungsfehler zeigen und gemeinsam korrigieren.',
    risk: 'Der Fehler kann sich einprägen, wenn er zu lange sichtbar bleibt.',
    evidence: 'heuristik',
    weight: 55,
    applies: (context) => context.transferRisk !== 'gering' && context.lexicalType !== 'falscher-freund',
  },
  {
    id: 'produktiv-muster',
    method: 'Musteranker mitgeben und eine erste Variation verlangen',
    rationale: 'Für produktiv geplante Einheiten reicht das Verstehen nicht; der Rahmen macht die Verwendung anschlussfähig.',
    confirmation: 'Eine kontrollierte Variation im Musteranker bilden lassen.',
    risk: 'Ohne Rahmen entstehen Sätze, die nur zufällig passen.',
    evidence: 'bedingt',
    weight: 50,
    applies: (context) => context.learningGoal === 'productive',
  },
];

const FALLBACK: MethodRecommendation = {
  id: 'kontext-klaerung',
  method: 'Kurzen Kontext anbieten und die Bedeutung anschließend eindeutig klären',
  rationale: 'Kontext plus Klärung ist ein tragfähiger Standardweg, wenn kein Merkmal klar für ein anderes Vorgehen spricht.',
  confirmation: 'Kernbedeutung festhalten und mit einem Beispiel prüfen.',
  risk: 'Ein wenig aussagekräftiger Kontext erzeugt Scheinverstehen.',
  evidence: 'heuristik',
};

const MAX_RECOMMENDATIONS = 4;

export function recommendMethods(context: AdvisorContext): MethodRecommendation[] {
  const matching = RULES.filter((rule) => rule.applies(context))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ weight: _weight, applies: _applies, ...recommendation }) => recommendation);

  return matching.length > 0 ? matching : [FALLBACK];
}

/** Alle bekannten Methoden für die Auswahlliste in der Vorbereitung. */
export const SEMANTISATION_METHODS: readonly string[] = Array.from(new Set(RULES.map((rule) => rule.method))).sort((a, b) =>
  a.localeCompare(b, 'de'),
);
