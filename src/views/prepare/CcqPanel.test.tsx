import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createConceptCheck } from '../../domain/ccq';
import { createDemoSequence } from '../../domain/demo';
import type { ConceptCheck, Lexeme } from '../../domain/model';
import { renderWithStore } from '../../test/renderWithStore';
import { CcqPanel } from './CcqPanel';

function setup(ccqs: ConceptCheck[] = [], overrides: Partial<Lexeme> = {}) {
  const sequence = createDemoSequence();
  const lexeme = { ...sequence.lexemes[0], ccqs, ...overrides };
  sequence.lexemes[0] = lexeme;
  const view = renderWithStore(<CcqPanel sequence={sequence} lexeme={lexeme} />, [sequence]);
  return { sequence, lexeme, ...view };
}

/** Letzter Aufruf von updateLexeme – dort steht die neue Fragenliste. */
function lastChecks(actions: { updateLexeme: unknown }): ConceptCheck[] {
  const calls = (actions.updateLexeme as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  return (calls.at(-1)?.[2] as { ccqs: ConceptCheck[] }).ccqs;
}

describe('CCQ-Editor', () => {
  it('weist auf den entfallenden Schritt hin, solange keine Frage vorliegt', () => {
    setup();
    expect(screen.getByText(/Ohne CCQ entfällt der Schritt/)).toBeInTheDocument();
  });

  it('legt eine leere Frage an', async () => {
    const user = userEvent.setup();
    const { actions } = setup();

    await user.click(screen.getByRole('button', { name: 'Frage hinzufügen' }));
    const checks = lastChecks(actions);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ question: '', feature: 'kernbedeutung', language: 'fr' });
  });

  it('übernimmt eine Vorlage als Gerüst, ohne eine Frage zu behaupten', async () => {
    const user = userEvent.setup();
    const { actions } = setup();

    await user.selectOptions(screen.getByLabelText('Aus Vorlage'), 'welche-situation');
    const [check] = lastChecks(actions);
    expect(check).toMatchObject({ templateId: 'welche-situation', question: '', target: 'use' });
  });

  it('setzt einen Fragestamm in der Zielsprache ein', async () => {
    const user = userEvent.setup();
    const { actions } = setup();

    await user.selectOptions(screen.getByLabelText('Fragestamm'), 'jetzt-oder-spaeter');
    const [check] = lastChecks(actions);
    expect(check.question).toBe('Est-ce que ça se passe maintenant ou plus tard ?');
    expect(check.feature).toBe('zeit');
  });

  it('übernimmt eine Abrufaufgabe auf Wunsch als CCQ', async () => {
    const user = userEvent.setup();
    const { actions } = setup();

    await user.click(screen.getByRole('button', { name: 'Abrufaufgabe als CCQ übernehmen' }));
    const [check] = lastChecks(actions);
    expect(check.question.length).toBeGreaterThan(5);
  });

  it('zeigt die Qualitätshinweise, ohne zu blockieren', () => {
    setup([createConceptCheck({ question: 'Habt ihr das verstanden?' })]);
    expect(screen.getByText(/prüft nichts/)).toBeInTheDocument();
    expect(screen.getByText(/Ohne erwartete Antwort/)).toBeInTheDocument();
  });

  it('ordnet Fragen um, dupliziert und entfernt sie', async () => {
    const user = userEvent.setup();
    const checks = [
      createConceptCheck({ question: 'Erste Frage', expectedAnswer: 'a' }),
      createConceptCheck({ question: 'Zweite Frage', expectedAnswer: 'b' }),
    ];
    const { actions } = setup(checks);

    await user.click(screen.getByRole('button', { name: 'Frage 1 nach unten' }));
    expect(lastChecks(actions).map((check) => check.question)).toEqual(['Zweite Frage', 'Erste Frage']);
    expect(screen.getByRole('status', { name: 'Reihenfolge der Fragen' })).toHaveTextContent(
      'Frage 1 steht jetzt an Position 2 von 2',
    );

    await user.click(screen.getByRole('button', { name: 'Frage 2 duplizieren' }));
    const duplicated = lastChecks(actions);
    expect(duplicated).toHaveLength(3);
    expect(duplicated[2].question).toBe('Zweite Frage');
    expect(duplicated[2].id).not.toBe(checks[1].id);

    await user.click(screen.getByRole('button', { name: 'Frage 1 entfernen' }));
    expect(lastChecks(actions).map((check) => check.question)).toEqual(['Zweite Frage']);
  });

  it('nimmt Antwort und Optionen entgegen', () => {
    const { actions } = setup([createConceptCheck({ question: 'Frage' })]);

    // Die Felder sind gesteuert; im Test bleibt der Ausgangswert stehen, deshalb je ein Änderungsereignis.
    fireEvent.change(screen.getByLabelText('Erwartete Antwort zu Frage 1'), { target: { value: 'Oui, c\u2019est une proposition.' } });
    expect(lastChecks(actions)[0].expectedAnswer).toBe('Oui, c\u2019est une proposition.');

    fireEvent.change(screen.getByLabelText('Antwortoptionen zu Frage 1'), { target: { value: 'Oui\nNon' } });
    expect(lastChecks(actions)[0].options).toEqual(['Oui', 'Non']);
  });

  it('zeigt in der Vorschau nur die Klassenansicht', async () => {
    const user = userEvent.setup();
    setup([
      createConceptCheck({
        question: 'Est-ce une proposition ?',
        expectedAnswer: 'Oui.',
        misconception: 'Wirkt unsicher.',
        alternativeClarification: 'Mini-Dialog.',
      }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Vorschau' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Est-ce une proposition ?');
    expect(dialog).not.toHaveTextContent('Erwartet: Oui.');
    expect(dialog).not.toHaveTextContent('Wirkt unsicher.');
  });
});
