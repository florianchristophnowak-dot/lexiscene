/**
 * Catalogue Español – noch unvollständig.
 *
 * Solange nicht alle Schlüssel aus `de.ts` belegt sind, wird diese Sprache
 * nicht als Bediensprache angeboten: Eine halb übersetzte Oberfläche wäre
 * schlechter als eine konsequent deutsche oder französische. Fehlende
 * Schlüssel nennt `missingKeys('es')`.
 */
import type { Catalogue } from './de';

export const es: Partial<Catalogue> = {
  'app.tagline': 'Dirección de la semantización para la introducción del léxico',
  'nav.home': 'Inicio',
  'nav.prepare': 'Preparar',
  'nav.reactivate': 'Reactivar',
  'nav.data': 'Datos',
  'nav.help': 'Ayuda',
};
