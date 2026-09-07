import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { StageState } from '../app/presentation';
import { createDemoSequence } from '../domain/demo';
import { renderWithStore } from '../test/renderWithStore';
import { ProjectionView } from './ProjectionView';

/*
 * Das Projektionsfenster folgt der Lehrkraftansicht über einen
 * BroadcastChannel, den es in der Testumgebung nicht gibt. Der Stand wird
 * deshalb direkt gesetzt; geprüft wird, was das Fenster daraus macht.
 */
const stage = vi.hoisted(() => ({ current: null as StageState | null }));

vi.mock('../app/presentation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app/presentation')>()),
  useStageSubscription: () => stage.current,
}));

function project(patch: Partial<StageState> = {}) {
  const sequence = createDemoSequence();
  const lexeme = sequence.lexemes.find((entry) => entry.corpus.enabled);
  if (!lexeme) throw new Error('Die Demo enthält keine Korpusminiatur.');

  stage.current = {
    sequenceId: sequence.id,
    lexemeId: lexeme.id,
    stepId: 'korpusminiatur',
    visibility: { meaning: false, form: false, support: false },
    releaseL1: false,
    corpusReveal: { highlight: true, groups: true, rule: true, transfer: true },
    ccqIndex: 0,
    showCcqAnswer: false,
    showCcqAlternative: false,
    wordReveal: 'hidden',
    drillStage: null,
    recapRevealed: 0,
    mode: 'reserve',
    finished: false,
    ...patch,
  };

  return { sequence, lexeme, ...renderWithStore(<ProjectionView sequenceId={sequence.id} />, [sequence]) };
}

describe('Projektionsfenster mit Korpusminiatur', () => {
  it('zeigt Belege, Markierungen, Gruppen, Regel und Transfer', () => {
    const { lexeme } = project();

    expect(screen.getByText(lexeme.corpus.guidingQuestion)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Belege' }).querySelectorAll('li')).toHaveLength(
      lexeme.corpus.examples.length,
    );
    expect(document.querySelectorAll('mark').length).toBe(lexeme.corpus.examples.length);
    expect(screen.getByText('Gruppen: Sport/Spiel · Instrument')).toBeInTheDocument();
    expect(screen.getByText(lexeme.corpus.ruleOrFinding)).toBeInTheDocument();
    expect(screen.getByText(lexeme.corpus.transferPrompt)).toBeInTheDocument();
  });

  it('projiziert niemals Lehrkraftnotizen oder den Quellenhinweis', () => {
    const { lexeme } = project();

    for (const example of lexeme.corpus.examples) {
      expect(screen.queryByText(new RegExp(example.teacherNote.slice(0, 20)))).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Für die Lehrkraft/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Herkunft:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/keine authentischen Korpusbelege/)).not.toBeInTheDocument();
  });

  it('hält verborgene Stufen auch dann zurück, wenn Inhalt vorhanden ist', () => {
    const { lexeme } = project({ corpusReveal: { highlight: false, groups: false, rule: false, transfer: false } });

    expect(document.querySelectorAll('mark')).toHaveLength(0);
    expect(screen.queryByText(/^Gruppen:/)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.corpus.ruleOrFinding)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.corpus.transferPrompt)).not.toBeInTheDocument();
  });
});

describe('Projektion und Sprache', () => {
  function projectStep(patch: Partial<StageState> = {}) {
    const sequence = createDemoSequence();
    const lexeme = sequence.lexemes[0];
    stage.current = {
      sequenceId: sequence.id,
      lexemeId: lexeme.id,
      stepId: 'ccq',
      visibility: { meaning: true, form: true, support: true },
      releaseL1: false,
      corpusReveal: { highlight: false, groups: false, rule: false, transfer: false },
      ccqIndex: 0,
      showCcqAnswer: false,
      showCcqAlternative: false,
      wordReveal: 'hidden',
      drillStage: null,
      recapRevealed: 0,
      mode: 'reserve',
      finished: false,
      ...patch,
    };
    return { sequence, lexeme, ...renderWithStore(<ProjectionView sequenceId={sequence.id} />, [sequence]) };
  }

  it('zeigt die CCQ in der Zielsprache, ohne Antwort und ohne Lehrkraftangaben', () => {
    const { lexeme } = projectStep();

    expect(screen.getByText(lexeme.ccqs[0].question)).toBeInTheDocument();
    expect(screen.getByText('Choisissez.')).toBeInTheDocument();
    expect(screen.queryByText(/Erwartet:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prüft:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missverständnis:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alternative Klärung:/)).not.toBeInTheDocument();
  });

  it('projiziert die zielsprachliche Erklärung, nicht die interne Bedeutung', () => {
    const { lexeme } = projectStep({ stepId: 'klaeren' });

    expect(screen.getByText(lexeme.targetExplanation)).toBeInTheDocument();
    expect(screen.queryByText(lexeme.coreMeaning)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.translation)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.teacherNote)).not.toBeInTheDocument();
  });

  it('hält im strengen Modus jede erstsprachliche Hilfe zurück – auch nach Freigabe', () => {
    const { lexeme } = projectStep({ stepId: 'klaeren', mode: 'strict', releaseL1: true });

    expect(screen.queryByText(lexeme.translation)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.simplifiedExplanation)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.coreMeaning)).not.toBeInTheDocument();
  });

  it('lässt die Reserve nur nach ausdrücklicher Freigabe durch', () => {
    const { lexeme } = projectStep({ stepId: 'klaeren', mode: 'reserve', releaseL1: true });
    expect(screen.getByText(lexeme.translation)).toBeInTheDocument();
  });

  it('deckt die erwartete Antwort nur auf Wunsch auf', () => {
    const { lexeme } = projectStep({ showCcqAnswer: true });
    expect(screen.getByText(`Erwartet: ${lexeme.ccqs[0].expectedAnswer}`)).toBeInTheDocument();
  });

  it('zeigt niemals das Lehrkraftfeld des Zweitbildschirms', () => {
    projectStep();
    expect(document.querySelector('.teacher-panel')).toBeNull();
    expect(document.querySelectorAll('.teach__teacher-note')).toHaveLength(0);
  });
});
