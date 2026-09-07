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
import { coversBothDirections, hasCheckPrompt } from './checks';
import { CORPUS_MIN_EXAMPLES, corpusMiniatureReady, usableExamples } from './corpus';
import { ccqWarnings, hasUsableCcq } from './ccq';
import { isStepEnabled } from './steps';
import { firstFilled, truncate } from './text';

export type ReadinessSeverity = 'ergaenzen' | 'vertiefen';

/**
 * Ein Hinweis nennt nur seine Kennung; Titel und Erläuterung stehen im
 * Sprachkatalog unter `readiness.<key>.title` und `readiness.<key>.detail`.
 */
export interface ReadinessFinding {
  id: string;
  severity: ReadinessSeverity;
  /** Schlüsselteil für den Sprachkatalog. */
  key: string;
  params: Record<string, string | number>;
  lexemeIds: string[];
}

const label = (lexeme: Lexeme): string => truncate(lexeme.expression || 'ohne Ausdruck', 28);

function listOf(lexemes: Lexeme[]): string {
  const names = lexemes.slice(0, 4).map(label);
  const rest = lexemes.length - names.length;
  return rest > 0 ? `${names.join(', ')} und ${rest} weitere` : names.join(', ');
}

/** Hat die Einheit überhaupt einen Abrufimpuls? */
function hasRetrievalPrompt(lexeme: Lexeme): boolean {
  return hasCheckPrompt(lexeme) || Boolean(lexeme.communicativeTask.trim());
}

/** Steht eine eindeutige Lösung oder Bestätigung bereit? */
function hasConfirmation(lexeme: Lexeme): boolean {
  return Boolean(
    firstFilled(lexeme.targetExplanation, lexeme.coreMeaning, lexeme.translation, lexeme.simplifiedExplanation, lexeme.example),
  );
}

export function checkReadiness(sequence: Sequence): ReadinessFinding[] {
  const findings: ReadinessFinding[] = [];
  const active = sequence.lexemes.filter((lexeme) => !lexeme.skipped);

  const add = (
    id: string,
    severity: ReadinessSeverity,
    key: string,
    params: Record<string, string | number> = {},
    lexemes: Lexeme[] = [],
  ): void => {
    findings.push({ id, severity, key, params, lexemeIds: lexemes.map((lexeme) => lexeme.id) });
  };

  if (!sequence.canDoGoal.trim()) {
    add('can-do', 'ergaenzen', 'canDo');
  }

  const withoutMeaning = active.filter((lexeme) => !lexeme.coreMeaning.trim());
  if (withoutMeaning.length > 0) {
    add('core-meaning', 'ergaenzen', 'coreMeaning', { list: listOf(withoutMeaning) }, withoutMeaning);
  }

  const withoutContext = active.filter((lexeme) => !firstFilled(lexeme.situation, lexeme.example, lexeme.modelUtterance));
  if (withoutContext.length > 0) {
    add('context', 'ergaenzen', 'context', { list: listOf(withoutContext) }, withoutContext);
  }

  const productiveCore = active.filter((lexeme) => lexeme.learningGoal === 'productive' && lexeme.repertoire === 'kern');
  const withoutAnchor = productiveCore.filter((lexeme) => !lexeme.sentenceFrame.trim());
  if (withoutAnchor.length > 0) {
    add('pattern-anchor', 'ergaenzen', 'patternAnchor', { list: listOf(withoutAnchor) }, withoutAnchor);
  }

  const withoutRetrieval = active.filter((lexeme) => !hasRetrievalPrompt(lexeme));
  if (withoutRetrieval.length > 0) {
    add('retrieval', 'ergaenzen', 'retrieval', { list: listOf(withoutRetrieval) }, withoutRetrieval);
  }

  const withoutConfirmation = active.filter((lexeme) => hasRetrievalPrompt(lexeme) && !hasConfirmation(lexeme));
  if (withoutConfirmation.length > 0) {
    add('confirmation', 'ergaenzen', 'confirmation', { list: listOf(withoutConfirmation) }, withoutConfirmation);
  }

  const singleDirection = productiveCore.filter((lexeme) => !coversBothDirections(lexeme));
  if (singleDirection.length > 0) {
    add('both-directions', 'vertiefen', 'bothDirections', { list: listOf(singleDirection) }, singleDirection);
  }

  // Bedeutungsprüfung: nur ein Angebot, nie eine Pflicht.
  const withoutCcq = active.filter((lexeme) => !hasUsableCcq(lexeme));
  if (withoutCcq.length > 0) {
    add('ccq', 'vertiefen', 'ccq', { list: listOf(withoutCcq) }, withoutCcq);
  }

  const ccqIssues = active.filter((lexeme) => ccqWarnings(lexeme.ccqs).length > 0);
  if (ccqIssues.length > 0) {
    add('ccq-quality', 'vertiefen', 'ccqQuality', { list: listOf(ccqIssues) }, ccqIssues);
  }

  // Korpusminiaturen: rein formale Hinweise, keine Bewertung der Belege.
  const corpusEnabled = active.filter((lexeme) => lexeme.corpus.enabled);
  const corpusTooShort = corpusEnabled.filter((lexeme) => usableExamples(lexeme.corpus).length < CORPUS_MIN_EXAMPLES);
  if (corpusTooShort.length > 0) {
    add(
      'corpus-incomplete',
      'ergaenzen',
      'corpusIncomplete',
      { min: CORPUS_MIN_EXAMPLES, list: listOf(corpusTooShort) },
      corpusTooShort,
    );
  }

  const corpusHidden = corpusEnabled.filter(
    (lexeme) => corpusMiniatureReady(lexeme.corpus) && !isStepEnabled(sequence, lexeme, 'korpusminiatur'),
  );
  if (corpusHidden.length > 0) {
    add('corpus-step-off', 'vertiefen', 'corpusStepOff', { list: listOf(corpusHidden) }, corpusHidden);
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
      'confusion',
      { count: members.length, group, list: listOf(members) },
      members,
    );
  }

  if (!sequence.reactivation.enabled) {
    add('reactivation', 'vertiefen', 'reactivation');
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
