import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './model';
import { normalizeSequence } from './schema';
import { corpusMiniatureReady } from './corpus';
import { summarizeObservations } from './observations';
import { resolveSteps } from './steps';

/** Eine vollständige Sequenz im Format der Version 0.1.x (Schema 1). */
const SCHEMA_1_SEQUENCE = {
  id: 'seq_alt',
  schemaVersion: 1,
  title: 'Freizeit verabreden',
  targetLanguage: 'fr',
  learningGroup: 'Klasse 7',
  topic: 'Wochenende',
  canDoGoal: 'Die Lernenden können einen Vorschlag machen.',
  teacherNote: 'Chunks zuerst hörend anbieten.',
  archived: false,
  steps: {
    situation: true,
    impuls: true,
    audio: true,
    vermuten: true,
    klaeren: true,
    form: true,
    fokus: false,
    kontrolle: true,
    'hilfen-ausblenden': true,
    abruf: true,
    aufgabe: true,
  },
  stepOrder: [
    'impuls',
    'situation',
    'audio',
    'vermuten',
    'klaeren',
    'form',
    'fokus',
    'kontrolle',
    'hilfen-ausblenden',
    'abruf',
    'aufgabe',
  ],
  lexemes: [
    {
      id: 'lex_1',
      expression: 'Ça te dit de… ?',
      coreMeaning: 'Hast du Lust?',
      communicativeFunction: 'einen Vorschlag machen',
      modelUtterance: 'Ça te dit d’aller au cinéma ?',
      lexicalType: 'sprechakt',
      semantisationMethod: 'Mini-Dialog mit Reaktion',
      repertoire: 'kern',
      imageId: 'media_bild',
      audioId: 'media_ton',
      sentenceFrame: 'Ça te dit de + Infinitiv ?',
      situation: 'Zwei Jugendliche verabreden sich.',
      translation: 'Hast du Lust, …?',
      checkTemplateId: 'sprechhandlung',
      communicativeTask: 'Macht einen Vorschlag.',
      stepOverrides: { audio: false },
      stepOrderOverride: null,
      skipped: false,
      status: 'kommunikativ-eingesetzt',
      statusUpdatedAt: 1_700_000_000_000,
      liveNote: 'Beim zweiten Durchgang saß es.',
      createdAt: 1_699_000_000_000,
      updatedAt: 1_700_000_000_000,
    },
    {
      id: 'lex_2',
      expression: 'Pourquoi pas !',
      coreMeaning: 'Gerne!',
      repertoire: 'stuetze',
      lexicalType: 'sprechakt',
      status: 'bedeutung-erkannt',
      statusUpdatedAt: 1_700_000_100_000,
    },
    {
      id: 'lex_3',
      expression: 'On y va !',
      coreMeaning: 'Los!',
      repertoire: 'erweiterung',
      status: 'reaktiviert',
      statusUpdatedAt: 1_700_000_200_000,
    },
  ],
  reactivation: { enabled: true, offsetsDays: [1, 3, 7], anchor: 1_700_000_000_000, completedRounds: 2 },
  session: { lexemeIndex: 1, stepIndex: 4, updatedAt: 1_700_000_000_000 },
  createdAt: 1_699_000_000_000,
  updatedAt: 1_700_000_000_000,
};

describe('Migration Schema 1 → 5', () => {
  const migrated = normalizeSequence(SCHEMA_1_SEQUENCE);

  it('hebt die Schemaversion an', () => {
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(5);
  });

  it('behält alle Freitexte, Medien und Schrittfolgen', () => {
    expect(migrated.title).toBe('Freizeit verabreden');
    expect(migrated.teacherNote).toBe('Chunks zuerst hörend anbieten.');
    // Die alte Reihenfolge bleibt erhalten; nur die neuen Schritte kommen hinzu.
    const addedSinceSchema1 = ['korpusminiatur', 'ccq', 'wort-elizitieren', 'chunk', 'wiederholung'];
    expect(migrated.stepOrder.filter((stepId) => !addedSinceSchema1.includes(stepId))).toEqual(
      SCHEMA_1_SEQUENCE.stepOrder,
    );
    expect(migrated.steps.fokus).toBe(false);
    expect(migrated.session).toEqual(SCHEMA_1_SEQUENCE.session);

    const first = migrated.lexemes[0];
    expect(first.sentenceFrame).toBe('Ça te dit de + Infinitiv ?');
    expect(first.imageId).toBe('media_bild');
    expect(first.audioId).toBe('media_ton');
    expect(first.liveNote).toBe('Beim zweiten Durchgang saß es.');
    expect(first.stepOverrides).toEqual({ audio: false });
    expect(first.translation).toBe('Hast du Lust, …?');
  });

  it('überführt den aktivierten Ratenschritt in die Einstellung', () => {
    expect(migrated.inferenceMode).toBe('optional');
    const withoutInference = normalizeSequence({
      ...SCHEMA_1_SEQUENCE,
      steps: { ...SCHEMA_1_SEQUENCE.steps, vermuten: false },
    });
    expect(withoutInference.inferenceMode).toBe('off');
  });

  it('leitet das Lernziel aus dem Repertoire ab', () => {
    expect(migrated.lexemes[0].learningGoal).toBe('productive');
    expect(migrated.lexemes[1].learningGoal).toBe('receptive');
  });

  it('macht aus dem linearen Status Beobachtungsereignisse', () => {
    const [first, second, third] = migrated.lexemes;

    expect(first.observations).toHaveLength(1);
    expect(first.observations[0]).toMatchObject({ dimension: 'use', result: 'secure', source: 'introduction' });

    expect(second.observations[0]).toMatchObject({ dimension: 'meaning', result: 'supported' });

    // „reaktiviert“ bleibt ein Ereignis – daraus wird keine Kompetenz abgeleitet.
    expect(third.observations[0]).toMatchObject({ dimension: null, result: null, source: 'reactivation' });
    expect(summarizeObservations(third.observations).every((entry) => entry.result === null)).toBe(true);
  });

  it('legt den neuen Schritt „Korpusminiatur“ nicht ungefragt in bestehende Sequenzen', () => {
    expect(migrated.steps.korpusminiatur).toBe(false);
    expect(migrated.stepOrder).toContain('korpusminiatur');
    expect(migrated.stepOrder[migrated.stepOrder.indexOf('korpusminiatur') - 1]).toBe('chunk');
    for (const lexeme of migrated.lexemes) {
      expect(lexeme.stepOverrides.korpusminiatur).toBeUndefined();
      expect(resolveSteps(migrated, lexeme).map((step) => step.id)).not.toContain('korpusminiatur');
    }
  });

  it('setzt den CCQ-Schritt unmittelbar hinter „Bedeutung klären“', () => {
    expect(migrated.stepOrder).toContain('ccq');
    expect(migrated.stepOrder[migrated.stepOrder.indexOf('ccq') - 1]).toBe('klaeren');
    // Der Schritt ist aktiviert, entfällt aber ohne Frage automatisch.
    expect(migrated.steps.ccq).toBe(true);

    // Die erste Einheit bringt eine überführte CCQ mit – sie bekommt den Schritt;
    // an ihre Stelle tritt er dort, wo vorher die Kontrollvorlage stand.
    const [first, second] = migrated.lexemes;
    expect(resolveSteps(migrated, first).map((step) => step.id)).toContain('ccq');
    expect(resolveSteps(migrated, first).map((step) => step.id)).not.toContain('kontrolle');
    expect(resolveSteps(migrated, second).map((step) => step.id)).not.toContain('ccq');
  });

  it('überführt CCQ-nahe Kontrollvorlagen in den CCQ-Bereich', () => {
    // „sprechhandlung“ prüft das Konzept – die Abrufkontrolle bleibt leer.
    const first = migrated.lexemes[0];
    expect(first.checkTemplateId).toBe('');
    expect(first.ccqs).toHaveLength(1);
    expect(first.ccqs[0]).toMatchObject({ templateId: 'sprechhandlung', target: 'use', feature: 'absicht' });

    // Eine Abrufvorlage bleibt, wo sie ist.
    const retrieval = normalizeSequence({
      ...SCHEMA_1_SEQUENCE,
      lexemes: [{ id: 'lex_r', expression: 'x', checkTemplateId: 'welcher-ausdruck-fehlt' }],
    });
    expect(retrieval.lexemes[0].checkTemplateId).toBe('welcher-ausdruck-fehlt');
    expect(retrieval.lexemes[0].ccqs).toEqual([]);
  });

  it('nimmt die eigene Formulierung als CCQ-Frage mit', () => {
    const migratedPrompt = normalizeSequence({
      ...SCHEMA_1_SEQUENCE,
      lexemes: [
        { id: 'lex_p', expression: 'x', checkTemplateId: 'welches-bild', checkPrompt: 'Welches Bild zeigt das?' },
      ],
    });
    const lexeme = migratedPrompt.lexemes[0];
    expect(lexeme.checkPrompt).toBe('');
    expect(lexeme.ccqs[0].question).toBe('Welches Bild zeigt das?');
  });

  it('legt die sprachlich getrennten Felder leer an, ohne etwas zu übersetzen', () => {
    const first = migrated.lexemes[0];
    expect(first.targetExplanation).toBe('');
    expect(first.targetPrompt).toBe('');
    expect(first.teacherNote).toBe('');
    // Die vorhandene Übersetzung bleibt unangetastet.
    expect(first.translation).toBe('Hast du Lust, …?');
  });

  it('legt für ältere Einheiten eine leere, deaktivierte Korpusminiatur an', () => {
    for (const lexeme of migrated.lexemes) {
      expect(lexeme.corpus).toEqual({
        enabled: false,
        title: '',
        guidingQuestion: '',
        focus: 'pattern',
        examples: [],
        discoveryPrompt: '',
        ruleOrFinding: '',
        transferPrompt: '',
        provenance: 'teacher-created',
        sourceNote: '',
      });
      expect(corpusMiniatureReady(lexeme.corpus)).toBe(false);
    }
  });

  it('ergänzt Reaktivierungsverlauf und Priorisierung ohne Datenverlust', () => {
    expect(migrated.reactivation).toMatchObject({
      enabled: true,
      offsetsDays: [1, 3, 7],
      anchor: 1_700_000_000_000,
      completedRounds: 2,
      history: [],
      prioritiseUnsure: true,
    });
  });

  it('füllt das Profil für den Berater mit nachvollziehbaren Startwerten', () => {
    const first = migrated.lexemes[0];
    expect(first.imageability).toBe('gering');
    expect(first.inferenceSuitability).toBe('bedingt');
    expect(first.transferRisk).toBe('gering');
    expect(first.confusionGroup).toBe('');
    expect(first.checkTemplateIdSecondary).toBe('');
  });

  it('ist beim erneuten Einlesen stabil', () => {
    expect(normalizeSequence(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
  });
});
