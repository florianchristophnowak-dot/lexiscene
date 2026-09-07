import { useStore } from '../../app/storeContext';
import { advisorContextFromLexeme } from '../../domain/advisor';
import {
  ELICITING_TECHNIQUES,
  elicitingWarnings,
  normalizeTechniques,
  recommendElicitingTechniques,
} from '../../domain/eliciting';
import type { Lexeme, Sequence } from '../../domain/model';
import type { TranslationKey } from '../../i18n';
import { useT, useTid } from '../../i18n/context';
import { CheckboxRow, TextArea } from '../../ui/Field';

/**
 * Planung des Herauslockens.
 *
 * Angeboten werden alle zehn Techniken; empfohlen werden die, die zum Profil
 * der Einheit passen. Ausgewählt wird nichts von allein – die Empfehlung ist
 * ein Hinweis, keine Vorbelegung.
 */
export function ElicitingPanel({ sequence, lexeme }: { sequence: Sequence; lexeme: Lexeme }) {
  const { actions } = useStore();
  const t = useT();
  const tid = useTid();

  const chosen = normalizeTechniques(lexeme.elicitingTechniques);
  const recommended = recommendElicitingTechniques(advisorContextFromLexeme(lexeme, sequence));
  const warnings = elicitingWarnings(lexeme);

  const set = (patch: Partial<Lexeme>) => actions.updateLexeme(sequence.id, lexeme.id, patch);

  const toggle = (id: string, on: boolean) => {
    const next = on ? [...chosen, id] : chosen.filter((entry) => entry !== id);
    set({ elicitingTechniques: normalizeTechniques(next) });
  };

  return (
    <div className="stack">
      <p className="field__hint">{t('eliciting.hint')}</p>

      {warnings.length > 0 ? (
        <ul className="corpus-warnings">
          {warnings.map((warning) => (
            <li className="notice" key={warning.id}>
              {t(warning.key as TranslationKey)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="stack-tight">
        <span className="field__label">{t('eliciting.techniques')}</span>
        <p className="field__hint">
          {t('eliciting.recommended', {
            list: recommended.map((id) => tid('eliciting.technique', id)).join(', '),
          })}
        </p>

        {ELICITING_TECHNIQUES.map((technique) => (
          <CheckboxRow
            key={technique.id}
            label={tid('eliciting.technique', technique.id)}
            hint={
              recommended.includes(technique.id)
                ? `${tid('eliciting.technique', `${technique.id}.fits`)} · ${t('eliciting.recommendedTag')}`
                : tid('eliciting.technique', `${technique.id}.fits`)
            }
            checked={chosen.includes(technique.id)}
            onChange={(on) => toggle(technique.id, on)}
          />
        ))}
        <p className="field__hint">{t('eliciting.count', { count: chosen.length })}</p>
      </div>

      <TextArea
        label={t('eliciting.field.context')}
        value={lexeme.elicitingContext}
        onChange={(elicitingContext) => set({ elicitingContext })}
        placeholder={t('eliciting.field.context.placeholder')}
        hint={t('eliciting.field.context.hint')}
        rows={2}
      />
    </div>
  );
}
