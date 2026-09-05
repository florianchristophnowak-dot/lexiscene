import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSequence } from '../../domain/schema';
import { renderWithStore } from '../../test/renderWithStore';
import { TableImport } from './TableImport';

const TABLE = 'Ausdruck\tKernbedeutung\nÇa te dit de… ?\tHast du Lust, …?\nPourquoi pas !\tGerne!';

function setup() {
  const sequence = createSequence({ title: 'Import' });
  const view = renderWithStore(<TableImport sequence={sequence} />, [sequence], {
    actions: { addLexemes: vi.fn().mockReturnValue(2) },
  });
  return { sequence, ...view };
}

describe('Tabellenimport', () => {
  it('erkennt Überschrift und Spalten und zeigt die Zahl der Einheiten', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByLabelText('Tabelle einfügen'));
    await user.paste(TABLE);

    expect(screen.getByLabelText('Erste Zeile enthält Überschriften')).toBeChecked();
    expect(screen.getByLabelText('Spalte 1 zuordnen')).toHaveValue('expression');
    expect(screen.getByLabelText('Spalte 2 zuordnen')).toHaveValue('coreMeaning');
    expect(screen.getByRole('button', { name: '2 Einheiten übernehmen' })).toBeEnabled();
  });

  it('übernimmt die Zeilen als neue Einheiten', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();

    await user.click(screen.getByLabelText('Tabelle einfügen'));
    await user.paste(TABLE);
    await user.click(screen.getByRole('button', { name: '2 Einheiten übernehmen' }));

    expect(actions.addLexemes).toHaveBeenCalledWith(sequence.id, [
      { expression: 'Ça te dit de… ?', coreMeaning: 'Hast du Lust, …?' },
      { expression: 'Pourquoi pas !', coreMeaning: 'Gerne!' },
    ]);
  });

  it('verlangt eine Spalte mit dem Ausdruck', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByLabelText('Tabelle einfügen'));
    await user.paste(TABLE);
    await user.selectOptions(screen.getByLabelText('Spalte 1 zuordnen'), 'ignore');

    expect(screen.getByText(/Ordnen Sie einer Spalte/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0 Einheiten übernehmen' })).toBeDisabled();
  });
});
