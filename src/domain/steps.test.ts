import { describe, expect, it } from 'vitest';
import { createLexeme, createSequence } from './schema';
import { de } from '../i18n/de';
import {
  PHASES,
  PHASE_VISIBILITY,
  STEPS,
  STEP_IDS,
  defaultVisibility,
  inferenceAvailable,
  isStepEnabled,
  moveStep,
  normalizeStepOrder,
  resolvePhases,
  resolveSteps,
  stepDimension,
  stepHasContent,
  stepInvitesFeedback,
  stepPhase,
  stepsOfPhase,
  visibilityLabel,
} from './steps';

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
    inferenceSuitability: 'geeignet',
  });

describe('Phasen', () => {
  it('gliedert die Dramaturgie in sechs Phasen', () => {
    expect(PHASES.map((phase) => phase.id)).toEqual([
      'kontext',
      'klarheit',
      'muster',
      'abruf',
      'gebrauch',
      'wiederbegegnung',
    ]);
    expect(PHASES.map((phase) => phase.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('ordnet jeden Schritt genau einer Phase zu', () => {
    expect(stepsOfPhase('kontext').map((step) => step.id)).toEqual(['situation', 'impuls']);
    expect(stepsOfPhase('klarheit').map((step) => step.id)).toEqual(['vermuten', 'klaeren', 'ccq']);
    expect(stepsOfPhase('muster').map((step) => step.id)).toEqual([
      'wort-elizitieren',
      'audio',
      'form',
      'fokus',
      'chunk',
      'korpusminiatur',
    ]);
    expect(stepsOfPhase('abruf').map((step) => step.id)).toEqual([
      'kontrolle',
      'hilfen-ausblenden',
      'abruf',
      'wiederholung',
    ]);
    expect(stepsOfPhase('gebrauch').map((step) => step.id)).toEqual(['aufgabe']);
    // Die Wiederbegegnung ist keine Station im Unterrichtsmodus, sondern der Reaktivierungsbereich.
    expect(stepsOfPhase('wiederbegegnung')).toEqual([]);
    expect(STEPS.every((step) => stepPhase(step.id))).toBe(true);
  });

  it('nennt zu jeder Einheit die vorkommenden Phasen', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme] });
    expect(resolvePhases(sequence, lexeme).map((phase) => phase.id)).toEqual([
      'kontext',
      'klarheit',
      'muster',
      'abruf',
      'gebrauch',
    ]);
  });
});

describe('Erschließen ist kein Pflichtschritt', () => {
  it('bietet Erschließen ohne tragfähigen Kontext nicht an', () => {
    const lexeme = createLexeme({ expression: 'x', coreMeaning: 'y' });
    expect(stepHasContent('vermuten', lexeme)).toBe(false);
    expect(inferenceAvailable(lexeme)).toBe(false);
  });

  it('lässt Erschließen aus, wenn die Sequenz es abschaltet', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme], inferenceMode: 'off' });
    expect(inferenceAvailable(lexeme, sequence)).toBe(false);
    expect(resolveSteps(sequence, lexeme).map((step) => step.id)).not.toContain('vermuten');
  });

  it('bietet es bei „wo es sich anbietet“ nur für geeignete Einheiten an', () => {
    const sequence = createSequence({ inferenceMode: 'optional' });
    const suited = createLexeme({ ...fullLexeme(), inferenceSuitability: 'geeignet' });
    const unsuited = createLexeme({ ...fullLexeme(), inferenceSuitability: 'ungeeignet' });
    expect(inferenceAvailable(suited, sequence)).toBe(true);
    expect(inferenceAvailable(unsuited, sequence)).toBe(false);
  });

  it('bietet es beim Strategietraining auch für ungeeignete Einheiten an – mit Kontext', () => {
    const sequence = createSequence({ inferenceMode: 'planned' });
    const unsuited = createLexeme({ ...fullLexeme(), inferenceSuitability: 'ungeeignet' });
    expect(inferenceAvailable(unsuited, sequence)).toBe(true);
    expect(inferenceAvailable(createLexeme({ expression: 'x' }), sequence)).toBe(false);
  });
});

describe('stepHasContent', () => {
  it('erkennt fehlendes Material', () => {
    const empty = createLexeme({ expression: 'x' });
    expect(stepHasContent('situation', empty)).toBe(false);
    expect(stepHasContent('klaeren', empty)).toBe(false);
    expect(stepHasContent('kontrolle', empty)).toBe(false);
    expect(stepHasContent('form', empty)).toBe(true);
  });

  it('erkennt vorhandenes Material', () => {
    const lexeme = fullLexeme();
    expect(stepHasContent('situation', lexeme)).toBe(true);
    expect(stepHasContent('audio', lexeme)).toBe(true);
    expect(stepHasContent('kontrolle', lexeme)).toBe(true);
    expect(stepHasContent('aufgabe', lexeme)).toBe(true);
  });
});

describe('Standardreihenfolge', () => {
  it('führt sechzehn Schritte in der festgelegten Folge', () => {
    expect(STEP_IDS).toEqual([
      'situation',
      'impuls',
      'vermuten',
      'klaeren',
      'ccq',
      'wort-elizitieren',
      'audio',
      'form',
      'fokus',
      'chunk',
      'korpusminiatur',
      'kontrolle',
      'hilfen-ausblenden',
      'abruf',
      'wiederholung',
      'aufgabe',
    ]);
    expect(STEPS.map((step) => step.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
  });

  it('lockt das Wort erst nach der Bedeutungsprüfung heraus', () => {
    expect(STEP_IDS.indexOf('wort-elizitieren')).toBeGreaterThan(STEP_IDS.indexOf('ccq'));
    expect(STEP_IDS.indexOf('wort-elizitieren')).toBeLessThan(STEP_IDS.indexOf('form'));
  });

  it('schaltet nur die Korpusminiatur ab, nicht die Bedeutungsprüfung', () => {
    const steps = createSequence().steps;
    expect(steps.ccq).toBe(true);
    expect(steps.korpusminiatur).toBe(false);
  });
});

describe('resolveSteps', () => {
  it('folgt der Standardreihenfolge entlang der Phasen', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme] });
    expect(resolveSteps(sequence, lexeme).map((step) => step.id)).toEqual([
      'situation',
      'impuls',
      'vermuten',
      'klaeren',
      'wort-elizitieren',
      'audio',
      'form',
      'fokus',
      'kontrolle',
      'hilfen-ausblenden',
      'abruf',
      'aufgabe',
    ]);
  });

  it('lässt den leeren CCQ-Schritt automatisch aus', () => {
    const lexeme = fullLexeme();
    const sequence = createSequence({ lexemes: [lexeme] });
    // Ohne Frage entfällt er wie jeder andere Schritt ohne Material.
    expect(resolveSteps(sequence, lexeme).map((step) => step.id)).not.toContain('ccq');
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

describe('Rückmeldung und Dimension', () => {
  it('ordnet jedem Schritt eine Wissensdimension zu', () => {
    expect(stepDimension('klaeren')).toBe('meaning');
    expect(stepDimension('form')).toBe('form');
    expect(stepDimension('fokus')).toBe('pattern');
    expect(stepDimension('aufgabe')).toBe('use');
  });

  it('richtet sich bei der Kontrolle nach der gewählten Vorlage', () => {
    expect(stepDimension('kontrolle', createLexeme({ checkTemplateId: 'welcher-ausdruck-fehlt' }))).toBe('pattern');
    expect(stepDimension('kontrolle', createLexeme({ checkTemplateId: 'welches-bild' }))).toBe('meaning');
  });

  it('lädt nur in Abruf- und Gebrauchsschritten zur Rückmeldung ein', () => {
    expect(stepInvitesFeedback('kontrolle')).toBe(true);
    expect(stepInvitesFeedback('abruf')).toBe(true);
    expect(stepInvitesFeedback('aufgabe')).toBe(true);
    expect(stepInvitesFeedback('situation')).toBe(false);
  });
});

describe('Sichtbarkeitsprofile der Phasen', () => {
  it('leitet die Standardsichtbarkeit aus der Phase ab', () => {
    expect(defaultVisibility('klaeren')).toEqual(PHASE_VISIBILITY.klarheit);
    expect(defaultVisibility('form')).toEqual(PHASE_VISIBILITY.muster);
    expect(defaultVisibility('kontrolle')).toEqual(PHASE_VISIBILITY.abruf);
    expect(defaultVisibility('aufgabe')).toEqual(PHASE_VISIBILITY.gebrauch);
  });

  it('lässt begründete Abweichungen einzelner Schritte zu', () => {
    // Erst vermuten, dann klären.
    expect(defaultVisibility('vermuten').meaning).toBe(false);
    // Klangbild vor dem Schriftbild innerhalb der Phase „Muster“.
    expect(defaultVisibility('audio')).toMatchObject({ meaning: true, form: false });
    // Musteranker und Lautung im Vordergrund.
    expect(defaultVisibility('fokus')).toMatchObject({ meaning: false, form: true, support: true });
    // In der Korpusminiatur tragen die Belege.
    expect(defaultVisibility('korpusminiatur')).toEqual({ meaning: false, form: false, support: false });
  });

  it('beschreibt ein Profil in Worten', () => {
    const label = (prefix: string, id: string) => de[`${prefix}.${id}` as keyof typeof de] ?? id;
    expect(visibilityLabel(PHASE_VISIBILITY.kontext, label, 'nichts')).toBe('nichts');
    expect(visibilityLabel(PHASE_VISIBILITY.muster, label, 'nichts')).toBe('Bedeutung, Schriftbild');
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

describe('normalizeStepOrder', () => {
  it('ergänzt fehlende Schritte und verwirft Unbekanntes', () => {
    const order = normalizeStepOrder(['form', 'unsinn', 'situation', 'form']);
    // Die ausdrücklich genannten Schritte behalten ihre Reihenfolge zueinander.
    expect(order.indexOf('form')).toBeLessThan(order.indexOf('situation'));
    expect(order).toHaveLength(STEP_IDS.length);
    expect(new Set(order).size).toBe(STEP_IDS.length);
  });

  it('setzt einen neu hinzugekommenen Schritt an seine Standardposition', () => {
    // Reihenfolge einer älteren Datei, die den Schritt „Korpusminiatur“ nicht kennt.
    const legacy = STEP_IDS.filter((stepId) => stepId !== 'korpusminiatur');
    const order = normalizeStepOrder(legacy);
    expect(order).toEqual([...STEP_IDS]);
    expect(order[order.indexOf('korpusminiatur') - 1]).toBe('chunk');

    // Ebenso die Schritte aus Schema 5: Sie landen an ihrer Standardposition.
    const beforeFive = STEP_IDS.filter(
      (stepId) => !['wort-elizitieren', 'chunk', 'wiederholung'].includes(stepId),
    );
    const migrated = normalizeStepOrder(beforeFive);
    expect(migrated).toEqual([...STEP_IDS]);
    expect(migrated[migrated.indexOf('wort-elizitieren') - 1]).toBe('ccq');
    expect(migrated[migrated.indexOf('wiederholung') - 1]).toBe('abruf');
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
