import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../../domain/demo';
import { createLexeme } from '../../domain/schema';
import type { Lexeme } from '../../domain/model';
import { renderWithStore } from '../../test/renderWithStore';
import { ElicitingPanel } from './ElicitingPanel';
import { ProfilePanel } from './ProfilePanel';

function setup(overrides: Partial<Lexeme> = {}) {
  const sequence = createDemoSequence();
  const lexeme = { ...sequence.lexemes[0], ...overrides };
  sequence.lexemes[0] = lexeme;
  return { sequence, lexeme, ...renderWithStore(<ElicitingPanel sequence={sequence} lexeme={lexeme} />, [sequence]) };
}

describe('Bedeutung herauslocken vorbereiten', () => {
  it('bietet alle zehn Techniken an und kennzeichnet die passenden', () => {
    setup({ imageability: 'hoch', lexicalType: 'gegenstand' });
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    expect(screen.getByText(/Zum Profil dieser Einheit passen: .*Bild/)).toBeInTheDocument();
    expect(screen.getAllByText(/empfohlen/).length).toBeGreaterThan(0);
  });

  it('wählt eine Technik aus, ohne etwas vorzubelegen', async () => {
    const user = userEvent.setup();
    const { actions, sequence, lexeme } = setup({ elicitingTechniques: [] });

    await user.click(screen.getByRole('checkbox', { name: /Zeichnung/ }));
    expect(actions.updateLexeme).toHaveBeenCalledWith(sequence.id, lexeme.id, {
      elicitingTechniques: ['zeichnung'],
    });
  });

  it('mahnt bei langer Lehrersprache, ohne zu blockieren', () => {
    setup({ elicitingTechniques: ['bild'], elicitingContext: 'Sehr ausführlich. '.repeat(20) });
    expect(screen.getByText(/Kürzer heißt hier meist eindeutiger/)).toBeInTheDocument();
    expect(screen.getByLabelText('Vorbereiteter Kontext oder Impuls')).toBeEnabled();
  });

  it('weist auf die fehlende Technik hin', () => {
    setup({ elicitingTechniques: [] });
    expect(screen.getByText(/ohne sie bleibt nur das Erklären/)).toBeInTheDocument();
  });
});

describe('Wortprofil', () => {
  it('zeigt belegte und offene Dimensionen mit ihrer Leitfrage', () => {
    renderWithStore(<ProfilePanel lexeme={createLexeme({ expression: 'la promesse' })} />, []);

    expect(screen.getByText('Bedeutung')).toBeInTheDocument();
    expect(screen.getByText(/Was bezeichnet der Ausdruck genau/)).toBeInTheDocument();
    expect(screen.getByText(/Noch offen: Bedeutung, Konnotation/)).toBeInTheDocument();
  });

  it('meldet ein vollständiges Profil', () => {
    const lexeme = createLexeme({
      expression: 'la promesse',
      coreMeaning: 'Versprechen',
      connotation: 'neutral',
      wordClass: 'nomen',
      wordFamily: 'promettre',
      ipa: '[pʁɔ.mɛs]',
      keyCollocation: 'tenir une promesse',
      situation: 'Jemand kündigt etwas an.',
    });
    renderWithStore(<ProfilePanel lexeme={lexeme} />, []);
    expect(screen.getByText('Alle sieben Dimensionen sind belegt.')).toBeInTheDocument();
  });
});
