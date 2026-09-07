import type { StageView } from '../../domain/stage';
import { useT } from '../../i18n/context';

export interface ElicitStageProps {
  view: StageView;
  /** Zielsprachlicher Impuls („Wie sagt man das?“). */
  prompt: string;
  teacherView: boolean;
}

/**
 * Das Wort herauslocken.
 *
 * Die Klasse hat das Konzept verstanden – jetzt geht es um das Wort. Es steht
 * nicht da: Erst wird gewartet, dann kommt ein Anlaut, zuletzt nennt es die
 * Lehrkraft. Was sichtbar ist, entscheidet `buildStageView`.
 */
export function ElicitStage({ view, prompt, teacherView }: ElicitStageProps) {
  const t = useT();

  return (
    <div className="elicit-stage">
      <p className="teach__prompt">{prompt}</p>

      {view.wordCue ? <p className="elicit-stage__cue">{view.wordCue}</p> : null}
      {!view.wordCue && !view.expression ? <p className="teach__placeholder">…</p> : null}

      {teacherView ? (
        <>
          <p className="teach__teacher-note">{t('teach.word.teacher')}</p>
          {!view.expression ? <p className="teach__teacher-note">{t('teach.word.hidden')}</p> : null}
        </>
      ) : null}
    </div>
  );
}
