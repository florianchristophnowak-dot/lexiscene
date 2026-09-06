/**
 * Catalogue Italiano – noch unvollständig.
 *
 * Solange nicht alle Schlüssel aus `de.ts` belegt sind, wird diese Sprache
 * nicht als Bediensprache angeboten: Eine halb übersetzte Oberfläche wäre
 * schlechter als eine konsequent deutsche oder französische. Fehlende
 * Schlüssel nennt `missingKeys('it')`.
 */
import type { Catalogue } from './de';

export const it: Partial<Catalogue> = {
  'app.tagline': 'Regia della semantizzazione per l’introduzione del lessico',
  'nav.home': 'Inizio',
  'nav.prepare': 'Preparare',
  'nav.reactivate': 'Riattivare',
  'nav.data': 'Dati',
  'nav.help': 'Aiuto',
};
