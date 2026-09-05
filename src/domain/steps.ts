/**
 * Standarddramaturgie einer Semantisierung.
 *
 * Die Reihenfolge ist bewusst stabil; die Lehrkraft aktiviert oder deaktiviert
 * einzelne Schritte auf Sequenz- oder Einheitenebene.
 */
import type { Lexeme, Sequence, StepId } from './model';

export interface StepDefinition {
  id: StepId;
  position: number;
  label: string;
  /** Knappe didaktische Begründung – erscheint als Hinweis in der Vorbereitung. */
  purpose: string;
}

export const STEPS: readonly StepDefinition[] = [
  { id: 'situation', position: 1, label: 'Situation', purpose: 'Kommunikativen Bedarf sichtbar machen, bevor Sprache angeboten wird.' },
  { id: 'impuls', position: 2, label: 'Impuls zeigen', purpose: 'Bild, Gegenstand, Geste oder Video als Bedeutungsträger anbieten.' },
  { id: 'audio', position: 3, label: 'Hören', purpose: 'Klangbild vor dem Schriftbild anbieten.' },
  { id: 'vermuten', position: 4, label: 'Bedeutung vermuten', purpose: 'Lernende erschließen die Bedeutung selbst – das sichert Verarbeitungstiefe.' },
  { id: 'klaeren', position: 5, label: 'Bedeutung klären', purpose: 'Bedeutung eindeutig sichern, damit keine falsche Hypothese bestehen bleibt.' },
  { id: 'form', position: 6, label: 'Form zeigen', purpose: 'Schriftbild erst nach der Bedeutungsklärung einführen.' },
  { id: 'fokus', position: 7, label: 'Aussprache und Muster', purpose: 'Lautung, Betonung und Satzrahmen gezielt fokussieren.' },
  { id: 'kontrolle', position: 8, label: 'Verständniskontrolle', purpose: 'Formative Rückmeldung einholen, ohne zu bewerten.' },
  { id: 'hilfen-ausblenden', position: 9, label: 'Hilfen ausblenden', purpose: 'Stützen schrittweise entfernen und Abrufbarkeit prüfen.' },
  { id: 'abruf', position: 10, label: 'Freier Abruf', purpose: 'Abruf ohne Vorlage anregen.' },
  { id: 'aufgabe', position: 11, label: 'Kommunikative Mini-Aufgabe', purpose: 'Erstes eigenes Sprachhandeln mit der neuen Einheit ermöglichen.' },
];

export const STEP_IDS: readonly StepId[] = STEPS.map((step) => step.id);

export function defaultStepConfig(): Record<StepId, boolean> {
  const config = {} as Record<StepId, boolean>;
  for (const step of STEPS) config[step.id] = true;
  return config;
}

export function stepDefinition(id: StepId): StepDefinition | undefined {
  return STEPS.find((step) => step.id === id);
}

const hasText = (...values: (string | undefined)[]): boolean => values.some((value) => Boolean(value && value.trim()));

/** Ein Schritt wird nur angeboten, wenn dafür überhaupt Material vorliegt. */
export function stepHasContent(id: StepId, lexeme: Lexeme): boolean {
  switch (id) {
    case 'situation':
      return hasText(lexeme.situation, lexeme.example, lexeme.modelUtterance);
    case 'impuls':
      return Boolean(lexeme.imageId || lexeme.videoId) || hasText(lexeme.semantisationMethod);
    case 'audio':
      return Boolean(lexeme.audioId) || hasText(lexeme.modelUtterance);
    case 'vermuten':
      return true;
    case 'klaeren':
      return hasText(lexeme.coreMeaning, lexeme.translation, lexeme.simplifiedExplanation);
    case 'form':
      return hasText(lexeme.expression);
    case 'fokus':
      return hasText(
        lexeme.pronunciationHint,
        lexeme.prosodyNote,
        lexeme.ipa,
        lexeme.morphology,
        lexeme.sentenceFrame,
        lexeme.valency,
        lexeme.collocations,
      );
    case 'kontrolle':
      return hasText(lexeme.checkTemplateId, lexeme.checkPrompt);
    case 'hilfen-ausblenden':
      return true;
    case 'abruf':
      return true;
    case 'aufgabe':
      return hasText(lexeme.communicativeTask, lexeme.extensionTask, lexeme.modelUtterance);
    default:
      return false;
  }
}

export function isStepEnabled(sequence: Sequence, lexeme: Lexeme, id: StepId): boolean {
  const override = lexeme.stepOverrides?.[id];
  if (typeof override === 'boolean') return override;
  return sequence.steps?.[id] !== false;
}

/** Alle Schritte, die für diese Einheit tatsächlich gezeigt werden. */
export function resolveSteps(sequence: Sequence, lexeme: Lexeme): StepDefinition[] {
  return STEPS.filter((step) => isStepEnabled(sequence, lexeme, step.id) && stepHasContent(step.id, lexeme));
}

/** Sichtbarkeit der Hilfen beim Betreten eines Schritts (gestufte Enthüllung). */
export interface StepVisibility {
  meaning: boolean;
  form: boolean;
  support: boolean;
}

export function defaultVisibility(id: StepId): StepVisibility {
  switch (id) {
    case 'situation':
    case 'impuls':
    case 'audio':
    case 'vermuten':
      return { meaning: false, form: false, support: false };
    case 'klaeren':
      return { meaning: true, form: false, support: false };
    case 'form':
      return { meaning: true, form: true, support: false };
    case 'fokus':
      // Lautung und Muster stehen im Vordergrund, die Bedeutung ist geklärt.
      return { meaning: false, form: true, support: true };
    case 'kontrolle':
      // Die Kontrollfrage steht allein – Hilfen blendet die Lehrkraft bei Bedarf ein.
      return { meaning: false, form: false, support: false };
    case 'hilfen-ausblenden':
    case 'abruf':
      return { meaning: false, form: false, support: false };
    case 'aufgabe':
      return { meaning: false, form: true, support: false };
    default:
      return { meaning: false, form: false, support: false };
  }
}
