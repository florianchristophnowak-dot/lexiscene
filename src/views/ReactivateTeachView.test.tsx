import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../domain/demo';
import { buildImpulses } from '../domain/reactivation';
import { renderWithStore } from '../test/renderWithStore';
import { ReactivateTeachView } from './ReactivateTeachView';

function setup() {
  const sequence = createDemoSequence();
  const impulses = buildImpulses(sequence);
  const view = renderWithStore(<ReactivateTeachView sequenceId={sequence.id} />, [sequence]);
  return { sequence, impulses, ...view };
}

describe('Reaktivierung im Unterricht', () => {
  it('zeigt den ersten Impuls ohne Lösung', () => {
    const { impulses } = setup();
    expect(screen.getByText(`Impuls 1 von ${impulses.length}`)).toBeInTheDocument();
    expect(screen.getByText(impulses[0].prompt)).toBeInTheDocument();
    expect(screen.queryByText(impulses[0].solution)).not.toBeInTheDocument();
  });

  it('deckt die Lösung mit der Leertaste auf und geht dann weiter', async () => {
    const user = userEvent.setup();
    const { impulses } = setup();

    await user.keyboard(' ');
    expect(screen.getByText(impulses[0].solution)).toBeInTheDocument();

    await user.keyboard(' ');
    expect(screen.getByText('Impuls 2 von ' + impulses.length)).toBeInTheDocument();
  });

  it('blättert mit den Pfeiltasten', async () => {
    const user = userEvent.setup();
    const { impulses } = setup();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(`Impuls 2 von ${impulses.length}`)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(`Impuls 1 von ${impulses.length}`)).toBeInTheDocument();
  });

  it('vermerkt eine Einheit als reaktiviert', async () => {
    const user = userEvent.setup();
    const { actions, impulses, sequence } = setup();

    await user.click(screen.getByRole('button', { name: 'Als reaktiviert vermerken' }));
    expect(actions.setLexemeStatus).toHaveBeenCalledWith(sequence.id, impulses[0].lexemeId, 'reaktiviert');
  });

  it('meldet verständlich, wenn es nichts zu reaktivieren gibt', () => {
    const sequence = createDemoSequence();
    sequence.lexemes = [];
    renderWithStore(<ReactivateTeachView sequenceId={sequence.id} />, [sequence]);
    expect(screen.getByText('Keine Impulse verfügbar')).toBeInTheDocument();
  });
});
