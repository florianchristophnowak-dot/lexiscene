import { APP_NAME, APP_VERSION } from '../domain/model';
import { PHASES, STEPS, stepsOfPhase } from '../domain/steps';
import { useT, useTid } from '../i18n/context';
import type { TranslationKey } from '../i18n';

const SHORTCUTS: [string, TranslationKey][] = [
  ['→', 'help.key.right'],
  ['Leertaste', 'help.key.space'],
  ['←', 'help.key.left'],
  ['Esc', 'help.key.esc'],
];

/** Absätze eines Hilfeabschnitts – der Text steht im Sprachkatalog. */
function Section({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <span className="panel__title">{title}</span>
      </div>
      <div className="panel__body stack">
        {paragraphs.map((text) => (
          <p className="muted text-sm" key={text}>
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}

export function HelpView() {
  const t = useT();
  const tid = useTid();

  return (
    <div className="page">
      <div className="stack-tight">
        <h1 className="page__title">{t('help.title')}</h1>
        <p className="muted">{t('help.lede', { name: APP_NAME })}</p>
      </div>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('help.teach.title')}</span>
        </div>
        <div className="panel__body stack">
          <ul className="help-list">
            {SHORTCUTS.map(([key, description]) => (
              <li key={key}>
                <span className="kbd">{key}</span>
                <span>{t(description)}</span>
              </li>
            ))}
          </ul>
          <p className="muted text-sm">{t('help.teach.buttons')}</p>
          <p className="muted text-sm">{t('help.teach.resume')}</p>
          <p className="muted text-sm">{t('help.teach.projection')}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('help.phases.title')}</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">{t('help.phases.lede', { name: APP_NAME })}</p>
          <ol className="help-list">
            {PHASES.map((phase) => (
              <li key={phase.id}>
                <span className="kbd">{phase.position}</span>
                <span>
                  <strong>{tid('phase', phase.id)}</strong> —{' '}
                  <span className="muted">{tid('phase', `${phase.id}.purpose`)}</span>
                  <span className="field__hint" style={{ display: 'block' }}>
                    {stepsOfPhase(phase.id).length > 0
                      ? t('help.phases.steps', {
                          steps: stepsOfPhase(phase.id)
                            .map((step) => tid('step', step.id))
                            .join(', '),
                        })
                      : t('help.phases.own')}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('help.steps.title')}</span>
        </div>
        <div className="panel__body stack">
          <ol className="help-list">
            {STEPS.map((step) => (
              <li key={step.id}>
                <span className="kbd">{step.position}</span>
                <span>
                  <strong>{tid('step', step.id)}</strong> —{' '}
                  <span className="muted">{tid('step', `${step.id}.purpose`)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="muted text-sm">{t('help.steps.order')}</p>
          <p className="muted text-sm">{t('help.steps.inference')}</p>
        </div>
      </section>

      <Section
        title={t('help.task.title')}
        paragraphs={[t('help.task.backwards'), t('help.task.choose'), t('help.task.criteria')]}
      />

      <Section
        title={t('help.routine.title')}
        paragraphs={[t('help.routine.lede'), t('help.routine.steps'), t('help.routine.note')]}
      />

      <Section
        title={t('help.eliciting.title')}
        paragraphs={[
          t('help.eliciting.principle'),
          t('help.eliciting.techniques'),
          t('help.eliciting.short'),
          t('help.eliciting.concept'),
        ]}
      />

      <Section
        title={t('help.drill.title')}
        paragraphs={[t('help.drill.board'), t('help.drill.stages'), t('help.drill.chunk')]}
      />

      <Section
        title={t('help.ccq.title')}
        paragraphs={[t('help.ccq.difference'), t('help.ccq.good'), t('help.ccq.form'), t('help.ccq.flow')]}
      />

      <Section
        title={t('help.language.title')}
        paragraphs={[
          t('help.language.target'),
          t('help.language.reserve'),
          t('help.language.modes'),
          t('help.language.fields'),
          t('help.language.ui'),
        ]}
      />

      <Section
        title={t('help.corpus.title')}
        paragraphs={[
          t('help.corpus.what', { name: APP_NAME }),
          t('help.corpus.for'),
          t('help.corpus.staged'),
          t('help.corpus.limits'),
        ]}
      />

      <Section
        title={t('help.observe.title')}
        paragraphs={[t('help.observe.what'), t('help.observe.noScore'), t('help.observe.correct')]}
      />

      <Section
        title={t('help.create.title')}
        paragraphs={[t('help.create.quick'), t('help.create.table'), t('help.create.audio')]}
      />

      <Section
        title={t('help.offline.title')}
        paragraphs={[t('help.offline.install', { name: APP_NAME }), t('help.offline.backup')]}
      />

      <p className="faint text-sm">
        {APP_NAME} · {APP_VERSION}
      </p>
    </div>
  );
}
