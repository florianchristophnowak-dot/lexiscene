/**
 * Sprachkatalog und Auflösung.
 *
 * Deutsch ist die Quelle aller Schlüssel. Eine Sprache wird nur dann als
 * Bediensprache angeboten, wenn sie **alle** Schlüssel bedient – sonst entstünde
 * eine gemischtsprachige Oberfläche. Fehlt im Einzelfall doch ein Eintrag,
 * greift Deutsch; ein roher Schlüssel erscheint nie.
 */
import { de, type Catalogue, type TranslationKey } from './de';
import { fr } from './fr';
import { en } from './en';
import { es } from './es';
import { it } from './it';
import { ru } from './ru';

export type { Catalogue, TranslationKey };
export type TranslationParams = Record<string, string | number>;

/** Alle bekannten Kataloge – auch die unvollständigen. */
export const CATALOGUES: Record<string, Partial<Catalogue>> = { de, fr, en, es, it, ru };

export const BASE_LOCALE = 'de';

const ALL_KEYS = Object.keys(de) as TranslationKey[];

/** Schlüssel, die dieser Sprache fehlen (leer = vollständig). */
export function missingKeys(locale: string): TranslationKey[] {
  const catalogue = CATALOGUES[locale];
  if (!catalogue) return [...ALL_KEYS];
  return ALL_KEYS.filter((key) => !catalogue[key]?.trim());
}

export function isCompleteLocale(locale: string): boolean {
  return missingKeys(locale).length === 0;
}

/**
 * Sprachen, die als vollständige Lehrkraftoberfläche angeboten werden.
 * Die Reihenfolge ist stabil: Deutsch zuerst, danach alphabetisch.
 */
export const UI_LOCALES: readonly string[] = Object.keys(CATALOGUES)
  .filter(isCompleteLocale)
  .sort((a, b) => (a === BASE_LOCALE ? -1 : b === BASE_LOCALE ? 1 : a.localeCompare(b)));

/** Eigenbezeichnung der Bediensprachen – bewusst nicht übersetzt. */
export const LOCALE_NAMES: Record<string, string> = {
  de: 'Deutsch',
  fr: 'Français',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  ru: 'Русский',
};

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(locale: string, key: TranslationKey, params?: TranslationParams): string {
  const catalogue = CATALOGUES[locale];
  const template = catalogue?.[key] ?? de[key];
  return interpolate(template ?? key, params);
}

/** Wörterbuchfunktion, wie sie Komponenten verwenden. */
export type TranslateFn = (key: TranslationKey, params?: TranslationParams) => string;

export function translatorFor(locale: string): TranslateFn {
  return (key, params) => translate(locale, key, params);
}

/**
 * Auflösung eines Schlüssels aus Vorsilbe und Kennung – für Kennungen, die
 * erst zur Laufzeit feststehen (Sprachcodes, Schrittkennungen, Regel-Ids).
 * Unbekannte Kennungen liefern den Rückfalltext, nie den rohen Schlüssel.
 */
export type TranslateIdFn = (prefix: string, id: string, fallback?: string) => string;

export function idTranslatorFor(locale: string): TranslateIdFn {
  return (prefix, id, fallback) => {
    const key = `${prefix}.${id}` as TranslationKey;
    return de[key] === undefined ? (fallback ?? id) : translate(locale, key);
  };
}

/**
 * Wirksame Bediensprache: die ausdrückliche Wahl, sonst die Sprache der
 * aktuellen Sequenz – aber nur, wenn dafür eine vollständige Übersetzung
 * vorliegt. Andernfalls bleibt es bei der Grundsprache.
 */
export function resolveUiLocale(setting: string, sequenceLanguage?: string): string {
  if (setting === 'sequence') {
    return sequenceLanguage && isCompleteLocale(sequenceLanguage) ? sequenceLanguage : BASE_LOCALE;
  }
  return isCompleteLocale(setting) ? setting : BASE_LOCALE;
}
