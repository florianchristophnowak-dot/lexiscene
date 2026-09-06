import { useMediaUrl } from '../../app/media';
import { buildCheckPrompt } from '../../domain/checks';
import { CLOSED_CORPUS_REVEAL, type CorpusReveal } from '../../domain/corpus';
import { usableCcqs } from '../../domain/ccq';
import { buildCcqView, buildStageView, type StageAudience } from '../../domain/stage';
import { corpusProvenanceLabel } from './corpusLabels';
import type { Lexeme, Sequence, TeachingLanguageMode } from '../../domain/model';
import type { StepDefinition, StepVisibility } from '../../domain/steps';
import { firstFilled, splitPatternAnchor } from '../../domain/text';
import { usePhrase, useT, useTid } from '../../i18n/context';
import { CorpusStage } from './CorpusStage';
import { CcqStage } from './CcqStage';

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
  return null;
}

const MEDIA_STEPS = ['impuls', 'vermuten', 'ccq', 'hilfen-ausblenden', 'abruf', 'kontrolle'];

/** Musteranker mit sichtbar unterschiedenen festen Teilen und Slots. */
export function PatternAnchor({ text }: { text: string }) {
  const segments = splitPatternAnchor(text);
  if (segments.length === 0) return null;
  return (
    <p className="teach__frame">
      {segments.map((segment, index) =>
        segment.slot ? (
          <span className="pattern-slot" key={index}>
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

export interface TeachStageProps {
  sequence: Sequence;
  lexeme: Lexeme;
  step: StepDefinition;
  visibility: StepVisibility;
  /** Erstsprachliche Reserve für die Klasse freigegeben. */
  releaseL1: boolean;
  /** Lösung im Abruf sichtbar machen (erst nach der Denkzeit). */
  showSolution?: boolean;
  /** Zusätzliche Aufgabe in der Gegenrichtung. */
  counterpartPrompt?: string;
  /** Aufgedeckte Stufen der Korpusminiatur. */
  corpusReveal?: CorpusReveal;
  /** Aktuelle Frage der Bedeutungsprüfung. */
  ccqIndex?: number;
  /** Erwartete Antwort für die Klasse aufgedeckt. */
  showCcqAnswer?: boolean;
  /** Alternative Klärung für die Klasse freigegeben. */
  showCcqAlternative?: boolean;
  mode: TeachingLanguageMode;
  /**
   * Für wen die Bühne gebaut wird. Im Projektionsfenster ist es immer
   * `class`; Lehrkraftinformationen entstehen dort gar nicht erst.
   */
  audience: StageAudience;
}

export function TeachStage({
  sequence,
  lexeme,
  step,
  visibility,
  releaseL1,
  showSolution = false,
  counterpartPrompt = '',
  corpusReveal = CLOSED_CORPUS_REVEAL,
  ccqIndex = 0,
  showCcqAnswer = false,
  showCcqAlternative = false,
  mode,
  audience,
}: TeachStageProps) {
  const t = useT();
  const tid = useTid();
  const phrase = usePhrase(sequence.targetLanguage);
  const audio = useMediaUrl(lexeme.audioId);
  const teacherView = audience === 'teacher';

  const view = buildStageView({ lexeme, step, visibility, releaseL1, showSolution, mode, audience });
  const checkPrompt = buildCheckPrompt(lexeme, phrase);
  const showMedia = MEDIA_STEPS.includes(step.id);

  const checks = usableCcqs(lexeme);
  const currentCheck = checks[Math.min(ccqIndex, Math.max(checks.length - 1, 0))];

  const stepContent = (() => {
    switch (step.id) {
      case 'situation':
        return <p className="teach__situation">{firstFilled(lexeme.situation, lexeme.example, sequence.topic)}</p>;
      case 'impuls':
        return lexeme.imageId || lexeme.videoId ? null : (
          <p className="teach__placeholder">{phrase('step.prompt.impuls')}</p>
        );
      case 'audio':
        return audio.url ? null : <p className="teach__prompt">{phrase('step.prompt.audio')}</p>;
      case 'vermuten':
        return <p className="teach__prompt">{phrase('step.prompt.vermuten')}</p>;
      case 'klaeren':
      case 'form':
        return null;
      case 'ccq':
        return currentCheck ? (
          <CcqStage
            view={buildCcqView({
              check: currentCheck,
              lexeme,
              audience,
              showAnswer: showCcqAnswer,
              showAlternative: showCcqAlternative,
              phrase,
            })}
            index={Math.min(ccqIndex, checks.length - 1)}
            total={checks.length}
            teacherView={teacherView}
          />
        ) : null;
      case 'fokus':
        // Phase „Muster“: Der Musteranker steht vorn; die Modelläußerung folgt
        // weiter unten aus dem Schriftbild-Block, damit nichts doppelt erscheint.
        return lexeme.sentenceFrame ? <PatternAnchor text={lexeme.sentenceFrame} /> : null;
      case 'korpusminiatur':
        return <CorpusStage miniature={lexeme.corpus} reveal={corpusReveal} teacherView={teacherView} />;
      case 'kontrolle':
        return (
          <>
            {checkPrompt ? <p className="teach__prompt">{checkPrompt}</p> : null}
            {counterpartPrompt ? <p className="teach__support">{counterpartPrompt}</p> : null}
          </>
        );
      case 'hilfen-ausblenden':
        return <p className="teach__prompt">{phrase('step.prompt.hilfen-ausblenden')}</p>;
      case 'abruf':
        return (
          <>
            <p className="teach__situation">{firstFilled(lexeme.situation, lexeme.example)}</p>
            <p className="teach__prompt">{phrase('step.prompt.abruf')}</p>
          </>
        );
      case 'aufgabe':
        return (
          <p className="teach__prompt">
            {firstFilled(
              lexeme.communicativeTask,
              lexeme.extensionTask,
              phrase('step.prompt.aufgabe', { expression: lexeme.expression }),
            )}
          </p>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="teach__stage">
      {showMedia ? <StageMedia lexeme={lexeme} /> : null}
      {stepContent}

      {view.expression ? <p className="teach__expression">{view.expression}</p> : null}
      {view.utterance ? <p className="teach__utterance">{view.utterance}</p> : null}
      {view.explanation ? <p className="teach__meaning">{view.explanation}</p> : null}
      {step.id !== 'ccq' && view.targetPrompt ? <p className="teach__support">{view.targetPrompt}</p> : null}

      {/* Erstsprachliche Reserve – für die Klasse nur nach Freigabe. */}
      {view.translation ? <p className="teach__l1">{view.translation}</p> : null}
      {view.simplified ? <p className="teach__l1">{view.simplified}</p> : null}

      {view.supportLines.length > 0 ? <p className="teach__support">{view.supportLines.join(' · ')}</p> : null}
      {view.patternAnchor ? <PatternAnchor text={view.patternAnchor} /> : null}

      {teacherView ? (
        <>
          {view.internalMeaning ? (
            <p className="teach__teacher-note">{t('teach.teacher.meaning', { value: view.internalMeaning })}</p>
          ) : null}
          {step.id === 'audio' && !audio.url && lexeme.modelUtterance ? (
            <p className="teach__teacher-note">{t('teach.teacher.speak', { value: lexeme.modelUtterance })}</p>
          ) : null}
          {step.id === 'impuls' && (lexeme.imageId || lexeme.videoId) && lexeme.semantisationMethod ? (
            <p className="teach__teacher-note">{t('teach.teacher.prefix', { value: lexeme.semantisationMethod })}</p>
          ) : null}
          {view.teacherNotes.map((note) => (
            <p className="teach__teacher-note" key={note}>
              {t('teach.teacher.hint', { value: note })}
            </p>
          ))}
          {step.id === 'korpusminiatur' ? (
            <p className="teach__teacher-note">{corpusProvenanceLabel(tid, lexeme.corpus)}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Zusätzliche Angaben, die nur die Lehrkraft sieht, wenn projiziert wird. */
export function TeacherPanel({
  lexeme,
  step,
  ccqIndex = 0,
}: {
  lexeme: Lexeme;
  step: StepDefinition;
  /** Laufende Bedeutungsfrage – nur im Schritt „Bedeutung prüfen“ von Belang. */
  ccqIndex?: number;
}) {
  const t = useT();
  const tid = useTid();

  /*
   * Während der Projektion zeigt die Bühne nur die Klassenansicht. Die Angaben
   * zur laufenden Frage stehen deshalb hier – sichtbar allein auf dem Gerät der
   * Lehrkraft.
   */
  const checks = step.id === 'ccq' ? usableCcqs(lexeme) : [];
  const current = checks[Math.min(ccqIndex, Math.max(checks.length - 1, 0))];

  const lines = [
    current && checks.length > 1 ? t('ccq.counter', { index: Math.min(ccqIndex, checks.length - 1) + 1, total: checks.length }) : '',
    current?.expectedAnswer ? t('ccq.expected', { value: current.expectedAnswer }) : '',
    current ? t('ccq.checks', { value: tid('ccq.feature', current.feature) }) : '',
    current?.misconception ? t('ccq.misconception', { value: current.misconception }) : '',
    current?.alternativeClarification ? t('ccq.alternative', { value: current.alternativeClarification }) : '',
    lexeme.modelUtterance ? t('teach.teacher.utterance', { value: lexeme.modelUtterance }) : '',
    lexeme.coreMeaning ? t('teach.teacher.meaning', { value: lexeme.coreMeaning }) : '',
    lexeme.translation ? t('teach.teacher.translation', { value: lexeme.translation }) : '',
    lexeme.semantisationMethod ? t('teach.teacher.method', { value: lexeme.semantisationMethod }) : '',
    lexeme.confusionRisk ? t('teach.teacher.risk', { value: lexeme.confusionRisk }) : '',
    lexeme.teacherNote ? t('teach.teacher.hint', { value: lexeme.teacherNote }) : '',
    lexeme.liveNote ? t('teach.teacher.note', { value: lexeme.liveNote }) : '',
    step.id === 'korpusminiatur' ? corpusProvenanceLabel(tid, lexeme.corpus) : '',
  ].filter(Boolean);

  return (
    <aside className="teacher-panel" aria-label={t('teach.teacherPanel')}>
      <p className="teacher-panel__title">{t('teach.teacherPanel.title', { step: tid('step', step.id) })}</p>
      <p className="teacher-panel__purpose">{tid('step', `${step.id}.purpose`)}</p>
      {lines.map((line) => (
        <p className="teacher-panel__line" key={line}>
          {line}
        </p>
      ))}
    </aside>
  );
}
