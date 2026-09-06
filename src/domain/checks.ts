/**
 * Vorlagen für den **Abruf** – nicht für die Bedeutungsprüfung.
 *
 * Seit Version 0.4.0 sind echte Concept Checking Questions in `ccq.ts`
 * getrennt. Hier stehen nur noch Aufgaben, die das Wiedererkennen, Erinnern
 * oder Produzieren sprachlicher Form verlangen.
 *
 * Die Aufgaben dienen der formativen Rückmeldung im Unterrichtsgespräch. Es
 * werden bewusst keine Punkte, Noten oder Lernstände berechnet.
 *
 * Jede Vorlage ist didaktisch eingeordnet nach
 * - `target`: worauf sie zielt (Bedeutung, Form, Muster, Gebrauch),
 * - `direction`: in welche Richtung abgerufen wird,
 * - `demand`: wie anspruchsvoll der Abruf ist.
 *
 * Der Impuls für die Klasse wird zielsprachlich aufgebaut: `prompt` verweist
 * auf den Sprachkatalog, `slots` liefert die einzusetzenden Textstellen.
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

/** Auflösung eines zielsprachlichen Impulses aus dem Sprachkatalog. */
export type PhraseFn = (key: string, params?: Record<string, string>) => string;

export interface CheckTemplate {
  id: string;
  target: CheckTarget;
  direction: CheckDirection;
  demand: CheckDemand;
  /** Empfohlen für diese lexikalischen Typen (nur als Hinweis). */
  recommendedFor?: LexicalType[];
  /** Schlüssel des zielsprachlichen Impulses. */
  prompt: string;
  /** Textstellen, die in den Impuls eingesetzt werden. */
  slots: (lexeme: Lexeme) => Record<string, string>;
}

export const CHECK_TEMPLATES: readonly CheckTemplate[] = [
  {
    id: 'ausdruck-auswaehlen',
    target: 'form',
    direction: 'meaning-to-l2',
    demand: 'recognition',
    prompt: 'check.prompt.ausdruck-auswaehlen',
    slots: (lexeme) => ({ meaning: firstFilled(lexeme.targetExplanation, lexeme.communicativeFunction) }),
  },
  {
    id: 'welche-reaktion',
    target: 'use',
    direction: 'l2-to-reaction',
    demand: 'recognition',
    recommendedFor: ['sprechakt'],
    prompt: 'check.prompt.welche-reaktion',
    slots: (lexeme) => ({ utterance: firstFilled(lexeme.modelUtterance, lexeme.expression) }),
  },
  {
    id: 'was-ausgeblendet',
    target: 'form',
    direction: 'meaning-to-l2',
    demand: 'recall',
    prompt: 'check.prompt.was-ausgeblendet',
    slots: (lexeme) => ({ meaning: firstFilled(lexeme.targetExplanation, lexeme.communicativeFunction) }),
  },
  {
    id: 'situation-zu-ausdruck',
    target: 'form',
    direction: 'context-to-l2',
    demand: 'recall',
    prompt: 'check.prompt.situation-zu-ausdruck',
    slots: (lexeme) => ({ situation: firstFilled(lexeme.situation, lexeme.example) }),
  },
  {
    id: 'welcher-ausdruck-fehlt',
    target: 'pattern',
    direction: 'pattern-completion',
    demand: 'controlled-production',
    recommendedFor: ['kollokation', 'sprechakt'],
    prompt: 'check.prompt.welcher-ausdruck-fehlt',
    slots: (lexeme) => ({ gap: gapText(firstFilled(lexeme.modelUtterance, lexeme.expression)) }),
  },
  {
    id: 'slot-variieren',
    target: 'pattern',
    direction: 'pattern-completion',
    demand: 'controlled-production',
    recommendedFor: ['kollokation', 'handlung'],
    prompt: 'check.prompt.slot-variieren',
    slots: (lexeme) => ({ frame: firstFilled(lexeme.sentenceFrame, lexeme.modelUtterance, lexeme.expression) }),
  },
  {
    id: 'reaktion-formulieren',
    target: 'use',
    direction: 'l2-to-reaction',
    demand: 'controlled-production',
    recommendedFor: ['sprechakt', 'kollokation'],
    prompt: 'check.prompt.reaktion-formulieren',
    slots: (lexeme) => ({ utterance: firstFilled(lexeme.modelUtterance, lexeme.expression) }),
  },
  {
    id: 'einheit-verwenden',
    target: 'use',
    direction: 'context-to-l2',
    demand: 'free-production',
    prompt: 'check.prompt.einheit-verwenden',
    slots: (lexeme) => ({ expression: lexeme.expression, situation: firstFilled(lexeme.situation, lexeme.example) }),
  },
];

export function checkTemplate(id: string): CheckTemplate | undefined {
  return CHECK_TEMPLATES.find((template) => template.id === id);
}

export function buildTemplatePrompt(template: CheckTemplate, lexeme: Lexeme, phrase: PhraseFn): string {
  return phrase(template.prompt, template.slots(lexeme));
}

/** Freitext hat Vorrang vor der Vorlage. */
export function buildCheckPrompt(lexeme: Lexeme, phrase: PhraseFn): string {
  if (lexeme.checkPrompt.trim()) return lexeme.checkPrompt.trim();
  const template = checkTemplate(lexeme.checkTemplateId);
  return template ? buildTemplatePrompt(template, lexeme, phrase) : '';
}

/** Ist überhaupt ein Abrufimpuls vorbereitet? (ohne Text aufzubauen) */
export function hasCheckPrompt(lexeme: Lexeme): boolean {
  return Boolean(lexeme.checkPrompt.trim() || checkTemplate(lexeme.checkTemplateId));
}

const isReceptiveDirection = (direction: CheckDirection): boolean => direction === 'l2-to-meaning';

/** Braucht diese Vorlage Material, das die Einheit auch hat? */
function templateFits(template: CheckTemplate, lexeme: Lexeme): boolean {
  if (template.id === 'situation-zu-ausdruck' || template.id === 'einheit-verwenden') {
    return Boolean(firstFilled(lexeme.situation, lexeme.example));
  }
  if (template.id === 'slot-variieren') return Boolean(lexeme.sentenceFrame.trim());
  if (template.id === 'welche-reaktion' || template.id === 'reaktion-formulieren') {
    return Boolean(lexeme.modelUtterance.trim());
  }
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
  const wantContext = primary.direction === 'meaning-to-l2' || primary.direction === 'pattern-completion';
  return CHECK_TEMPLATES.filter((template) => templateFits(template, lexeme))
    .filter((template) =>
      wantContext
        ? template.direction === 'context-to-l2' || template.direction === 'l2-to-reaction'
        : template.direction === 'meaning-to-l2' || template.direction === 'pattern-completion',
    )
    .sort((a, b) => DEMAND_LADDER.indexOf(a.demand) - DEMAND_LADDER.indexOf(b.demand))
    .find((template) => template.id !== primary.id);
}

/**
 * Die zweite Aufgabe: ausdrücklich gewählt, sonst der Vorschlag der App in der
 * jeweils anderen Richtung.
 */
export function secondaryCheck(lexeme: Lexeme): CheckTemplate | undefined {
  return checkTemplate(lexeme.checkTemplateIdSecondary) ?? counterpartCheck(lexeme);
}

export function buildSecondaryPrompt(lexeme: Lexeme, phrase: PhraseFn): string {
  const template = secondaryCheck(lexeme);
  return template ? buildTemplatePrompt(template, lexeme, phrase) : '';
}

/** Aus der Bedeutung heraus abrufen – oder aus der Situation heraus? */
function directionFamily(direction: CheckDirection): 'from-meaning' | 'from-context' {
  return direction === 'meaning-to-l2' || direction === 'pattern-completion' ? 'from-meaning' : 'from-context';
}

/**
 * Deckt das Vorbereitete beide Zugänge ab: einmal von der Bedeutung oder dem
 * Muster her, einmal aus der Situation oder einer Äußerung heraus?
 */
export function coversBothDirections(lexeme: Lexeme): boolean {
  const prepared = [checkTemplate(lexeme.checkTemplateId), secondaryCheck(lexeme)].filter(
    (template): template is CheckTemplate => Boolean(template),
  );
  if (prepared.length < 2) return false;
  return new Set(prepared.map((template) => directionFamily(template.direction))).size > 1;
}
