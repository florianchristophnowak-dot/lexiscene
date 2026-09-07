import { describe, expect, it } from 'vitest';
import {
  CHECK_TEMPLATES,
  DEMAND_LADDER,
  buildCheckPrompt,
  buildSecondaryPrompt,
  buildTemplatePrompt,
  checkTemplate,
  counterpartCheck,
  coversBothDirections,
  hasCheckPrompt,
  recommendedChecks,
  secondaryCheck,
  suggestRetrievalProgression,
} from './checks';
import { isCcqTemplateId } from './ccq';
import { de } from '../i18n/de';
import { promptFor } from '../i18n/prompts';
import { createLexeme } from './schema';

/** Zielsprachlicher Impuls wie im Unterricht – hier auf Französisch. */
const phrase = (key: string, params?: Record<string, string>) => promptFor('fr', key, params);

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
      expect(de[`check.demand.${template.demand}`].length).toBeGreaterThan(3);
      // Jede Vorlage hat Bezeichnung, Zweck und zielsprachlichen Impuls.
      expect(de[`check.${template.id}` as keyof typeof de]).toBeTruthy();
      expect(de[`check.${template.id}.purpose` as keyof typeof de]).toBeTruthy();
      expect(phrase(template.prompt)).toBeTruthy();
    }
  });

  it('deckt die produktiven Richtungen ab', () => {
    const directions = new Set(CHECK_TEMPLATES.map((template) => template.direction));
    expect(directions.has('meaning-to-l2')).toBe(true);
    expect(directions.has('context-to-l2')).toBe(true);
    expect(directions.has('pattern-completion')).toBe(true);
    expect(directions.has('l2-to-reaction')).toBe(true);
  });

  it('enthält keine Bedeutungsprüfung mehr', () => {
    // Die fünf CCQ-Vorlagen sind in `ccq.ts` gewandert.
    for (const template of CHECK_TEMPLATES) {
      expect(isCcqTemplateId(template.id)).toBe(false);
    }
    for (const id of ['welches-bild', 'welche-situation', 'beispiel-nichtbeispiel', 'welche-bedeutung', 'sprechhandlung']) {
      expect(checkTemplate(id)).toBeUndefined();
      expect(isCcqTemplateId(id)).toBe(true);
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
    expect(ids).not.toContain('situation-zu-ausdruck');
    expect(ids).not.toContain('einheit-verwenden');
  });
});

describe('Gegenrichtung', () => {
  it('bietet zu einer Bedeutung-→-Form-Aufgabe eine kontextbasierte an', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'ausdruck-auswaehlen' });
    const counterpart = counterpartCheck(lexeme);
    expect(['context-to-l2', 'l2-to-reaction']).toContain(counterpart?.direction);
  });

  it('bietet zu einer kontextbasierten Aufgabe eine Bedeutung-→-Form-Aufgabe an', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'einheit-verwenden' });
    expect(['meaning-to-l2', 'pattern-completion']).toContain(counterpartCheck(lexeme)?.direction);
  });
});

describe('Aufgabentext', () => {
  it('bevorzugt die eigene Formulierung', () => {
    const lexeme = createLexeme({ expression: 'x', checkTemplateId: 'einheit-verwenden', checkPrompt: 'Eigene Frage' });
    expect(buildCheckPrompt(lexeme, phrase)).toBe('Eigene Frage');
  });

  it('baut den Impuls in der Zielsprache auf', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'situation-zu-ausdruck' });
    expect(buildCheckPrompt(lexeme, phrase)).toBe('Zwei Jugendliche verabreden sich. – comment le dit-on ?');
    // Dieselbe Vorlage in einer anderen Zielsprache.
    const english = (key: string, params?: Record<string, string>) => promptFor('en', key, params);
    expect(buildCheckPrompt(lexeme, english)).toBe('Zwei Jugendliche verabreden sich. – how do you say it?');
  });

  it('liefert ohne Vorlage nichts', () => {
    expect(buildCheckPrompt(createLexeme({ expression: 'x' }), phrase)).toBe('');
    expect(hasCheckPrompt(createLexeme({ expression: 'x' }))).toBe(false);
    expect(checkTemplate('gibt-es-nicht')).toBeUndefined();
  });

  it('empfiehlt passende Vorlagen je Typ', () => {
    expect(recommendedChecks('sprechakt').map((entry) => entry.id)).toContain('welche-reaktion');
    expect(recommendedChecks('kollokation').map((entry) => entry.id)).toContain('welcher-ausdruck-fehlt');
  });
});

describe('Zweite Abrufaufgabe', () => {
  it('nutzt den Vorschlag der App, solange nichts gewählt ist', () => {
    const lexeme = createLexeme({ ...productive(), checkTemplateId: 'ausdruck-auswaehlen' });
    expect(secondaryCheck(lexeme)).toEqual(counterpartCheck(lexeme));
    const suggested = counterpartCheck(lexeme);
    expect(buildSecondaryPrompt(lexeme, phrase)).toBe(
      suggested ? buildTemplatePrompt(suggested, lexeme, phrase) : '',
    );
  });

  it('bevorzugt die ausdrücklich gewählte Aufgabe', () => {
    const lexeme = createLexeme({
      ...productive(),
      checkTemplateId: 'ausdruck-auswaehlen',
      checkTemplateIdSecondary: 'welcher-ausdruck-fehlt',
    });
    expect(secondaryCheck(lexeme)?.id).toBe('welcher-ausdruck-fehlt');
    expect(buildSecondaryPrompt(lexeme, phrase)).toMatch(/Complétez/);
  });

  it('erkennt, ob beide Richtungen vorbereitet sind', () => {
    const single = createLexeme({
      ...productive(),
      checkTemplateId: 'ausdruck-auswaehlen',
      checkTemplateIdSecondary: 'welcher-ausdruck-fehlt',
    });
    expect(coversBothDirections(single)).toBe(false);

    const both = createLexeme({
      ...productive(),
      checkTemplateId: 'ausdruck-auswaehlen',
      checkTemplateIdSecondary: 'situation-zu-ausdruck',
    });
    expect(coversBothDirections(both)).toBe(true);
  });
});
