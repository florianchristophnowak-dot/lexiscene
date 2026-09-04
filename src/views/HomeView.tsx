import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
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

  const activeSequences = state.sequences.filter((sequence) => !sequence.archived);
  const lastSequence =
    activeSequences.find((sequence) => sequence.id === state.settings.lastSequenceId) ??
    [...activeSequences].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const due = dueSequences(state.sequences);

  const resumeMeta = (() => {
    if (!lastSequence) return '';
    if (lastSequence.session) {
      const total = lastSequence.lexemes.length;
      return `Unterricht unterbrochen bei Einheit ${Math.min(lastSequence.session.lexemeIndex + 1, total)} von ${total}`;
    }
    return `Zuletzt bearbeitet am ${formatDate(lastSequence.updatedAt)} · ${lastSequence.lexemes.length} Einheiten`;
  })();

  return (
    <div className="home">
      <div className="stack-tight">
        <h1 className="home__title">LexiScène</h1>
        <p className="home__lede">
          Lexikalische Einheiten vorbereiten, im Unterricht schrittweise semantisieren und sofort kommunikativ
          verwenden lassen. Alle Inhalte bleiben auf diesem Gerät.
        </p>
      </div>

      <div className="home__actions">
        {lastSequence ? (
          <ActionCard
            variant="primary"
            label={lastSequence.session ? `Unterricht fortsetzen: ${lastSequence.title}` : `Weiterarbeiten: ${lastSequence.title}`}
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
            label="Erste Sequenz erstellen"
            meta="Titel, Zielsprache und kommunikatives Ziel festlegen"
            onClick={() => {
              void actions.createNewSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
            }}
          />
        )}

        <ActionCard
          label="Neue Sequenz erstellen"
          meta="Leere Semantisierungssequenz anlegen"
          onClick={() => {
            void actions.createNewSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
          }}
        />

        <ActionCard
          variant={due.length > 0 ? 'due' : 'default'}
          label="Fälligen Wortschatz reaktivieren"
          meta={
            due.length > 0
              ? `${due.length} ${due.length === 1 ? 'Sequenz ist' : 'Sequenzen sind'} zur Reaktivierung vorgemerkt`
              : 'Nichts fällig – Reaktivierung planen oder Impulse ansehen'
          }
          onClick={() => navigate({ name: 'reactivate' })}
        />

        <ActionCard
          label="Vorhandene Vorlage öffnen"
          meta={`Bibliothek mit ${activeSequences.length} ${activeSequences.length === 1 ? 'Sequenz' : 'Sequenzen'}`}
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
            Beispielsequenz „Freizeit verabreden“ laden
          </Button>
        </div>
      ) : null}
    </div>
  );
}
