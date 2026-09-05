/**
 * Didaktischer Bereitschaftscheck.
 *
 * Der Check gibt Hinweise, bevor unterrichtet wird – er blockiert nie. Er
 * unterscheidet zwischen „noch ergänzen“ (fehlt für einen tragfähigen
 * Erstkontakt) und „optional vertiefen“ (verbessert die Sequenz, ist aber nicht
 * nötig). Es findet keine inhaltliche Analyse und keine automatische Bewertung
 * statt; geprüft wird ausschließlich, was die Lehrkraft eingetragen hat.
 */
import type { Lexeme, Sequence } from './model';
import { buildCheckPrompt } from './checks';
import { firstFilled, truncate } from './text';

export type ReadinessSeverity = 'ergaenzen' | 'vertiefen';

export interface ReadinessFinding {
  id: string;
  severity: ReadinessSeverity;
  title: string;
  detail: string;
  lexemeIds: string[];
}

const SEVERITY_LABELS: Record<ReadinessSeverity, string> = {
  ergaenzen: 'Noch ergänzen',
  vertiefen: 'Optional vertiefen',
};

export const readinessSeverityLabel = (severity: ReadinessSeverity): string => SEVERITY_LABELS[severity];

const label = (lexeme: Lexeme): string => truncate(lexeme.expression || 'ohne Ausdruck', 28);

function listOf(lexemes: Lexeme[]): string {
  const names = lexemes.slice(0, 4).map(label);
  const rest = lexemes.length - names.length;
  return rest > 0 ? `${names.join(', ')} und ${rest} weitere` : names.join(', ');
}

/** Hat die Einheit überhaupt einen Abrufimpuls? */
function hasRetrievalPrompt(lexeme: Lexeme): boolean {
  return Boolean(buildCheckPrompt(lexeme).trim() || lexeme.communicativeTask.trim());
}

/** Steht eine eindeutige Lösung oder Bestätigung bereit? */
function hasConfirmation(lexeme: Lexeme): boolean {
  return Boolean(firstFilled(lexeme.coreMeaning, lexeme.translation, lexeme.simplifiedExplanation, lexeme.example));
}

export function checkReadiness(sequence: Sequence): ReadinessFinding[] {
  const findings: ReadinessFinding[] = [];
  const active = sequence.lexemes.filter((lexeme) => !lexeme.skipped);

  const add = (
    id: string,
    severity: ReadinessSeverity,
    title: string,
    detail: string,
    lexemes: Lexeme[] = [],
  ): void => {
    findings.push({ id, severity, title, detail, lexemeIds: lexemes.map((lexeme) => lexeme.id) });
  };

  if (!sequence.canDoGoal.trim()) {
    add('can-do', 'ergaenzen', 'Kommunikatives Kann-Ziel fehlt', 'Ohne Ziel bleibt offen, wofür die Einheiten gebraucht werden.');
  }

  const withoutMeaning = active.filter((lexeme) => !lexeme.coreMeaning.trim());
  if (withoutMeaning.length > 0) {
    add(
      'core-meaning',
      'ergaenzen',
      'Kernbedeutung fehlt',
      `Ohne Kernbedeutung lässt sich die Bedeutung im Unterricht nicht eindeutig klären: ${listOf(withoutMeaning)}.`,
      withoutMeaning,
    );
  }

  const withoutContext = active.filter((lexeme) => !firstFilled(lexeme.situation, lexeme.example, lexeme.modelUtterance));
  if (withoutContext.length > 0) {
    add(
      'context',
      'ergaenzen',
      'Situation oder Kontext fehlt',
      `Der Erstkontakt beginnt ohne erkennbaren Anlass: ${listOf(withoutContext)}.`,
      withoutContext,
    );
  }

  const productiveCore = active.filter((lexeme) => lexeme.learningGoal === 'productive' && lexeme.repertoire === 'kern');
  const withoutAnchor = productiveCore.filter((lexeme) => !lexeme.sentenceFrame.trim());
  if (withoutAnchor.length > 0) {
    add(
      'pattern-anchor',
      'ergaenzen',
      'Produktives Kernitem ohne Musteranker',
      `Für die eigene Verwendung fehlt der Rahmen, in dem die Einheit steht: ${listOf(withoutAnchor)}.`,
      withoutAnchor,
    );
  }

  const withoutRetrieval = active.filter((lexeme) => !hasRetrievalPrompt(lexeme));
  if (withoutRetrieval.length > 0) {
    add(
      'retrieval',
      'ergaenzen',
      'Kein Abrufimpuls vorbereitet',
      `Weder Verständniskontrolle noch Mini-Aufgabe hinterlegt: ${listOf(withoutRetrieval)}.`,
      withoutRetrieval,
    );
  }

  const withoutConfirmation = active.filter((lexeme) => hasRetrievalPrompt(lexeme) && !hasConfirmation(lexeme));
  if (withoutConfirmation.length > 0) {
    add(
      'confirmation',
      'ergaenzen',
      'Keine eindeutige Lösung vorbereitet',
      `Zum Abruf fehlt die Bestätigung, an der sich die Klasse ausrichten kann: ${listOf(withoutConfirmation)}.`,
      withoutConfirmation,
    );
  }

  // Verwechslungsgruppen: rein aus den Angaben der Lehrkraft, ohne Textanalyse.
  const groups = new Map<string, Lexeme[]>();
  for (const lexeme of active) {
    const group = lexeme.confusionGroup.trim().toLowerCase();
    if (!group) continue;
    groups.set(group, [...(groups.get(group) ?? []), lexeme]);
  }
  for (const [group, members] of groups) {
    if (members.length < 2) continue;
    add(
      `confusion-${group}`,
      'vertiefen',
      'Eng verwandte Einheiten in einer Sequenz',
      `${members.length} Einheiten der Gruppe „${group}“ (${listOf(members)}) könnten sich gegenseitig stören – eine zeitliche Staffelung ist oft ruhiger.`,
      members,
    );
  }

  if (!sequence.reactivation.enabled) {
    add(
      'reactivation',
      'vertiefen',
      'Reaktivierung noch nicht geplant',
      'Die Wiederbegegnung lässt sich im Bereich „Reaktivieren“ mit frei wählbaren Abständen vorbereiten.',
    );
  }

  return findings;
}

export interface ReadinessSummary {
  findings: ReadinessFinding[];
  toComplete: number;
  optional: number;
}

export function summarizeReadiness(sequence: Sequence): ReadinessSummary {
  const findings = checkReadiness(sequence);
  return {
    findings,
    toComplete: findings.filter((finding) => finding.severity === 'ergaenzen').length,
    optional: findings.filter((finding) => finding.severity === 'vertiefen').length,
  };
}
