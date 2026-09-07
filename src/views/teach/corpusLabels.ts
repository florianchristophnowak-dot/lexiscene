/** Kleine Helfer für die Beschriftung der Korpusminiatur. */
import type { CorpusMiniature } from '../../domain/model';
import type { TranslateIdFn } from '../../i18n';

/** Herkunftszeile für die Lehrkraft – erscheint nie in der Projektion. */
export function corpusProvenanceLabel(tid: TranslateIdFn, miniature: CorpusMiniature): string {
  if (!miniature.enabled) return '';
  const provenance = tid('corpus.provenance', miniature.provenance);
  const source = miniature.sourceNote.trim();
  return source ? `${provenance} · ${source}` : provenance;
}
