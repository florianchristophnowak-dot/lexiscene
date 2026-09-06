/**
 * Catalogue English – noch unvollständig.
 *
 * Solange nicht alle Schlüssel aus `de.ts` belegt sind, wird diese Sprache
 * nicht als Bediensprache angeboten: Eine halb übersetzte Oberfläche wäre
 * schlechter als eine konsequent deutsche oder französische. Fehlende
 * Schlüssel nennt `missingKeys('en')`.
 */
import type { Catalogue } from './de';

export const en: Partial<Catalogue> = {
  'app.tagline': 'Semantisation direction for vocabulary introduction',
  'nav.home': 'Home',
  'nav.prepare': 'Prepare',
  'nav.reactivate': 'Reactivate',
  'nav.data': 'Data',
  'nav.help': 'Help',
};
