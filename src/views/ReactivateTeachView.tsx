import { useCallback, useEffect, useMemo, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import { OBSERVATION_RESULTS, type ObservationResult } from '../domain/model';
import { buildImpulses, summariseOutcomes, type ImpulseOutcome } from '../domain/reactivation';
import { usePhrase, useT, useTid } from '../i18n/context';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ProgressBar } from '../ui/Feedback';
import { useFullscreenState } from '../ui/hooks';
import { useToast } from '../ui/toastContext';

interface Reveal {
  index: number;
  support: boolean;
  solution: boolean;
}

/**
 * Reaktivierung im Unterricht – Phase „Wiederbegegnung“.
 * Die Runde zählt erst als durchgeführt, wenn sie hier abgeschlossen wird.
 */
export function ReactivateTeachView({ sequenceId }: { sequenceId: string }) {
  const t = useT();
  const tid = useTid();
  const { state, actions } = useStore();
  const toast = useToast();
  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const isFullscreen = useFullscreenState();

  const phrase = usePhrase(sequence?.targetLanguage ?? 'fr');
  const impulses = useMemo(() => (sequence ? buildImpulses(sequence, phrase) : []), [phrase, sequence]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [results, setResults] = useState<Record<string, ObservationResult>>({});

  const finished = index >= impulses.length;
  const safeIndex = Math.min(index, Math.max(impulses.length - 1, 0));
  const impulse = finished ? undefined : impulses[safeIndex];
  const showSupport = reveal?.index === safeIndex && reveal.support;
  const showSolution = reveal?.index === safeIndex && reveal.solution;

  const goNext = useCallback(() => setIndex((current) => Math.min(current + 1, impulses.length)), [impulses.length]);
  const goBack = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);

  const leave = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    navigate({ name: 'reactivate', sequenceId });
  }, [sequenceId]);

  const outcomes: ImpulseOutcome[] = useMemo(
    () =>
      impulses
        .filter((entry) => results[entry.id])
        .map((entry) => ({
          lexemeId: entry.lexemeId,
          kind: entry.kind,
          dimension: entry.dimension,
          result: results[entry.id],
        })),
    [impulses, results],
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (impulse?.solution && !showSolution) setReveal({ index: safeIndex, support: showSupport, solution: true });
        else goNext();
      } else if (event.key === 'Escape' && !document.fullscreenElement) {
        event.preventDefault();
        leave();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goBack, goNext, impulse, leave, safeIndex, showSolution, showSupport]);

  if (!sequence) {
    return (
      <div className="page">
        <EmptyState title={t('teach.notFound')}>
          <Button onClick={() => navigate({ name: 'home' })}>{t('teach.toStart')}</Button>
        </EmptyState>
      </div>
    );
  }

  if (impulses.length === 0) {
    return (
      <div className="page">
        <EmptyState title={t('reactivate.noImpulses')}>
          <p>{t('reactivate.noLexemes')}</p>
          <Button variant="primary" onClick={() => navigate({ name: 'reactivate', sequenceId })}>
            {t('reactivate.toPlanning')}
          </Button>
        </EmptyState>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  if (finished) {
    const summary = summariseOutcomes(outcomes);
    const round = sequence.reactivation.completedRounds + 1;

    return (
      <div className="teach">
        <div className="teach__top">
          <span className="teach__step">
            <span className="teach__step-number">
              {t('teach.phase', { position: 6, label: tid('phase', 'wiederbegegnung') })}
            </span>{' '}
            · {t('reactivate.round', { round })}
          </span>
          <span className="spacer" />
          <Button onClick={leave}>{t('reactivate.end')}</Button>
        </div>

        <div className="teach__stage">
          <p className="teach__step">{t('reactivate.allShown')}</p>
          <h1 className="teach__utterance">{sequence.title}</h1>
          <p className="teach__support">
            {outcomes.length === 0
              ? t('reactivate.noFeedback')
              : t('reactivate.summary', {
                  secure: summary.secure,
                  supported: summary.supported,
                  notYet: summary.notYet,
                })}
          </p>
        </div>

        <div className="teach__bottom">
          <Button onClick={goBack}>{t('common.back')}</Button>
          <span className="spacer" />
          <Button
            variant="primary"
            large
            onClick={() => {
              actions.completeReactivationRound(sequence.id, outcomes);
              toast.show(t('reactivate.finished', { round }), 'success');
              leave();
            }}
          >
            {t('reactivate.finish')}
          </Button>
        </div>
      </div>
    );
  }

  const current = impulse!;
  const chosen = results[current.id];

  return (
    <div className="teach">
      <div className="teach__top">
        <span className="teach__step">
          <span className="teach__step-number">
            {t('teach.phase', { position: 6, label: tid('phase', 'wiederbegegnung') })}
          </span>{' '}
          · {tid('impulse', current.kind)}
        </span>
        <span className="teach__counter">
          {t('reactivate.counter', { index: safeIndex + 1, total: impulses.length, title: sequence.title })}
        </span>
        <span className="spacer" />
        <IconButton
          label={isFullscreen ? t('teach.fullscreen.off') : t('teach.fullscreen.on')}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '⤡' : '⤢'}
        </IconButton>
        <Button onClick={leave}>{t('reactivate.end')}</Button>
      </div>

      <div className="teach__progress">
        <ProgressBar value={safeIndex + 1} max={impulses.length} label={t('reactivate.progress')} />
      </div>

      <div className="teach__stage">
        <p className="teach__prompt">{current.prompt}</p>
        {showSupport && current.support ? (
          <p className="teach__support">{t('reactivate.support', { value: current.support })}</p>
        ) : null}
        {showSolution && current.solution ? <p className="teach__utterance">{current.solution}</p> : null}
      </div>

      <div className="teach__bottom">
        <Button large onClick={goBack} disabled={safeIndex === 0}>
          {t('teach.back')}
        </Button>
        <Button variant="primary" large onClick={goNext}>
          {t('teach.next')}
        </Button>

        <div className="teach__toggles">
          {current.support ? (
            <button
              type="button"
              className={showSupport ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSupport}
              onClick={() => setReveal({ index: safeIndex, support: !showSupport, solution: showSolution })}
            >
              {t('reactivate.toggleSupport')}
            </button>
          ) : null}
          {current.solution ? (
            <button
              type="button"
              className={showSolution ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSolution}
              onClick={() => setReveal({ index: safeIndex, support: showSupport, solution: !showSolution })}
            >
              {t('reactivate.toggleSolution')}
            </button>
          ) : null}
        </div>

        <span className="spacer" />

        <div className="teach__feedback" role="group" aria-label={t('reactivate.feedbackGroup')}>
          <span className="teach__feedback-label">{t('teach.feedback')}</span>
          {OBSERVATION_RESULTS.map((option) => (
            <button
              key={option}
              type="button"
              className={chosen === option ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={chosen === option}
              onClick={() => setResults((entries) => ({ ...entries, [current.id]: option }))}
            >
              {tid('result', option)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
