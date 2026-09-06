import { describe, expect, it } from 'vitest';
import { buildCcqView, buildStageView, l1VisibleToClass, type StageOptions } from './stage';
import { createConceptCheck } from './ccq';
import { createLexeme } from './schema';
import { stepDefinition } from './steps';
import type { TeachingLanguageMode } from './model';
import { promptFor } from '../i18n/prompts';

const phrase = (key: string, params?: Record<string, string>) => promptFor('fr', key, params);

const lexeme = () =>
  createLexeme({
    expression: 'Ça te dit de… ?',
    coreMeaning: 'Hast du Lust, etwas zu tun?',
    targetExplanation: 'On propose une activité.',
    targetPrompt: 'Écoutez.',
    translation: 'Hast du Lust, …?',
    simplifiedExplanation: 'Man fragt: Willst du mitmachen?',
    teacherNote: 'Chunk als Ganzes anbieten.',
    modelUtterance: 'Ça te dit d’aller au cinéma ?',
  });

const options = (patch: Partial<StageOptions> = {}): StageOptions => ({
  lexeme: lexeme(),
  step: stepDefinition('klaeren')!,
  visibility: { meaning: true, form: true, support: false },
  releaseL1: false,
  showSolution: false,
  mode: 'reserve',
  audience: 'class',
  ...patch,
});

describe('Sprachtrennung der Bühne', () => {
  it('zeigt der Klasse die zielsprachliche Erklärung, nicht die interne Bedeutung', () => {
    const view = buildStageView(options());
    expect(view.explanation).toBe('On propose une activité.');
    expect(view.internalMeaning).toBe('');
    expect(view.translation).toBe('');
    expect(view.simplified).toBe('');
    expect(view.teacherNotes).toEqual([]);
  });

  it('gibt der Lehrkraft alles – auch ohne Freigabe', () => {
    const view = buildStageView(options({ audience: 'teacher' }));
    expect(view.internalMeaning).toBe('Hast du Lust, etwas zu tun?');
    expect(view.translation).toBe('Hast du Lust, …?');
    expect(view.teacherNotes).toContain('Chunk als Ganzes anbieten.');
  });

  it('lässt die Reserve erst nach ausdrücklicher Freigabe an die Klasse', () => {
    const closed = buildStageView(options({ mode: 'reserve', releaseL1: false }));
    expect(closed.translation).toBe('');

    const released = buildStageView(options({ mode: 'reserve', releaseL1: true }));
    expect(released.translation).toBe('Hast du Lust, …?');
    expect(released.simplified).toBe('Man fragt: Willst du mitmachen?');
    // Die interne Bedeutung bleibt auch dann bei der Lehrkraft.
    expect(released.internalMeaning).toBe('');
  });

  it('hält im strengen Modus jede Erstsprache aus der Projektion heraus', () => {
    const strict = buildStageView(options({ mode: 'strict', releaseL1: true }));
    expect(strict.translation).toBe('');
    expect(strict.simplified).toBe('');
    expect(strict.internalMeaning).toBe('');
    expect(strict.l1Available).toBe(false);
    expect(l1VisibleToClass('strict', true)).toBe(false);
  });

  it('gibt im flexiblen Modus auf Wunsch auch die interne Bedeutung frei', () => {
    const flexible = buildStageView(options({ mode: 'flexible', releaseL1: true }));
    expect(flexible.internalMeaning).toBe('Hast du Lust, etwas zu tun?');
    expect(buildStageView(options({ mode: 'flexible', releaseL1: false })).internalMeaning).toBe('');
  });

  it('meldet, ob eine Reserve überhaupt vorliegt', () => {
    const empty = buildStageView(options({ lexeme: createLexeme({ expression: 'x' }) }));
    expect(empty.l1Available).toBe(false);
    expect(buildStageView(options()).l1Available).toBe(true);
  });

  it('zeigt Schriftbild und Modelläußerung nur bei sichtbarer Form', () => {
    const hidden = buildStageView(options({ visibility: { meaning: false, form: false, support: false } }));
    expect(hidden.expression).toBe('');
    expect(hidden.utterance).toBe('');

    const shown = buildStageView(options());
    expect(shown.expression).toBe('Ça te dit de… ?');
    expect(shown.utterance).toBe('Ça te dit d’aller au cinéma ?');
  });

  it('behandelt alle Modi für die Klasse gleich streng, solange nichts freigegeben ist', () => {
    for (const mode of ['reserve', 'strict', 'flexible'] as TeachingLanguageMode[]) {
      const view = buildStageView(options({ mode }));
      expect(view.translation).toBe('');
      expect(view.internalMeaning).toBe('');
    }
  });
});

describe('Bedeutungsprüfung auf der Bühne', () => {
  const check = createConceptCheck({
    question: 'Est-ce une proposition ou un refus ?',
    expectedAnswer: 'Une proposition.',
    options: ['Une proposition.', 'Un refus.'],
    feature: 'absicht',
    format: 'a-b',
    misconception: 'Die Frageform wirkt unsicher.',
    alternativeClarification: 'Mini-Dialog gegenüberstellen.',
  });

  it('gibt der Klasse nur Frage, Optionen und Arbeitsanweisung', () => {
    const view = buildCcqView({ check, lexeme: lexeme(), audience: 'class', showAnswer: false, phrase });
    expect(view.question).toBe('Est-ce une proposition ou un refus ?');
    expect(view.options).toEqual(['Une proposition.', 'Un refus.']);
    expect(view.instruction).toBe('Choisissez.');
    expect(view.expectedAnswer).toBe('');
    expect(view.feature).toBe('');
    expect(view.misconception).toBe('');
    expect(view.alternative).toBe('');
  });

  it('deckt die erwartete Antwort erst auf Wunsch auf', () => {
    const view = buildCcqView({ check, lexeme: lexeme(), audience: 'class', showAnswer: true, phrase });
    expect(view.expectedAnswer).toBe('Une proposition.');
    // Merkmal und Klärung bleiben trotzdem bei der Lehrkraft.
    expect(view.feature).toBe('');
    expect(view.alternative).toBe('');
  });

  it('zeigt der Lehrkraft Merkmal, Missverständnis und Klärung', () => {
    const view = buildCcqView({ check, lexeme: lexeme(), audience: 'teacher', showAnswer: false, phrase });
    expect(view.expectedAnswer).toBe('Une proposition.');
    expect(view.feature).toBe('absicht');
    expect(view.misconception).toBe('Die Frageform wirkt unsicher.');
    expect(view.alternative).toBe('Mini-Dialog gegenüberstellen.');
  });

  it('wählt die Arbeitsanweisung nach dem Antwortformat', () => {
    const sort = buildCcqView({
      check: { ...check, format: 'sortieren' },
      lexeme: lexeme(),
      audience: 'class',
      showAnswer: false,
      phrase,
    });
    expect(sort.instruction).toBe('Classez.');
  });
});
