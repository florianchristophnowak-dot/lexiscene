// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import type { MediaRecord } from '../domain/model';
import { createLexeme, createSequence } from '../domain/schema';
import { STORE_MEDIA, STORE_SEQUENCES, STORE_SETTINGS, clearStore } from './idb';
import {
  loadMedia,
  loadMediaIndex,
  loadSequences,
  loadSettings,
  pruneMedia,
  removeSequence,
  replaceAll,
  saveMedia,
  saveSequence,
  saveSettings,
} from './repository';

const media = (id: string): MediaRecord => ({
  id,
  name: `${id}.png`,
  mimeType: 'image/png',
  kind: 'image',
  size: 3,
  createdAt: Date.now(),
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
});

beforeEach(async () => {
  await clearStore(STORE_SEQUENCES);
  await clearStore(STORE_MEDIA);
  await clearStore(STORE_SETTINGS);
});

describe('Sequenzen', () => {
  it('speichert, liest und löscht Sequenzen', async () => {
    const sequence = createSequence({ title: 'Erste', lexemes: [createLexeme({ expression: 'le pain' })] });
    await saveSequence(sequence);

    const loaded = await loadSequences();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Erste');
    expect(loaded[0].lexemes[0].expression).toBe('le pain');

    await removeSequence(sequence.id);
    expect(await loadSequences()).toHaveLength(0);
  });

  it('sortiert nach letzter Bearbeitung', async () => {
    await saveSequence(createSequence({ title: 'alt', updatedAt: 1000 }));
    await saveSequence(createSequence({ title: 'neu', updatedAt: 5000 }));
    expect((await loadSequences()).map((sequence) => sequence.title)).toEqual(['neu', 'alt']);
  });

  it('überspringt beschädigte Einträge, statt alles zu verlieren', async () => {
    const { putRecord } = await import('./idb');
    await putRecord(STORE_SEQUENCES, { id: 'kaputt' });
    await saveSequence(createSequence({ title: 'heil' }));
    const loaded = await loadSequences();
    expect(loaded.map((sequence) => sequence.title)).toContain('heil');
  });
});

describe('Medien', () => {
  it('bewahrt Dateien als Blob auf', async () => {
    await saveMedia(media('media_1'));
    const record = await loadMedia('media_1');
    expect(record?.mimeType).toBe('image/png');
    expect(new Uint8Array(await record!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('liefert ein Verzeichnis ohne Blobs', async () => {
    await saveMedia(media('media_2'));
    const index = await loadMediaIndex();
    expect(index.media_2.name).toBe('media_2.png');
    expect('blob' in index.media_2).toBe(false);
  });

  it('räumt nicht mehr referenzierte Medien weg', async () => {
    await saveMedia(media('media_benutzt'));
    await saveMedia(media('media_verwaist'));
    const sequence = createSequence({ lexemes: [createLexeme({ expression: 'x', imageId: 'media_benutzt' })] });

    const removed = await pruneMedia([sequence]);
    expect(removed).toBe(1);
    expect(await loadMedia('media_benutzt')).toBeDefined();
    expect(await loadMedia('media_verwaist')).toBeUndefined();
  });
});

describe('Wiederherstellung', () => {
  it('ersetzt den gesamten Bestand', async () => {
    await saveSequence(createSequence({ title: 'vorher' }));
    await saveMedia(media('media_alt'));

    const neu = createSequence({ title: 'nachher' });
    await replaceAll([neu], [media('media_neu')]);

    expect((await loadSequences()).map((sequence) => sequence.title)).toEqual(['nachher']);
    expect(await loadMedia('media_alt')).toBeUndefined();
    expect(await loadMedia('media_neu')).toBeDefined();
  });
});

describe('Einstellungen', () => {
  it('speichert und normalisiert Einstellungen', async () => {
    await saveSettings({
      theme: 'dark',
      detailPaneVisible: false,
      lastSequenceId: 'seq_1',
      reactivationOffsets: [2, 5],
      demoSeeded: true,
      uiLanguage: 'fr',
      teachingLanguageMode: 'strict',
    });
    const settings = await loadSettings();
    expect(settings).toEqual({
      theme: 'dark',
      detailPaneVisible: false,
      lastSequenceId: 'seq_1',
      reactivationOffsets: [2, 5],
      demoSeeded: true,
      uiLanguage: 'fr',
      teachingLanguageMode: 'strict',
    });
  });

  it('liefert ohne gespeicherte Werte sinnvolle Standardwerte', async () => {
    const settings = await loadSettings();
    expect(settings.theme).toBe('system');
    expect(settings.demoSeeded).toBe(false);
  });
});
