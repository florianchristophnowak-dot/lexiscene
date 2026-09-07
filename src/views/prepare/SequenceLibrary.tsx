import { useMemo, useState } from 'react';
import { useStore } from '../../app/storeContext';
import { navigate } from '../../app/router';
import type { Sequence } from '../../domain/model';
import { formatDate } from '../../domain/text';
import { useT, useTid } from '../../i18n/context';
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
  const t = useT();
  const tid = useTid();
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
        <h2 className="pane-head__title">{t('library.title')}</h2>
        <Button
          variant="primary"
          onClick={() => {
            void actions.createNewSequence().then((id) => {
              onSelect(id);
              toast.show(t('library.new'));
            });
          }}
        >
          {t('library.new.button')}
        </Button>
      </div>

      <div className="library-search">
        <TextField
          label={t('library.search')}
          value={query}
          onChange={setQuery}
          placeholder={t('library.search.placeholder')}
          hint={t('library.search.hint')}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState title={query ? t('library.noHits') : t('library.empty')}>
          <p className="text-sm">
            {query ? t('library.noHits.hint') : t('library.empty.hint')}
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
                    <span>{sequence.learningGroup || t('library.noGroup')}</span>
                    <span>{tid('language', sequence.targetLanguage)}</span>
                    <span>{sequence.lexemes.length} Einheiten</span>
                    <span>{formatDate(sequence.updatedAt)}</span>
                    {sequence.archived ? <span>archiviert</span> : null}
                  </span>
                </button>
                {isActive ? (
                  <div className="row" style={{ padding: '0 var(--space-2) var(--space-2)' }}>
                    <IconButton
                      label={t('library.duplicate')}
                      onClick={() => {
                        void actions.duplicateSequence(sequence.id).then((id) => {
                          if (id) {
                            onSelect(id);
                            toast.show(t('library.duplicated'));
                          }
                        });
                      }}
                    >
                      ⧉
                    </IconButton>
                    <IconButton
                      label={t('library.rename')}
                      onClick={() => {
                        setRenaming(sequence);
                        setRenameValue(sequence.title);
                      }}
                    >
                      ✎
                    </IconButton>
                    <IconButton
                      label={sequence.archived ? t('library.unarchive') : t('library.archive')}
                      onClick={() => {
                        actions.setArchived(sequence.id, !sequence.archived);
                        toast.show(sequence.archived ? t('library.unarchived') : t('library.archived'));
                      }}
                    >
                      {sequence.archived ? '↺' : '⇩'}
                    </IconButton>
                    <IconButton label={t('library.delete')} onClick={() => setDeleting(sequence)}>
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
          {showArchived ? t('library.hideArchive') : t('library.showArchive', { count: archivedCount })}
        </Button>
      ) : null}

      {renaming ? (
        <Modal
          title={t('library.rename')}
          onClose={() => setRenaming(null)}
          actions={
            <>
              <Button onClick={() => setRenaming(null)}>{t('common.cancel')}</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const title = renameValue.trim();
                  if (title) actions.updateSequence(renaming.id, { title });
                  setRenaming(null);
                }}
              >
                {t('common.apply')}
              </Button>
            </>
          }
        >
          <TextField label={t('library.title.field')} value={renameValue} onChange={setRenameValue} autoFocus />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('library.deleteTitle')}
          message={t('library.deleteConfirm', { title: deleting.title, count: deleting.lexemes.length })}
          confirmLabel={t('library.deleteForever')}
          cancelLabel={t('common.cancel')}
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.id;
            setDeleting(null);
            void actions.deleteSequence(id).then(() => {
              toast.show(t('library.deleted'));
              const next = state.sequences.find((sequence) => sequence.id !== id && !sequence.archived);
              navigate({ name: 'prepare', sequenceId: next?.id }, { replace: true });
            });
          }}
        />
      ) : null}
    </div>
  );
}
