import { describe, expect, it } from 'vitest';
import { createLexeme } from './schema';
import {
  createObservation,
  latestObservation,
  migrateLegacyStatus,
  needsPractice,
  reactivationTouchCount,
  summarizeObservations,
} from './observations';

describe('Beobachtungen', () => {
  it('speichert Zeitpunkt, Dimension, Ergebnis und Quelle', () => {
    const observation = createObservation({
      dimension: 'form',
      result: 'supported',
      source: 'reactivation',
      impulseKind: 'chunk-ergaenzen',
      round: 2,
      at: 1_700_000_000_000,
    });

    expect(observation).toMatchObject({
      at: 1_700_000_000_000,
      dimension: 'form',
      result: 'supported',
      source: 'reactivation',
      impulseKind: 'chunk-ergaenzen',
      round: 2,
    });
    expect(observation.id).toMatch(/^obs_/);
  });

  it('führt je Dimension die jüngste Beobachtung', () => {
    const observations = [
      createObservation({ dimension: 'meaning', result: 'not-yet', source: 'introduction', at: 1000 }),
      createObservation({ dimension: 'meaning', result: 'secure', source: 'reactivation', at: 2000 }),
      createObservation({ dimension: 'form', result: 'supported', source: 'introduction', at: 1500 }),
    ];

    expect(latestObservation(observations, 'meaning')?.result).toBe('secure');
    const summary = summarizeObservations(observations);
    expect(summary.map((entry) => entry.result)).toEqual(['secure', 'supported', null, null]);
    expect(summary[0].count).toBe(2);
  });

  it('überschreibt einen erreichten Stand nicht durch ein Reaktivierungsereignis', () => {
    const observations = [
      createObservation({ dimension: 'use', result: 'secure', source: 'introduction', at: 1000 }),
      // Ereignis ohne Kompetenzaussage
      createObservation({ dimension: null, result: null, source: 'reactivation', at: 2000 }),
    ];

    expect(latestObservation(observations, 'use')?.result).toBe('secure');
    expect(summarizeObservations(observations)[3].result).toBe('secure');
    expect(reactivationTouchCount({ ...createLexeme({ expression: 'x' }), observations })).toBe(1);
  });

  it('erkennt Übungsbedarf ohne Punktwert', () => {
    const secure = createLexeme({
      expression: 'a',
      observations: [createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })],
    });
    const unsure = createLexeme({
      expression: 'b',
      observations: [createObservation({ dimension: 'pattern', result: 'not-yet', source: 'introduction' })],
    });

    expect(needsPractice(secure)).toBe(false);
    expect(needsPractice(unsure)).toBe(true);
  });
});

describe('Migration des alten Status', () => {
  it('bildet jede frühere Stufe ab', () => {
    expect(migrateLegacyStatus('bedeutung-erkannt', 1000)[0]).toMatchObject({ dimension: 'meaning', result: 'supported' });
    expect(migrateLegacyStatus('bedeutung-erinnert', 1000)[0]).toMatchObject({ dimension: 'meaning', result: 'secure' });
    expect(migrateLegacyStatus('form-abgerufen', 1000)[0]).toMatchObject({ dimension: 'form', result: 'secure' });
    expect(migrateLegacyStatus('im-muster-verwendet', 1000)[0]).toMatchObject({ dimension: 'pattern', result: 'secure' });
    expect(migrateLegacyStatus('kommunikativ-eingesetzt', 1000)[0]).toMatchObject({ dimension: 'use', result: 'secure' });
  });

  it('macht aus „begegnet“ und „reaktiviert“ Ereignisse ohne Kompetenzaussage', () => {
    expect(migrateLegacyStatus('begegnet', 1000)[0]).toMatchObject({ dimension: null, result: null, source: 'introduction' });
    expect(migrateLegacyStatus('reaktiviert', 1000)[0]).toMatchObject({ dimension: null, result: null, source: 'reactivation' });
  });

  it('ignoriert unbekannte Werte', () => {
    expect(migrateLegacyStatus('erfunden', 1000)).toEqual([]);
    expect(migrateLegacyStatus(undefined, undefined)).toEqual([]);
  });
});
