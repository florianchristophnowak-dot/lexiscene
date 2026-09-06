import { describe, expect, it } from 'vitest';
import { createLexeme, createReactivationPlan, createSequence } from './schema';
import { checkReadiness, summarizeReadiness } from './readiness';

const complete = () =>
  createLexeme({
    expression: 'Ça te dit de… ?',
    coreMeaning: 'Hast du Lust?',
    situation: 'Zwei Jugendliche verabreden sich.',
    sentenceFrame: 'Ça te dit de + Infinitiv ?',
    checkTemplateId: 'welche-situation',
    checkTemplateIdSecondary: 'situation-zu-ausdruck',
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
    const oneDirection = createSequence({
      canDoGoal: 'Ziel',
      lexemes: [createLexeme({ ...complete(), checkTemplateIdSecondary: '' })],
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
