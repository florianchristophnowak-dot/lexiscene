import { describe, expect, it } from 'vitest';
import { parseHash, toHash, type Route } from './router';

describe('Router', () => {
  it('erkennt alle Bereiche', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/vorbereiten')).toEqual({ name: 'prepare', sequenceId: undefined });
    expect(parseHash('#/vorbereiten/seq_1')).toEqual({ name: 'prepare', sequenceId: 'seq_1' });
    expect(parseHash('#/unterrichten/seq_1')).toEqual({ name: 'teach', sequenceId: 'seq_1' });
    expect(parseHash('#/reaktivieren')).toEqual({ name: 'reactivate', sequenceId: undefined });
    expect(parseHash('#/daten')).toEqual({ name: 'data' });
    expect(parseHash('#/hilfe')).toEqual({ name: 'help' });
  });

  it('führt unbekannte Adressen zur Startseite', () => {
    expect(parseHash('#/unbekannt')).toEqual({ name: 'home' });
    expect(parseHash('#/unterrichten')).toEqual({ name: 'home' });
  });

  it('bildet Adressen verlustfrei ab', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'prepare', sequenceId: 'seq_ä b' },
      { name: 'teach', sequenceId: 'seq_1' },
      { name: 'reactivate', sequenceId: 'seq_2' },
      { name: 'data' },
      { name: 'help' },
    ];
    for (const route of routes) expect(parseHash(toHash(route))).toEqual(route);
  });
});
