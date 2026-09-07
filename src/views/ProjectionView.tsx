import { useEffect } from 'react';
import { useStageSubscription } from '../app/presentation';
import { useStore } from '../app/storeContext';
import { APP_NAME } from '../domain/model';
import { CLOSED_CORPUS_REVEAL } from '../domain/corpus';
import { stepDefinition } from '../domain/steps';
import { useT } from '../i18n/context';
import { Button } from '../ui/Button';
import { TeachStage } from './teach/TeachStage';

/**
 * Zweitbildschirm: zeigt ausschließlich das, was die Klasse sehen soll.
 * Es gibt hier bewusst keine Bedienelemente – gesteuert wird in der
 * Lehrkraftansicht.
 */
export function ProjectionView({ sequenceId }: { sequenceId: string }) {
  const { state } = useStore();
  const stage = useStageSubscription();
  const t = useT();

  const sequence = state.sequences.find((entry) => entry.id === (stage?.sequenceId ?? sequenceId));
  const lexeme = stage ? sequence?.lexemes.find((entry) => entry.id === stage.lexemeId) : undefined;
  const step = stage ? stepDefinition(stage.stepId) : undefined;

  useEffect(() => {
    const previous = document.title;
    document.title = sequence ? `${sequence.title} – ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [sequence]);

  if (!stage || !sequence || !lexeme || !step || stage.finished) {
    return (
      <div className="teach">
        <div className="teach__stage">
          <div className="projection__waiting">
            <p className="teach__step">{stage?.finished ? t('teach.finished') : t('teach.projection.ready')}</p>
            <p className="teach__situation">{stage?.finished ? sequence?.title : t('teach.projection.waiting')}</p>
            <Button onClick={() => window.close()}>{t('teach.projection.closeWindow')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teach projection">
      <TeachStage
        sequence={sequence}
        lexeme={lexeme}
        step={step}
        visibility={stage.visibility}
        releaseL1={stage.releaseL1 ?? false}
        corpusReveal={stage.corpusReveal ?? CLOSED_CORPUS_REVEAL}
        ccqIndex={stage.ccqIndex ?? 0}
        showCcqAnswer={stage.showCcqAnswer ?? false}
        showCcqAlternative={stage.showCcqAlternative ?? false}
        mode={stage.mode ?? 'reserve'}
        audience="class"
      />
      <p className="projection__hint">{t('teach.projection.hint')}</p>
    </div>
  );
}
