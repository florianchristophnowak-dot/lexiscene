import { describe, expect, it } from 'vitest';
import { createLexeme, createSequence } from './schema';
import { STEPS, STEP_IDS, defaultVisibility, isStepEnabled, moveStep, normalizeStepOrder, resolveSteps, stepHasContent } from './steps';

const fullLexeme = () =>
  createLexeme({
    expression: 'Ça te dit de… ?',
    coreMeaning: 'Hast du Lust?',
    modelUtterance: 'Ça te dit d’aller au cinéma ?',
    situation: 'Zwei Jugendliche verabreden sich.',
    semantisationMethod: 'Mini-Dialog mit Reaktion',
    pronunciationHint: 'steigende Melodie',
    checkTemplateId: 'sprechhandlung',
    communicativeTask: 'Macht einen Vorschlag.',
  });

describe('stepHasContent', () => {
  it('erkennt fehlendes Material', () => {
    const empty = createLexeme({ expression: 'x' });
    expect(stepHasContent('situation', empty)).toBe(false);
    expect(stepHasContent('klaeren', empty)).toBe(false);
    expect(stepHasContent('kontrolle', empty)).toBe(false);
    expect(stepHasContent('form', empty)).toBe(true);
    expect(stepHasContent('vermuten', empty)).toBe(true);
  });

  it('erkennt vorhandenes Material', () => {
    const lexeme = fullLexeme();
    expect(stepHasContent('situation', lexeme)).toBe(true);
    expect(stepHasContent('audio', lexeme)).toBe(true);
    expect(stepHasContent('kontrolle', lexeme)).toBe(true);
    expect(stepHasContent('aufgabe', lexeme)).toBe(true);
  });
});

describe('resolveSteps', () => {
  it('liefert alle Schritte mit Material in fester Reihenfolge', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme] });
    const steps = resolveSteps(sequence, lexeme);
    expect(steps.map((step) => step.id)).toEqual([
      'situation',
      'impuls',
      'audio',
      'vermuten',
      'klaeren',
      'form',
      'fokus',
      'kontrolle',
      'hilfen-ausblenden',
      'abruf',
      'aufgabe',
    ]);
  });

  it('lässt auf Sequenzebene abgeschaltete Schritte aus', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme], steps: { ...createSequence().steps, audio: false } });
    expect(resolveSteps(sequence, lexeme).map((step) => step.id)).not.toContain('audio');
  });

  it('lässt die Einheit die Sequenzvorgabe überschreiben', () => {
    const lexeme = createLexeme({ ...fullLexeme(), stepOverrides: { audio: true } });
    const sequence = createSequence({ lexemes: [lexeme], steps: { ...createSequence().steps, audio: false } });
    expect(isStepEnabled(sequence, lexeme, 'audio')).toBe(true);
    expect(resolveSteps(sequence, lexeme).map((step) => step.id)).toContain('audio');
  });
});

describe('defaultVisibility', () => {
  it('zeigt zu Beginn weder Bedeutung noch Schriftbild', () => {
    expect(defaultVisibility('situation')).toEqual({ meaning: false, form: false, support: false });
    expect(defaultVisibility('vermuten')).toEqual({ meaning: false, form: false, support: false });
  });

  it('deckt Bedeutung vor der Form auf', () => {
    expect(defaultVisibility('klaeren')).toMatchObject({ meaning: true, form: false });
    expect(defaultVisibility('form')).toMatchObject({ meaning: true, form: true });
  });

  it('blendet beim Ausblendeschritt wieder alles aus', () => {
    expect(defaultVisibility('hilfen-ausblenden')).toEqual({ meaning: false, form: false, support: false });
  });
});

describe('STEPS', () => {
  it('nummeriert die Dramaturgie lückenlos von 1 bis 11', () => {
    expect(STEPS.map((step) => step.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(new Set(STEPS.map((step) => step.id)).size).toBe(11);
  });
});

describe('normalizeStepOrder', () => {
  it('ergänzt fehlende Schritte und verwirft Unbekanntes', () => {
    const order = normalizeStepOrder(['form', 'unsinn', 'situation', 'form']);
    expect(order.slice(0, 2)).toEqual(['form', 'situation']);
    expect(order).toHaveLength(11);
    expect(new Set(order).size).toBe(11);
  });

  it('liefert bei fehlender Angabe die Standardreihenfolge', () => {
    expect(normalizeStepOrder(undefined)).toEqual([...STEP_IDS]);
  });
});

describe('moveStep', () => {
  it('verschiebt einen Schritt an die Zielposition', () => {
    expect(moveStep(['a', 'b', 'c'] as never, 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('lässt ungültige Indizes unverändert', () => {
    const order = [...STEP_IDS];
    expect(moveStep(order, 99, 0)).toBe(order);
    expect(moveStep(order, 0, 99)).toEqual(moveStep(order, 0, order.length - 1));
  });
});

describe('Reihenfolge in resolveSteps', () => {
  it('folgt der Reihenfolge der Sequenz', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme], stepOrder: ['form', 'situation', ...STEP_IDS] });
    expect(resolveSteps(sequence, lexeme).slice(0, 2).map((step) => step.id)).toEqual(['form', 'situation']);
  });

  it('lässt die Einheit eine eigene Reihenfolge vorgeben', () => {
    const lexeme = createLexeme({ ...fullLexeme(), stepOrderOverride: ['aufgabe', 'form'] });
    const sequence = createSequence({ lexemes: [lexeme], stepOrder: ['situation', 'form'] });
    expect(resolveSteps(sequence, lexeme).slice(0, 2).map((step) => step.id)).toEqual(['aufgabe', 'form']);
  });

  it('behält die Standardreihenfolge, wenn nichts gesetzt ist', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme] });
    expect(resolveSteps(sequence, lexeme).map((step) => step.id)).toEqual([...STEP_IDS]);
  });
});
