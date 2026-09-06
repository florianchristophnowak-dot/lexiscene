import { useEffect } from 'react';
import { useStageSubscription } from '../app/presentation';
import { useStore } from '../app/storeContext';
import { CLOSED_CORPUS_REVEAL } from '../domain/corpus';
import { stepDefinition } from '../domain/steps';
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

  const sequence = state.sequences.find((entry) => entry.id === (stage?.sequenceId ?? sequenceId));
  const lexeme = stage ? sequence?.lexemes.find((entry) => entry.id === stage.lexemeId) : undefined;
  const step = stage ? stepDefinition(stage.stepId) : undefined;

  useEffect(() => {
    const previous = document.title;
    document.title = sequence ? `${sequence.title} – Projektion` : 'LexiScène – Projektion';
    return () => {
      document.title = previous;
    };
  }, [sequence]);

  if (!stage || !sequence || !lexeme || !step || stage.finished) {
    return (
      <div className="teach">
        <div className="teach__stage">
          <div className="projection__waiting">
            <p className="teach__step">{stage?.finished ? 'Sequenz abgeschlossen' : 'Bereit'}</p>
            <p className="teach__situation">
              {stage?.finished
                ? sequence?.title
                : 'Dieses Fenster zeigt gleich die Projektion. Die Steuerung bleibt im Fenster der Lehrkraft.'}
            </p>
            <Button onClick={() => window.close()}>Fenster schließen</Button>
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
        showTranslation={stage.showTranslation}
        corpusReveal={stage.corpusReveal ?? CLOSED_CORPUS_REVEAL}
        teacherView={false}
      />
      <p className="projection__hint">Projektion · Steuerung im Fenster der Lehrkraft</p>
    </div>
  );
}
