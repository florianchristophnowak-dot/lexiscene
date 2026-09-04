// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createDemoSequence } from '../domain/demo';
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
