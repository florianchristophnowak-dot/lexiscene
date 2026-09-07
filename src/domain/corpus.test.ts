import { describe, expect, it } from 'vitest';
import {
  CORPUS_MIN_EXAMPLES,
  appendExampleLines,
  corpusCategories,
  corpusMiniatureReady,
  corpusStages,
  corpusWarnings,
  createCorpusExample,
  createCorpusMiniature,
  highlightCount,
  moveCorpusExample,
  normalizeCorpusMiniature,
  parseExampleLines,
  splitHighlight,
  usableExamples,
} from './corpus';
import { createLexeme, createSequence } from './schema';
import { resolveSteps, stepDimension, stepHasContent, stepPhase } from './steps';

const jouer = () =>
  createCorpusMiniature({
    enabled: true,
    title: 'jouer à oder jouer de?',
    guidingQuestion: 'Was steht nach jouer?',
    examples: [
      createCorpusExample({ text: 'Nous jouons au tennis.', highlight: 'au tennis', category: 'Sport/Spiel' }),
      createCorpusExample({ text: 'Ils jouent aux échecs.', highlight: 'aux échecs', category: 'Sport/Spiel' }),
      createCorpusExample({ text: 'Elle joue du piano.', highlight: 'du piano', category: 'Instrument' }),
    ],
    ruleOrFinding: 'jouer à + Sport · jouer de + Instrument',
  });

describe('Normalisierung', () => {
  it('macht aus fehlenden Daten eine leere, deaktivierte Miniatur', () => {
    expect(normalizeCorpusMiniature(undefined)).toEqual(createCorpusMiniature());
    expect(normalizeCorpusMiniature('unsinn')).toEqual(createCorpusMiniature());
    expect(normalizeCorpusMiniature([]).enabled).toBe(false);
  });

  it('liest unvollständige und ungültige Angaben tolerant', () => {
    const miniature = normalizeCorpusMiniature({
      enabled: 'ja',
      title: 42,
      focus: 'unbekannt',
      provenance: 'aus-dem-netz',
      examples: [{ text: 'Elle joue de la guitare.' }, null, 'kein Beleg', { highlight: 'ohne Text' }],
      unbekanntesFeld: true,
    });

    // „enabled“ ist nur bei echtem true gesetzt – nichts wird ungefragt aktiviert.
    expect(miniature.enabled).toBe(false);
    expect(miniature.title).toBe('');
    expect(miniature.focus).toBe('pattern');
    expect(miniature.provenance).toBe('teacher-created');
    expect(miniature.examples).toHaveLength(2);
    expect(miniature.examples[0].text).toBe('Elle joue de la guitare.');
    expect(miniature.examples[0].category).toBe('');
    expect(miniature.examples.every((example) => example.id.length > 0)).toBe(true);
  });

  it('vergibt doppelte Kennungen neu', () => {
    const miniature = normalizeCorpusMiniature({
      examples: [
        { id: 'beleg_1', text: 'a' },
        { id: 'beleg_1', text: 'b' },
      ],
    });
    expect(miniature.examples[0].id).not.toBe(miniature.examples[1].id);
  });

  it('überlebt eine Runde durch JSON unverändert', () => {
    const miniature = jouer();
    expect(normalizeCorpusMiniature(JSON.parse(JSON.stringify(miniature)))).toEqual(miniature);
  });
});

describe('Mehrfacheingabe', () => {
  it('macht aus fünf Zeilen fünf Belege und übergeht leere Zeilen', () => {
    const pasted = 'Un\n\nDeux\n   \nTrois\nQuatre\nCinq\n';
    expect(parseExampleLines(pasted)).toEqual(['Un', 'Deux', 'Trois', 'Quatre', 'Cinq']);
    expect(appendExampleLines([], pasted)).toHaveLength(5);
  });

  it('hängt an und überschreibt vorhandene Belege nicht', () => {
    const existing = [createCorpusExample({ text: 'Vorhandener Beleg', highlight: 'Vorhandener' })];
    const result = appendExampleLines(existing, 'Neu eins\nNeu zwei');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(existing[0]);
    expect(result.map((example) => example.text)).toEqual(['Vorhandener Beleg', 'Neu eins', 'Neu zwei']);
  });

  it('lässt die Belege unverändert, wenn nichts Verwertbares eingefügt wurde', () => {
    const existing = [createCorpusExample({ text: 'a' })];
    expect(appendExampleLines(existing, '\n   \n')).toBe(existing);
  });
});

describe('Reihenfolge der Belege', () => {
  it('verschiebt einen Beleg an die Zielposition', () => {
    const examples = ['a', 'b', 'c'].map((text) => createCorpusExample({ text }));
    expect(moveCorpusExample(examples, 2, 0).map((example) => example.text)).toEqual(['c', 'a', 'b']);
    expect(moveCorpusExample(examples, 0, 1).map((example) => example.text)).toEqual(['b', 'a', 'c']);
  });

  it('lässt ungültige Indizes unverändert', () => {
    const examples = ['a', 'b'].map((text) => createCorpusExample({ text }));
    expect(moveCorpusExample(examples, 5, 0)).toBe(examples);
    expect(moveCorpusExample(examples, 0, 0)).toBe(examples);
    expect(moveCorpusExample(examples, 0, 99).map((example) => example.text)).toEqual(['b', 'a']);
  });
});

describe('Markierung', () => {
  it('markiert alle Vorkommen und lässt den Beleg unverändert', () => {
    const segments = splitHighlight('On joue au foot, puis on joue au tennis.', 'joue au');
    expect(segments.filter((segment) => segment.mark)).toHaveLength(2);
    expect(segments.map((segment) => segment.text).join('')).toBe('On joue au foot, puis on joue au tennis.');
  });

  it('verarbeitet Akzente und französische Apostrophe korrekt', () => {
    expect(highlightCount('Ils jouent aux échecs.', 'aux échecs')).toBe(1);
    expect(highlightCount("Ça te dit d’aller au cinéma ?", 'd’aller')).toBe(1);
    expect(highlightCount('Elle joue de la guitare.', 'de la guitare')).toBe(1);
    // Ein anderer Apostroph ist eine andere Zeichenfolge – und wird nicht gefunden.
    expect(highlightCount("Ça te dit d’aller au cinéma ?", "d'aller")).toBe(0);
  });

  it('findet nichts, wenn die Markierung nicht im Beleg steht', () => {
    expect(highlightCount('Elle joue du piano.', 'au piano')).toBe(0);
    expect(splitHighlight('Elle joue du piano.', 'au piano')).toEqual([{ text: 'Elle joue du piano.', mark: false }]);
  });

  it('gibt ohne Markierung den ganzen Beleg unmarkiert zurück', () => {
    expect(splitHighlight('Elle joue du piano.', '   ')).toEqual([{ text: 'Elle joue du piano.', mark: false }]);
  });
});

describe('Hinweise für die Vorbereitung', () => {
  it('warnt, wenn eine Markierung nicht gefunden wird', () => {
    const miniature = jouer();
    miniature.examples[2] = { ...miniature.examples[2], highlight: 'au piano' };
    const warnings = corpusWarnings(miniature);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].exampleId).toBe(miniature.examples[2].id);
    expect(warnings[0].key).toBe('corpus.warning.highlightMissing');
    expect(warnings[0].params?.highlight).toBe('au piano');
  });

  it('weist auf zu wenige Belege hin', () => {
    const miniature = createCorpusMiniature({ enabled: true, examples: [createCorpusExample({ text: 'Nur einer.' })] });
    expect(corpusWarnings(miniature).some((warning) => warning.id === 'zu-wenige-belege')).toBe(true);
  });

  it('schweigt bei einer deaktivierten Miniatur', () => {
    expect(corpusWarnings(createCorpusMiniature({ examples: [] }))).toEqual([]);
  });

  it('sagt bei vollständigen Angaben nichts', () => {
    expect(corpusWarnings(jouer())).toEqual([]);
  });
});

describe('Stufen der Präsentation', () => {
  it('bietet nur Stufen an, für die es Inhalt gibt', () => {
    expect(corpusStages(jouer())).toEqual({ highlight: true, groups: true, rule: true, transfer: false });
    const plain = createCorpusMiniature({
      enabled: true,
      examples: [createCorpusExample({ text: 'Ein Beleg ohne alles.' })],
    });
    expect(corpusStages(plain)).toEqual({ highlight: false, groups: false, rule: false, transfer: false });
  });

  it('nennt die Gruppen in der Reihenfolge ihres Auftretens', () => {
    expect(corpusCategories(jouer())).toEqual(['Sport/Spiel', 'Instrument']);
  });
});

describe('Schritt „Korpusminiatur“', () => {
  it('gehört zur Phase Muster und folgt auf „Aussprache und Muster“', () => {
    expect(stepPhase('korpusminiatur')?.id).toBe('muster');
    expect(stepDimension('korpusminiatur')).toBe('pattern');
    const order = createSequence().stepOrder;
    expect(order[order.indexOf('korpusminiatur') - 1]).toBe('fokus');
  });

  it('wird erst ab drei Belegen und nur im aktivierten Zustand angeboten', () => {
    expect(CORPUS_MIN_EXAMPLES).toBe(3);

    const disabled = createLexeme({ expression: 'jouer', corpus: { ...jouer(), enabled: false } });
    expect(stepHasContent('korpusminiatur', disabled)).toBe(false);

    const tooFew = createLexeme({
      expression: 'jouer',
      corpus: createCorpusMiniature({
        enabled: true,
        examples: [createCorpusExample({ text: 'a' }), createCorpusExample({ text: 'b' }), createCorpusExample({ text: '   ' })],
      }),
    });
    expect(usableExamples(tooFew.corpus)).toHaveLength(2);
    expect(corpusMiniatureReady(tooFew.corpus)).toBe(false);
    expect(stepHasContent('korpusminiatur', tooFew)).toBe(false);

    const ready = createLexeme({ expression: 'jouer', corpus: jouer() });
    expect(stepHasContent('korpusminiatur', ready)).toBe(true);
  });

  it('bleibt in neuen Sequenzen abgeschaltet, bis eine Einheit ihn einschaltet', () => {
    const sequence = createSequence();
    expect(sequence.steps.korpusminiatur).toBe(false);

    const silent = createLexeme({ expression: 'jouer', corpus: jouer() });
    expect(resolveSteps({ ...sequence, lexemes: [silent] }, silent).map((step) => step.id)).not.toContain(
      'korpusminiatur',
    );

    const shown = createLexeme({ expression: 'jouer', corpus: jouer(), stepOverrides: { korpusminiatur: true } });
    expect(resolveSteps({ ...sequence, lexemes: [shown] }, shown).map((step) => step.id)).toContain('korpusminiatur');
  });
});
