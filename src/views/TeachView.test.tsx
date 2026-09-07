import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../domain/demo';
import { DEFAULT_SETTINGS } from '../domain/model';
import { renderWithStore } from '../test/renderWithStore';
import { TeachView } from './TeachView';
import { TeacherPanel } from './teach/TeachStage';
import { stepDefinition } from '../domain/steps';

const EXPRESSION = 'Ça te dit de… ?';
const EXPLANATION = 'On propose une activité à quelqu’un.';

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

  it('deckt die zielsprachliche Erklärung vor der Form auf', async () => {
    const user = userEvent.setup();
    setup();

    // bis zum Schritt „Bedeutung klären“ blättern
    for (let index = 0; index < 6; index += 1) {
      if (screen.queryByText(EXPLANATION)) break;
      await user.keyboard('{ArrowRight}');
    }
    expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
    expect(screen.queryByText(EXPRESSION)).not.toBeInTheDocument();
    // Die interne Bedeutung steht als Lehrkrafthinweis daneben, nicht als Bühnentext.
    expect(screen.getByText(/Interne Bedeutung:/)).toBeInTheDocument();
  });

  it('blendet Informationen einzeln ein und aus', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Schriftbild' }));
    expect(screen.getByText(EXPRESSION)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Schriftbild' }));
    expect(screen.queryByText(EXPRESSION)).not.toBeInTheDocument();

    // Die erstsprachliche Reserve wird ausdrücklich freigegeben.
    await user.click(screen.getByRole('button', { name: 'Erstsprache' }));
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

  it('erscheint als Schritt der Phase „Muster“ hinter der Kollokation', async () => {
    const user = userEvent.setup();
    setupCorpus();
    await goToCorpus(user);

    expect(screen.getByText('Phase 3: Muster')).toBeInTheDocument();
    expect(screen.getByText(/Korpusminiatur/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Kollokation ergänzen|Aussprache und Muster/)).toBeInTheDocument();
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

describe('Bedeutungsprüfung im Unterricht', () => {
  function setupCcq() {
    const demo = createDemoSequence();
    const lexeme = demo.lexemes[0];
    const sequence = { ...demo, lexemes: [lexeme] };
    const view = renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence]);
    return { sequence, lexeme, ...view };
  }

  async function goToCcq(user: ReturnType<typeof userEvent.setup>) {
    for (let index = 0; index < 12; index += 1) {
      if (screen.queryByText(/Bedeutung prüfen/)) return;
      await user.keyboard('{ArrowRight}');
    }
    throw new Error('Der Schritt „Bedeutung prüfen“ wurde nicht erreicht.');
  }

  it('erscheint in der Phase „Klarheit“ hinter der Klärung', async () => {
    const user = userEvent.setup();
    setupCcq();
    await goToCcq(user);

    expect(screen.getByText('Phase 2: Klarheit')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Bedeutung klären/)).toBeInTheDocument();
  });

  it('zeigt die Frage, hält die erwartete Antwort aber zurück', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupCcq();
    await goToCcq(user);

    expect(screen.getByText(lexeme.ccqs[0].question)).toBeInTheDocument();
    // Auf dem Lehrkraftbildschirm steht die Antwort bereit …
    expect(screen.getByText(/Erwartet: Elle propose\./)).toBeInTheDocument();
    // … und die Klasse sieht sie erst nach „Antwort zeigen“.
    expect(screen.getByRole('button', { name: 'Antwort zeigen' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('blättert durch mehrere Fragen, bevor der Schritt endet', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupCcq();
    await goToCcq(user);

    expect(screen.getByText('Frage 1 von 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nächste Frage' }));
    expect(screen.getByText('Frage 2 von 2')).toBeInTheDocument();
    expect(screen.getByText(lexeme.ccqs[1].question)).toBeInTheDocument();

    // Die Pfeiltaste blättert erst die Fragen durch und geht dann weiter.
    await user.click(screen.getByRole('button', { name: 'Vorherige Frage' }));
    expect(screen.getByText('Frage 1 von 2')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Frage 2 von 2')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.queryByText(/Frage 2 von 2/)).not.toBeInTheDocument();
  });

  it('ordnet die Rückmeldung der geprüften Dimension zu', async () => {
    const user = userEvent.setup();
    const { actions, sequence, lexeme } = setupCcq();
    await goToCcq(user);

    await user.click(screen.getByRole('button', { name: 'sicher' }));
    expect(actions.recordObservation).toHaveBeenCalledWith(
      sequence.id,
      lexeme.id,
      expect.objectContaining({ dimension: 'use', result: 'secure', source: 'introduction' }),
    );
  });

  it('bietet bei Unsicherheit die alternative Klärung und den Rücksprung an', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupCcq();
    await goToCcq(user);

    expect(screen.queryByRole('button', { name: 'Zurück zur Klärung' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'mit Hilfe' }));
    await user.click(screen.getByRole('button', { name: 'Alternative Klärung zeigen' }));
    expect(screen.getByText(new RegExp(lexeme.ccqs[0].alternativeClarification))).toBeInTheDocument();

    // Zurück zur Klärung – und von dort wieder zur Frage.
    await user.click(screen.getByRole('button', { name: 'Zurück zur Klärung' }));
    expect(screen.getByText(/Bedeutung klären/)).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(lexeme.ccqs[0].question)).toBeInTheDocument();
  });
});

describe('Erstsprachliche Reserve', () => {
  it('bietet die Freigabe an und blendet die Übersetzung ein', async () => {
    const user = userEvent.setup();
    setup();

    const release = screen.getByRole('button', { name: 'Erstsprache' });
    expect(release).toHaveAttribute('aria-pressed', 'false');
    await user.click(release);
    expect(screen.getByText('Hast du Lust, …?')).toBeInTheDocument();
  });

  it('entfällt im streng zielsprachlichen Modus', () => {
    const sequence = createDemoSequence();
    renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence], {
      state: { settings: { ...DEFAULT_SETTINGS, teachingLanguageMode: 'strict' } },
    });
    expect(screen.queryByRole('button', { name: 'Erstsprache' })).not.toBeInTheDocument();
  });
});

describe('Lehrkraftfeld während der Projektion', () => {
  it('trägt die Angaben zur laufenden Frage, die die Klasse nicht sieht', () => {
    const demo = createDemoSequence();
    const lexeme = demo.lexemes[0];
    const step = stepDefinition('ccq')!;

    const { unmount } = renderWithStore(<TeacherPanel lexeme={lexeme} step={step} />, [demo]);
    expect(screen.getByText('Frage 1 von 2')).toBeInTheDocument();
    expect(screen.getByText(/Erwartet: Elle propose\./)).toBeInTheDocument();
    expect(screen.getByText(/Prüft:/)).toBeInTheDocument();
    unmount();

    renderWithStore(<TeacherPanel lexeme={lexeme} step={step} ccqIndex={1} />, [demo]);
    expect(screen.getByText('Frage 2 von 2')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Erwartet: ${lexeme.ccqs[1].expectedAnswer}`))).toBeInTheDocument();
  });
});

describe('Wort herauslocken im Unterricht', () => {
  function setupElicit() {
    const demo = createDemoSequence();
    const lexeme = demo.lexemes[0];
    const sequence = { ...demo, lexemes: [lexeme] };
    const view = renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence]);
    return { sequence, lexeme, ...view };
  }

  async function goTo(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
    for (let index = 0; index < 16; index += 1) {
      if (screen.queryByText(label)) return;
      await user.keyboard('{ArrowRight}');
    }
    throw new Error(`Der Schritt ${label} wurde nicht erreicht.`);
  }

  it('folgt auf die Bedeutungsprüfung und hält das Wort zurück', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupElicit();
    await goTo(user, /Wort herauslocken/);

    expect(screen.queryByText(lexeme.expression)).not.toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Bedeutung prüfen/)).toBeInTheDocument();
  });

  it('gibt erst den Anlaut und dann das Wort', async () => {
    const user = userEvent.setup();
    const { lexeme } = setupElicit();
    await goTo(user, /Wort herauslocken/);

    await user.click(screen.getByRole('button', { name: 'Anlaut geben' }));
    expect(screen.getByText(lexeme.wordCue)).toBeInTheDocument();
    expect(screen.queryByText(lexeme.expression)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Wort nennen' }));
    expect(screen.getByText(lexeme.expression)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Warten' }));
    expect(screen.queryByText(lexeme.expression)).not.toBeInTheDocument();
  });
});

describe('Aussprache im Unterricht', () => {
  it('führt die fünf Stufen und zeigt die ganze Wendung', async () => {
    const user = userEvent.setup();
    const demo = createDemoSequence();
    const lexeme = demo.lexemes[0];
    renderWithStore(<TeachView sequenceId={demo.id} />, [{ ...demo, lexemes: [lexeme] }]);

    for (let index = 0; index < 16; index += 1) {
      if (screen.queryByText(/Aussprache und Muster/)) break;
      await user.keyboard('{ArrowRight}');
    }

    await user.click(screen.getByRole('button', { name: 'Aussprache üben' }));
    expect(screen.getByText(lexeme.keyCollocation)).toBeInTheDocument();
    expect(screen.getByText('Stufe 1 von 5 · Vorsprechen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nächste Stufe' }));
    expect(screen.getByText('Stufe 2 von 5 · Chorisch')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Einzeln' }));
    expect(screen.getByText('Stufe 4 von 5 · Einzeln')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aussprachearbeit beenden' }));
    expect(screen.queryByText(/Stufe 4 von 5/)).not.toBeInTheDocument();
  });
});

describe('Beitrag der Lerngruppe', () => {
  it('nimmt eine Wendung auf und speichert sie zur Einheit', async () => {
    const user = userEvent.setup();
    const demo = createDemoSequence();
    const lexeme = demo.lexemes[0];
    const { actions } = renderWithStore(<TeachView sequenceId={demo.id} />, [{ ...demo, lexemes: [lexeme] }]);

    await user.click(screen.getByRole('button', { name: 'Beitrag aufnehmen' }));
    await user.type(screen.getByLabelText('Ausdruck oder Wendung aus der Klasse'), 'On y va !');
    await user.click(screen.getByRole('button', { name: 'Übernehmen' }));

    expect(actions.updateLexeme).toHaveBeenCalledWith(demo.id, lexeme.id, {
      classContributions: [...lexeme.classContributions, 'On y va !'],
    });
  });
});
