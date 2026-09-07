import { describe, expect, it } from 'vitest';
import { EVIDENCE_GRADES, advisorContextFromLexeme, recommendMethods, SEMANTISATION_METHOD_IDS } from './advisor';
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

describe('Methodenberater', () => {
  it('liefert immer vollständige Empfehlungen mit Evidenzkennzeichnung', () => {
    for (const type of ['gegenstand', 'abstrakt', 'sprechakt', 'kollokation', 'polysem', 'falscher-freund'] as const) {
      const recommendations = recommendMethods(context({ lexicalType: type }));
      expect(recommendations.length).toBeGreaterThan(0);
      for (const entry of recommendations) {
        // Der Text steht im Sprachkatalog – geprüft wird, dass er vollständig vorliegt.
        for (const part of ['method', 'rationale', 'confirmation', 'risk'] as const) {
          const text = de[`advisor.${entry.id}.${part}` as keyof typeof de];
          expect(text?.length ?? 0).toBeGreaterThan(10);
        }
        expect(EVIDENCE_GRADES).toContain(entry.evidence);
      }
    }
  });

  it('entscheidet nicht allein nach dem lexikalischen Typ', () => {
    const visual = recommendMethods(context({ lexicalType: 'sonstige', imageability: 'hoch' }));
    const abstract = recommendMethods(context({ lexicalType: 'sonstige', imageability: 'gering' }));
    expect(visual.map((entry) => entry.id)).toContain('realie');
    expect(abstract.map((entry) => entry.id)).not.toContain('realie');
    expect(abstract.map((entry) => entry.id)).toContain('kurze-l1');
  });

  it('berücksichtigt das Lernniveau bei der Klärung', () => {
    const beginner = recommendMethods(context({ level: 'anfaenger' }));
    const advanced = recommendMethods(context({ level: 'fortgeschritten' }));
    expect(beginner.map((entry) => entry.id)).toContain('kurze-l1');
    expect(advanced.map((entry) => entry.id)).toContain('l2-umschreibung');
  });

  it('schlägt Erschließen nur bei geeigneten Einheiten vor', () => {
    expect(recommendMethods(context({ inferenceSuitability: 'geeignet' })).map((entry) => entry.id)).toContain(
      'erschliessen',
    );
    expect(recommendMethods(context({ inferenceSuitability: 'ungeeignet' })).map((entry) => entry.id)).not.toContain(
      'erschliessen',
    );
  });

  it('stellt beim falschen Freund die Sicherung vor den Vergleich', () => {
    const [first] = recommendMethods(context({ lexicalType: 'falscher-freund', transferRisk: 'hoch' }));
    expect(first.id).toBe('falscher-freund');
    expect(de['advisor.falscher-freund.method']).toMatch(/Kernbedeutung/);
  });

  it('ergänzt bei produktivem Lernziel den Musteranker', () => {
    const productive = recommendMethods(context({ learningGoal: 'productive', lexicalType: 'gegenstand' }));
    expect(productive.some((entry) => entry.id === 'produktiv-muster' || entry.id === 'musteranker')).toBe(true);
  });

  it('vermeidet absolute Formulierungen', () => {
    const all = recommendMethods(context({ lexicalType: 'abstrakt' }));
    const text = all
      .map(
        (entry) =>
          `${de[`advisor.${entry.id}.method` as keyof typeof de]} ${de[`advisor.${entry.id}.rationale` as keyof typeof de]}`,
      )
      .join(' ');
    expect(text).not.toMatch(/wäre ein Umweg|robusteste|immer besser|garantiert/);
  });

  it('liest den Kontext aus Einheit und Sequenz', () => {
    const lexeme = createLexeme({ expression: 'x', imageability: 'hoch', learningGoal: 'productive' });
    const sequence = createSequence({ learnerLevel: 'anfaenger' });
    expect(advisorContextFromLexeme(lexeme, sequence)).toMatchObject({
      imageability: 'hoch',
      learningGoal: 'productive',
      level: 'anfaenger',
    });
  });

  it('bietet die Methodenliste für die Auswahl an', () => {
    expect(SEMANTISATION_METHOD_IDS.length).toBeGreaterThan(5);
    expect(new Set(SEMANTISATION_METHOD_IDS).size).toBe(SEMANTISATION_METHOD_IDS.length);
    // Zu jeder Methode gibt es einen Katalogeintrag.
    for (const id of SEMANTISATION_METHOD_IDS) {
      expect(de[`advisor.${id}.method` as keyof typeof de]).toBeTruthy();
    }
  });
});
