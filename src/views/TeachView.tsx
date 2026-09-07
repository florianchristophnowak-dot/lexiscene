import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { navigate, toHash } from '../app/router';
import { useMediaUrl } from '../app/media';
import {
  PROJECTION_WINDOW_NAME,
  isPresentationSupported,
  publishStage,
  useProjectionRequests,
  type StageState,
} from '../app/presentation';
import { useStore } from '../app/storeContext';
import { OBSERVATION_RESULTS, type ObservationResult } from '../domain/model';
import {
  defaultVisibility,
  resolveSteps,
  stepDimension,
  stepInvitesFeedback,
  stepPhase,
  type StepVisibility,
} from '../domain/steps';
import { buildSecondaryPrompt } from '../domain/checks';
import { usableCcqs } from '../domain/ccq';
import { DRILL_STAGES, nextDrillStage, previousDrillStage, type DrillStage as DrillStageId } from '../domain/drill';
import { recapItems } from '../domain/recap';
import type { WordReveal } from '../domain/stage';
import { CLOSED_CORPUS_REVEAL, corpusStages, type CorpusReveal } from '../domain/corpus';
import { firstFilled } from '../domain/text';
import { usePhrase, useT, useTid } from '../i18n/context';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ProgressBar } from '../ui/Feedback';
import { useFullscreenState } from '../ui/hooks';
import { useToast } from '../ui/toastContext';
import { TeachStage, TeacherPanel } from './teach/TeachStage';

/** Beschriftung der drei Stufen beim Herauslocken des Wortes. */
const WORD_REVEAL_LABELS = {
  hidden: 'teach.word.wait',
  cue: 'teach.word.cue',
  full: 'teach.word.full',
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Sichtbarkeit der Hilfen – gilt jeweils nur für den aktuellen Schritt. */
interface RevealState {
  key: string;
  visibility: StepVisibility;
  /** Erstsprachliche Reserve für die Klasse freigegeben. */
  releaseL1: boolean;
  /** Lösung im Abruf – erst Denkzeit, dann zeigen. */
  solution: boolean;
  /** Zusätzliche Aufgabe in der Gegenrichtung. */
  counterpart: boolean;
  /** Gestufte Enthüllung der Korpusminiatur. */
  corpus: CorpusReveal;
  /** Aktuelle Frage der Bedeutungsprüfung. */
  ccqIndex: number;
  /** Erwartete Antwort für die Klasse aufgedeckt. */
  ccqAnswer: boolean;
  /** Alternative Klärung auf dem Lehrkraftbildschirm. */
  alternative: boolean;
  /** Stufe beim Herauslocken des Wortes. */
  wordReveal: WordReveal;
  /** Laufende Stufe der Aussprachearbeit, sonst `null`. */
  drillStage: DrillStageId | null;
  /** Aufgedeckte Einträge der kumulativen Wiederholung. */
  recapRevealed: number;
}

export function TeachView({ sequenceId }: { sequenceId: string }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const t = useT();
  const tid = useTid();
  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const projectionRef = useRef<Window | null>(null);
  const stageRef = useRef<StageState | null>(null);
  const isFullscreen = useFullscreenState();
  const mode = state.settings.teachingLanguageMode;
  const phrase = usePhrase(sequence?.targetLanguage ?? 'fr');

  const teachable = useMemo(() => sequence?.lexemes.filter((lexeme) => !lexeme.skipped) ?? [], [sequence]);
  const stepsPerLexeme = useMemo(
    () => (sequence ? teachable.map((lexeme) => resolveSteps(sequence, lexeme)) : []),
    [sequence, teachable],
  );

  const [lexemeIndex, setLexemeIndex] = useState(() => sequence?.session?.lexemeIndex ?? 0);
  const [stepIndex, setStepIndex] = useState(() => sequence?.session?.stepIndex ?? 0);
  const [finished, setFinished] = useState(false);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contribution, setContribution] = useState('');
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, { result: ObservationResult; observationId: string | null }>>({});

  const safeLexemeIndex = clamp(lexemeIndex, 0, Math.max(teachable.length - 1, 0));
  const lexeme = teachable[safeLexemeIndex];
  const steps = stepsPerLexeme[safeLexemeIndex] ?? [];
  const safeStepIndex = clamp(stepIndex, 0, Math.max(steps.length - 1, 0));
  const step = steps[safeStepIndex];

  const audio = useMediaUrl(lexeme?.audioId);

  // Gestufte Enthüllung: Jeder Schritt beginnt mit seiner Standardsichtbarkeit.
  // Umschaltungen der Lehrkraft gelten nur für den gerade gezeigten Schritt.
  const stepKey = `${safeLexemeIndex}:${safeStepIndex}`;
  const visibility: StepVisibility = useMemo(() => {
    if (reveal?.key === stepKey) return reveal.visibility;
    return step ? defaultVisibility(step.id) : { meaning: false, form: false, support: false };
  }, [reveal, step, stepKey]);
  const current = reveal?.key === stepKey ? reveal : null;
  const releaseL1 = current?.releaseL1 ?? false;
  const showSolution = current?.solution ?? false;
  const showCounterpart = current?.counterpart ?? false;
  const corpusReveal = current?.corpus ?? CLOSED_CORPUS_REVEAL;
  const ccqIndex = current?.ccqIndex ?? 0;
  const showCcqAnswer = current?.ccqAnswer ?? false;
  const showAlternative = current?.alternative ?? false;
  const wordReveal = current?.wordReveal ?? 'hidden';
  const drillStage = current?.drillStage ?? null;
  const recapRevealed = current?.recapRevealed ?? 0;

  const revealState = (patch: Partial<Omit<RevealState, 'key'>>) =>
    setReveal({
      key: stepKey,
      visibility,
      releaseL1,
      solution: showSolution,
      counterpart: showCounterpart,
      corpus: corpusReveal,
      ccqIndex,
      ccqAnswer: showCcqAnswer,
      alternative: showAlternative,
      wordReveal,
      drillStage,
      recapRevealed,
      ...patch,
    });
  const revealCorpus = (patch: Partial<CorpusReveal>) => revealState({ corpus: { ...corpusReveal, ...patch } });
  const updateVisibility = (patch: Partial<StepVisibility>) => revealState({ visibility: { ...visibility, ...patch } });

  const totalSteps = stepsPerLexeme.reduce((sum, entries) => sum + entries.length, 0);
  const completedSteps =
    stepsPerLexeme.slice(0, safeLexemeIndex).reduce((sum, entries) => sum + entries.length, 0) + safeStepIndex + 1;

  const checks = lexeme ? usableCcqs(lexeme) : [];
  const onCcqStep = step?.id === 'ccq';
  const onElicitStep = step?.id === 'wort-elizitieren';
  const onDrillStep = step?.id === 'fokus';
  const onRecapStep = step?.id === 'wiederholung';
  const recap = useMemo(() => (sequence && lexeme ? recapItems(sequence, lexeme) : []), [lexeme, sequence]);

  // Unterbrechen und später fortsetzen.
  useEffect(() => {
    if (!sequence || finished) return;
    const session = sequence.session;
    if (session && session.lexemeIndex === safeLexemeIndex && session.stepIndex === safeStepIndex) return;
    actions.setSession(sequence.id, { lexemeIndex: safeLexemeIndex, stepIndex: safeStepIndex, updatedAt: Date.now() });
  }, [actions, finished, safeLexemeIndex, safeStepIndex, sequence]);

  // Stand für das Projektionsfenster bereithalten und senden.
  useEffect(() => {
    const stage: StageState | null =
      lexeme && step
        ? {
            sequenceId,
            lexemeId: lexeme.id,
            stepId: step.id,
            visibility,
            releaseL1,
            corpusReveal,
            ccqIndex,
            showCcqAnswer,
            showCcqAlternative: showAlternative,
            wordReveal,
            drillStage,
            recapRevealed,
            mode,
            finished,
          }
        : null;
    stageRef.current = stage;
    if (projectionOpen) publishStage(stage);
  }, [
    ccqIndex,
    corpusReveal,
    drillStage,
    finished,
    lexeme,
    mode,
    projectionOpen,
    recapRevealed,
    releaseL1,
    sequenceId,
    showAlternative,
    showCcqAnswer,
    step,
    visibility,
    wordReveal,
  ]);

  const handleProjectionHello = useCallback(() => {
    setProjectionOpen(true);
    publishStage(stageRef.current);
  }, []);
  const handleProjectionClosed = useCallback(() => setProjectionOpen(false), []);
  useProjectionRequests(handleProjectionHello, handleProjectionClosed);

  const openProjection = useCallback(() => {
    const url = new URL(window.location.href);
    url.hash = toHash({ name: 'projection', sequenceId });
    const opened = window.open(url.toString(), PROJECTION_WINDOW_NAME, 'width=1280,height=800');
    if (!opened) {
      toast.show(t('teach.projection.blocked'), 'error');
      return;
    }
    projectionRef.current = opened;
    setProjectionOpen(true);
    publishStage(stageRef.current);
  }, [sequenceId, t, toast]);

  const closeProjection = useCallback(() => {
    projectionRef.current?.close();
    projectionRef.current = null;
    setProjectionOpen(false);
  }, []);

  /** Innerhalb der Bedeutungsprüfung erst die Fragen durchgehen. */
  const goNext = useCallback(() => {
    if (onCcqStep && ccqIndex < checks.length - 1) {
      revealState({ ccqIndex: ccqIndex + 1, ccqAnswer: false });
      return;
    }
    if (safeStepIndex < steps.length - 1) {
      setStepIndex(safeStepIndex + 1);
      return;
    }
    if (safeLexemeIndex < teachable.length - 1) {
      setLexemeIndex(safeLexemeIndex + 1);
      setStepIndex(0);
      return;
    }
    setFinished(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealState hängt bewusst am Renderstand
  }, [ccqIndex, checks.length, onCcqStep, safeLexemeIndex, safeStepIndex, steps.length, teachable.length]);

  const goBack = useCallback(() => {
    if (finished) {
      setFinished(false);
      return;
    }
    if (onCcqStep && ccqIndex > 0) {
      revealState({ ccqIndex: ccqIndex - 1, ccqAnswer: false });
      return;
    }
    if (safeStepIndex > 0) {
      setStepIndex(safeStepIndex - 1);
      return;
    }
    if (safeLexemeIndex > 0) {
      const previous = safeLexemeIndex - 1;
      setLexemeIndex(previous);
      setStepIndex(Math.max((stepsPerLexeme[previous]?.length ?? 1) - 1, 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revealState hängt bewusst am Renderstand
  }, [ccqIndex, finished, onCcqStep, safeLexemeIndex, safeStepIndex, stepsPerLexeme]);

  const leave = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    navigate({ name: 'prepare', sequenceId });
  }, [sequenceId]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void containerRef.current?.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      } else if (event.key === 'Escape' && !document.fullscreenElement) {
        event.preventDefault();
        leave();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goBack, goNext, leave]);

  if (!sequence) {
    return (
      <div className="page">
        <EmptyState title={t('teach.notFound')}>
          <Button onClick={() => navigate({ name: 'home' })}>{t('teach.toStart')}</Button>
        </EmptyState>
      </div>
    );
  }

  if (teachable.length === 0 || totalSteps === 0) {
    return (
      <div className="page">
        <EmptyState title={t('teach.empty.title')}>
          <p>{t('teach.empty.hint')}</p>
          <Button variant="primary" onClick={() => navigate({ name: 'prepare', sequenceId })}>
            {t('teach.toPrepare')}
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (finished || !lexeme || !step) {
    return (
      <div className="teach" ref={containerRef}>
        <div className="teach__stage">
          <p className="teach__step">{t('teach.finished')}</p>
          <h1 className="teach__utterance">{sequence.title}</h1>
          <p className="teach__support">{t('teach.finished.hint', { count: teachable.length })}</p>
        </div>
        <div className="teach__bottom">
          <Button onClick={goBack}>{t('common.back')}</Button>
          <span className="spacer" />
          <Button
            variant="primary"
            onClick={() => {
              actions.setSession(sequence.id, null);
              navigate({ name: 'reactivate', sequenceId: sequence.id });
            }}
          >
            {t('teach.finished.reactivate')}
          </Button>
          <Button
            onClick={() => {
              actions.setSession(sequence.id, null);
              setFinished(false);
              setLexemeIndex(0);
              setStepIndex(0);
            }}
          >
            {t('teach.finished.restart')}
          </Button>
          <Button
            onClick={() => {
              actions.setSession(sequence.id, null);
              closeProjection();
              leave();
            }}
          >
            {t('teach.toPrepare')}
          </Button>
        </div>
      </div>
    );
  }

  const phase = stepPhase(step.id);
  const invitesFeedback = stepInvitesFeedback(step.id);
  const dimension = stepDimension(step.id, lexeme);
  const counterpartPrompt = step.id === 'kontrolle' ? buildSecondaryPrompt(lexeme, phrase) : '';
  const stages = step.id === 'korpusminiatur' ? corpusStages(lexeme.corpus) : null;
  const feedbackKey = `${stepKey}:${dimension}`;
  const currentFeedback = feedback[feedbackKey]?.result;
  const currentCheck = checks[Math.min(ccqIndex, Math.max(checks.length - 1, 0))];
  const needsSupport = currentFeedback === 'supported' || currentFeedback === 'not-yet';
  const clarifyIndex = steps.findIndex((entry) => entry.id === 'klaeren');
  // Erstsprachliche Reserve nur anbieten, wenn es sie gibt und der Modus sie zulässt.
  const l1Available =
    mode !== 'strict' && Boolean(firstFilled(lexeme.translation, lexeme.simplifiedExplanation, lexeme.coreMeaning));

  return (
    <div className="teach" ref={containerRef}>
      <div className="teach__top">
        <span className="teach__step">
          <span className="teach__step-number">
            {t('teach.phase', { position: phase?.position ?? 1, label: phase ? tid('phase', phase.id) : '' })}
          </span>{' '}
          · {tid('step', step.id)}
        </span>
        <span className="teach__counter">
          {t('teach.counter', {
            step: safeStepIndex + 1,
            steps: steps.length,
            lexeme: safeLexemeIndex + 1,
            lexemes: teachable.length,
          })}
        </span>
        <span className="spacer" />
        {isPresentationSupported() ? (
          <Button onClick={projectionOpen ? closeProjection : openProjection}>
            {projectionOpen ? t('teach.projection.close') : t('teach.projection.open')}
          </Button>
        ) : null}
        <IconButton
          label={isFullscreen ? t('teach.fullscreen.off') : t('teach.fullscreen.on')}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '⤡' : '⤢'}
        </IconButton>
        <Button
          onClick={() => {
            closeProjection();
            leave();
          }}
        >
          {t('teach.leave')}
        </Button>
      </div>

      <div className="teach__progress">
        <ProgressBar value={completedSteps} max={totalSteps} label={t('teach.progress')} />
      </div>

      <TeachStage
        sequence={sequence}
        lexeme={lexeme}
        step={step}
        visibility={visibility}
        releaseL1={releaseL1}
        showSolution={showSolution}
        counterpartPrompt={showCounterpart ? counterpartPrompt : ''}
        corpusReveal={corpusReveal}
        ccqIndex={ccqIndex}
        showCcqAnswer={showCcqAnswer}
        showCcqAlternative={showAlternative}
        wordReveal={wordReveal}
        drillStage={drillStage}
        recapRevealed={recapRevealed}
        mode={mode}
        audience={projectionOpen ? 'class' : 'teacher'}
      />

      {projectionOpen ? (
        <TeacherPanel lexeme={lexeme} step={step} ccqIndex={ccqIndex} wordReveal={wordReveal} drillStage={drillStage} />
      ) : null}

      {audio.url ? <audio ref={audioRef} src={audio.url} preload="auto" /> : null}

      {noteOpen ? (
        <div className="teach__bottom">
          <label className="field teach__note-field">
            <span className="field__label">{t('teach.note.field')}</span>
            <textarea
              className="textarea"
              rows={2}
              value={lexeme.liveNote}
              onChange={(event) => actions.updateLexeme(sequence.id, lexeme.id, { liveNote: event.target.value })}
            />
          </label>
          <Button onClick={() => setNoteOpen(false)}>{t('teach.note.close')}</Button>
        </div>
      ) : null}

      {/*
        * Beiträge der Lerngruppe: Was jemand einbringt, wird zur Einheit
        * gespeichert und erscheint im Wortfeld – nichts wird bewertet.
        */}
      {contributionOpen ? (
        <div className="teach__bottom">
          <label className="field teach__note-field">
            <span className="field__label">{t('teach.contribution.field')}</span>
            <input
              className="input"
              value={contribution}
              onChange={(event) => setContribution(event.target.value)}
              placeholder={t('teach.contribution.hint')}
            />
          </label>
          <Button
            variant="primary"
            disabled={!contribution.trim()}
            onClick={() => {
              const entry = contribution.trim();
              if (!entry) return;
              const existing = lexeme.classContributions;
              if (!existing.includes(entry)) {
                actions.updateLexeme(sequence.id, lexeme.id, { classContributions: [...existing, entry] });
              }
              setContribution('');
              setContributionOpen(false);
              toast.show(t('teach.contribution.saved'), 'success');
            }}
          >
            {t('teach.contribution.add')}
          </Button>
          <Button onClick={() => setContributionOpen(false)}>{t('teach.contribution.close')}</Button>
        </div>
      ) : null}

      <div className="teach__bottom">
        <Button large onClick={goBack} disabled={safeLexemeIndex === 0 && safeStepIndex === 0 && ccqIndex === 0}>
          {t('teach.back')}
        </Button>
        <Button variant="primary" large onClick={goNext}>
          {t('teach.next')}
        </Button>

        <div className="teach__toggles">
          {onCcqStep && checks.length > 1 ? (
            <>
              <button
                type="button"
                className="toggle-btn"
                disabled={ccqIndex === 0}
                onClick={() => revealState({ ccqIndex: ccqIndex - 1, ccqAnswer: false })}
              >
                {t('ccq.prev')}
              </button>
              <button
                type="button"
                className="toggle-btn"
                disabled={ccqIndex >= checks.length - 1}
                onClick={() => revealState({ ccqIndex: ccqIndex + 1, ccqAnswer: false })}
              >
                {t('ccq.nextQuestion')}
              </button>
            </>
          ) : null}
          {onCcqStep && currentCheck?.expectedAnswer.trim() ? (
            <button
              type="button"
              className={showCcqAnswer ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showCcqAnswer}
              onClick={() => revealState({ ccqAnswer: !showCcqAnswer })}
            >
              {t('ccq.showAnswer')}
            </button>
          ) : null}

          {/*
            * Das Wort wird gestuft herausgelockt: warten, Anlaut, nennen.
            * Vorher steht es nirgends – auch nicht über „Schriftbild“.
            */}
          {onElicitStep
            ? (['hidden', 'cue', 'full'] as WordReveal[]).map((stage) => (
                <button
                  key={stage}
                  type="button"
                  className={wordReveal === stage ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
                  aria-pressed={wordReveal === stage}
                  onClick={() => revealState({ wordReveal: stage })}
                >
                  {t(WORD_REVEAL_LABELS[stage])}
                </button>
              ))
            : null}

          {onDrillStep ? (
            drillStage ? (
              <>
                {DRILL_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    className={drillStage === stage ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
                    aria-pressed={drillStage === stage}
                    onClick={() => revealState({ drillStage: stage })}
                  >
                    {tid('drill.stage', stage)}
                  </button>
                ))}
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => revealState({ drillStage: previousDrillStage(drillStage) })}
                >
                  {t('drill.previous')}
                </button>
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => revealState({ drillStage: nextDrillStage(drillStage) })}
                >
                  {t('drill.next')}
                </button>
                <button type="button" className="toggle-btn" onClick={() => revealState({ drillStage: null })}>
                  {t('drill.stop')}
                </button>
              </>
            ) : (
              <button type="button" className="toggle-btn" onClick={() => revealState({ drillStage: 'model' })}>
                {t('drill.start')}
              </button>
            )
          ) : null}

          {onRecapStep ? (
            <>
              <button
                type="button"
                className="toggle-btn"
                disabled={recapRevealed >= recap.length}
                onClick={() => revealState({ recapRevealed: recapRevealed + 1 })}
              >
                {t('teach.recap.reveal')}
              </button>
              <button
                type="button"
                className="toggle-btn"
                disabled={recapRevealed === 0}
                onClick={() => revealState({ recapRevealed: 0 })}
              >
                {t('teach.recap.hide')}
              </button>
            </>
          ) : null}

          <button
            type="button"
            className={visibility.meaning ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
            aria-pressed={visibility.meaning}
            onClick={() => updateVisibility({ meaning: !visibility.meaning })}
          >
            {t('teach.toggle.meaning')}
          </button>
          <button
            type="button"
            className={visibility.form ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
            aria-pressed={visibility.form}
            onClick={() => updateVisibility({ form: !visibility.form })}
          >
            {t('teach.toggle.form')}
          </button>
          {l1Available ? (
            <button
              type="button"
              className={releaseL1 ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={releaseL1}
              title={t('teach.toggle.l1.hint')}
              onClick={() => revealState({ releaseL1: !releaseL1 })}
            >
              {t('teach.toggle.l1')}
            </button>
          ) : null}
          <button
            type="button"
            className={visibility.support ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
            aria-pressed={visibility.support}
            onClick={() => updateVisibility({ support: !visibility.support })}
          >
            {t('teach.toggle.support')}
          </button>
          {invitesFeedback && !onCcqStep ? (
            <button
              type="button"
              className={showSolution ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSolution}
              onClick={() => revealState({ solution: !showSolution })}
            >
              {t('teach.toggle.solution')}
            </button>
          ) : null}
          {counterpartPrompt ? (
            <button
              type="button"
              className={showCounterpart ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showCounterpart}
              onClick={() => revealState({ counterpart: !showCounterpart })}
            >
              {t('teach.toggle.counterpart')}
            </button>
          ) : null}
          {stages?.highlight ? (
            <button
              type="button"
              className={corpusReveal.highlight ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={corpusReveal.highlight}
              onClick={() => revealCorpus({ highlight: !corpusReveal.highlight })}
            >
              {t('corpus.reveal.highlight')}
            </button>
          ) : null}
          {stages?.groups ? (
            <button
              type="button"
              className={corpusReveal.groups ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={corpusReveal.groups}
              onClick={() => revealCorpus({ groups: !corpusReveal.groups })}
            >
              {t('corpus.reveal.groups')}
            </button>
          ) : null}
          {stages?.rule ? (
            <button
              type="button"
              className={corpusReveal.rule ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={corpusReveal.rule}
              onClick={() => revealCorpus({ rule: !corpusReveal.rule })}
            >
              {t('corpus.reveal.rule')}
            </button>
          ) : null}
          {stages?.transfer ? (
            <button
              type="button"
              className={corpusReveal.transfer ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={corpusReveal.transfer}
              onClick={() => revealCorpus({ transfer: !corpusReveal.transfer })}
            >
              {t('corpus.reveal.transfer')}
            </button>
          ) : null}
          {audio.url ? (
            <Button
              onClick={() => {
                if (!audioRef.current) return;
                audioRef.current.currentTime = 0;
                void audioRef.current.play().catch(() => undefined);
              }}
            >
              {t('teach.toggle.audio')}
            </Button>
          ) : null}
        </div>

        <span className="spacer" />

        <div className="teach__status-row">
          {invitesFeedback ? (
            <div
              className="teach__feedback"
              role="group"
              aria-label={t('teach.feedback.group', { dimension: tid('dimension', dimension) })}
            >
              <span className="teach__feedback-label">{t('teach.feedback')}</span>
              {OBSERVATION_RESULTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={currentFeedback === option ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
                  aria-pressed={currentFeedback === option}
                  onClick={() => {
                    // Eine Korrektur ersetzt die Rückmeldung dieses Schritts,
                    // statt eine zweite Beobachtung anzulegen.
                    const previous = feedback[feedbackKey];
                    if (previous?.observationId) {
                      actions.removeObservation(sequence.id, lexeme.id, previous.observationId);
                    }
                    const observationId = actions.recordObservation(sequence.id, lexeme.id, {
                      dimension,
                      result: option,
                      source: 'introduction',
                    });
                    setFeedback((entries) => ({ ...entries, [feedbackKey]: { result: option, observationId } }));
                  }}
                >
                  {tid('result', option)}
                </button>
              ))}
            </div>
          ) : null}

          {onCcqStep && needsSupport ? (
            <>
              {currentCheck?.alternativeClarification.trim() ? (
                <Button
                  variant={showAlternative ? 'secondary' : 'ghost'}
                  aria-pressed={showAlternative}
                  onClick={() => revealState({ alternative: !showAlternative })}
                >
                  {t('ccq.showAlternative')}
                </Button>
              ) : null}
              {clarifyIndex >= 0 ? (
                <Button variant="ghost" onClick={() => setStepIndex(clarifyIndex)}>
                  {t('ccq.backToClarify')}
                </Button>
              ) : null}
            </>
          ) : null}

          <Button onClick={() => setContributionOpen((value) => !value)}>{t('teach.contribution')}</Button>
          <Button onClick={() => setNoteOpen((value) => !value)}>{t('teach.note')}</Button>
          <Button
            onClick={() => {
              actions.updateLexeme(sequence.id, lexeme.id, { skipped: true });
              if (safeLexemeIndex >= teachable.length - 1) setFinished(true);
              else setStepIndex(0);
            }}
          >
            {t('teach.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
