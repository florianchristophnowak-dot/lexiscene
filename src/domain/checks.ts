/**
 * Vorlagen für Abruf- und Verständniskontrollen.
 *
 * Die Kontrollen dienen der formativen Rückmeldung im Unterrichtsgespräch.
 * Es werden bewusst keine Punkte, Noten oder Lernstände berechnet.
 *
 * Jede Vorlage ist didaktisch eingeordnet nach
 * - `target`: worauf sie zielt (Bedeutung, Form, Muster, Gebrauch),
 * - `direction`: in welche Richtung abgerufen wird,
 * - `demand`: wie anspruchsvoll der Abruf ist.
 */
import type { Lexeme, LexicalType, ObservationDimension } from './model';
import { firstFilled, gapText } from './text';

export type CheckTarget = ObservationDimension;

export type CheckDirection =
  | 'l2-to-meaning'
  | 'meaning-to-l2'
  | 'context-to-l2'
  | 'pattern-completion'
  | 'l2-to-reaction';

export type CheckDemand = 'recognition' | 'evaluation' | 'recall' | 'controlled-production' | 'free-production';

/** Anforderungsstufen in aufsteigender Reihenfolge – als Progression nutzbar. */
export const DEMAND_LADDER: readonly CheckDemand[] = [
  'recognition',
  'evaluation',
  'recall',
  'controlled-production',
  'free-production',
];

const TARGET_LABELS: Record<CheckTarget, string> = {
  meaning: 'Bedeutung',
  form: 'Form',
  pattern: 'Muster',
  use: 'Gebrauch',
};

const DIRECTION_LABELS: Record<CheckDirection, string> = {
  'l2-to-meaning': 'Form → Bedeutung',
  'meaning-to-l2': 'Bedeutung → Form',
  'context-to-l2': 'Situation → Form',
  'pattern-completion': 'Muster ergänzen',
  'l2-to-reaction': 'Äußerung → Reaktion',
};

const DEMAND_LABELS: Record<CheckDemand, string> = {
  recognition: 'auswählen oder zuordnen',
  evaluation: 'Passung beurteilen',
  recall: 'ohne Auswahl erinnern',
  'controlled-production': 'kontrolliert produzieren',
  'free-production': 'frei verwenden',
};

export const checkTargetLabel = (target: CheckTarget): string => TARGET_LABELS[target];
export const checkDirectionLabel = (direction: CheckDirection): string => DIRECTION_LABELS[direction];
export const checkDemandLabel = (demand: CheckDemand): string => DEMAND_LABELS[demand];

export interface CheckTemplate {
  id: string;
  label: string;
  /** Didaktischer Zweck – wird in der Vorbereitung angezeigt. */
  purpose: string;
  target: CheckTarget;
  direction: CheckDirection;
  demand: CheckDemand;
  /** Empfohlen für diese lexikalischen Typen (nur als Hinweis). */
  recommendedFor?: LexicalType[];
  build: (lexeme: Lexeme) => string;
}

export const CHECK_TEMPLATES: readonly CheckTemplate[] = [
  {
    id: 'welches-bild',
    label: 'Welches Bild passt?',
    purpose: 'Prüft die Bedeutungszuordnung ohne Sprachproduktion.',
    target: 'meaning',
    direction: 'l2-to-meaning',
    demand: 'recognition',
    recommendedFor: ['gegenstand', 'handlung', 'eigenschaft'],
    build: (lexeme) => `Welches Bild passt zu „${lexeme.expression}“?`,
  },
  {
    id: 'welche-situation',
    label: 'Welche Situation passt?',
    purpose: 'Prüft, ob die kommunikative Funktion verstanden wurde.',
    target: 'use',
    direction: 'l2-to-meaning',
    demand: 'recognition',
    recommendedFor: ['sprechakt', 'abstrakt', 'kollokation'],
    build: (lexeme) => `In welcher Situation sagt man „${lexeme.expression}“?`,
  },
  {
    id: 'ausdruck-auswaehlen',
    label: 'Welcher Ausdruck passt?',
    purpose: 'Erste produktive Stufe: aus einem Angebot auswählen statt frei formulieren.',
    target: 'form',
    direction: 'meaning-to-l2',
    demand: 'recognition',
    build: (lexeme) =>
      `Welcher Ausdruck passt zu „${firstFilled(lexeme.coreMeaning, lexeme.communicativeFunction)}“? Wählt aus dem Angebot.`,
  },
  {
    id: 'welche-reaktion',
    label: 'Welche Reaktion passt?',
    purpose: 'Macht das Paar aus Äußerung und Antwort bewusst.',
    target: 'use',
    direction: 'l2-to-reaction',
    demand: 'recognition',
    recommendedFor: ['sprechakt'],
    build: (lexeme) => `Jemand sagt: „${firstFilled(lexeme.modelUtterance, lexeme.expression)}“ – welche Reaktion passt?`,
  },
  {
    id: 'beispiel-nichtbeispiel',
    label: 'Beispiel oder Nichtbeispiel?',
    purpose: 'Zieht die Begriffsgrenze aktiv nach.',
    target: 'meaning',
    direction: 'l2-to-meaning',
    demand: 'evaluation',
    recommendedFor: ['abstrakt', 'eigenschaft', 'gefuehl'],
    build: (lexeme) =>
      `Passt „${firstFilled(lexeme.example, lexeme.modelUtterance, lexeme.expression)}“ zu „${lexeme.expression}“ – ja oder nein?`,
  },
  {
    id: 'welche-bedeutung',
    label: 'Welche Bedeutung ist hier gemeint?',
    purpose: 'Klärt bei mehrdeutigen Einheiten die gemeinte Lesart.',
    target: 'meaning',
    direction: 'l2-to-meaning',
    demand: 'evaluation',
    recommendedFor: ['polysem', 'falscher-freund'],
    build: (lexeme) => `Welche Bedeutung von „${lexeme.expression}“ ist hier gemeint?`,
  },
  {
    id: 'sprechhandlung',
    label: 'Einladung, Information, Zustimmung oder Ablehnung?',
    purpose: 'Fokussiert die Sprechhandlung statt der Wortbedeutung.',
    target: 'use',
    direction: 'l2-to-meaning',
    demand: 'evaluation',
    recommendedFor: ['sprechakt'],
    build: (lexeme) =>
      `Ist „${firstFilled(lexeme.modelUtterance, lexeme.expression)}“ eine Einladung, eine Information, eine Zustimmung oder eine Ablehnung?`,
  },
  {
    id: 'was-ausgeblendet',
    label: 'Was wurde gerade ausgeblendet?',
    purpose: 'Prüft den Abruf unmittelbar nach dem Entfernen der Hilfe.',
    target: 'form',
    direction: 'meaning-to-l2',
    demand: 'recall',
    build: (lexeme) => `Was stand hier gerade? Nennt die Einheit zu: ${firstFilled(lexeme.coreMeaning, lexeme.communicativeFunction)}`,
  },
  {
    id: 'situation-zu-ausdruck',
    label: 'Wie sagt man das in dieser Situation?',
    purpose: 'Abruf aus der Situation heraus, ohne Auswahlangebot.',
    target: 'form',
    direction: 'context-to-l2',
    demand: 'recall',
    build: (lexeme) => `${firstFilled(lexeme.situation, lexeme.example)} – wie sagt man das?`,
  },
  {
    id: 'welcher-ausdruck-fehlt',
    label: 'Welcher Ausdruck fehlt?',
    purpose: 'Aktiviert den Chunk als Ganzes.',
    target: 'pattern',
    direction: 'pattern-completion',
    demand: 'controlled-production',
    recommendedFor: ['kollokation', 'sprechakt'],
    build: (lexeme) => `Ergänzt: ${gapText(firstFilled(lexeme.modelUtterance, lexeme.expression))}`,
  },
  {
    id: 'slot-variieren',
    label: 'Baustein austauschen',
    purpose: 'Kontrollierte Variation im Musteranker, bevor frei formuliert wird.',
    target: 'pattern',
    direction: 'pattern-completion',
    demand: 'controlled-production',
    recommendedFor: ['kollokation', 'handlung'],
    build: (lexeme) =>
      `Setzt in „${firstFilled(lexeme.sentenceFrame, lexeme.modelUtterance, lexeme.expression)}“ einen anderen Baustein ein.`,
  },
  {
    id: 'reaktion-formulieren',
    label: 'Formuliere eine passende Reaktion.',
    purpose: 'Produktiver Schritt in einem vorgegebenen Rahmen.',
    target: 'use',
    direction: 'l2-to-reaction',
    demand: 'controlled-production',
    recommendedFor: ['sprechakt', 'kollokation'],
    build: (lexeme) => `Antwortet auf: „${firstFilled(lexeme.modelUtterance, lexeme.expression)}“`,
  },
  {
    id: 'einheit-verwenden',
    label: 'Verwende die Einheit in der dargestellten Situation.',
    purpose: 'Überführt die Einheit in eigenes Sprachhandeln.',
    target: 'use',
    direction: 'context-to-l2',
    demand: 'free-production',
    build: (lexeme) => `Verwendet „${lexeme.expression}“ in dieser Situation: ${firstFilled(lexeme.situation, lexeme.example)}`,
  },
];

export function checkTemplate(id: string): CheckTemplate | undefined {
  return CHECK_TEMPLATES.find((template) => template.id === id);
}

/** Freitext hat Vorrang vor der Vorlage. */
export function buildCheckPrompt(lexeme: Lexeme): string {
  if (lexeme.checkPrompt.trim()) return lexeme.checkPrompt.trim();
  const template = checkTemplate(lexeme.checkTemplateId);
  return template ? template.build(lexeme) : '';
}

const isReceptiveDirection = (direction: CheckDirection): boolean => direction === 'l2-to-meaning';

/** Braucht diese Vorlage Material, das die Einheit auch hat? */
function templateFits(template: CheckTemplate, lexeme: Lexeme): boolean {
  if (template.id === 'situation-zu-ausdruck' || template.id === 'einheit-verwenden') {
    return Boolean(firstFilled(lexeme.situation, lexeme.example));
  }
  if (template.id === 'welches-bild') return Boolean(lexeme.imageId);
  if (template.id === 'slot-variieren') return Boolean(lexeme.sentenceFrame.trim());
  if (template.id === 'welche-reaktion' || template.id === 'reaktion-formulieren') {
    return Boolean(lexeme.modelUtterance.trim());
  }
  if (template.id === 'beispiel-nichtbeispiel') return Boolean(firstFilled(lexeme.example, lexeme.modelUtterance));
  return true;
}

/**
 * Vorschläge in aufsteigender Anforderung: auswählen, beurteilen, erinnern,
 * kontrolliert produzieren, frei verwenden. Rezeptive Einheiten enden bewusst
 * vor der freien Produktion.
 */
export function suggestRetrievalProgression(lexeme: Lexeme): CheckTemplate[] {
  const productive = lexeme.learningGoal === 'productive';
  const candidates = CHECK_TEMPLATES.filter((template) => templateFits(template, lexeme)).filter((template) =>
    productive ? true : isReceptiveDirection(template.direction) || template.demand === 'recognition',
  );

  const byDemand = new Map<CheckDemand, CheckTemplate>();
  for (const demand of DEMAND_LADDER) {
    const typeMatch = candidates.find(
      (template) => template.demand === demand && template.recommendedFor?.includes(lexeme.lexicalType),
    );
    const anyMatch = candidates.find((template) => template.demand === demand);
    const chosen = typeMatch ?? anyMatch;
    if (chosen) byDemand.set(demand, chosen);
  }

  return DEMAND_LADDER.map((demand) => byDemand.get(demand)).filter((entry): entry is CheckTemplate => Boolean(entry));
}

/** Vorlagen, die zum lexikalischen Typ passen (Hinweis in der Auswahl). */
export function recommendedChecks(type: LexicalType): CheckTemplate[] {
  return CHECK_TEMPLATES.filter((template) => template.recommendedFor?.includes(type));
}

/**
 * Für produktive Kerneinheiten sollten beide Richtungen vorkommen. Liefert eine
 * Vorlage in der jeweils anderen Richtung – als Angebot, nicht als Pflicht.
 */
export function counterpartCheck(lexeme: Lexeme): CheckTemplate | undefined {
  const primary = checkTemplate(lexeme.checkTemplateId);
  if (!primary) return undefined;
  const wantProductive = isReceptiveDirection(primary.direction);
  return CHECK_TEMPLATES.filter((template) => templateFits(template, lexeme))
    .filter((template) => (wantProductive ? !isReceptiveDirection(template.direction) : isReceptiveDirection(template.direction)))
    .sort((a, b) => DEMAND_LADDER.indexOf(a.demand) - DEMAND_LADDER.indexOf(b.demand))
    .find((template) => template.id !== primary.id);
}

export function buildCounterpartPrompt(lexeme: Lexeme): string {
  const template = counterpartCheck(lexeme);
  return template ? template.build(lexeme) : '';
}

/**
 * Die zweite Aufgabe: ausdrücklich gewählt, sonst der Vorschlag der App in der
 * jeweils anderen Richtung.
 */
export function secondaryCheck(lexeme: Lexeme): CheckTemplate | undefined {
  return checkTemplate(lexeme.checkTemplateIdSecondary) ?? counterpartCheck(lexeme);
}

export function buildSecondaryPrompt(lexeme: Lexeme): string {
  const template = secondaryCheck(lexeme);
  return template ? template.build(lexeme) : '';
}

/** Deckt das Vorbereitete beide Richtungen ab? */
export function coversBothDirections(lexeme: Lexeme): boolean {
  const prepared = [checkTemplate(lexeme.checkTemplateId), checkTemplate(lexeme.checkTemplateIdSecondary)].filter(
    (template): template is CheckTemplate => Boolean(template),
  );
  return (
    prepared.some((template) => isReceptiveDirection(template.direction)) &&
    prepared.some((template) => !isReceptiveDirection(template.direction))
  );
}
