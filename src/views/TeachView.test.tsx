import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../domain/demo';
import { renderWithStore } from '../test/renderWithStore';
import { TeachView } from './TeachView';

const EXPRESSION = 'Ça te dit de… ?';

function setup() {
  const sequence = createDemoSequence();
  const view = renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence]);
  return { sequence, ...view };
}

describe('Unterrichtsmodus', () => {
  it('beginnt mit der Situation und zeigt weder Schriftbild noch Bedeutung', () => {
    setup();
    expect(screen.getByText(/Schritt 1/)).toBeInTheDocument();
    expect(screen.getByText(/Zwei Jugendliche schreiben sich/)).toBeInTheDocument();
    expect(screen.queryByText(EXPRESSION)).not.toBeInTheDocument();
    expect(screen.queryByText('Hast du Lust, etwas zu tun?')).not.toBeInTheDocument();
  });

  it('deckt die Bedeutung vor der Form auf', async () => {
    const user = userEvent.setup();
    setup();

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(screen.getByText(/Schritt 5/)).toBeInTheDocument();
    expect(screen.getByText('Hast du Lust, etwas zu tun?')).toBeInTheDocument();
    expect(screen.queryByText(EXPRESSION)).not.toBeInTheDocument();

    await user.keyboard(' ');
    expect(screen.getByText(/Schritt 6/)).toBeInTheDocument();
    expect(screen.getByText(EXPRESSION)).toBeInTheDocument();
  });

  it('blendet Informationen einzeln ein und aus', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Schriftbild' }));
    expect(screen.getByText(EXPRESSION)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Schriftbild' }));
    expect(screen.queryByText(EXPRESSION)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Übersetzung' }));
    expect(screen.getByText('Hast du Lust, …?')).toBeInTheDocument();
  });

  it('geht mit der Pfeiltaste zurück', async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText(/Schritt 3/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Schritt 2/)).toBeInTheDocument();
  });

  it('merkt sich die Stelle für das spätere Fortsetzen', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();
    await user.keyboard('{ArrowRight}');
    expect(actions.setSession).toHaveBeenCalledWith(
      sequence.id,
      expect.objectContaining({ lexemeIndex: 0, stepIndex: 1 }),
    );
  });

  it('zeigt eine verständliche Meldung, wenn nichts zu unterrichten ist', () => {
    const sequence = createDemoSequence();
    sequence.lexemes = [];
    renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence]);
    expect(screen.getByText('Nichts zu unterrichten')).toBeInTheDocument();
  });
});

describe('Phasen und Rückmeldung', () => {
  it('zeigt die Phase als übergeordnete Ebene', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.getByText('Phase 1: Kontext')).toBeInTheDocument();
    expect(screen.getByText(/Schritt 1 von/)).toBeInTheDocument();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText('Phase 2: Klarheit')).toBeInTheDocument();
  });

  it('bietet in Abrufschritten eine Rückmeldung der Klasse an und hält sie fest', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();

    // bis zur Verständniskontrolle blättern
    for (let index = 0; index < 20; index += 1) {
      if (screen.queryByRole('button', { name: 'mit Hilfe' })) break;
      await user.keyboard('{ArrowRight}');
    }

    await user.click(screen.getByRole('button', { name: 'mit Hilfe' }));
    expect(actions.recordObservation).toHaveBeenCalledWith(
      sequence.id,
      sequence.lexemes[0].id,
      expect.objectContaining({ result: 'supported', source: 'introduction' }),
    );
  });

  it('hält die Lösung im Abruf zunächst zurück', async () => {
    const user = userEvent.setup();
    setup();

    for (let index = 0; index < 20; index += 1) {
      if (screen.queryByRole('button', { name: 'Lösung' })) break;
      await user.keyboard('{ArrowRight}');
    }

    expect(screen.queryByText(EXPRESSION)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lösung' }));
    expect(screen.getByText(EXPRESSION)).toBeInTheDocument();
  });
});

describe('Korrektur einer Rückmeldung', () => {
  it('ersetzt die Rückmeldung eines Schritts, statt eine zweite anzulegen', async () => {
    const user = userEvent.setup();
    const { actions, sequence } = setup();

    for (let index = 0; index < 20; index += 1) {
      if (screen.queryByRole('button', { name: 'mit Hilfe' })) break;
      await user.keyboard('{ArrowRight}');
    }

    await user.click(screen.getByRole('button', { name: 'mit Hilfe' }));
    expect(actions.removeObservation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'sicher' }));
    expect(actions.removeObservation).toHaveBeenCalledWith(sequence.id, sequence.lexemes[0].id, 'obs_neu');
    expect(actions.recordObservation).toHaveBeenCalledTimes(2);
  });
});

describe('Korpusminiatur im Unterrichtsmodus', () => {
  function setupCorpus() {
    const demo = createDemoSequence();
    const lexeme = demo.lexemes.find((entry) => entry.corpus.enabled);
    if (!lexeme) throw new Error('Die Demo enthält keine Korpusminiatur.');
    const sequence = { ...demo, lexemes: [lexeme] };
    const view = renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence]);
    return { sequence, lexeme, ...view };
  }

  async function goToCorpus(user: ReturnType<typeof userEvent.setup>) {
    for (let index = 0; index < 20; index += 1) {
      if (screen.queryByRole('button', { name: 'Fokus markieren' })) return;
      await user.keyboard('{ArrowRight}');
    }
    throw new Error('Der Schritt „Korpusminiatur“ wurde nicht erreicht.');
  }

  it('erscheint als Schritt der Phase „Muster“ nach „Aussprache und Muster“', async () => {
    const user = userEvent.setup();
    setupCorpus();
    await goToCorpus(user);

    expect(screen.getByText('Phase 3: Muster')).toBeInTheDocument();
    expect(screen.getByText(/Korpusminiatur/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Aussprache und Muster/)).toBeInTheDocument();
  });

  it('zeigt beim Betreten nur Leitfrage und Belege', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupCorpus();
    await goToCorpus(user);

    expect(screen.getByText(lexeme.corpus.guidingQuestion)).toBeInTheDocument();
    expect(document.querySelectorAll('mark')).toHaveLength(0);
    expect(screen.queryByText(lexeme.corpus.ruleOrFinding)).not.toBeInTheDocument();
    expect(screen.queryByText(lexeme.corpus.transferPrompt)).not.toBeInTheDocument();
  });

  it('deckt Fokus, Gruppen, Regel und Transfer getrennt auf', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupCorpus();
    await goToCorpus(user);

    await user.click(screen.getByRole('button', { name: 'Fokus markieren' }));
    expect(document.querySelectorAll('mark').length).toBe(lexeme.corpus.examples.length);
    expect(screen.queryByText(/^Gruppen:/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gruppen zeigen' }));
    expect(screen.getByText('Gruppen: Sport/Spiel · Instrument')).toBeInTheDocument();
    expect(screen.queryByText(lexeme.corpus.ruleOrFinding)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Regel zeigen' }));
    expect(screen.getByText(lexeme.corpus.ruleOrFinding)).toBeInTheDocument();
    expect(screen.queryByText(lexeme.corpus.transferPrompt)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Transfer zeigen' }));
    expect(screen.getByText(lexeme.corpus.transferPrompt)).toBeInTheDocument();
  });

  it('lässt sich wieder zuklappen', async () => {
    const user = userEvent.setup();
    setupCorpus();
    await goToCorpus(user);

    await user.click(screen.getByRole('button', { name: 'Fokus markieren' }));
    expect(document.querySelectorAll('mark').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Fokus markieren' }));
    expect(screen.getByRole('button', { name: 'Fokus markieren' })).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelectorAll('mark')).toHaveLength(0);
  });

  it('beginnt bei der nächsten Einheit wieder verdeckt', async () => {
    const user = userEvent.setup();
    const demo = createDemoSequence();
    const first = demo.lexemes.find((entry) => entry.corpus.enabled);
    if (!first) throw new Error('Die Demo enthält keine Korpusminiatur.');
    const second = { ...first, id: 'lex_zweite' };
    const sequence = { ...demo, lexemes: [first, second] };
    renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence]);

    await goToCorpus(user);
    await user.click(screen.getByRole('button', { name: 'Fokus markieren' }));
    expect(document.querySelectorAll('mark').length).toBeGreaterThan(0);

    // bis zur Korpusminiatur der zweiten Einheit weiterblättern
    for (let index = 0; index < 30; index += 1) {
      if (screen.queryByText(/Einheit 2 von 2/) && screen.queryByRole('button', { name: 'Fokus markieren' })) break;
      await user.keyboard('{ArrowRight}');
    }

    expect(screen.getByRole('button', { name: 'Fokus markieren' })).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelectorAll('mark')).toHaveLength(0);
  });

  it('bietet Lehrkraftnotizen auf dem eigenen Bildschirm an', async () => {
    const user = userEvent.setup();
    setupCorpus();
    await goToCorpus(user);
    expect(screen.getAllByText(/^Für die Lehrkraft:/).length).toBeGreaterThan(0);
  });

  it('taucht ohne Korpusminiatur gar nicht auf', async () => {
    const user = userEvent.setup();
    setup();

    for (let index = 0; index < 20; index += 1) {
      expect(screen.queryByRole('button', { name: 'Fokus markieren' })).not.toBeInTheDocument();
      await user.keyboard('{ArrowRight}');
    }
  });
});
