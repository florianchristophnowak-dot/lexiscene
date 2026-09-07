import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import { useT } from '../i18n/context';
import { dueSequences } from '../domain/reactivation';
import { formatDate } from '../domain/text';
import { Button } from '../ui/Button';

interface ActionCardProps {
  label: string;
  meta: string;
  variant?: 'primary' | 'due' | 'default';
  onClick: () => void;
}

function ActionCard({ label, meta, variant = 'default', onClick }: ActionCardProps) {
  const className = ['action-card', variant === 'primary' ? 'action-card--primary' : '', variant === 'due' ? 'action-card--due' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={className} onClick={onClick}>
      <span className="action-card__label">{label}</span>
      <span className="action-card__meta">{meta}</span>
    </button>
  );
}

export function HomeView() {
  const { state, actions } = useStore();
  const t = useT();

  const activeSequences = state.sequences.filter((sequence) => !sequence.archived);
  const lastSequence =
    activeSequences.find((sequence) => sequence.id === state.settings.lastSequenceId) ??
    [...activeSequences].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const due = dueSequences(state.sequences);

  const resumeMeta = (() => {
    if (!lastSequence) return '';
    if (lastSequence.session) {
      const total = lastSequence.lexemes.length;
      return t('home.meta.interrupted', {
        index: Math.min(lastSequence.session.lexemeIndex + 1, total),
        total,
      });
    }
    return t('home.meta.edited', { date: formatDate(lastSequence.updatedAt), count: lastSequence.lexemes.length });
  })();

  return (
    <div className="home">
      <div className="stack-tight">
        <h1 className="home__title">LexiScène</h1>
        <p className="home__lede">{t('home.lede')}</p>
      </div>

      <div className="home__actions">
        {lastSequence ? (
          <ActionCard
            variant="primary"
            label={
              lastSequence.session
                ? t('home.resume', { title: lastSequence.title })
                : t('home.continue', { title: lastSequence.title })
            }
            meta={resumeMeta}
            onClick={() =>
              navigate(
                lastSequence.session
                  ? { name: 'teach', sequenceId: lastSequence.id }
                  : { name: 'prepare', sequenceId: lastSequence.id },
              )
            }
          />
        ) : (
          <ActionCard
            variant="primary"
            label={t('home.first')}
            meta={t('home.first.meta')}
            onClick={() => {
              void actions.createNewSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
            }}
          />
        )}

        <ActionCard
          label={t('home.new')}
          meta={t('home.new.empty')}
          onClick={() => {
            void actions.createNewSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
          }}
        />

        <ActionCard
          variant={due.length > 0 ? 'due' : 'default'}
          label={t('home.reactivate')}
          meta={due.length > 0 ? t('home.reactivate.due', { count: due.length }) : t('home.reactivate.none')}
          onClick={() => navigate({ name: 'reactivate' })}
        />

        <ActionCard
          label={t('home.open')}
          meta={t('home.open.meta', { count: activeSequences.length })}
          onClick={() => navigate({ name: 'prepare' })}
        />
      </div>

      {state.sequences.length === 0 ? (
        <div className="row">
          <Button
            onClick={() => {
              void actions.seedDemoSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
            }}
          >
            {t('home.demoLoad')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
