import { describe, expect, it } from 'vitest';
import { createLexeme, createSequence } from './schema';
import { DAY_MS, buildImpulses, dueSequences, isSequenceDue, nextDueAt } from './reactivation';

const NOW = new Date('2026-05-04T09:00:00Z').getTime();

function planned(offsets: number[], anchorDaysAgo: number, completedRounds = 0) {
  return createSequence({
    title: 'Plan',
    reactivation: { enabled: true, offsetsDays: offsets, anchor: NOW - anchorDaysAgo * DAY_MS, completedRounds },
    lexemes: [createLexeme({ expression: 'Ça te dit de… ?', coreMeaning: 'Hast du Lust?', status: 'begegnet' })],
  });
}

describe('nextDueAt', () => {
  it('ergibt ohne Planung nichts', () => {
    expect(nextDueAt(createSequence())).toBeNull();
  });

  it('rechnet den Abstand der offenen Runde ab dem Startpunkt', () => {
    const sequence = planned([1, 3, 7], 2);
    expect(nextDueAt(sequence)).toBe(NOW - 2 * DAY_MS + 1 * DAY_MS);
    expect(isSequenceDue(sequence, NOW)).toBe(true);
  });

  it('ist nach der letzten Runde abgeschlossen', () => {
    expect(nextDueAt(planned([1, 3], 10, 2))).toBeNull();
  });

  it('ist vor dem Termin nicht fällig', () => {
    expect(isSequenceDue(planned([7], 1), NOW)).toBe(false);
  });
});

describe('dueSequences', () => {
  it('liefert nur fällige, nicht archivierte Sequenzen – zeitlich sortiert', () => {
    const early = planned([1], 9);
    const late = planned([1], 2);
    const future = planned([30], 1);
    const archived = createSequence({ ...planned([1], 5), archived: true });
    const due = dueSequences([future, late, early, archived], NOW);
    expect(due.map((entry) => entry.sequence.id)).toEqual([early.id, late.id]);
  });
});

describe('buildImpulses', () => {
  const sequence = createSequence({
    topic: 'Freizeit',
    lexemes: [
      createLexeme({
        expression: 'Ça te dit de… ?',
        coreMeaning: 'Hast du Lust?',
        modelUtterance: 'Ça te dit d’aller au cinéma ?',
        situation: 'Zwei Jugendliche verabreden sich.',
        status: 'begegnet',
      }),
      createLexeme({ expression: 'Pourquoi pas !', coreMeaning: 'Gerne!', status: 'begegnet' }),
      createLexeme({ expression: 'übersprungen', coreMeaning: 'x', skipped: true, status: 'begegnet' }),
    ],
  });

  it('überspringt deaktivierte Einheiten', () => {
    const impulses = buildImpulses(sequence);
    expect(impulses).toHaveLength(2);
    expect(impulses.map((impulse) => impulse.prompt.includes('übersprungen'))).toEqual([false, false]);
  });

  it('ist deterministisch und wechselt die Impulsart je Runde', () => {
    const first = buildImpulses(sequence, { round: 0 });
    expect(buildImpulses(sequence, { round: 0 })).toEqual(first);
    const second = buildImpulses(sequence, { round: 1 });
    expect(second[0].kind).not.toBe(first[0].kind);
  });

  it('liefert zu jeder Bedeutungsfrage die Lösung mit', () => {
    const impulse = buildImpulses(sequence, { round: 0 }).find((entry) => entry.kind === 'bedeutung-erinnern');
    expect(impulse?.solution).toBe('Hast du Lust?');
  });

  it('begrenzt die Anzahl auf Wunsch', () => {
    expect(buildImpulses(sequence, { limit: 1 })).toHaveLength(1);
  });
});
