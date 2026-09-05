import { useCallback, useEffect, useMemo, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import { buildImpulses } from '../domain/reactivation';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ProgressBar } from '../ui/Feedback';
import { useFullscreenState } from '../ui/hooks';

interface Reveal {
  index: number;
  support: boolean;
  solution: boolean;
}

export function ReactivateTeachView({ sequenceId }: { sequenceId: string }) {
  const { state, actions } = useStore();
  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const isFullscreen = useFullscreenState();

  const impulses = useMemo(() => (sequence ? buildImpulses(sequence) : []), [sequence]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const safeIndex = Math.min(index, Math.max(impulses.length - 1, 0));
  const impulse = impulses[safeIndex];
  const showSupport = reveal?.index === safeIndex && reveal.support;
  const showSolution = reveal?.index === safeIndex && reveal.solution;

  const goNext = useCallback(() => setIndex((current) => Math.min(current + 1, impulses.length - 1)), [impulses.length]);
  const goBack = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);

  const leave = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    navigate({ name: 'reactivate', sequenceId });
  }, [sequenceId]);

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
        // Leertaste deckt zuerst die Lösung auf und geht dann weiter.
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

  if (!impulse) {
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

  const lexeme = sequence.lexemes.find((entry) => entry.id === impulse.lexemeId);

  return (
    <div className="teach">
      <div className="teach__top">
        <span className="teach__step">
          <span className="teach__step-number">
            Impuls {safeIndex + 1} von {impulses.length}
          </span>{' '}
          · {impulse.label}
        </span>
        <span className="teach__counter">{sequence.title}</span>
        <span className="spacer" />
        <IconButton
          label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild einschalten'}
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
            else void document.documentElement.requestFullscreen?.().catch(() => undefined);
          }}
        >
          {isFullscreen ? '⤡' : '⤢'}
        </IconButton>
        <Button onClick={leave}>Beenden</Button>
      </div>

      <div className="teach__progress">
        <ProgressBar value={safeIndex + 1} max={impulses.length} label="Fortschritt der Reaktivierung" />
      </div>

      <div className="teach__stage">
        <p className="teach__prompt">{impulse.prompt}</p>
        {showSupport && impulse.support ? <p className="teach__support">Hilfe: {impulse.support}</p> : null}
        {showSolution && impulse.solution ? <p className="teach__utterance">{impulse.solution}</p> : null}
      </div>

      <div className="teach__bottom">
        <Button large onClick={goBack} disabled={safeIndex === 0}>
          ← Zurück
        </Button>
        <Button variant="primary" large onClick={goNext} disabled={safeIndex === impulses.length - 1}>
          Weiter →
        </Button>

        <div className="teach__toggles">
          {impulse.support ? (
            <button
              type="button"
              className={showSupport ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSupport}
              onClick={() => setReveal({ index: safeIndex, support: !showSupport, solution: showSolution })}
            >
              Hilfe
            </button>
          ) : null}
          {impulse.solution ? (
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

        <Button
          disabled={lexeme?.status === 'reaktiviert'}
          onClick={() => actions.setLexemeStatus(sequence.id, impulse.lexemeId, 'reaktiviert')}
        >
          {lexeme?.status === 'reaktiviert' ? 'Als reaktiviert vermerkt' : 'Als reaktiviert vermerken'}
        </Button>
      </div>
    </div>
  );
}
