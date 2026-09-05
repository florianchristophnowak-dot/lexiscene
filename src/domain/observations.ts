/**
 * Beobachtungen der Lerngruppe.
 *
 * Statt eines linearen Status hält LexiScène einzelne Ereignisse fest: wann
 * wurde in welcher Wissensdimension was beobachtet. Daraus wird bewusst kein
 * Punktwert, keine Note und kein Gesamtlernstand berechnet.
 */
import type {
  Lexeme,
  LexemeObservation,
  ObservationDimension,
  ObservationResult,
  ObservationSource,
} from './model';
import { OBSERVATION_DIMENSIONS } from './model';

export interface ObservationInput {
  dimension: ObservationDimension | null;
  result: ObservationResult | null;
  source: ObservationSource;
  at?: number;
  impulseKind?: string;
  round?: number;
}

let counter = 0;

export function createObservation(input: ObservationInput): LexemeObservation {
  counter += 1;
  const at = input.at ?? Date.now();
  return {
    id: `obs_${at.toString(36)}_${counter.toString(36)}`,
    at,
    dimension: input.dimension,
    result: input.result,
    source: input.source,
    ...(input.impulseKind ? { impulseKind: input.impulseKind } : {}),
    ...(typeof input.round === 'number' ? { round: input.round } : {}),
  };
}

/** Jüngste Beobachtung einer Dimension. */
export function latestObservation(
  observations: LexemeObservation[],
  dimension: ObservationDimension,
): LexemeObservation | undefined {
  return observations
    .filter((entry) => entry.dimension === dimension && entry.result)
    .sort((a, b) => b.at - a.at)[0];
}

export interface DimensionSummary {
  dimension: ObservationDimension;
  label: string;
  result: ObservationResult | null;
  at: number | null;
  count: number;
}

/** Kompakte Übersicht der vier Dimensionen – ohne Verrechnung. */
export function summarizeObservations(observations: LexemeObservation[]): DimensionSummary[] {
  return OBSERVATION_DIMENSIONS.map((entry) => {
    const latest = latestObservation(observations, entry.id);
    const count = observations.filter((observation) => observation.dimension === entry.id && observation.result).length;
    return {
      dimension: entry.id,
      label: entry.label,
      result: latest?.result ?? null,
      at: latest?.at ?? null,
      count,
    };
  });
}

/** Wurde die Einheit im Unterricht überhaupt schon behandelt? */
export function hasBeenIntroduced(lexeme: Lexeme): boolean {
  return lexeme.observations.length > 0;
}

/** Zuletzt „mit Hilfe“ oder „noch nicht“ – Grundlage der Priorisierung. */
export function needsPractice(lexeme: Lexeme): boolean {
  return summarizeObservations(lexeme.observations).some(
    (entry) => entry.result === 'supported' || entry.result === 'not-yet',
  );
}

/** Ereignisse aus Reaktivierungen – ohne Kompetenzaussage. */
export function reactivationTouchCount(lexeme: Lexeme): number {
  return lexeme.observations.filter((entry) => entry.source === 'reactivation').length;
}

/* ------------------------------------------------------------- Migration */

/** Zuordnung des früheren linearen Klassenstatus (Schema 1). */
const LEGACY_STATUS_MAP: Record<string, { dimension: ObservationDimension | null; result: ObservationResult | null; source: ObservationSource }> = {
  begegnet: { dimension: null, result: null, source: 'introduction' },
  'bedeutung-erkannt': { dimension: 'meaning', result: 'supported', source: 'introduction' },
  'bedeutung-erinnert': { dimension: 'meaning', result: 'secure', source: 'introduction' },
  'form-abgerufen': { dimension: 'form', result: 'secure', source: 'introduction' },
  'im-muster-verwendet': { dimension: 'pattern', result: 'secure', source: 'introduction' },
  'kommunikativ-eingesetzt': { dimension: 'use', result: 'secure', source: 'introduction' },
  // Reaktivierung ist ein Ereignis, aus dem keine Kompetenz abgeleitet wird.
  reaktiviert: { dimension: null, result: null, source: 'reactivation' },
};

export function migrateLegacyStatus(status: unknown, at: unknown): LexemeObservation[] {
  if (typeof status !== 'string') return [];
  const mapped = LEGACY_STATUS_MAP[status];
  if (!mapped) return [];
  const timestamp = typeof at === 'number' && Number.isFinite(at) ? at : Date.now();
  return [createObservation({ ...mapped, at: timestamp })];
}
