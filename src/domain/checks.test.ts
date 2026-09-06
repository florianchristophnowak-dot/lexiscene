import { describe, expect, it } from 'vitest';
import {
  CHECK_TEMPLATES,
  DEMAND_LADDER,
  buildCheckPrompt,
  buildCounterpartPrompt,
  buildSecondaryPrompt,
  checkDemandLabel,
  checkTemplate,
  counterpartCheck,
  coversBothDirections,
  recommendedChecks,
  secondaryCheck,
  suggestRetrievalProgression,
} from './checks';
import { createLexeme } from './schema';

const productive = () =>
  createLexeme({
    expression: 'Ça te dit de… ?',
    coreMeaning: 'Hast du Lust?',
    communicativeFunction: 'einen Vorschlag machen',
    modelUtterance: 'Ça te dit d’aller au cinéma ?',
    sentenceFrame: 'Ça te dit de + Infinitiv ?',
    situation: 'Zwei Jugendliche verabreden sich.',
    example: 'Ça te dit de venir ?',
    learningGoal: 'productive',
    lexicalType: 'sprechakt',
  });

describe('Klassifikation der Abrufvorlagen', () => {
  it('ordnet jede Vorlage nach Dimension, Richtung und Anforderung ein', () => {
    for (const template of CHECK_TEMPLATES) {
      expect(['meaning', 'form', 'pattern', 'use']).toContain(template.target);
      expect(DEMAND_LADDER).toContain(template.demand);
      expect(checkDemandLabel(template.demand).length).toBeGreaterThan(3);
    }
  });

  it('deckt beide Richtungen ab', () => {
    const directions = new Set(CHECK_TEMPLATES.map((template) => template.direction));
    expect(directions.has('l2-to-meaning')).toBe(true);
    expect(directions.has('meaning-to-l2')).toBe(true);
    expect(directions.has('context-to-l2')).toBe(true);
    expect(directions.has('pattern-completion')).toBe(true);
  });

  it('deckt alle Anforderungsstufen ab', () => {
    for (const demand of DEMAND_LADDER) {
      expect(CHECK_TEMPLATES.some((template) => template.demand === demand)).toBe(true);
    }
  });
});

describe('Progression', () => {
  it('beginnt nicht mit der freien Verwendung', () => {
    const progression = suggestRetrievalProgression(productive());
    expect(progression.length).toBeGreaterThan(2);
    expect(progression[0].demand).toBe('recognition');
    expect(progression[progression.length - 1].demand).toBe('free-production');
  });

  it('steigt in der Anforderung an', () => {
    const progression = suggestRetrievalProgression(productive());
    const positions = progression.map((template) => DEMAND_LADDER.indexOf(template.demand));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('endet bei rezeptivem Lernziel vor der freien Produktion', () => {
    const receptive = createLexeme({ ...productive(), learningGoal: 'receptive' });
    const demands = suggestRetrievalProgression(receptive).map((template) => template.demand);
    expect(demands).not.toContain('free-production');
  });

  it('lässt Vorlagen ohne passendes Material aus', () => {
    const sparse = createLexeme({ expression: 'le pain', coreMeaning: 'das Brot', learningGoal: 'productive' });
    const ids = suggestRetrievalProgression(sparse).map((template) => template.id);
    expect(ids).not.toContain('welches-bild');
    expect(ids).not.toContain('einheit-verwenden');
  });
});

describe('Gegenrichtung', () => {
  it('bietet zu einer rezeptiven Aufgabe eine produktive an', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'welche-situation' });
    const counterpart = counterpartCheck(lexeme);
    expect(counterpart?.direction).not.toBe('l2-to-meaning');
    expect(buildCounterpartPrompt(lexeme).length).toBeGreaterThan(5);
  });

  it('bietet zu einer produktiven Aufgabe eine rezeptive an', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'einheit-verwenden' });
    expect(counterpartCheck(lexeme)?.direction).toBe('l2-to-meaning');
  });
});

describe('Aufgabentext', () => {
  it('bevorzugt die eigene Formulierung', () => {
    const lexeme = createLexeme({ expression: 'x', checkTemplateId: 'welches-bild', checkPrompt: 'Eigene Frage' });
    expect(buildCheckPrompt(lexeme)).toBe('Eigene Frage');
  });

  it('füllt die Vorlage mit den Daten der Einheit', () => {
    const lexeme = createLexeme({ expression: 'faire du skate', checkTemplateId: 'welches-bild' });
    expect(buildCheckPrompt(lexeme)).toBe('Welches Bild passt zu „faire du skate“?');
  });

  it('liefert ohne Vorlage nichts', () => {
    expect(buildCheckPrompt(createLexeme({ expression: 'x' }))).toBe('');
    expect(checkTemplate('gibt-es-nicht')).toBeUndefined();
  });

  it('empfiehlt passende Vorlagen je Typ', () => {
    expect(recommendedChecks('sprechakt').map((entry) => entry.id)).toContain('welche-reaktion');
    expect(recommendedChecks('polysem').map((entry) => entry.id)).toContain('welche-bedeutung');
  });
});

describe('Zweite Abrufaufgabe', () => {
  it('nutzt den Vorschlag der App, solange nichts gewählt ist', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'welche-situation' });
    expect(secondaryCheck(lexeme)).toEqual(counterpartCheck(lexeme));
    expect(buildSecondaryPrompt(lexeme)).toBe(buildCounterpartPrompt(lexeme));
  });

  it('bevorzugt die ausdrücklich gewählte Aufgabe', () => {
    const lexeme = createLexeme({
      ...productive(),
      checkTemplateId: 'welche-situation',
      checkTemplateIdSecondary: 'welcher-ausdruck-fehlt',
    });
    expect(secondaryCheck(lexeme)?.id).toBe('welcher-ausdruck-fehlt');
    expect(buildSecondaryPrompt(lexeme)).toMatch(/Ergänzt/);
  });

  it('erkennt, ob beide Richtungen vorbereitet sind', () => {
    const onlyReceptive = createLexeme({ ...productive(), checkTemplateId: 'welche-situation' });
    expect(coversBothDirections(onlyReceptive)).toBe(false);

    const both = createLexeme({
      ...productive(),
      checkTemplateId: 'welche-situation',
      checkTemplateIdSecondary: 'situation-zu-ausdruck',
    });
    expect(coversBothDirections(both)).toBe(true);
  });
});
