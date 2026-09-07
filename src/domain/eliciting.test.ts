import { describe, expect, it } from 'vitest';
import {
  ELICITING_CONTEXT_LIMIT,
  ELICITING_TECHNIQUE_IDS,
  elicitingWarnings,
  normalizeTechniques,
  recommendElicitingTechniques,
} from './eliciting';
import { advisorContextFromLexeme } from './advisor';
import { de } from '../i18n/de';
import { createLexeme, createSequence } from './schema';
import type { AdvisorContext } from './advisor';

const context = (patch: Partial<AdvisorContext> = {}): AdvisorContext => ({
  lexicalType: 'sonstige',
  learningGoal: 'receptive',
  level: 'mittelstufe',
  imageability: 'mittel',
  inferenceSuitability: 'bedingt',
  transferRisk: 'gering',
  ...patch,
});

describe('Techniken zum Herauslocken', () => {
  it('führt zehn Techniken mit Bezeichnung und Eignung', () => {
    expect(ELICITING_TECHNIQUE_IDS).toHaveLength(10);
    for (const id of ELICITING_TECHNIQUE_IDS) {
      expect(de[`eliciting.technique.${id}` as keyof typeof de]).toBeTruthy();
      expect(de[`eliciting.technique.${id}.fits` as keyof typeof de]).toBeTruthy();
    }
  });

  it('empfiehlt Zeigbares beim gut vorstellbaren Gegenstand', () => {
    const ids = recommendElicitingTechniques(context({ lexicalType: 'gegenstand', imageability: 'hoch' }));
    expect(ids).toContain('bild');
    expect(ids).toContain('realie');
    expect(ids).not.toContain('definition');
  });

  it('empfiehlt beim Abstrakten den vorbereiteten Kontext', () => {
    const ids = recommendElicitingTechniques(context({ lexicalType: 'abstrakt', imageability: 'gering' }));
    expect(ids).toContain('kontext');
    expect(ids).not.toContain('realie');
  });

  it('schlägt Anfängerinnen und Anfängern keine Definition vor', () => {
    const beginner = recommendElicitingTechniques(context({ level: 'anfaenger', imageability: 'gering' }));
    expect(beginner).not.toContain('definition');
    expect(beginner).toContain('kontext');

    const advanced = recommendElicitingTechniques(context({ level: 'fortgeschritten', imageability: 'gering' }));
    expect(advanced).toContain('definition');
  });

  it('bietet nie mehr als vier Vorschläge an', () => {
    for (const type of ['gegenstand', 'handlung', 'abstrakt', 'sprechakt', 'kollokation'] as const) {
      expect(recommendElicitingTechniques(context({ lexicalType: type })).length).toBeLessThanOrEqual(4);
    }
  });

  it('wählt nichts von allein aus', () => {
    const lexeme = createLexeme({ expression: 'la promesse', imageability: 'hoch' });
    expect(lexeme.elicitingTechniques).toEqual([]);
    expect(recommendElicitingTechniques(advisorContextFromLexeme(lexeme, createSequence())).length).toBeGreaterThan(0);
  });

  it('nimmt nur bekannte Kennungen und ordnet sie nach dem Katalog', () => {
    expect(normalizeTechniques(['kontext', 'bild', 'bild', 'unbekannt'])).toEqual(['bild', 'kontext']);
    expect(normalizeTechniques('kein Feld')).toEqual([]);
  });
});

describe('Hinweise zum Herauslocken', () => {
  const withPlan = (patch = {}) =>
    createLexeme({ expression: 'la promesse', elicitingTechniques: ['bild'], ...patch });

  it('meldet eine fehlende Technik', () => {
    const ids = elicitingWarnings(createLexeme({ expression: 'x' })).map((warning) => warning.id);
    expect(ids).toContain('keine-technik');
  });

  it('mahnt zu knapper Lehrersprache', () => {
    const long = withPlan({ elicitingContext: 'x'.repeat(ELICITING_CONTEXT_LIMIT + 1) });
    expect(elicitingWarnings(long).map((warning) => warning.id)).toContain('lange-lehrersprache');
    expect(elicitingWarnings(withPlan({ elicitingContext: 'Kurzer Kontext.' }))).toEqual([]);
  });

  it('rät beim gut zeigbaren Wort vom bloßen Definieren ab', () => {
    const lexeme = createLexeme({
      expression: 'la pêche',
      imageability: 'hoch',
      elicitingTechniques: ['definition'],
    });
    expect(elicitingWarnings(lexeme).map((warning) => warning.id)).toContain('zeigen-vor-erklaeren');
  });

  it('vermisst zum Erschließen den Kontext', () => {
    const lexeme = createLexeme({ expression: 'x', elicitingTechniques: ['kontext'] });
    expect(elicitingWarnings(lexeme).map((warning) => warning.id)).toContain('kontext-fehlt');

    const withContext = createLexeme({
      expression: 'x',
      elicitingTechniques: ['kontext'],
      situation: 'Zwei Freunde verabreden sich.',
    });
    expect(elicitingWarnings(withContext).map((warning) => warning.id)).not.toContain('kontext-fehlt');
  });

  it('blockiert nichts – Hinweise sind Text, keine Sperre', () => {
    for (const warning of elicitingWarnings(createLexeme({ expression: 'x' }))) {
      expect(de[warning.key as keyof typeof de]).toBeTruthy();
    }
  });
});
