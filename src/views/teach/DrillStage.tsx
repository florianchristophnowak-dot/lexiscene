import { DRILL_STAGES, drillPosition, type DrillStage as Stage } from '../../domain/drill';
import { useT, useTid } from '../../i18n/context';

export interface DrillStageProps {
  /** Was gesprochen wird – möglichst die ganze Wendung. */
  item: string;
  stage: Stage;
  /** Zielsprachliche Arbeitsanweisung zur Stufe. */
  instruction: string;
  /** Hinweis der Lehrkraft auf bekannte Schwierigkeiten. */
  difficulty: string;
  teacherView: boolean;
}

/**
 * Aussprache üben.
 *
 * Die Klasse sieht die Wendung und eine kurze zielsprachliche Anweisung. Die
 * Stufenfolge, der Regiehinweis und die notierte Schwierigkeit stehen nur auf
 * dem Gerät der Lehrkraft – sie sind Arbeitsmaterial, kein Tafelbild.
 */
export function DrillStage({ item, stage, instruction, difficulty, teacherView }: DrillStageProps) {
  const t = useT();
  const tid = useTid();

  return (
    <div className="drill-stage">
      {teacherView ? (
        <p className="teach__step">
          {t('drill.position', { position: drillPosition(stage), total: DRILL_STAGES.length })} ·{' '}
          {tid('drill.stage', stage)}
        </p>
      ) : null}

      <p className="drill-stage__item">{item}</p>
      <p className="teach__support">{instruction}</p>

      {teacherView ? (
        <>
          <p className="teach__teacher-note">{tid('drill.stage', `${stage}.teacher`)}</p>
          {difficulty ? <p className="teach__teacher-note">{difficulty}</p> : null}
          <p className="teach__teacher-note">{t('drill.hint')}</p>
        </>
      ) : null}
    </div>
  );
}
