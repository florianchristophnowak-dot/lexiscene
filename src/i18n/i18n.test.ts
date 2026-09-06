import { describe, expect, it } from 'vitest';
import { CATALOGUES, LOCALE_NAMES, UI_LOCALES, isCompleteLocale, missingKeys, resolveUiLocale, translate } from './index';
import { de } from './de';
import { fr } from './fr';
import { LANGUAGES } from '../domain/model';
import { PHASES, STEPS } from '../domain/steps';
import { missingPromptKeys, promptFor } from './prompts';

describe('Sprachkatalog', () => {
  it('führt Deutsch und Französisch vollständig', () => {
    expect(missingKeys('de')).toEqual([]);
    expect(missingKeys('fr')).toEqual([]);
    expect(Object.keys(fr)).toHaveLength(Object.keys(de).length);
  });

  it('bietet nur vollständige Sprachen als Bediensprache an', () => {
    expect(UI_LOCALES).toEqual(['de', 'fr']);
    for (const locale of UI_LOCALES) {
      expect(isCompleteLocale(locale)).toBe(true);
      expect(LOCALE_NAMES[locale]).toBeTruthy();
    }
    // Die begonnenen Kataloge sind vorbereitet, aber noch nicht vollständig.
    for (const locale of ['en', 'es', 'it', 'ru']) {
      expect(CATALOGUES[locale]).toBeTruthy();
      expect(isCompleteLocale(locale)).toBe(false);
      expect(UI_LOCALES).not.toContain(locale);
    }
  });

  it('lässt keine gemischtsprachige Oberfläche zu', () => {
    // Ein unvollständiger Katalog wird nie zur Bediensprache – und ein
    // fehlender Schlüssel fällt auf Deutsch zurück, nie auf die rohe Kennung.
    expect(translate('en', 'nav.home')).toBe('Home');
    expect(translate('en', 'teach.next')).toBe(de['teach.next']);
  });

  it('setzt Platzhalter ein', () => {
    expect(translate('de', 'teach.phase', { position: 3, label: 'Muster' })).toBe('Phase 3: Muster');
    expect(translate('fr', 'teach.phase', { position: 3, label: 'Structure' })).toBe('Phase 3 : Structure');
  });

  it('beschreibt jede Phase und jeden Schritt in beiden Sprachen', () => {
    for (const phase of PHASES) {
      for (const locale of UI_LOCALES) {
        expect(translate(locale, `phase.${phase.id}`)).toBeTruthy();
        expect(translate(locale, `phase.${phase.id}.purpose`)).toBeTruthy();
      }
    }
    for (const step of STEPS) {
      for (const locale of UI_LOCALES) {
        expect(translate(locale, `step.${step.id}`)).toBeTruthy();
        expect(translate(locale, `step.${step.id}.purpose`)).toBeTruthy();
      }
    }
  });

  it('benennt die Abrufkontrolle in der Oberfläche um', () => {
    expect(de['step.kontrolle']).toBe('Abrufkontrolle');
    expect(fr['step.kontrolle']).toBe('Contrôle de restitution');
  });
});

describe('Wirksame Bediensprache', () => {
  it('folgt der ausdrücklichen Wahl', () => {
    expect(resolveUiLocale('de')).toBe('de');
    expect(resolveUiLocale('fr')).toBe('fr');
  });

  it('folgt der Sequenz nur bei vollständiger Übersetzung', () => {
    expect(resolveUiLocale('sequence', 'fr')).toBe('fr');
    expect(resolveUiLocale('sequence', 'ru')).toBe('de');
    expect(resolveUiLocale('sequence', undefined)).toBe('de');
  });

  it('fällt bei unbekannter Einstellung auf die Grundsprache zurück', () => {
    expect(resolveUiLocale('kl')).toBe('de');
  });
});

describe('Zielsprachliche Impulse', () => {
  it('liegen für jede auswählbare Zielsprache vollständig vor', () => {
    for (const language of LANGUAGES) {
      expect(missingPromptKeys(language.code)).toEqual([]);
    }
  });

  it('folgen der Zielsprache, nicht der Bediensprache', () => {
    expect(promptFor('fr', 'step.prompt.abruf')).toBe('Comment dit-on cela ?');
    expect(promptFor('es', 'step.prompt.abruf')).toBe('¿Cómo se dice esto?');
    expect(promptFor('ru', 'step.prompt.abruf')).toBe('Как это сказать?');
  });

  it('setzt Platzhalter ein und liefert nie eine rohe Kennung', () => {
    expect(promptFor('it', 'step.prompt.aufgabe', { expression: 'jouer' })).toContain('jouer');
    expect(promptFor('fr', 'gibt.es.nicht')).toBe('');
    // Unbekannte Zielsprache: Französisch als Vorgabe der Beispielsequenz.
    expect(promptFor('kl', 'learner.look')).toBe('Regardez.');
  });
});
