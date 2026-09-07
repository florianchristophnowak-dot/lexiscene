import { useMemo, type ReactNode } from 'react';
import { useStore } from '../app/storeContext';
import { idTranslatorFor, resolveUiLocale, translatorFor } from './index';
import { I18nContext, type I18nValue } from './context';

/**
 * Stellt die Bediensprache bereit.
 *
 * „Der Sprache der aktuellen Sequenz folgen“ richtet sich nach der zuletzt
 * geöffneten Sequenz und greift nur, wenn deren Zielsprache vollständig
 * übersetzt ist.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const { uiLanguage, lastSequenceId } = state.settings;

  const sequenceLanguage = useMemo(
    () => state.sequences.find((sequence) => sequence.id === lastSequenceId)?.targetLanguage,
    [lastSequenceId, state.sequences],
  );

  const value = useMemo<I18nValue>(() => {
    const locale = resolveUiLocale(uiLanguage, sequenceLanguage);
    return { locale, t: translatorFor(locale), tid: idTranslatorFor(locale) };
  }, [sequenceLanguage, uiLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
