/**
 * Catalogue Русский – noch unvollständig.
 *
 * Solange nicht alle Schlüssel aus `de.ts` belegt sind, wird diese Sprache
 * nicht als Bediensprache angeboten: Eine halb übersetzte Oberfläche wäre
 * schlechter als eine konsequent deutsche oder französische. Fehlende
 * Schlüssel nennt `missingKeys('ru')`.
 */
import type { Catalogue } from './de';

export const ru: Partial<Catalogue> = {
  'app.tagline': 'Режиссура семантизации при введении лексики',
  'nav.home': 'Начало',
  'nav.prepare': 'Подготовка',
  'nav.reactivate': 'Повторение',
  'nav.data': 'Данные',
  'nav.help': 'Справка',
};
