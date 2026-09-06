// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createDemoSequence } from '../domain/demo';
import { createCorpusExample, createCorpusMiniature } from '../domain/corpus';
import { createLexeme, createSequence, SchemaError } from '../domain/schema';
import type { MediaRecord } from '../domain/model';
import { ZipError } from './zip';
import {
  buildBackup,
  buildSequenceExport,
  mediaExtension,
  parseBackup,
  parseSequenceDocument,
  sequenceExportFileName,
} from './backup';

const mediaRecord = (id: string, bytes: number[]): MediaRecord => ({
  id,
  name: 'bild.png',
  mimeType: 'image/png',
  kind: 'image',
  size: bytes.length,
  createdAt: 1_700_000_000_000,
  blob: new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
});

describe('Sicherung', () => {
  it('schreibt und liest Sequenzen samt Medien', async () => {
    const sequence = createSequence({
      title: 'Freizeit verabreden',
      lexemes: [createLexeme({ expression: 'Ça te dit de… ?', coreMeaning: 'Hast du Lust?', imageId: 'media_1' })],
    });
    const blob = await buildBackup([sequence], [mediaRecord('media_1', [1, 2, 3, 4])]);
    const restored = await parseBackup(await blob.arrayBuffer());

    expect(restored.warnings).toEqual([]);
    expect(restored.sequences).toHaveLength(1);
    expect(restored.sequences[0].title).toBe('Freizeit verabreden');
    expect(restored.sequences[0].lexemes[0].expression).toBe('Ça te dit de… ?');
    expect(restored.media).toHaveLength(1);
    expect(new Uint8Array(await restored.media[0].blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(restored.media[0].mimeType).toBe('image/png');
  });

  it('überträgt die vollständige Beispielsequenz verlustfrei', async () => {
    const demo = createDemoSequence();
    const restored = await parseBackup(await (await buildBackup([demo], [])).arrayBuffer());
    expect(restored.sequences[0]).toEqual(demo);
  });

  it('meldet fehlende Mediendateien als Warnung statt zu scheitern', async () => {
    const sequence = createSequence({ lexemes: [createLexeme({ expression: 'x', imageId: 'media_9' })] });
    const blob = await buildBackup([sequence], [mediaRecord('media_9', [9])]);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Archiv ohne die Mediendatei nachbauen
    const { createZip, readZip, textToBytes } = await import('./zip');
    const files = await readZip(bytes);
    const rebuilt = await createZip([{ name: 'manifest.json', data: files.get('manifest.json')! }, { name: 'x.txt', data: textToBytes('x') }]);
    const restored = await parseBackup(await rebuilt.arrayBuffer());
    expect(restored.media).toHaveLength(0);
    expect(restored.warnings[0]).toContain('Mediendatei fehlt');
  });

  it('weist fremde Archive und kaputte Dateien ab', async () => {
    const { createZip, textToBytes } = await import('./zip');
    const foreign = await createZip([{ name: 'manifest.json', data: textToBytes('{"format":"etwas-anderes"}') }]);
    await expect(parseBackup(await foreign.arrayBuffer())).rejects.toBeInstanceOf(SchemaError);
    await expect(parseBackup(new TextEncoder().encode('kein zip'))).rejects.toBeInstanceOf(ZipError);
  });

  it('leitet Dateiendungen aus dem Medientyp ab', () => {
    expect(mediaExtension({ id: 'a', name: 'a', mimeType: 'audio/mpeg', kind: 'audio', size: 0, createdAt: 0 })).toBe('mp3');
    expect(mediaExtension({ id: 'a', name: 'clip.mov', mimeType: '', kind: 'video', size: 0, createdAt: 0 })).toBe('mov');
  });
});

describe('Alte Sicherungen', () => {
  it('liest eine Sicherung im Schema 1 und migriert sie verlustfrei', async () => {
    const { createZip, textToBytes } = await import('./zip');
    const manifest = {
      format: 'lexiscene-backup',
      version: 1,
      schemaVersion: 1,
      app: { name: 'LexiScène', version: '0.1.0' },
      createdAt: '2026-09-04T20:57:08.614Z',
      sequences: [
        {
          id: 'seq_alt',
          schemaVersion: 1,
          title: 'Alte Sequenz',
          targetLanguage: 'fr',
          steps: { vermuten: false },
          lexemes: [
            {
              id: 'lex_alt',
              expression: 'le pain',
              coreMeaning: 'das Brot',
              sentenceFrame: 'acheter du + Nomen',
              repertoire: 'kern',
              imageId: 'media_1',
              status: 'form-abgerufen',
              statusUpdatedAt: 1_700_000_000_000,
              liveNote: 'lief gut',
            },
          ],
          reactivation: { enabled: true, offsetsDays: [2, 5], anchor: 1_700_000_000_000, completedRounds: 1 },
        },
      ],
      media: [
        {
          id: 'media_1',
          name: 'brot.png',
          mimeType: 'image/png',
          kind: 'image',
          size: 4,
          createdAt: 1_700_000_000_000,
          file: 'media/media_1.png',
        },
      ],
    };

    const archive = await createZip([
      { name: 'manifest.json', data: textToBytes(JSON.stringify(manifest)) },
      { name: 'media/media_1.png', data: new Uint8Array([1, 2, 3, 4]) },
    ]);

    const restored = await parseBackup(await archive.arrayBuffer());
    const sequence = restored.sequences[0];

    expect(restored.warnings).toEqual([]);
    expect(sequence.schemaVersion).toBe(3);
    expect(sequence.inferenceMode).toBe('off');
    expect(sequence.reactivation).toMatchObject({ offsetsDays: [2, 5], completedRounds: 1, history: [] });
    expect(sequence.lexemes[0]).toMatchObject({
      sentenceFrame: 'acheter du + Nomen',
      imageId: 'media_1',
      liveNote: 'lief gut',
      learningGoal: 'productive',
    });
    expect(sequence.lexemes[0].observations[0]).toMatchObject({ dimension: 'form', result: 'secure' });
    expect(restored.media[0].name).toBe('brot.png');
  });

  it('schreibt eine neue Sicherung, die wieder eingelesen werden kann', async () => {
    const demo = createDemoSequence();
    const roundtrip = await parseBackup(await (await buildBackup([demo], [])).arrayBuffer());
    expect(roundtrip.sequences[0].schemaVersion).toBe(3);
    expect(roundtrip.sequences[0]).toEqual(demo);
  });
});

describe('Korpusminiaturen in Sicherung und Export', () => {
  const withMiniature = () =>
    createSequence({
      title: 'jouer',
      steps: { ...createSequence().steps, korpusminiatur: true },
      lexemes: [
        createLexeme({
          expression: 'jouer à / jouer de',
          coreMeaning: 'spielen',
          corpus: createCorpusMiniature({
            enabled: true,
            title: 'jouer à oder jouer de?',
            guidingQuestion: 'Was steht nach jouer?',
            focus: 'pattern',
            examples: [
              createCorpusExample({ text: 'Nous jouons au tennis.', highlight: 'au tennis', category: 'Sport/Spiel' }),
              createCorpusExample({ text: 'Ils jouent aux échecs.', highlight: 'aux échecs', category: 'Sport/Spiel' }),
              createCorpusExample({
                text: 'Elle joue du piano.',
                highlight: 'du piano',
                category: 'Instrument',
                teacherNote: 'Gegenbeispiel',
              }),
            ],
            ruleOrFinding: 'jouer à + Sport · jouer de + Instrument',
            transferPrompt: 'Bildet je einen eigenen Satz.',
            provenance: 'teacher-created',
            sourceNote: 'Selbst formuliert.',
          }),
        }),
      ],
    });

  it('überträgt eine Miniatur durch Sicherung und Wiederherstellung', async () => {
    const sequence = withMiniature();
    const restored = await parseBackup(await (await buildBackup([sequence], [])).arrayBuffer());
    expect(restored.sequences[0]).toEqual(sequence);
    expect(restored.sequences[0].lexemes[0].corpus.examples[2].teacherNote).toBe('Gegenbeispiel');
  });

  it('überträgt eine Miniatur durch den Einzelexport', () => {
    const sequence = withMiniature();
    const document = buildSequenceExport(sequence);
    const [reimported] = parseSequenceDocument(JSON.stringify(document));

    expect(document.schemaVersion).toBe(3);
    expect(document.phase.steps.map((step) => step.id)).toContain('korpusminiatur');
    expect(reimported.lexemes[0].corpus).toEqual(sequence.lexemes[0].corpus);
  });

  it('lässt den Schritt aus dem Export, solange die Sequenz ihn nicht führt', () => {
    const document = buildSequenceExport(createSequence({ lexemes: [createLexeme({ expression: 'x' })] }));
    expect(document.phase.steps.map((step) => step.id)).not.toContain('korpusminiatur');
  });

  it('liest Dateien der Schemaversion 2 ohne Korpusfeld unverändert', () => {
    const [sequence] = parseSequenceDocument(
      JSON.stringify({
        schemaVersion: 2,
        title: 'Ältere Sequenz',
        steps: { situation: true, form: true },
        lexemes: [{ id: 'lex_1', expression: 'Ça te dit de… ?', coreMeaning: 'Hast du Lust?' }],
      }),
    );

    expect(sequence.schemaVersion).toBe(3);
    expect(sequence.lexemes[0].expression).toBe('Ça te dit de… ?');
    expect(sequence.lexemes[0].corpus).toEqual(createCorpusMiniature());
    expect(sequence.steps.korpusminiatur).toBe(false);
  });

  it('übergeht unbekannte künftige Felder und behält die bekannten', () => {
    const [sequence] = parseSequenceDocument(
      JSON.stringify({
        schemaVersion: 3,
        title: 'Aus einer späteren Fassung',
        lexemes: [
          {
            id: 'lex_1',
            expression: 'jouer',
            corpus: {
              enabled: true,
              title: 'Titel',
              examples: [{ id: 'beleg_1', text: 'Beleg', kuenftigesFeld: 42 }],
              kuenftigesFeld: 'unbekannt',
            },
          },
        ],
      }),
    );

    const corpus = sequence.lexemes[0].corpus;
    expect(corpus.enabled).toBe(true);
    expect(corpus.title).toBe('Titel');
    expect(corpus.examples).toEqual([
      { id: 'beleg_1', text: 'Beleg', highlight: '', category: '', teacherNote: '' },
    ]);
    expect(corpus).not.toHaveProperty('kuenftigesFeld');
  });
});

describe('Einzelexport', () => {
  it('beschreibt die Sequenz zusätzlich als Unterrichtsphase', () => {
    const sequence = createSequence({
      title: 'Freizeit verabreden',
      canDoGoal: 'Die Lernenden können …',
      steps: { ...createSequence().steps, audio: false },
      lexemes: [createLexeme({ expression: 'x' })],
    });
    const document = buildSequenceExport(sequence);
    expect(document.format).toBe('lexiscene.sequence');
    expect(document.phase.lexemeCount).toBe(1);
    expect(document.phase.steps.map((step) => step.id)).not.toContain('audio');
    expect(sequenceExportFileName(sequence)).toBe('lexiscene-freizeit-verabreden.json');
  });

  it('liest Austauschdokument, nackte Sequenz und Liste', () => {
    const sequence = createSequence({ title: 'Import' });
    expect(parseSequenceDocument(JSON.stringify(buildSequenceExport(sequence)))[0].title).toBe('Import');
    expect(parseSequenceDocument(JSON.stringify(sequence))[0].title).toBe('Import');
    expect(parseSequenceDocument(JSON.stringify([sequence, sequence]))).toHaveLength(2);
  });

  it('meldet ungültiges JSON verständlich', () => {
    expect(() => parseSequenceDocument('kein json')).toThrow(SchemaError);
  });
});
