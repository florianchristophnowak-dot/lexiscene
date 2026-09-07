import { describe, expect, it } from 'vitest';
import {
  CCQ_STEMS,
  CCQ_TEMPLATES,
  ccqDimension,
  ccqTemplate,
  ccqTemplateFits,
  ccqWarnings,
  createConceptCheck,
  hasQuestion,
  hasUsableCcq,
  isCcqTemplateId,
  moveCcq,
  normalizeConceptChecks,
  recommendedCcqTemplates,
  resolveCcqQuestion,
  usableCcqs,
} from './ccq';
import { createLexeme, createSequence } from './schema';
import { resolveSteps, stepDimension, stepHasContent } from './steps';
import { de } from '../i18n/de';
import { promptFor } from '../i18n/prompts';

const phrase = (key: string, params?: Record<string, string>) => promptFor('fr', key, params);

const withChecks = (...questions: string[]) =>
  createLexeme({
    expression: 'Ça te dit de… ?',
    coreMeaning: 'Hast du Lust?',
    ccqs: questions.map((question) => createConceptCheck({ question, expectedAnswer: 'Oui.' })),
  });

describe('Normalisierung', () => {
  it('liest unvollständige und ungültige Angaben tolerant', () => {
    const checks = normalizeConceptChecks([
      { question: 'Est-ce positif ?' },
      null,
      'keine Frage',
      { question: 'x', feature: 'unbekannt', format: 'unsinn', target: 'was-auch-immer', options: ['a', '', 'b', 7] },
    ]);

    expect(checks).toHaveLength(2);
    expect(checks[0]).toMatchObject({ feature: 'kernbedeutung', format: 'ja-nein', target: 'meaning' });
    expect(checks[1].options).toEqual(['a', 'b']);
    expect(checks.every((check) => check.id.length > 0)).toBe(true);
  });

  it('vergibt doppelte Kennungen neu', () => {
    const checks = normalizeConceptChecks([
      { id: 'ccq_1', question: 'a' },
      { id: 'ccq_1', question: 'b' },
    ]);
    expect(checks[0].id).not.toBe(checks[1].id);
  });

  it('überlebt eine Runde durch JSON unverändert', () => {
    const checks = withChecks('Est-ce une proposition ?').ccqs;
    expect(normalizeConceptChecks(JSON.parse(JSON.stringify(checks)))).toEqual(checks);
  });
});

describe('Vorlagen und Fragestämme', () => {
  it('trennt CCQ-Vorlagen von Abrufvorlagen', () => {
    expect(CCQ_TEMPLATES.map((template) => template.id)).toEqual([
      'welches-bild',
      'welche-situation',
      'beispiel-nichtbeispiel',
      'welche-bedeutung',
      'sprechhandlung',
    ]);
    expect(isCcqTemplateId('welcher-ausdruck-fehlt')).toBe(false);
  });

  it('beschreibt jede Vorlage und jeden Stamm im Sprachkatalog', () => {
    for (const template of CCQ_TEMPLATES) {
      expect(de[`ccq.template.${template.id}` as keyof typeof de]).toBeTruthy();
      expect(de[`ccq.template.${template.id}.purpose` as keyof typeof de]).toBeTruthy();
      expect(phrase(template.scaffold)).toBeTruthy();
    }
    for (const stem of CCQ_STEMS) {
      expect(de[`ccq.stem.${stem.id}` as keyof typeof de]).toBeTruthy();
      expect(promptFor('fr', `ccq.stem.${stem.id}`)).toBeTruthy();
    }
  });

  it('setzt den Fragerahmen in der Zielsprache ein, ohne etwas zu behaupten', () => {
    const lexeme = createLexeme({ expression: 'jouer à', imageId: 'media_1' });
    const check = createConceptCheck({ templateId: 'welches-bild' });
    expect(resolveCcqQuestion(check, lexeme, phrase)).toBe('Quelle image correspond à « jouer à » ?');
    // Eine eigene Formulierung hat Vorrang.
    expect(resolveCcqQuestion({ ...check, question: 'Eigene Frage' }, lexeme, phrase)).toBe('Eigene Frage');
  });

  it('bietet nur Vorlagen an, für die Material vorliegt', () => {
    const withoutImage = createLexeme({ expression: 'x' });
    expect(ccqTemplateFits(ccqTemplate('welches-bild')!, withoutImage)).toBe(false);
    expect(ccqTemplateFits(ccqTemplate('welche-situation')!, withoutImage)).toBe(true);
  });

  it('empfiehlt Vorlagen je lexikalischem Typ', () => {
    const polysem = createLexeme({ expression: 'x', lexicalType: 'polysem' });
    expect(recommendedCcqTemplates(polysem).map((entry) => entry.id)).toContain('welche-bedeutung');
  });
});

describe('Schritt „Bedeutung prüfen“', () => {
  it('entfällt ohne verwendbare Frage', () => {
    const empty = createLexeme({ expression: 'x', coreMeaning: 'y' });
    expect(hasUsableCcq(empty)).toBe(false);
    expect(stepHasContent('ccq', empty)).toBe(false);

    const blank = createLexeme({ expression: 'x', ccqs: [createConceptCheck({ question: '   ' })] });
    expect(usableCcqs(blank)).toHaveLength(0);
    expect(stepHasContent('ccq', blank)).toBe(false);
  });

  it('erscheint, sobald eine Frage oder eine Vorlage vorliegt', () => {
    expect(stepHasContent('ccq', withChecks('Est-ce une proposition ?'))).toBe(true);
    const fromTemplate = createLexeme({
      expression: 'x',
      ccqs: [createConceptCheck({ templateId: 'welche-situation' })],
    });
    expect(hasQuestion(fromTemplate.ccqs[0])).toBe(true);
    expect(stepHasContent('ccq', fromTemplate)).toBe(true);
  });

  it('steht in der Standardreihenfolge hinter „Bedeutung klären“', () => {
    const lexeme = withChecks('Est-ce une proposition ?');
    const sequence = createSequence({ lexemes: [lexeme] });
    const ids = resolveSteps(sequence, lexeme).map((step) => step.id);
    expect(ids[ids.indexOf('ccq') - 1]).toBe('klaeren');
  });

  it('ordnet die Rückmeldung der geprüften Dimension zu', () => {
    const meaning = withChecks('Est-ce positif ?');
    expect(ccqDimension(meaning)).toBe('meaning');
    expect(stepDimension('ccq', meaning)).toBe('meaning');

    const use = createLexeme({
      expression: 'x',
      ccqs: [createConceptCheck({ question: 'À un ami ou à la directrice ?', target: 'use' })],
    });
    expect(ccqDimension(use)).toBe('use');
    expect(stepDimension('ccq', use)).toBe('use');
  });
});

describe('Reihenfolge', () => {
  it('verschiebt eine Frage an die Zielposition', () => {
    const checks = ['a', 'b', 'c'].map((question) => createConceptCheck({ question }));
    expect(moveCcq(checks, 2, 0).map((check) => check.question)).toEqual(['c', 'a', 'b']);
    expect(moveCcq(checks, 5, 0)).toBe(checks);
    expect(moveCcq(checks, 1, 1)).toBe(checks);
  });
});

describe('Qualitätshinweise', () => {
  it('erkennt eine Verständnisabfrage', () => {
    const warnings = ccqWarnings([createConceptCheck({ question: 'Habt ihr das verstanden?', expectedAnswer: 'ja' })]);
    expect(warnings.map((entry) => entry.key)).toContain('ccq.warning.comprehension');
  });

  it('erkennt eine Frage nach der Form', () => {
    const warnings = ccqWarnings([
      createConceptCheck({ question: 'Wie sagt man das auf Französisch?', expectedAnswer: 'x' }),
    ]);
    expect(warnings.map((entry) => entry.key)).toContain('ccq.warning.form');
  });

  it('vermisst die erwartete Antwort', () => {
    const warnings = ccqWarnings([createConceptCheck({ question: 'Est-ce positif ?' })]);
    expect(warnings.map((entry) => entry.key)).toContain('ccq.warning.noAnswer');
  });

  it('meldet sehr lange Fragen', () => {
    const warnings = ccqWarnings([
      createConceptCheck({ question: `Est-ce que ${'très '.repeat(30)}long ?`, expectedAnswer: 'Oui.' }),
    ]);
    expect(warnings.map((entry) => entry.key)).toContain('ccq.warning.long');
  });

  it('meldet, wenn jede Ja/Nein-Frage mit „ja“ beantwortet wird', () => {
    const warnings = ccqWarnings([
      createConceptCheck({ question: 'Est-ce positif ?', expectedAnswer: 'Oui' }),
      createConceptCheck({ question: 'C’est possible ?', expectedAnswer: 'oui.' }),
    ]);
    expect(warnings.map((entry) => entry.key)).toContain('ccq.warning.allYes');

    const mixed = ccqWarnings([
      createConceptCheck({ question: 'Est-ce positif ?', expectedAnswer: 'Oui' }),
      createConceptCheck({ question: 'C’est obligatoire ?', expectedAnswer: 'Non' }),
    ]);
    expect(mixed.map((entry) => entry.key)).not.toContain('ccq.warning.allYes');
  });

  it('schweigt bei einer sauber vorbereiteten Frage', () => {
    expect(ccqWarnings([createConceptCheck({ question: 'Est-ce une proposition ?', expectedAnswer: 'Oui.' })])).toEqual(
      [],
    );
  });
});
