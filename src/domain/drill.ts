/**
 * Aussprache erarbeiten.
 *
 * Nach dem Anschreiben wird die natürliche Aussprache modelliert und geübt:
 * vorsprechen, chorisch nachsprechen, Teilgruppen, einzelne Lernende – und
 * dazwischen gezielt hinhören. Gedrillt wird möglichst die ganze Wendung, nicht
 * eine Folge einzelner Wörter.
 *
 * Die Stufen sind eine Regiehilfe, kein Pflichtablauf: Die Lehrkraft springt
 * frei und beendet den Schritt, wann sie will.
 */
import type { Lexeme } from './model';
import { firstFilled } from './text';

export type DrillStage = 'model' | 'chorus' | 'groups' | 'individual' | 'listen';

export const DRILL_STAGES: readonly DrillStage[] = ['model', 'chorus', 'groups', 'individual', 'listen'];

/** Zielsprachliche Arbeitsanweisung je Stufe (Schlüssel in `i18n/prompts`). */
export function drillPromptKey(stage: DrillStage): string {
  return `drill.prompt.${stage}`;
}

/**
 * Was gesprochen wird: die zentrale Kollokation, sonst die Modelläußerung,
 * sonst der Ausdruck. So wird die Wendung als Ganzes gedrillt.
 */
export function drillItem(lexeme: Lexeme): string {
  return firstFilled(lexeme.keyCollocation, lexeme.modelUtterance, lexeme.expression);
}

export function drillPosition(stage: DrillStage): number {
  return DRILL_STAGES.indexOf(stage) + 1;
}

/** Nächste Stufe; die letzte bleibt stehen. */
export function nextDrillStage(stage: DrillStage): DrillStage {
  const index = DRILL_STAGES.indexOf(stage);
  return DRILL_STAGES[Math.min(index + 1, DRILL_STAGES.length - 1)];
}

/** Vorige Stufe; die erste bleibt stehen. */
export function previousDrillStage(stage: DrillStage): DrillStage {
  const index = DRILL_STAGES.indexOf(stage);
  return DRILL_STAGES[Math.max(index - 1, 0)];
}

export function isDrillStage(value: unknown): value is DrillStage {
  return typeof value === 'string' && DRILL_STAGES.includes(value as DrillStage);
}
