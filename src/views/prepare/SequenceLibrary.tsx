import { useMemo, useState } from 'react';
import { useStore } from '../../app/storeContext';
import { navigate } from '../../app/router';
import { languageLabel, type Sequence } from '../../domain/model';
import { formatDate } from '../../domain/text';
import { Button, IconButton } from '../../ui/Button';
import { ConfirmDialog, Modal } from '../../ui/Dialog';
import { TextField } from '../../ui/Field';
import { EmptyState } from '../../ui/Feedback';
import { useToast } from '../../ui/toastContext';

function matches(sequence: Sequence, query: string): boolean {
  if (!query) return true;
  const haystack = [
    sequence.title,
    sequence.topic,
    sequence.canDoGoal,
    sequence.learningGroup,
    ...sequence.lexemes.map((lexeme) => `${lexeme.communicativeFunction} ${lexeme.expression}`),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

interface Props {
  activeId?: string;
  onSelect: (id: string) => void;
}

export function SequenceLibrary({ activeId, onSelect }: Props) {
  const { state, actions } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [renaming, setRenaming] = useState<Sequence | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<Sequence | null>(null);

  const visible = useMemo(
    () =>
      state.sequences
        .filter((sequence) => (showArchived ? true : !sequence.archived))
        .filter((sequence) => matches(sequence, query))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [query, showArchived, state.sequences],
  );

  const archivedCount = state.sequences.filter((sequence) => sequence.archived).length;

  return (
    <div className="stack">
      <div className="pane-head">
        <h2 className="pane-head__title">Sequenzbibliothek</h2>
        <Button
          variant="primary"
          onClick={() => {
            void actions.createNewSequence().then((id) => {
              onSelect(id);
              toast.show('Neue Sequenz angelegt.');
            });
          }}
        >
          Neu
        </Button>
      </div>

      <div className="library-search">
        <TextField
          label="Suche"
          value={query}
          onChange={setQuery}
          placeholder="Titel, Thema, Funktion …"
          hint="Durchsucht auch die kommunikativen Funktionen der Einheiten."
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title={query ? 'Keine Treffer' : 'Noch keine Sequenz'}>
          <p className="text-sm">
            {query ? 'Suchbegriff anpassen oder Archiv einblenden.' : 'Legen Sie mit „Neu“ Ihre erste Sequenz an.'}
          </p>
        </EmptyState>
      ) : (
        <ul className="library-list">
          {visible.map((sequence) => {
            const isActive = sequence.id === activeId;
            return (
              <li key={sequence.id}>
                <button
                  type="button"
                  className={[
                    'library-item',
                    isActive ? 'library-item--active' : '',
                    sequence.archived ? 'library-item--archived' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSelect(sequence.id)}
                >
                  <span className="library-item__title">{sequence.title}</span>
                  <span className="library-item__meta">
                    <span>{sequence.learningGroup || 'ohne Lerngruppe'}</span>
                    <span>{languageLabel(sequence.targetLanguage)}</span>
                    <span>{sequence.lexemes.length} Einheiten</span>
                    <span>{formatDate(sequence.updatedAt)}</span>
                    {sequence.archived ? <span>archiviert</span> : null}
                  </span>
                </button>
                {isActive ? (
                  <div className="row" style={{ padding: '0 var(--space-2) var(--space-2)' }}>
                    <IconButton
                      label="Sequenz duplizieren"
                      onClick={() => {
                        void actions.duplicateSequence(sequence.id).then((id) => {
                          if (id) {
                            onSelect(id);
                            toast.show('Sequenz dupliziert.');
                          }
                        });
                      }}
                    >
                      ⧉
                    </IconButton>
                    <IconButton
                      label="Sequenz umbenennen"
                      onClick={() => {
                        setRenaming(sequence);
                        setRenameValue(sequence.title);
                      }}
                    >
                      ✎
                    </IconButton>
                    <IconButton
                      label={sequence.archived ? 'Aus dem Archiv holen' : 'Sequenz archivieren'}
                      onClick={() => {
                        actions.setArchived(sequence.id, !sequence.archived);
                        toast.show(sequence.archived ? 'Sequenz wieder aktiv.' : 'Sequenz archiviert.');
                      }}
                    >
                      {sequence.archived ? '↺' : '⇩'}
                    </IconButton>
                    <IconButton label="Sequenz löschen" onClick={() => setDeleting(sequence)}>
                      ✕
                    </IconButton>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {archivedCount > 0 ? (
        <Button variant="ghost" onClick={() => setShowArchived((value) => !value)}>
          {showArchived ? 'Archiv ausblenden' : `Archiv einblenden (${archivedCount})`}
        </Button>
      ) : null}

      {renaming ? (
        <Modal
          title="Sequenz umbenennen"
          onClose={() => setRenaming(null)}
          actions={
            <>
              <Button onClick={() => setRenaming(null)}>Abbrechen</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const title = renameValue.trim();
                  if (title) actions.updateSequence(renaming.id, { title });
                  setRenaming(null);
                }}
              >
                Übernehmen
              </Button>
            </>
          }
        >
          <TextField label="Titel" value={renameValue} onChange={setRenameValue} autoFocus />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Sequenz löschen?"
          message={`„${deleting.title}“ wird mit allen ${deleting.lexemes.length} lexikalischen Einheiten unwiderruflich gelöscht. Nicht mehr benötigte Medien werden mitentfernt.`}
          confirmLabel="Endgültig löschen"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.id;
            setDeleting(null);
            void actions.deleteSequence(id).then(() => {
              toast.show('Sequenz gelöscht.');
              const next = state.sequences.find((sequence) => sequence.id !== id && !sequence.archived);
              navigate({ name: 'prepare', sequenceId: next?.id }, { replace: true });
            });
          }}
        />
      ) : null}
    </div>
  );
}
