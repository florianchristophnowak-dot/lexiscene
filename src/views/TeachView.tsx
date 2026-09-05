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
import { buildCounterpartPrompt } from '../domain/checks';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ProgressBar } from '../ui/Feedback';
import { useFullscreenState } from '../ui/hooks';
import { useToast } from '../ui/toastContext';
import { TeachStage, TeacherPanel } from './teach/TeachStage';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Sichtbarkeit der Hilfen – gilt jeweils nur für den aktuellen Schritt. */
interface RevealState {
  key: string;
  visibility: StepVisibility;
  translation: boolean;
  /** Lösung im Abruf – erst Denkzeit, dann zeigen. */
  solution: boolean;
  /** Zusätzliche Aufgabe in der Gegenrichtung. */
  counterpart: boolean;
}

export function TeachView({ sequenceId }: { sequenceId: string }) {
  const { state, actions } = useStore();
  const toast = useToast();
  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const projectionRef = useRef<Window | null>(null);
  const stageRef = useRef<StageState | null>(null);
  const isFullscreen = useFullscreenState();

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
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, ObservationResult>>({});

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
  const showTranslation = reveal?.key === stepKey ? reveal.translation : false;
  const showSolution = reveal?.key === stepKey ? reveal.solution : false;
  const showCounterpart = reveal?.key === stepKey ? reveal.counterpart : false;
  const revealState = (patch: Partial<Omit<RevealState, 'key'>>) =>
    setReveal({
      key: stepKey,
      visibility,
      translation: showTranslation,
      solution: showSolution,
      counterpart: showCounterpart,
      ...patch,
    });
  const updateVisibility = (patch: Partial<StepVisibility>) => revealState({ visibility: { ...visibility, ...patch } });
  const toggleTranslation = () => revealState({ translation: !showTranslation });

  const totalSteps = stepsPerLexeme.reduce((sum, entries) => sum + entries.length, 0);
  const completedSteps =
    stepsPerLexeme.slice(0, safeLexemeIndex).reduce((sum, entries) => sum + entries.length, 0) + safeStepIndex + 1;

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
            showTranslation,
            finished,
          }
        : null;
    stageRef.current = stage;
    if (projectionOpen) publishStage(stage);
  }, [finished, lexeme, projectionOpen, sequenceId, showTranslation, step, visibility]);

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
      toast.show('Das Projektionsfenster wurde blockiert. Bitte Pop-ups für diese Seite erlauben.', 'error');
      return;
    }
    projectionRef.current = opened;
    setProjectionOpen(true);
    publishStage(stageRef.current);
  }, [sequenceId, toast]);

  const closeProjection = useCallback(() => {
    projectionRef.current?.close();
    projectionRef.current = null;
    setProjectionOpen(false);
  }, []);

  const goNext = useCallback(() => {
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
  }, [safeLexemeIndex, safeStepIndex, steps.length, teachable.length]);

  const goBack = useCallback(() => {
    if (finished) {
      setFinished(false);
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
  }, [finished, safeLexemeIndex, safeStepIndex, stepsPerLexeme]);

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
        <EmptyState title="Sequenz nicht gefunden">
          <Button onClick={() => navigate({ name: 'home' })}>Zur Startseite</Button>
        </EmptyState>
      </div>
    );
  }

  if (teachable.length === 0 || totalSteps === 0) {
    return (
      <div className="page">
        <EmptyState title="Nichts zu unterrichten">
          <p>
            Diese Sequenz enthält keine aktiven Einheiten mit Material. Ergänzen Sie in der Vorbereitung mindestens
            einen Ausdruck.
          </p>
          <Button variant="primary" onClick={() => navigate({ name: 'prepare', sequenceId })}>
            Zur Vorbereitung
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (finished || !lexeme || !step) {
    return (
      <div className="teach" ref={containerRef}>
        <div className="teach__stage">
          <p className="teach__step">Sequenz abgeschlossen</p>
          <h1 className="teach__utterance">{sequence.title}</h1>
          <p className="teach__support">
            {teachable.length} lexikalische {teachable.length === 1 ? 'Einheit' : 'Einheiten'} eingeführt.
            Planen Sie jetzt die Reaktivierung oder kehren Sie zur Vorbereitung zurück.
          </p>
        </div>
        <div className="teach__bottom">
          <Button onClick={goBack}>Zurück</Button>
          <span className="spacer" />
          <Button
            variant="primary"
            onClick={() => {
              actions.setSession(sequence.id, null);
              navigate({ name: 'reactivate', sequenceId: sequence.id });
            }}
          >
            Reaktivierung planen
          </Button>
          <Button
            onClick={() => {
              actions.setSession(sequence.id, null);
              setFinished(false);
              setLexemeIndex(0);
              setStepIndex(0);
            }}
          >
            Von vorn beginnen
          </Button>
          <Button
            onClick={() => {
              actions.setSession(sequence.id, null);
              closeProjection();
              leave();
            }}
          >
            Zur Vorbereitung
          </Button>
        </div>
      </div>
    );
  }

  const phase = stepPhase(step.id);
  const invitesFeedback = stepInvitesFeedback(step.id);
  const dimension = stepDimension(step.id, lexeme);
  const counterpartPrompt =
    lexeme.learningGoal === 'productive' && step.id === 'kontrolle' ? buildCounterpartPrompt(lexeme) : '';
  const feedbackKey = `${stepKey}:${dimension}`;

  return (
    <div className="teach" ref={containerRef}>
      <div className="teach__top">
        <span className="teach__step">
          <span className="teach__step-number">
            Phase {phase?.position ?? 1}: {phase?.label ?? ''}
          </span>{' '}
          · {step.label}
        </span>
        <span className="teach__counter">
          Schritt {safeStepIndex + 1} von {steps.length} · Einheit {safeLexemeIndex + 1} von {teachable.length}
        </span>
        <span className="spacer" />
        {isPresentationSupported() ? (
          <Button onClick={projectionOpen ? closeProjection : openProjection}>
            {projectionOpen ? 'Projektion beenden' : 'Zweitbildschirm'}
          </Button>
        ) : null}
        <IconButton label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild einschalten'} onClick={toggleFullscreen}>
          {isFullscreen ? '⤡' : '⤢'}
        </IconButton>
        <Button
          onClick={() => {
            closeProjection();
            leave();
          }}
        >
          Vorbereiten
        </Button>
      </div>

      <div className="teach__progress">
        <ProgressBar value={completedSteps} max={totalSteps} label="Fortschritt der Sequenz" />
      </div>

      <TeachStage
        sequence={sequence}
        lexeme={lexeme}
        step={step}
        visibility={visibility}
        showTranslation={showTranslation}
        showSolution={showSolution}
        counterpartPrompt={showCounterpart ? counterpartPrompt : ''}
        teacherView={!projectionOpen}
      />

      {projectionOpen ? <TeacherPanel lexeme={lexeme} step={step} /> : null}

      {audio.url ? <audio ref={audioRef} src={audio.url} preload="auto" /> : null}

      {noteOpen ? (
        <div className="teach__bottom">
          <label className="field teach__note-field">
            <span className="field__label">Notiz zu dieser Einheit</span>
            <textarea
              className="textarea"
              rows={2}
              value={lexeme.liveNote}
              onChange={(event) => actions.updateLexeme(sequence.id, lexeme.id, { liveNote: event.target.value })}
            />
          </label>
          <Button onClick={() => setNoteOpen(false)}>Notiz schließen</Button>
        </div>
      ) : null}

      <div className="teach__bottom">
        <Button large onClick={goBack} disabled={safeLexemeIndex === 0 && safeStepIndex === 0}>
          ← Zurück
        </Button>
        <Button variant="primary" large onClick={goNext}>
          Weiter →
        </Button>

        <div className="teach__toggles">
          <button
            type="button"
            className={visibility.meaning ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
            aria-pressed={visibility.meaning}
            onClick={() => updateVisibility({ meaning: !visibility.meaning })}
          >
            Bedeutung
          </button>
          <button
            type="button"
            className={visibility.form ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
            aria-pressed={visibility.form}
            onClick={() => updateVisibility({ form: !visibility.form })}
          >
            Schriftbild
          </button>
          {lexeme.translation ? (
            <button
              type="button"
              className={showTranslation ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showTranslation}
              onClick={toggleTranslation}
            >
              Übersetzung
            </button>
          ) : null}
          <button
            type="button"
            className={visibility.support ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
            aria-pressed={visibility.support}
            onClick={() => updateVisibility({ support: !visibility.support })}
          >
            Hilfen
          </button>
          {invitesFeedback ? (
            <button
              type="button"
              className={showSolution ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showSolution}
              onClick={() => revealState({ solution: !showSolution })}
            >
              Lösung
            </button>
          ) : null}
          {counterpartPrompt ? (
            <button
              type="button"
              className={showCounterpart ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
              aria-pressed={showCounterpart}
              onClick={() => revealState({ counterpart: !showCounterpart })}
            >
              Gegenrichtung
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
              Audio abspielen
            </Button>
          ) : null}
        </div>

        <span className="spacer" />

        <div className="teach__status-row">
          {invitesFeedback ? (
            <div className="teach__feedback" role="group" aria-label={`Rückmeldung der Klasse zur Dimension ${dimension}`}>
              <span className="teach__feedback-label">Klasse:</span>
              {OBSERVATION_RESULTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={feedback[feedbackKey] === option.id ? 'toggle-btn toggle-btn--on' : 'toggle-btn'}
                  aria-pressed={feedback[feedbackKey] === option.id}
                  onClick={() => {
                    setFeedback((current) => ({ ...current, [feedbackKey]: option.id }));
                    actions.recordObservation(sequence.id, lexeme.id, {
                      dimension,
                      result: option.id,
                      source: 'introduction',
                    });
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          <Button onClick={() => setNoteOpen((value) => !value)}>Notiz</Button>
          <Button
            onClick={() => {
              actions.updateLexeme(sequence.id, lexeme.id, { skipped: true });
              if (safeLexemeIndex >= teachable.length - 1) setFinished(true);
              else setStepIndex(0);
            }}
          >
            Überspringen
          </Button>
        </div>
      </div>
    </div>
  );
}
