import type { CcqView } from '../../domain/stage';
import { useT, useTid } from '../../i18n/context';

export interface CcqStageProps {
  view: CcqView;
  index: number;
  total: number;
  /** Lehrkraftansicht: zeigt erwartete Antwort, Merkmal und Klärung. */
  teacherView: boolean;
}

/**
 * Eine Concept Checking Question auf der Bühne.
 *
 * Die Klasse sieht nur Frage, Antwortoptionen und eine kurze zielsprachliche
 * Arbeitsanweisung. Erwartete Antwort, geprüftes Merkmal, Missverständnis und
 * alternative Klärung stehen ausschließlich auf dem Lehrkraftbildschirm – die
 * Auswahl trifft `buildCcqView`.
 */
export function CcqStage({ view, index, total, teacherView }: CcqStageProps) {
  const t = useT();
  const tid = useTid();

  return (
    <div className="ccq-stage">
      {teacherView && total > 1 ? (
        <p className="teach__step">{t('ccq.counter', { index: index + 1, total })}</p>
      ) : null}

      <p className="ccq-stage__question">{view.question}</p>

      {view.options.length > 0 ? (
        <ol className="ccq-stage__options" aria-label={t('ccq.options')}>
          {view.options.map((option) => (
            <li className="ccq-stage__option" key={option}>
              {option}
            </li>
          ))}
        </ol>
      ) : null}

      {view.instruction ? <p className="teach__support">{view.instruction}</p> : null}

      {view.expectedAnswer ? <p className="ccq-stage__answer">{t('ccq.expected', { value: view.expectedAnswer })}</p> : null}

      {teacherView ? (
        <>
          {view.feature ? (
            <p className="teach__teacher-note">{t('ccq.checks', { value: tid('ccq.feature', view.feature) })}</p>
          ) : null}
          {view.misconception ? (
            <p className="teach__teacher-note">{t('ccq.misconception', { value: view.misconception })}</p>
          ) : null}
        </>
      ) : null}

      {view.alternative ? <p className="teach__support">{t('ccq.alternative', { value: view.alternative })}</p> : null}
    </div>
  );
}
