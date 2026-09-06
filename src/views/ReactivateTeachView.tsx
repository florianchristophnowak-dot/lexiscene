import { useCallback, useEffect, useMemo, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import { OBSERVATION_RESULTS, type ObservationResult } from '../domain/model';
import { buildImpulses, summariseOutcomes, type ImpulseOutcome } from '../domain/reactivation';
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
  const { state, actions } = useStore();
  const toast = useToast();
  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const isFullscreen = useFullscreenState();

  const impulses = useMemo(() => (sequence ? buildImpulses(sequence) : []), [sequence]);
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
        <EmptyState title="Sequenz nicht gefunden">
          <Button onClick={() => navigate({ name: 'home' })}>Zur Startseite</Button>
        </EmptyState>
      </div>
    );
  }

  if (impulses.length === 0) {
    return (
      <div className="page">
        <EmptyState title="Keine Impulse verfügbar">
          <p>Diese Sequenz enthält noch keine Einheiten mit Ausdruck.</p>
          <Button variant="primary" onClick={() => navigate({ name: 'reactivate', sequenceId })}>
            Zur Reaktivierungsplanung
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
            <span className="teach__step-number">Phase 6: Wiederbegegnung</span> · Runde {round}
          </span>
          <span className="spacer" />
          <Button onClick={leave}>Beenden</Button>
        </div>

        <div className="teach__stage">
          <p className="teach__step">Alle Impulse gezeigt</p>
          <h1 className="teach__utterance">{sequence.title}</h1>
          <p className="teach__support">
            {outcomes.length === 0
              ? 'Es wurden keine Rückmeldungen erfasst. Die Runde lässt sich trotzdem abschließen.'
              : `Rückmeldungen: ${summary.secure}× sicher, ${summary.supported}× mit Hilfe, ${summary.notYet}× noch nicht.`}
          </p>
        </div>

        <div className="teach__bottom">
          <Button onClick={goBack}>Zurück</Button>
          <span className="spacer" />
          <Button
            variant="primary"
            large
            onClick={() => {
              actions.completeReactivationRound(sequence.id, outcomes);
              toast.show(`Runde ${round} abgeschlossen.`, 'success');
              leave();
            }}
          >
            Runde abschließen
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
          <span className="teach__step-number">Phase 6: Wiederbegegnung</span> · {current.label}
        </span>
        <span className="teach__counter">
          Impuls {safeIndex + 1} von {impulses.length} · {sequence.title}
        </span>
        <span className="spacer" />
        <IconButton label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild einschalten'} onClick={toggleFullscreen}>
          {isFullscreen ? '⤡' : '⤢'}
        </IconButton>
        <Button onClick={leave}>Beenden</Button>
      </div>

      <div className="teach__progress">
        <ProgressBar value={safeIndex + 1} max={impulses.length} label="Fortschritt der Reaktivierung" />
      </div>

      <div className="teach__stage">
        <p className="teach__prompt">{current.prompt}</p>
        {showSupport && current.support ? <p className="teach__support">Hilfe: {current.support}</p> : null}
        {showSolution && current.solution ? <p className="teach__utterance">{current.solution}</p> : null}
      </div>

      <div className="teach__bottom">
        <Button large onClick={goBack} disabled={safeIndex === 0}>
          ← Zurück
        </Button>
        <Button variant="primary" large onClick={goNext}>
          Weiter →
        </Button>

        <div className="teach__toggles">
          {current.support ? (
            <button
              type="button"
              className={showSupport ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSupport}
              onClick={() => setReveal({ index: safeIndex, support: !showSupport, solution: showSolution })}
            >
              Hilfe
            </button>
          ) : null}
          {current.solution ? (
            <button
              type="button"
              className={showSolution ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSolution}
              onClick={() => setReveal({ index: safeIndex, support: showSupport, solution: !showSolution })}
            >
              Lösung
            </button>
          ) : null}
        </div>

        <span className="spacer" />

        <div className="teach__feedback" role="group" aria-label="Rückmeldung der Klasse zu diesem Impuls">
          <span className="teach__feedback-label">Klasse:</span>
          {OBSERVATION_RESULTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={chosen === option.id ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={chosen === option.id}
              onClick={() => setResults((entries) => ({ ...entries, [current.id]: option.id }))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
