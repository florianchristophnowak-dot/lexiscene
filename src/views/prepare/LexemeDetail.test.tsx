import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../../domain/demo';
import { createObservation } from '../../domain/observations';
import { renderWithStore } from '../../test/renderWithStore';
import { LexemeDetail } from './LexemeDetail';

function setup(observations = [] as ReturnType<typeof createObservation>[]) {
  const sequence = createDemoSequence();
  sequence.lexemes[0] = { ...sequence.lexemes[0], observations };
  const lexeme = sequence.lexemes[0];
  const view = renderWithStore(<LexemeDetail sequence={sequence} lexeme={lexeme} />, [sequence]);
  return { sequence, lexeme, ...view };
}

describe('Detailspalte', () => {
  it('stellt den Erstkontakt voran', () => {
    setup();
    const core = screen.getByText('Für den Erstkontakt').closest('section');
    expect(core).toBeTruthy();
    for (const label of [
      'Ausdruck oder Chunk',
      'Kernbedeutung',
      'Kommunikative Funktion',
      'Modelläußerung',
      'Musteranker',
      'Lexikalischer Typ',
      'Lernziel',
    ]) {
      expect(core?.textContent).toContain(label);
    }
  });

  it('zeigt den Musteranker der Einheit im Kernbereich', () => {
    const { lexeme } = setup();
    expect(screen.getByRole('textbox', { name: 'Musteranker' })).toHaveValue(lexeme.sentenceFrame);
  });

  it('lässt eine zweite Aufgabe in der Gegenrichtung wählen', async () => {
    const user = userEvent.setup();
    const { actions, sequence, lexeme } = setup();

    await user.click(screen.getByText('Bedeutungssicherung und Abruf'));
    await user.selectOptions(screen.getByLabelText('Zweite Aufgabe in der Gegenrichtung'), 'situation-zu-ausdruck');

    expect(actions.updateLexeme).toHaveBeenCalledWith(sequence.id, lexeme.id, {
      checkTemplateIdSecondary: 'situation-zu-ausdruck',
    });
  });

  it('zeigt den Verlauf der Beobachtungen und lässt einzelne entfernen', async () => {
    const user = userEvent.setup();
    const observation = createObservation({
      dimension: 'pattern',
      result: 'supported',
      source: 'reactivation',
      round: 2,
      impulseKind: 'chunk-ergaenzen',
      at: 1_700_000_000_000,
    });
    const { actions, sequence, lexeme } = setup([observation]);

    await user.click(screen.getByText('Verlauf (1)'));
    expect(screen.getByText('Muster: mit Hilfe')).toBeInTheDocument();
    expect(screen.getByText(/Reaktivierung · Runde 2 · Chunk ergänzen/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Diese Beobachtung entfernen' }));
    expect(actions.removeObservation).toHaveBeenCalledWith(sequence.id, lexeme.id, observation.id);
  });

  it('zeigt die vier Dimensionen ohne Verrechnung', () => {
    setup([createObservation({ dimension: 'meaning', result: 'secure', source: 'introduction' })]);
    expect(screen.getByText('Bedeutung')).toBeInTheDocument();
    expect(screen.getByText('sicher')).toBeInTheDocument();
    expect(screen.getAllByText('noch keine Beobachtung')).toHaveLength(3);
  });
});
