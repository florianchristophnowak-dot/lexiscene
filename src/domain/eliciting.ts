/**
 * Bedeutung herauslocken (Eliciting).
 *
 * Die Bedeutung wird nach Möglichkeit nicht erklärt, sondern aus einer Situation
 * erschlossen. Welche Technik trägt, hängt vom Wort ab: Sichtbares zeigt man,
 * Abstraktes braucht einen vorbereiteten Kontext.
 *
 * Dieses Modul liefert nur Kennungen und Empfehlungen. Bezeichnung, Eignung und
 * Hinweise stehen im Sprachkatalog unter `eliciting.technique.<id>` und
 * `eliciting.technique.<id>.fits`. Es wird nichts automatisch ausgewählt – die
 * Entscheidung trifft die Lehrkraft.
 */
import type { AdvisorContext } from './advisor';
import type { Lexeme } from './model';

export type ElicitingTechniqueId =
  | 'mimik'
  | 'bild'
  | 'zeichnung'
  | 'realie'
  | 'pantomime'
  | 'synonym'
  | 'antonym'
  | 'beispiele'
  | 'kontext'
  | 'definition';

export interface ElicitingTechnique {
  id: ElicitingTechniqueId;
  /**
   * Wie viel Lehrersprache die Technik üblicherweise braucht. Techniken mit
   * `knapp` sind im Zweifel vorzuziehen: Eliciting soll schnell sein.
   */
  talk: 'knapp' | 'mittel' | 'viel';
  /** Höhere Werte erscheinen in den Empfehlungen weiter oben. */
  weight: number;
  fits: (context: AdvisorContext) => boolean;
}

const CONCRETE = ['gegenstand', 'handlung', 'eigenschaft'];

/**
 * Die zehn Techniken in der Reihenfolge, in der sie in der Vorbereitung
 * angeboten werden: zuerst das Zeigen, zuletzt das Erklären.
 */
export const ELICITING_TECHNIQUES: readonly ElicitingTechnique[] = [
  {
    id: 'mimik',
    talk: 'knapp',
    weight: 88,
    fits: (context) => context.lexicalType === 'handlung' || context.lexicalType === 'gefuehl',
  },
  {
    id: 'bild',
    talk: 'knapp',
    weight: 95,
    fits: (context) => context.imageability === 'hoch',
  },
  {
    id: 'zeichnung',
    talk: 'knapp',
    weight: 70,
    fits: (context) => context.imageability !== 'gering',
  },
  {
    id: 'realie',
    talk: 'knapp',
    weight: 92,
    fits: (context) => context.lexicalType === 'gegenstand' && context.imageability === 'hoch',
  },
  {
    id: 'pantomime',
    talk: 'knapp',
    weight: 80,
    fits: (context) => CONCRETE.includes(context.lexicalType) && context.imageability !== 'gering',
  },
  {
    id: 'synonym',
    talk: 'knapp',
    weight: 60,
    fits: (context) => context.level !== 'anfaenger',
  },
  {
    id: 'antonym',
    talk: 'knapp',
    weight: 75,
    fits: (context) => context.lexicalType === 'eigenschaft' || context.lexicalType === 'gefuehl',
  },
  {
    id: 'beispiele',
    talk: 'mittel',
    weight: 65,
    fits: (context) => context.lexicalType === 'abstrakt' || context.lexicalType === 'gegenstand',
  },
  {
    id: 'kontext',
    talk: 'mittel',
    weight: 90,
    fits: (context) =>
      context.imageability !== 'hoch' ||
      ['abstrakt', 'sprechakt', 'polysem', 'kollokation'].includes(context.lexicalType),
  },
  {
    id: 'definition',
    talk: 'viel',
    weight: 40,
    /*
     * Eine Definition braucht Sprache, die erst vorhanden sein muss. Für
     * Anfängerinnen und Anfänger trägt der vorbereitete Kontext weiter.
     */
    fits: (context) =>
      context.level !== 'anfaenger' && (context.level === 'fortgeschritten' || context.imageability === 'gering'),
  },
];

export const ELICITING_TECHNIQUE_IDS: readonly ElicitingTechniqueId[] = ELICITING_TECHNIQUES.map(
  (technique) => technique.id,
);

export function elicitingTechnique(id: string): ElicitingTechnique | undefined {
  return ELICITING_TECHNIQUES.find((technique) => technique.id === id);
}

export function isElicitingTechniqueId(id: string): boolean {
  return ELICITING_TECHNIQUE_IDS.includes(id as ElicitingTechniqueId);
}

/** Nur bekannte Kennungen, ohne Dopplungen, in der Reihenfolge des Katalogs. */
export function normalizeTechniques(raw: unknown): ElicitingTechniqueId[] {
  const chosen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const entry of raw) if (typeof entry === 'string' && isElicitingTechniqueId(entry)) chosen.add(entry);
  }
  return ELICITING_TECHNIQUE_IDS.filter((id) => chosen.has(id));
}

const MAX_RECOMMENDATIONS = 4;

/**
 * Vorschläge zum Profil der Einheit – höchstens vier, damit die Auswahl eine
 * Entscheidung bleibt und keine Liste zum Abarbeiten wird.
 */
export function recommendElicitingTechniques(context: AdvisorContext): ElicitingTechniqueId[] {
  return ELICITING_TECHNIQUES.filter((technique) => technique.fits(context))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_RECOMMENDATIONS)
    .map((technique) => technique.id);
}

export interface ElicitingWarning {
  id: string;
  /** Schlüssel im Sprachkatalog. */
  key: string;
}

/** Ab hier gilt der vorbereitete Kontext als zu lang für ein zügiges Eliciting. */
export const ELICITING_CONTEXT_LIMIT = 220;

/**
 * Dezente Hinweise zur Planung. Sie blockieren nichts und bewerten keine
 * Inhalte – geprüft wird nur, was eingetragen wurde.
 */
export function elicitingWarnings(lexeme: Lexeme): ElicitingWarning[] {
  const warnings: ElicitingWarning[] = [];
  const techniques = normalizeTechniques(lexeme.elicitingTechniques);

  if (techniques.length === 0) {
    warnings.push({ id: 'keine-technik', key: 'eliciting.warning.none' });
  }

  if (lexeme.elicitingContext.trim().length > ELICITING_CONTEXT_LIMIT) {
    warnings.push({ id: 'lange-lehrersprache', key: 'eliciting.warning.long' });
  }

  // Ein gut zeigbares Wort zuerst zu definieren, kostet unnötig Lehrersprache.
  if (lexeme.imageability === 'hoch' && techniques.length > 0 && techniques.every((id) => id === 'definition')) {
    warnings.push({ id: 'zeigen-vor-erklaeren', key: 'eliciting.warning.visualFirst' });
  }

  // Zum Erschließen aus dem Kontext gehört ein Kontext.
  if (techniques.includes('kontext') && !lexeme.elicitingContext.trim() && !lexeme.situation.trim()) {
    warnings.push({ id: 'kontext-fehlt', key: 'eliciting.warning.contextMissing' });
  }

  return warnings;
}
