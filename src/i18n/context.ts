/** Kontext der Bediensprache – getrennt vom Provider, damit Fast Refresh sauber arbeitet. */
import { createContext, useContext, useMemo } from 'react';
import { promptFor, type PromptParams } from './prompts';
import { idTranslatorFor, translatorFor, type TranslateFn, type TranslateIdFn } from './index';

export interface I18nValue {
  /** Wirksame Bediensprache der Lehrkraftoberfläche. */
  locale: string;
  t: TranslateFn;
  /** Auflösung dynamischer Kennungen, z. B. `tid('step', step.id)`. */
  tid: TranslateIdFn;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  // Ohne Provider bleibt die Oberfläche bedienbar – in der Grundsprache.
  return value ?? { locale: 'de', t: translatorFor('de'), tid: idTranslatorFor('de') };
}

export function useT(): TranslateFn {
  return useI18n().t;
}

export function useTid(): TranslateIdFn {
  return useI18n().tid;
}

export function useLocale(): string {
  return useI18n().locale;
}

/** Auflösung zielsprachlicher Impulse für die Klasse. */
export type PhraseFn = (key: string, params?: PromptParams) => string;

/**
 * Zielsprachliche Bausteine einer Sequenz. Sie folgen der `targetLanguage`,
 * nicht der Bediensprache – die Klasse hört und liest die Zielsprache.
 */
export function usePhrase(targetLanguage: string): PhraseFn {
  return useMemo(() => (key: string, params?: PromptParams) => promptFor(targetLanguage, key, params), [targetLanguage]);
}
