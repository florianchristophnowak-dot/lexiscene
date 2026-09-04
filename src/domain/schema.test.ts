import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './model';
import { SchemaError, collectMediaIds, createLexeme, createSequence, normalizeSequence, normalizeSettings } from './schema';

describe('createSequence', () => {
  it('legt eine vollständige Sequenz mit aktiver Standarddramaturgie an', () => {
    const sequence = createSequence();
    expect(sequence.schemaVersion).toBe(SCHEMA_VERSION);
    expect(sequence.lexemes).toEqual([]);
    expect(sequence.steps.situation).toBe(true);
    expect(sequence.steps.aufgabe).toBe(true);
    expect(sequence.reactivation.enabled).toBe(false);
  });
});

describe('normalizeSequence', () => {
  it('ergänzt fehlende Felder tolerant', () => {
    const sequence = normalizeSequence({ title: 'Einkaufen', lexemes: [{ expression: 'le pain' }] });
    expect(sequence.title).toBe('Einkaufen');
    expect(sequence.targetLanguage).toBe('fr');
    expect(sequence.lexemes).toHaveLength(1);
    expect(sequence.lexemes[0].expression).toBe('le pain');
    expect(sequence.lexemes[0].repertoire).toBe('kern');
    expect(sequence.lexemes[0].stepOverrides).toEqual({});
  });

  it('übernimmt bekannte Werte und verwirft unbekannte', () => {
    const sequence = normalizeSequence({
      title: 'Test',
      steps: { audio: false, unsinn: true },
      lexemes: [{ expression: 'x', lexicalType: 'nichts', repertoire: 'stuetze', status: 'erfunden' }],
    });
    expect(sequence.steps.audio).toBe(false);
    expect(sequence.steps.situation).toBe(true);
    expect(sequence.lexemes[0].lexicalType).toBe('sprechakt');
    expect(sequence.lexemes[0].repertoire).toBe('stuetze');
    expect(sequence.lexemes[0].status).toBeNull();
  });

  it('lehnt neuere Schemaversionen mit klarer Meldung ab', () => {
    expect(() => normalizeSequence({ title: 'x', schemaVersion: 99 })).toThrow(SchemaError);
  });

  it('lehnt leere Daten ab', () => {
    expect(() => normalizeSequence(null)).toThrow(SchemaError);
  });
});

describe('collectMediaIds', () => {
  it('sammelt alle referenzierten Medien', () => {
    const sequence = createSequence({
      lexemes: [
        createLexeme({ expression: 'a', imageId: 'm1', audioId: 'm2' }),
        createLexeme({ expression: 'b', videoId: 'm3' }),
      ],
    });
    expect(collectMediaIds([sequence])).toEqual(new Set(['m1', 'm2', 'm3']));
  });
});

describe('normalizeSettings', () => {
  it('fällt auf sichere Standardwerte zurück', () => {
    const settings = normalizeSettings({ theme: 'lila', reactivationOffsets: [0, -3, 5] });
    expect(settings.theme).toBe('system');
    expect(settings.reactivationOffsets).toEqual([5]);
    expect(settings.detailPaneVisible).toBe(true); // Detailspalte ist standardmäßig sichtbar
  });
});
