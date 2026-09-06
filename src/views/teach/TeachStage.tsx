import { useMediaUrl } from '../../app/media';
import { buildCheckPrompt } from '../../domain/checks';
import { CLOSED_CORPUS_REVEAL, usableExamples, type CorpusReveal } from '../../domain/corpus';
import { corpusProvenanceLabel, languageLabel, type Lexeme, type Sequence } from '../../domain/model';
import type { StepDefinition, StepVisibility } from '../../domain/steps';
import { firstFilled, splitPatternAnchor } from '../../domain/text';
import { CorpusStage } from './CorpusStage';

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

const MEDIA_STEPS = ['impuls', 'vermuten', 'hilfen-ausblenden', 'abruf', 'kontrolle'];

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
  showTranslation: boolean;
  /** Lösung im Abruf sichtbar machen (erst nach der Denkzeit). */
  showSolution?: boolean;
  /** Zusätzliche Aufgabe in der Gegenrichtung. */
  counterpartPrompt?: string;
  /** Aufgedeckte Stufen der Korpusminiatur. */
  corpusReveal?: CorpusReveal;
  /**
   * Lehrkraftansicht: zeigt zusätzlich Hinweise, die nicht an die Klasse
   * gehen. Im Projektionsfenster ist das immer aus.
   */
  teacherView: boolean;
}

export function TeachStage({
  sequence,
  lexeme,
  step,
  visibility,
  showTranslation,
  showSolution = false,
  counterpartPrompt = '',
  corpusReveal = CLOSED_CORPUS_REVEAL,
  teacherView,
}: TeachStageProps) {
  const audio = useMediaUrl(lexeme.audioId);
  const checkPrompt = buildCheckPrompt(lexeme);
  const showMedia = MEDIA_STEPS.includes(step.id);
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
      case 'form':
        return null;
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
            {counterpartPrompt ? <p className="teach__support">Gegenrichtung: {counterpartPrompt}</p> : null}
          </>
        );
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
    <div className="teach__stage">
      {showMedia ? <StageMedia lexeme={lexeme} /> : null}
      {stepContent}

      {visibility.form || showSolution ? <p className="teach__expression">{lexeme.expression}</p> : null}
      {visibility.form && lexeme.modelUtterance && step.id !== 'form' ? (
        <p className="teach__utterance">{lexeme.modelUtterance}</p>
      ) : null}
      {visibility.meaning || showSolution ? <p className="teach__meaning">{lexeme.coreMeaning}</p> : null}
      {showTranslation && lexeme.translation ? <p className="teach__meaning">{lexeme.translation}</p> : null}

      {visibility.support && supportLines.length > 0 ? <p className="teach__support">{supportLines.join(' · ')}</p> : null}
      {visibility.support && lexeme.sentenceFrame && step.id !== 'fokus' ? (
        <PatternAnchor text={lexeme.sentenceFrame} />
      ) : null}

      {teacherView ? (
        <>
          {step.id === 'audio' && !audio.url && lexeme.modelUtterance ? (
            <p className="teach__teacher-note">Für die Lehrkraft: „{lexeme.modelUtterance}“ zweimal vorsprechen.</p>
          ) : null}
          {step.id === 'impuls' && (lexeme.imageId || lexeme.videoId) && lexeme.semantisationMethod ? (
            <p className="teach__teacher-note">Für die Lehrkraft: {lexeme.semantisationMethod}</p>
          ) : null}
          {visibility.support && lexeme.extraHint ? <p className="teach__teacher-note">Hinweis: {lexeme.extraHint}</p> : null}
        </>
      ) : null}
    </div>
  );
}

/** Zusätzliche Angaben, die nur die Lehrkraft sieht, wenn projiziert wird. */
export function TeacherPanel({ lexeme, step }: { lexeme: Lexeme; step: StepDefinition }) {
  /*
   * Während der Projektion blendet die Bühne alle Lehrkrafthinweise aus.
   * Notizen und Quellenhinweis der Korpusminiatur stehen deshalb hier – auf
   * dem Gerät der Lehrkraft, nie im Projektionsfenster.
   */
  const corpusLines =
    step.id === 'korpusminiatur'
      ? [
          `Herkunft: ${corpusProvenanceLabel(lexeme.corpus.provenance)}`,
          lexeme.corpus.sourceNote.trim() ? `Quelle: ${lexeme.corpus.sourceNote.trim()}` : '',
          ...usableExamples(lexeme.corpus)
            .filter((example) => example.teacherNote.trim())
            .map((example) => `${example.text}: ${example.teacherNote.trim()}`),
        ]
      : [];

  const lines = [
    lexeme.modelUtterance ? `Modelläußerung: ${lexeme.modelUtterance}` : '',
    lexeme.coreMeaning ? `Bedeutung: ${lexeme.coreMeaning}` : '',
    lexeme.semantisationMethod ? `Methode: ${lexeme.semantisationMethod}` : '',
    lexeme.confusionRisk ? `Achtung: ${lexeme.confusionRisk}` : '',
    lexeme.liveNote ? `Notiz: ${lexeme.liveNote}` : '',
    ...corpusLines,
  ].filter(Boolean);

  return (
    <aside className="teacher-panel" aria-label="Nur auf diesem Bildschirm sichtbar">
      <p className="teacher-panel__title">Nur auf diesem Bildschirm · {step.label}</p>
      <p className="teacher-panel__purpose">{step.purpose}</p>
      {lines.map((line) => (
        <p className="teacher-panel__line" key={line}>
          {line}
        </p>
      ))}
    </aside>
  );
}
