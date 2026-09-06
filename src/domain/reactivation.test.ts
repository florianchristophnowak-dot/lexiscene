import { describe, expect, it } from 'vitest';
import { createLexeme, createReactivationPlan, createSequence } from './schema';
import { DAY_MS, buildImpulses, completeRound, dueSequences, isSequenceDue, nextDueAt, summariseOutcomes, unsureCount } from './reactivation';
import { createObservation } from './observations';

const NOW = new Date('2026-05-04T09:00:00Z').getTime();

function planned(offsets: number[], anchorDaysAgo: number, completedRounds = 0) {
  return createSequence({
    title: 'Plan',
    reactivation: createReactivationPlan({
      enabled: true,
      offsetsDays: offsets,
      anchor: NOW - anchorDaysAgo * DAY_MS,
      completedRounds,
    }),
    lexemes: [
      createLexeme({
        expression: 'Ça te dit de… ?',
        coreMeaning: 'Hast du Lust?',
        observations: [createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })],
      }),
    ],
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
        observations: [createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })],
      }),
      createLexeme({
        expression: 'Pourquoi pas !',
        coreMeaning: 'Gerne!',
        observations: [createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })],
      }),
      createLexeme({
        expression: 'übersprungen',
        coreMeaning: 'x',
        skipped: true,
        observations: [createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })],
      }),
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

describe('Runden abschließen', () => {
  it('zählt die Runde erst mit dem Abschluss und schreibt den Verlauf fort', () => {
    const plan = createReactivationPlan({ enabled: true, offsetsDays: [1, 3], anchor: NOW });
    const updated = completeRound(
      plan,
      [
        { lexemeId: 'lex_1', kind: 'bedeutung-erinnern', dimension: 'meaning', result: 'secure' },
        { lexemeId: 'lex_2', kind: 'chunk-ergaenzen', dimension: 'pattern', result: 'not-yet' },
      ],
      NOW,
    );

    expect(plan.completedRounds).toBe(0);
    expect(updated.completedRounds).toBe(1);
    expect(updated.history).toEqual([{ round: 1, completedAt: NOW, secure: 1, supported: 0, notYet: 1 }]);
  });

  it('fasst Ergebnisse ohne Verrechnung zusammen', () => {
    expect(
      summariseOutcomes([
        { lexemeId: 'a', kind: 'bedeutung-erinnern', dimension: 'meaning', result: 'supported' },
        { lexemeId: 'b', kind: 'bedeutung-erinnern', dimension: 'meaning', result: 'supported' },
      ]),
    ).toEqual({ secure: 0, supported: 2, notYet: 0 });
  });
});

describe('Priorisierung', () => {
  const unsure = createLexeme({
    expression: 'On y va !',
    coreMeaning: 'Los!',
    observations: [createObservation({ dimension: 'meaning', result: 'not-yet', source: 'introduction' })],
  });
  const secure = createLexeme({
    expression: 'Pourquoi pas !',
    coreMeaning: 'Gerne!',
    observations: [createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })],
  });

  it('stellt unsichere Einheiten nach vorn, wenn die Sequenz das vorsieht', () => {
    const sequence = createSequence({ lexemes: [secure, unsure] });
    expect(buildImpulses(sequence)[0].lexemeId).toBe(unsure.id);
    expect(unsureCount(sequence)).toBe(1);
  });

  it('behält die Reihenfolge bei abgeschalteter Priorisierung', () => {
    const sequence = createSequence({
      lexemes: [secure, unsure],
      reactivation: createReactivationPlan({ prioritiseUnsure: false }),
    });
    expect(buildImpulses(sequence)[0].lexemeId).toBe(secure.id);
  });
});
