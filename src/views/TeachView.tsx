import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { navigate } from '../app/router';
import { useMediaUrl } from '../app/media';
import { useStore } from '../app/storeContext';
import { buildCheckPrompt } from '../domain/checks';
import { CLASS_STATUSES, languageLabel, type ClassStatus, type Lexeme } from '../domain/model';
import { defaultVisibility, resolveSteps, type StepVisibility } from '../domain/steps';
import { firstFilled } from '../domain/text';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ProgressBar } from '../ui/Feedback';
import { useFullscreenState } from '../ui/hooks';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Sichtbarkeit der Hilfen – gilt jeweils nur für den aktuellen Schritt. */
interface RevealState {
  key: string;
  visibility: StepVisibility;
  translation: boolean;
}

/** Bild oder Video der aktuellen Einheit. */
function StageMedia({ lexeme }: { lexeme: Lexeme }) {
  const image = useMediaUrl(lexeme.imageId);
  const video = useMediaUrl(lexeme.videoId);

  if (video.url) {
    return (
      <div className="teach__media">
        <video src={video.url} controls playsInline />
      </div>
    );
  }
  if (image.url) {
    return (
      <div className="teach__media">
        <img src={image.url} alt="" />
      </div>
    );
  }
  if (image.loading || video.loading) return <p className="teach__support">Medien werden geladen …</p>;
  return null;
}

export function TeachView({ sequenceId }: { sequenceId: string }) {
  const { state, actions } = useStore();
  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  const safeLexemeIndex = clamp(lexemeIndex, 0, Math.max(teachable.length - 1, 0));
  const lexeme = teachable[safeLexemeIndex];
  const steps = stepsPerLexeme[safeLexemeIndex] ?? [];
  const safeStepIndex = clamp(stepIndex, 0, Math.max(steps.length - 1, 0));
  const step = steps[safeStepIndex];

  const audio = useMediaUrl(lexeme?.audioId);

  // Gestufte Enthüllung: Jeder Schritt beginnt mit seiner Standardsichtbarkeit.
  // Umschaltungen der Lehrkraft gelten nur für den gerade gezeigten Schritt.
  const stepKey = `${safeLexemeIndex}:${safeStepIndex}`;
  const visibility: StepVisibility =
    reveal?.key === stepKey ? reveal.visibility : step ? defaultVisibility(step.id) : { meaning: false, form: false, support: false };
  const showTranslation = reveal?.key === stepKey ? reveal.translation : false;
  const updateVisibility = (patch: Partial<StepVisibility>) =>
    setReveal({ key: stepKey, visibility: { ...visibility, ...patch }, translation: showTranslation });
  const toggleTranslation = () => setReveal({ key: stepKey, visibility, translation: !showTranslation });

  const totalSteps = stepsPerLexeme.reduce((sum, entries) => sum + entries.length, 0);
  const completedSteps = stepsPerLexeme.slice(0, safeLexemeIndex).reduce((sum, entries) => sum + entries.length, 0) + safeStepIndex + 1;

  // Unterbrechen und später fortsetzen.
  useEffect(() => {
    if (!sequence || finished) return;
    const session = sequence.session;
    if (session && session.lexemeIndex === safeLexemeIndex && session.stepIndex === safeStepIndex) return;
    actions.setSession(sequence.id, { lexemeIndex: safeLexemeIndex, stepIndex: safeStepIndex, updatedAt: Date.now() });
  }, [actions, finished, safeLexemeIndex, safeStepIndex, sequence]);

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
              leave();
            }}
          >
            Zur Vorbereitung
          </Button>
        </div>
      </div>
    );
  }

  const checkPrompt = buildCheckPrompt(lexeme);
  const showMedia = ['impuls', 'vermuten', 'hilfen-ausblenden', 'abruf', 'kontrolle'].includes(step.id);
  const supportLines = [lexeme.pronunciationHint, lexeme.prosodyNote, lexeme.ipa, lexeme.morphology].filter(
    (line) => line && line.trim(),
  );

  const stepContent = (() => {
    switch (step.id) {
      case 'situation':
        return <p className="teach__situation">{firstFilled(lexeme.situation, lexeme.example, sequence.topic)}</p>;
      case 'impuls':
        return lexeme.imageId || lexeme.videoId ? null : (
          <p className="teach__placeholder">{firstFilled(lexeme.semantisationMethod, 'Impuls zeigen')}</p>
        );
      case 'audio':
        return audio.url ? null : <p className="teach__prompt">Hört genau zu.</p>;
      case 'vermuten':
        return <p className="teach__prompt">Was könnte das bedeuten?</p>;
      case 'klaeren':
        return null;
      case 'form':
        return null;
      case 'fokus':
        return lexeme.sentenceFrame ? <p className="teach__frame">{lexeme.sentenceFrame}</p> : null;
      case 'kontrolle':
        return checkPrompt ? <p className="teach__prompt">{checkPrompt}</p> : null;
      case 'hilfen-ausblenden':
        return <p className="teach__prompt">Die Hilfen sind weg – wer kann die Einheit noch nennen?</p>;
      case 'abruf':
        return (
          <>
            <p className="teach__situation">{firstFilled(lexeme.situation, lexeme.example)}</p>
            <p className="teach__prompt">Wie sagt man das auf {languageLabel(sequence.targetLanguage)}?</p>
          </>
        );
      case 'aufgabe':
        return (
          <p className="teach__prompt">
            {firstFilled(
              lexeme.communicativeTask,
              lexeme.extensionTask,
              `Verwendet „${lexeme.expression}“ in einer eigenen Situation.`,
            )}
          </p>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="teach" ref={containerRef}>
      <div className="teach__top">
        <span className="teach__step">
          <span className="teach__step-number">Schritt {step.position}</span> · {step.label}
        </span>
        <span className="teach__counter">
          Einheit {safeLexemeIndex + 1} von {teachable.length}
        </span>
        <span className="spacer" />
        <IconButton label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild einschalten'} onClick={toggleFullscreen}>
          {isFullscreen ? '⤡' : '⤢'}
        </IconButton>
        <Button onClick={leave}>Vorbereiten</Button>
      </div>

      <div className="teach__progress">
        <ProgressBar value={completedSteps} max={totalSteps} label="Fortschritt der Sequenz" />
      </div>

      <div className="teach__stage">
        {showMedia ? <StageMedia lexeme={lexeme} /> : null}
        {stepContent}

        {visibility.form ? <p className="teach__expression">{lexeme.expression}</p> : null}
        {visibility.form && lexeme.modelUtterance && step.id !== 'form' ? (
          <p className="teach__utterance">{lexeme.modelUtterance}</p>
        ) : null}
        {visibility.meaning ? <p className="teach__meaning">{lexeme.coreMeaning}</p> : null}
        {showTranslation && lexeme.translation ? <p className="teach__meaning">{lexeme.translation}</p> : null}

        {visibility.support && supportLines.length > 0 ? (
          <p className="teach__support">{supportLines.join(' · ')}</p>
        ) : null}
        {visibility.support && lexeme.sentenceFrame && step.id !== 'fokus' ? (
          <p className="teach__frame">{lexeme.sentenceFrame}</p>
        ) : null}

        {step.id === 'audio' && !audio.url && lexeme.modelUtterance ? (
          <p className="teach__teacher-note">Für die Lehrkraft: „{lexeme.modelUtterance}“ zweimal vorsprechen.</p>
        ) : null}
        {step.id === 'impuls' && (lexeme.imageId || lexeme.videoId) && lexeme.semantisationMethod ? (
          <p className="teach__teacher-note">Für die Lehrkraft: {lexeme.semantisationMethod}</p>
        ) : null}
        {visibility.support && lexeme.extraHint ? <p className="teach__teacher-note">Hinweis: {lexeme.extraHint}</p> : null}
      </div>

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
          <label className="visually-hidden" htmlFor="teach-status">
            Klassenstatus der Einheit
          </label>
          <select
            id="teach-status"
            className="select"
            style={{ width: 'auto' }}
            value={lexeme.status ?? ''}
            onChange={(event) =>
              actions.setLexemeStatus(sequence.id, lexeme.id, event.target.value ? (event.target.value as ClassStatus) : null)
            }
          >
            <option value="">Status setzen …</option>
            {CLASS_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
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
