/**
 * Vorlagen für Verständniskontrollen.
 *
 * Die Kontrollen dienen der formativen Rückmeldung im Unterrichtsgespräch.
 * Es werden bewusst keine Punkte, Noten oder Lernstände berechnet.
 */
import type { Lexeme, LexicalType } from './model';
import { firstFilled, gapText } from './text';

export interface CheckTemplate {
  id: string;
  label: string;
  /** Didaktischer Zweck – wird in der Vorbereitung angezeigt. */
  purpose: string;
  /** Empfohlen für diese lexikalischen Typen (nur als Hinweis). */
  recommendedFor?: LexicalType[];
  build: (lexeme: Lexeme) => string;
}

export const CHECK_TEMPLATES: readonly CheckTemplate[] = [
  {
    id: 'welches-bild',
    label: 'Welches Bild passt?',
    purpose: 'Prüft die Bedeutungszuordnung ohne Sprachproduktion.',
    recommendedFor: ['gegenstand', 'handlung', 'eigenschaft'],
    build: (lexeme) => `Welches Bild passt zu „${lexeme.expression}“?`,
  },
  {
    id: 'welche-situation',
    label: 'Welche Situation passt?',
    purpose: 'Prüft, ob die kommunikative Funktion verstanden wurde.',
    recommendedFor: ['sprechakt', 'abstrakt', 'kollokation'],
    build: (lexeme) => `In welcher Situation sagt man „${lexeme.expression}“?`,
  },
  {
    id: 'welche-reaktion',
    label: 'Welche Reaktion passt?',
    purpose: 'Macht das Paar aus Äußerung und Antwort bewusst.',
    recommendedFor: ['sprechakt'],
    build: (lexeme) => `Jemand sagt: „${firstFilled(lexeme.modelUtterance, lexeme.expression)}“ – welche Reaktion passt?`,
  },
  {
    id: 'beispiel-nichtbeispiel',
    label: 'Beispiel oder Nichtbeispiel?',
    purpose: 'Zieht die Begriffsgrenze aktiv nach.',
    recommendedFor: ['abstrakt', 'eigenschaft', 'gefuehl'],
    build: (lexeme) =>
      `Passt „${firstFilled(lexeme.example, lexeme.modelUtterance, lexeme.expression)}“ zu „${lexeme.expression}“ – ja oder nein?`,
  },
  {
    id: 'welche-bedeutung',
    label: 'Welche Bedeutung ist hier gemeint?',
    purpose: 'Klärt bei mehrdeutigen Einheiten die gemeinte Lesart.',
    recommendedFor: ['polysem', 'falscher-freund'],
    build: (lexeme) => `Welche Bedeutung von „${lexeme.expression}“ ist hier gemeint?`,
  },
  {
    id: 'was-ausgeblendet',
    label: 'Was wurde gerade ausgeblendet?',
    purpose: 'Prüft den Abruf unmittelbar nach dem Entfernen der Hilfe.',
    build: (lexeme) => `Was stand hier gerade? Nennt die Einheit zu: ${firstFilled(lexeme.coreMeaning, lexeme.communicativeFunction)}`,
  },
  {
    id: 'welcher-ausdruck-fehlt',
    label: 'Welcher Ausdruck fehlt?',
    purpose: 'Aktiviert den Chunk als Ganzes.',
    recommendedFor: ['kollokation', 'sprechakt'],
    build: (lexeme) => `Ergänzt: ${gapText(firstFilled(lexeme.modelUtterance, lexeme.expression))}`,
  },
  {
    id: 'sprechhandlung',
    label: 'Einladung, Information, Zustimmung oder Ablehnung?',
    purpose: 'Fokussiert die illokutive Funktion statt der Wortbedeutung.',
    recommendedFor: ['sprechakt'],
    build: (lexeme) =>
      `Ist „${firstFilled(lexeme.modelUtterance, lexeme.expression)}“ eine Einladung, eine Information, eine Zustimmung oder eine Ablehnung?`,
  },
  {
    id: 'reaktion-formulieren',
    label: 'Formuliere eine passende Reaktion.',
    purpose: 'Erster produktiver Schritt in einem sicheren Rahmen.',
    recommendedFor: ['sprechakt', 'kollokation'],
    build: (lexeme) => `Antwortet auf: „${firstFilled(lexeme.modelUtterance, lexeme.expression)}“`,
  },
  {
    id: 'einheit-verwenden',
    label: 'Verwende die Einheit in der dargestellten Situation.',
    purpose: 'Überführt die Einheit in eigenes Sprachhandeln.',
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

export function recommendedChecks(type: LexicalType): CheckTemplate[] {
  return CHECK_TEMPLATES.filter((template) => template.recommendedFor?.includes(type));
}
