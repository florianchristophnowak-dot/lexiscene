import type { RecapLine } from '../../domain/stage';
import { useT } from '../../i18n/context';

export interface RecapStageProps {
  lines: RecapLine[];
  prompt: string;
  teacherView: boolean;
}

/**
 * Kumulative Wiederholung.
 *
 * Aufgedeckt wird eine Einheit nach der anderen; verdeckte Einträge stehen als
 * Platzhalter da, damit die Klasse sieht, wie viel noch kommt, ohne die Lösung
 * zu lesen. Die Lehrkraft sieht die ganze Liste – verdeckte Einträge dezent.
 */
export function RecapStage({ lines, prompt, teacherView }: RecapStageProps) {
  const t = useT();
  const revealed = lines.filter((line) => line.revealed).length;

  return (
    <div className="recap-stage">
      <p className="teach__prompt">{prompt}</p>

      <ol className="recap-stage__list" aria-label={t('teach.recap.title')}>
        {lines.map((line) => (
          <li
            className={line.revealed ? 'recap-stage__item recap-stage__item--open' : 'recap-stage__item'}
            key={line.lexemeId}
          >
            {line.text ? (
              <>
                <span className="recap-stage__expression">{line.text}</span>
                {line.chunk ? <span className="recap-stage__chunk">{line.chunk}</span> : null}
              </>
            ) : (
              <span className="recap-stage__masked" aria-label={t('teach.recap.masked')}>
                ···
              </span>
            )}
          </li>
        ))}
      </ol>

      {teacherView ? (
        <>
          <p className="teach__step">{t('teach.recap.counter', { revealed, total: lines.length })}</p>
          <p className="teach__teacher-note">{t('teach.recap.teacher')}</p>
        </>
      ) : null}
    </div>
  );
}
