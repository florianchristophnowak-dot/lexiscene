import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCorpusExample, createCorpusMiniature } from '../../domain/corpus';
import { createDemoSequence } from '../../domain/demo';
import type { CorpusMiniature, Lexeme } from '../../domain/model';
import { renderWithStore } from '../../test/renderWithStore';
import { CorpusPanel } from './CorpusPanel';

function setup(corpus: CorpusMiniature, overrides: Partial<Lexeme> = {}) {
  const sequence = createDemoSequence();
  const lexeme = { ...sequence.lexemes[0], corpus, ...overrides };
  sequence.lexemes[0] = lexeme;
  const view = renderWithStore(<CorpusPanel sequence={sequence} lexeme={lexeme} />, [sequence]);
  return { sequence, lexeme, ...view };
}

const withExamples = (count: number, patch: Partial<CorpusMiniature> = {}) =>
  createCorpusMiniature({
    enabled: true,
    examples: Array.from({ length: count }, (_, index) =>
      createCorpusExample({ text: `Beleg ${index + 1}`, highlight: `Beleg ${index + 1}` }),
    ),
    ...patch,
  });

describe('Korpusminiatur vorbereiten', () => {
  it('bleibt zugeklappt, solange die Funktion nicht eingeschaltet ist', () => {
    setup(createCorpusMiniature());
    expect(screen.getByRole('checkbox', { name: /Korpusminiatur für diese Einheit verwenden/ })).not.toBeChecked();
    expect(screen.queryByLabelText('Leitfrage')).not.toBeInTheDocument();
  });

  it('schaltet die Funktion für diese Einheit ein', async () => {
    const user = userEvent.setup();
    const { actions, sequence, lexeme } = setup(createCorpusMiniature());

    await user.click(screen.getByRole('checkbox', { name: /Korpusminiatur für diese Einheit verwenden/ }));
    expect(actions.updateLexeme).toHaveBeenCalledWith(sequence.id, lexeme.id, {
      corpus: { ...lexeme.corpus, enabled: true },
    });
  });

  it('nennt die Empfehlung zum Umfang, ohne sie zu erzwingen', () => {
    setup(withExamples(3));
    expect(screen.getByText(/fünf bis zehn kurze, verständliche Belege/)).toBeInTheDocument();
  });

  it('macht aus fünf eingefügten Zeilen fünf Belege und hängt sie an', async () => {
    const user = userEvent.setup();
    const existing = withExamples(1);
    const { actions, sequence, lexeme } = setup(existing);

    await user.type(
      screen.getByLabelText('Mehrere Belege einfügen'),
      'Un\n\nDeux\nTrois\nQuatre\nCinq',
    );
    await user.click(screen.getByRole('button', { name: /5 Zeilen als Belege übernehmen/ }));

    const call = (actions.updateLexeme as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1);
    expect(call?.[0]).toBe(sequence.id);
    expect(call?.[1]).toBe(lexeme.id);
    const examples = (call?.[2] as { corpus: CorpusMiniature }).corpus.examples;
    expect(examples).toHaveLength(6);
    expect(examples[0]).toEqual(existing.examples[0]);
    expect(examples.slice(1).map((example) => example.text)).toEqual(['Un', 'Deux', 'Trois', 'Quatre', 'Cinq']);
  });

  it('warnt, wenn die Markierung im Beleg nicht vorkommt', () => {
    setup(
      createCorpusMiniature({
        enabled: true,
        examples: [
          createCorpusExample({ text: 'Elle joue du piano.', highlight: 'au piano' }),
          createCorpusExample({ text: 'Ils jouent aux échecs.', highlight: 'aux échecs' }),
          createCorpusExample({ text: 'Nous jouons au tennis.', highlight: 'au tennis' }),
        ],
      }),
    );

    expect(screen.getByText(/Die Markierung „au piano“ kommt in diesem Beleg nicht vor/)).toBeInTheDocument();
    expect(screen.queryByText(/Die Markierung „aux échecs“/)).not.toBeInTheDocument();
  });

  it('weist auf zu wenige Belege hin', () => {
    setup(withExamples(2));
    expect(screen.getByText(/erst ab 3 Belegen angeboten – derzeit 2/)).toBeInTheDocument();
  });

  it('ordnet Belege über die Pfeilschaltflächen um', async () => {
    const user = userEvent.setup();
    const miniature = withExamples(3);
    const { actions, sequence, lexeme } = setup(miniature);

    await user.click(screen.getByRole('button', { name: 'Beleg 1 nach unten' }));
    expect(actions.updateLexeme).toHaveBeenCalledWith(sequence.id, lexeme.id, {
      corpus: {
        ...miniature,
        examples: [miniature.examples[1], miniature.examples[0], miniature.examples[2]],
      },
    });
    expect(screen.getByRole('status', { name: 'Reihenfolge der Belege' })).toHaveTextContent(
      'Beleg 1 steht jetzt an Position 2 von 3',
    );
  });

  it('entfernt und dupliziert einzelne Belege', async () => {
    const user = userEvent.setup();
    const miniature = withExamples(3);
    const { actions, sequence, lexeme } = setup(miniature);

    await user.click(screen.getByRole('button', { name: 'Beleg 2 entfernen' }));
    expect(actions.updateLexeme).toHaveBeenCalledWith(sequence.id, lexeme.id, {
      corpus: { ...miniature, examples: [miniature.examples[0], miniature.examples[2]] },
    });

    await user.click(screen.getByRole('button', { name: 'Beleg 2 duplizieren' }));
    const call = (actions.updateLexeme as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1);
    const examples = (call?.[2] as { corpus: CorpusMiniature }).corpus.examples;
    expect(examples).toHaveLength(4);
    expect(examples[2].text).toBe(miniature.examples[1].text);
    expect(examples[2].id).not.toBe(miniature.examples[1].id);
  });

  it('schaltet den Unterrichtsschritt gezielt für diese Einheit ein', async () => {
    const user = userEvent.setup();
    const { actions, sequence, lexeme } = setup(withExamples(3));

    const checkbox = screen.getByRole('checkbox', { name: /Schritt „Korpusminiatur“ im Unterricht/ });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(actions.updateLexeme).toHaveBeenCalledWith(sequence.id, lexeme.id, {
      stepOverrides: { ...lexeme.stepOverrides, korpusminiatur: true },
    });
  });

  it('öffnet eine Vorschau der gestuften Präsentation', async () => {
    const user = userEvent.setup();
    setup(withExamples(3, { guidingQuestion: 'Was fällt euch auf?', ruleOrFinding: 'Das Muster.' }));

    await user.click(screen.getByRole('button', { name: 'Vorschau' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Was fällt euch auf?');
    expect(dialog).not.toHaveTextContent('Das Muster.');

    await user.click(screen.getByRole('button', { name: 'Regel zeigen' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Das Muster.');
  });
});
