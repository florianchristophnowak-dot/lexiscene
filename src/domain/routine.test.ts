import { describe, expect, it } from 'vitest';
import { DRILL_STAGES, drillItem, drillPromptKey, nextDrillStage, previousDrillStage } from './drill';
import { ANALYSIS_DIMENSIONS, analyseLexeme, analysisGaps } from './profile';
import { recapItems } from './recap';
import { buildStageView, wordCue } from './stage';
import { defaultVisibility, stepDefinition, stepHasContent } from './steps';
import { createLexeme, createSequence } from './schema';
import { promptFor } from '../i18n/prompts';
import { de } from '../i18n/de';
import type { Lexeme } from './model';

const step = (id: Parameters<typeof stepDefinition>[0]) => stepDefinition(id)!;

const stage = (lexeme: Lexeme, id: Parameters<typeof stepDefinition>[0], patch = {}) =>
  buildStageView({
    lexeme,
    step: step(id),
    visibility: defaultVisibility(id),
    releaseL1: false,
    showSolution: false,
    mode: 'reserve',
    audience: 'class',
    ...patch,
  });

describe('Wort herauslocken', () => {
  const lexeme = createLexeme({
    expression: 'tenir une promesse',
    coreMeaning: 'ein Versprechen halten',
    targetExplanation: 'On fait ce qu’on a dit.',
  });

  it('hält das Wort zurück, bis die Lehrkraft es zeigt', () => {
    expect(stage(lexeme, 'wort-elizitieren').expression).toBe('');
    expect(stage(lexeme, 'wort-elizitieren', { wordReveal: 'cue' }).expression).toBe('');
    expect(stage(lexeme, 'wort-elizitieren', { wordReveal: 'full' }).expression).toBe('tenir une promesse');
  });

  it('zeigt in der zweiten Stufe nur die Anlauthilfe', () => {
    const view = stage(lexeme, 'wort-elizitieren', { wordReveal: 'cue' });
    expect(view.wordCue).toBe('te…');
    expect(view.expression).toBe('');
    expect(stage(lexeme, 'wort-elizitieren').wordCue).toBe('');
  });

  it('nimmt die eigene Anlauthilfe der Lehrkraft', () => {
    const own = createLexeme({ ...lexeme, wordCue: 'te-nir …' });
    expect(wordCue(own)).toBe('te-nir …');
    expect(stage(own, 'wort-elizitieren', { wordReveal: 'cue' }).wordCue).toBe('te-nir …');
  });

  it('lässt das Schriftbild auch dann nicht durch, wenn es sonst sichtbar wäre', () => {
    const view = stage(lexeme, 'wort-elizitieren', {
      visibility: { meaning: true, form: true, support: true },
    });
    expect(view.expression).toBe('');
    expect(view.utterance).toBe('');
  });

  it('entfällt ohne Ausdruck', () => {
    expect(stepHasContent('wort-elizitieren', lexeme)).toBe(true);
    expect(stepHasContent('wort-elizitieren', createLexeme({ expression: '' }))).toBe(false);
  });
});

describe('Aussprache üben', () => {
  const lexeme = createLexeme({
    expression: 'une promesse',
    coreMeaning: 'ein Versprechen',
    keyCollocation: 'tenir une promesse',
    modelUtterance: 'Il tient toujours ses promesses.',
  });

  it('übt die ganze Wendung, nicht das Einzelwort', () => {
    expect(drillItem(lexeme)).toBe('tenir une promesse');
    expect(drillItem(createLexeme({ expression: 'promesse' }))).toBe('promesse');
  });

  it('führt fünf Stufen mit zielsprachlicher Anweisung', () => {
    expect(DRILL_STAGES).toEqual(['model', 'chorus', 'groups', 'individual', 'listen']);
    for (const entry of DRILL_STAGES) {
      expect(promptFor('fr', drillPromptKey(entry))).toBeTruthy();
      expect(de[`drill.stage.${entry}` as keyof typeof de]).toBeTruthy();
      expect(de[`drill.stage.${entry}.teacher` as keyof typeof de]).toBeTruthy();
    }
  });

  it('bleibt an den Enden stehen', () => {
    expect(previousDrillStage('model')).toBe('model');
    expect(nextDrillStage('listen')).toBe('listen');
    expect(nextDrillStage('model')).toBe('chorus');
  });

  it('zeigt die Wendung nur, solange die Aussprachearbeit läuft', () => {
    expect(stage(lexeme, 'fokus').drillItem).toBe('');
    expect(stage(lexeme, 'fokus', { drillStage: 'chorus' }).drillItem).toBe('tenir une promesse');
  });

  it('räumt die Bühne, damit die Wendung allein steht', () => {
    const running = stage(lexeme, 'fokus', {
      drillStage: 'chorus',
      visibility: { meaning: true, form: true, support: true },
    });
    expect(running.expression).toBe('');
    expect(running.utterance).toBe('');
    expect(running.supportLines).toEqual([]);
    expect(running.internalMeaning).toBe('');

    const paused = stage(lexeme, 'fokus', { visibility: { meaning: true, form: true, support: true } });
    expect(paused.expression).toBe('une promesse');
  });
});

describe('Kollokation ergänzen', () => {
  it('nimmt die zentrale Wendung, sonst die erste Kollokation', () => {
    const key = createLexeme({ expression: 'promesse', keyCollocation: 'tenir une promesse' });
    expect(stage(key, 'chunk').chunk).toBe('tenir une promesse');

    const list = createLexeme({ expression: 'promesse', collocations: 'faire une promesse\nrompre une promesse' });
    expect(stage(list, 'chunk').chunk).toBe('faire une promesse');
  });

  it('entfällt, solange keine Wendung hinterlegt ist', () => {
    expect(stepHasContent('chunk', createLexeme({ expression: 'promesse' }))).toBe(false);
    expect(stepHasContent('chunk', createLexeme({ expression: 'x', keyCollocation: 'y' }))).toBe(true);
  });
});

describe('Kumulative Wiederholung', () => {
  const sequence = () =>
    createSequence({
      lexemes: [
        createLexeme({ id: 'lex_1', expression: 'Ça te dit de… ?', keyCollocation: 'Ça te dit d’aller… ?' }),
        createLexeme({ id: 'lex_2', expression: 'Pourquoi pas !' }),
        createLexeme({ id: 'lex_3', expression: 'Je préfère…' }),
      ],
    });

  it('beginnt erst ab der zweiten Einheit', () => {
    const entries = sequence().lexemes;
    expect(recapItems(sequence(), entries[0])).toEqual([]);
    expect(recapItems(sequence(), entries[1]).map((item) => item.expression)).toEqual([
      'Ça te dit de… ?',
      'Pourquoi pas !',
    ]);
    expect(stepHasContent('wiederholung', entries[0], sequence())).toBe(false);
    expect(stepHasContent('wiederholung', entries[1], sequence())).toBe(true);
  });

  it('deckt für die Klasse nur auf, was aufgedeckt wurde', () => {
    const current = sequence();
    const view = stage(current.lexemes[2], 'wiederholung', {
      recap: recapItems(current, current.lexemes[2]),
      recapRevealed: 1,
    });
    expect(view.recap.map((line) => line.text)).toEqual(['Ça te dit de… ?', '', '']);
    expect(view.recap[0].chunk).toBe('Ça te dit d’aller… ?');
  });

  it('zeigt der Lehrkraft die ganze Liste', () => {
    const current = sequence();
    const view = stage(current.lexemes[2], 'wiederholung', {
      audience: 'teacher',
      recap: recapItems(current, current.lexemes[2]),
      recapRevealed: 0,
    });
    expect(view.recap.every((line) => line.text)).toBe(true);
    expect(view.recap.every((line) => !line.revealed)).toBe(true);
  });

  it('lässt den Impuls der laufenden Einheit weg', () => {
    const current = createSequence({
      lexemes: [
        createLexeme({ id: 'lex_1', expression: 'erste' }),
        createLexeme({ id: 'lex_2', expression: 'zweite', targetPrompt: 'Écoutez l’intonation.' }),
      ],
    });
    const view = stage(current.lexemes[1], 'wiederholung', { recap: recapItems(current, current.lexemes[1]) });
    expect(view.targetPrompt).toBe('');
  });

  it('lässt übersprungene Einheiten aus', () => {
    const current = createSequence({
      lexemes: [
        createLexeme({ id: 'lex_1', expression: 'übersprungen', skipped: true }),
        createLexeme({ id: 'lex_2', expression: 'erste echte' }),
        createLexeme({ id: 'lex_3', expression: 'zweite echte' }),
      ],
    });
    expect(recapItems(current, current.lexemes[2]).map((item) => item.expression)).toEqual([
      'erste echte',
      'zweite echte',
    ]);
  });
});

describe('Wortprofil', () => {
  it('kennt sieben Dimensionen mit Leitfrage', () => {
    expect(ANALYSIS_DIMENSIONS).toHaveLength(7);
    for (const id of ANALYSIS_DIMENSIONS) {
      expect(de[`profile.dimension.${id}` as keyof typeof de]).toBeTruthy();
      expect(de[`profile.question.${id}` as keyof typeof de]).toBeTruthy();
    }
  });

  it('meldet nur, was noch leer ist', () => {
    const bare = createLexeme({ expression: 'la promesse' });
    expect(analysisGaps(bare)).toEqual([...ANALYSIS_DIMENSIONS]);

    const filled = createLexeme({
      expression: 'la promesse',
      coreMeaning: 'Versprechen',
      connotation: 'neutral',
      wordClass: 'nomen',
      wordFamily: 'promettre',
      ipa: '[pʁɔ.mɛs]',
      keyCollocation: 'tenir une promesse',
      situation: 'Jemand kündigt etwas an.',
    });
    expect(analysisGaps(filled)).toEqual([]);
    expect(analyseLexeme(filled).every((entry) => entry.filled)).toBe(true);
  });

  it('wertet „noch offen“ nicht als Angabe', () => {
    const lexeme = createLexeme({ expression: 'x', connotation: 'unbestimmt', wordClass: 'unbestimmt' });
    expect(analysisGaps(lexeme)).toEqual(expect.arrayContaining(['konnotation', 'form']));
  });
});

describe('Beiträge der Lerngruppe', () => {
  it('erscheinen zielsprachlich auf der Bühne', () => {
    const lexeme = createLexeme({
      expression: 'une promesse',
      keyCollocation: 'tenir une promesse',
      classContributions: ['faire une promesse'],
    });
    expect(stage(lexeme, 'chunk').contributions).toEqual(['faire une promesse']);
  });
});
