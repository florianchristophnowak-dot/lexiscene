import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../../domain/demo';
import { renderWithStore } from '../../test/renderWithStore';
import { SequencePanel } from './SequencePanel';

function setup() {
  const sequence = createDemoSequence();
  const onSelectLexeme = vi.fn();
  const view = renderWithStore(
    <SequencePanel sequence={sequence} selectedLexemeId={null} onSelectLexeme={onSelectLexeme} />,
    [sequence],
  );
  return { sequence, onSelectLexeme, ...view };
}

describe('Sequenzspalte', () => {
  it('zeigt die Einheiten in der gespeicherten Reihenfolge', () => {
    const { sequence } = setup();
    const rows = screen.getAllByText(/./, { selector: '.lexeme-row__expression' });
    expect(rows.map((row) => row.textContent)).toEqual(sequence.lexemes.map((lexeme) => lexeme.expression));
  });

  it('legt über die Schnelleingabe eine Einheit an und wählt sie aus', async () => {
    const user = userEvent.setup();
    const { actions, onSelectLexeme, sequence } = setup();

    await user.type(screen.getByLabelText('Neuer Ausdruck oder Chunk'), 'On y va !');
    await user.type(screen.getByLabelText('Kernbedeutung (optional)'), 'Los geht’s!');
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(actions.addLexeme).toHaveBeenCalledWith(sequence.id, {
      expression: 'On y va !',
      coreMeaning: 'Los geht’s!',
    });
    expect(onSelectLexeme).toHaveBeenCalledWith('lex_neu');
  });

  it('sortiert barrierefrei über Schaltflächen und meldet die neue Position', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();

    await user.click(screen.getAllByRole('button', { name: 'Nach unten verschieben' })[0]);
    expect(actions.moveLexeme).toHaveBeenCalledWith(sequence.id, 0, 1);
    expect(screen.getByRole('status', { name: 'Reihenfolge der Einheiten' })).toHaveTextContent(
      'ist jetzt an Position 2 von 7',
    );
  });

  it('deaktiviert das Verschieben an den Rändern', () => {
    setup();
    expect(screen.getAllByRole('button', { name: 'Nach oben verschieben' })[0]).toBeDisabled();
    const down = screen.getAllByRole('button', { name: 'Nach unten verschieben' });
    expect(down[down.length - 1]).toBeDisabled();
  });

  it('schaltet Schritte der Dramaturgie ab', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();

    await user.click(screen.getByText('Dramaturgie der Einführung'));
    await user.click(screen.getByLabelText(/^Hören/));
    expect(actions.setSequenceStep).toHaveBeenCalledWith(sequence.id, 'audio', false);
  });

  it('sortiert die Dramaturgie um und meldet die neue Position', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();

    await user.click(screen.getByText('Dramaturgie der Einführung'));
    await user.click(screen.getByRole('button', { name: '„Impuls zeigen“ nach oben verschieben' }));

    expect(actions.updateSequence).toHaveBeenCalledWith(sequence.id, {
      stepOrder: ['impuls', 'situation', 'audio', 'vermuten', 'klaeren', 'form', 'fokus', 'kontrolle', 'hilfen-ausblenden', 'abruf', 'aufgabe'],
    });
    expect(screen.getByRole('status', { name: 'Reihenfolge der Schritte' })).toHaveTextContent(
      '„Impuls zeigen“ ist jetzt an Position 1 von 11',
    );
  });
});
