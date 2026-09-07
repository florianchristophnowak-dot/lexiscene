import { describe, expect, it } from 'vitest';
import { createLexeme, createReactivationPlan, createSequence } from './schema';
import { createConceptCheck } from './ccq';
import { createCorpusExample, createCorpusMiniature } from './corpus';
import { checkReadiness, summarizeReadiness } from './readiness';

const complete = () =>
  createLexeme({
    expression: 'Ça te dit de… ?',
    coreMeaning: 'Hast du Lust?',
    situation: 'Zwei Jugendliche verabreden sich.',
    sentenceFrame: 'Ça te dit de + Infinitiv ?',
    checkTemplateId: 'ausdruck-auswaehlen',
    checkTemplateIdSecondary: 'situation-zu-ausdruck',
    ccqs: [createConceptCheck({ question: 'Est-ce une proposition ?', expectedAnswer: 'Oui.' })],
    learningGoal: 'productive',
    repertoire: 'kern',
  });

const ids = (sequence: Parameters<typeof checkReadiness>[0]) => checkReadiness(sequence).map((finding) => finding.id);

describe('Bereitschaftscheck', () => {
  it('meldet nichts Wesentliches bei einer vorbereiteten Sequenz', () => {
    const sequence = createSequence({
      canDoGoal: 'Die Lernenden können einen Vorschlag machen.',
      lexemes: [complete()],
      reactivation: createReactivationPlan({ enabled: true, anchor: Date.now() }),
    });
    expect(summarizeReadiness(sequence).toComplete).toBe(0);
  });

  it('vermisst das kommunikative Kann-Ziel', () => {
    expect(ids(createSequence({ lexemes: [complete()] }))).toContain('can-do');
  });

  it('vermisst Kernbedeutung und Kontext', () => {
    const sequence = createSequence({ lexemes: [createLexeme({ expression: 'x' })] });
    expect(ids(sequence)).toEqual(expect.arrayContaining(['core-meaning', 'context']));
  });

  it('vermisst den Musteranker nur bei produktiven Kerneinheiten', () => {
    const productive = createSequence({
      lexemes: [createLexeme({ ...complete(), sentenceFrame: '' })],
    });
    expect(ids(productive)).toContain('pattern-anchor');

    const receptive = createSequence({
      lexemes: [createLexeme({ ...complete(), sentenceFrame: '', learningGoal: 'receptive' })],
    });
    expect(ids(receptive)).not.toContain('pattern-anchor');
  });

  it('vermisst Abrufimpuls und Lösung', () => {
    const withoutRetrieval = createSequence({
      lexemes: [createLexeme({ ...complete(), checkTemplateId: '', communicativeTask: '' })],
    });
    expect(ids(withoutRetrieval)).toContain('retrieval');

    const withoutSolution = createSequence({
      lexemes: [
        createLexeme({
          expression: 'x',
          situation: 'irgendeine Situation',
          communicativeTask: 'Verwendet die Einheit.',
        }),
      ],
    });
    expect(ids(withoutSolution)).toContain('confirmation');
  });

  it('empfiehlt bei mehreren Einheiten einer Verwechslungsgruppe eine Staffelung', () => {
    const sequence = createSequence({
      lexemes: [
        createLexeme({ ...complete(), confusionGroup: 'Kleidung' }),
        createLexeme({ ...complete(), id: 'lex_b', confusionGroup: 'kleidung' }),
      ],
    });
    const finding = checkReadiness(sequence).find((entry) => entry.id.startsWith('confusion-'));
    expect(finding?.severity).toBe('vertiefen');
    expect(finding?.lexemeIds).toHaveLength(2);
  });

  it('regt bei produktiven Kerneinheiten beide Abrufrichtungen an', () => {
    // Ohne Situation und Äußerung findet die App keine Aufgabe aus dem Kontext heraus.
    const oneDirection = createSequence({
      canDoGoal: 'Ziel',
      lexemes: [
        createLexeme({
          ...complete(),
          situation: '',
          example: '',
          modelUtterance: '',
          checkTemplateIdSecondary: '',
        }),
      ],
    });
    const finding = checkReadiness(oneDirection).find((entry) => entry.id === 'both-directions');
    expect(finding?.severity).toBe('vertiefen');
    expect(ids(createSequence({ canDoGoal: 'Ziel', lexemes: [complete()] }))).not.toContain('both-directions');
  });

  it('unterscheidet zwischen Ergänzen und Vertiefen und blockiert nie', () => {
    const sequence = createSequence({ lexemes: [createLexeme({ expression: 'x' })] });
    const summary = summarizeReadiness(sequence);
    expect(summary.toComplete).toBeGreaterThan(0);
    expect(summary.optional).toBeGreaterThan(0);
    expect(summary.findings.every((finding) => ['ergaenzen', 'vertiefen'].includes(finding.severity))).toBe(true);
  });
});

describe('Bereitschaftscheck und Korpusminiaturen', () => {
  const miniature = (count: number) =>
    createCorpusMiniature({
      enabled: true,
      examples: Array.from({ length: count }, (_, index) => createCorpusExample({ text: `Beleg ${index + 1}` })),
    });

  it('schweigt, solange keine Miniatur eingeschaltet ist', () => {
    const sequence = createSequence({ lexemes: [complete()] });
    expect(ids(sequence)).not.toEqual(expect.arrayContaining(['corpus-incomplete', 'corpus-step-off']));
  });

  it('meldet eine Miniatur mit zu wenigen Belegen', () => {
    const sequence = createSequence({ lexemes: [createLexeme({ ...complete(), corpus: miniature(2) })] });
    expect(ids(sequence)).toContain('corpus-incomplete');
  });

  it('weist darauf hin, dass eine fertige Miniatur nicht eingeschaltet ist', () => {
    const sequence = createSequence({ lexemes: [createLexeme({ ...complete(), corpus: miniature(3) })] });
    const finding = checkReadiness(sequence).find((entry) => entry.id === 'corpus-step-off');
    expect(finding?.severity).toBe('vertiefen');
  });

  it('schweigt, sobald der Schritt für die Einheit eingeschaltet ist', () => {
    const sequence = createSequence({
      lexemes: [createLexeme({ ...complete(), corpus: miniature(3), stepOverrides: { korpusminiatur: true } })],
    });
    expect(ids(sequence)).not.toContain('corpus-step-off');
  });
});
