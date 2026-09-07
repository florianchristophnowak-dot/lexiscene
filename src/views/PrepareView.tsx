import { useEffect, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import type { Sequence } from '../domain/model';
import { useMediaQuery } from '../ui/hooks';
import { useT } from '../i18n/context';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { SequenceLibrary } from './prepare/SequenceLibrary';
import { SequencePanel } from './prepare/SequencePanel';
import { LexemeDetail } from './prepare/LexemeDetail';

type NarrowPane = 'library' | 'sequence' | 'detail';
type MidPane = 'library' | 'detail';

export function PrepareView({ sequenceId }: { sequenceId?: string }) {
  const { state, actions } = useStore();
  const t = useT();

  const sequence = state.sequences.find((entry) => entry.id === sequenceId);
  const lastSequenceId = state.settings.lastSequenceId;

  useEffect(() => {
    if (sequence || state.sequences.length === 0) return;
    const active = state.sequences.filter((entry) => !entry.archived);
    const fallback =
      state.sequences.find((entry) => entry.id === lastSequenceId && !entry.archived) ??
      [...active].sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
      state.sequences[0];
    if (fallback) navigate({ name: 'prepare', sequenceId: fallback.id }, { replace: true });
  }, [lastSequenceId, sequence, state.sequences]);

  useEffect(() => {
    if (sequence && lastSequenceId !== sequence.id) actions.updateSettings({ lastSequenceId: sequence.id });
  }, [actions, lastSequenceId, sequence]);

  if (state.sequences.length === 0) {
    return (
      <div className="page">
        <EmptyState title={t('prepare.noSequence')}>
          <p>{t('prepare.noSequence.hint')}</p>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => {
                void actions.createNewSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
              }}
            >
              Neue Sequenz erstellen
            </Button>
            <Button
              onClick={() => {
                void actions.seedDemoSequence().then((id) => navigate({ name: 'prepare', sequenceId: id }));
              }}
            >
              {t('home.demoLoad')}
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="page">
        <EmptyState title={t('prepare.opening')}>
          <Button onClick={() => navigate({ name: 'prepare' })}>{t('prepare.toLibrary')}</Button>
        </EmptyState>
      </div>
    );
  }

  // Der Schlüssel setzt die Auswahl zurück, sobald eine andere Sequenz geöffnet wird.
  return <PrepareWorkspace key={sequence.id} sequence={sequence} />;
}

function PrepareWorkspace({ sequence }: { sequence: Sequence }) {
  const { state, actions } = useStore();
  const t = useT();
  const isWide = useMediaQuery('(min-width: 1024px)');
  const isMid = useMediaQuery('(min-width: 768px)');
  const [selectedLexemeId, setSelectedLexemeId] = useState<string | null>(null);
  const [narrowPane, setNarrowPane] = useState<NarrowPane>('sequence');
  const [midPane, setMidPane] = useState<MidPane>('library');

  const selectedLexeme = sequence.lexemes.find((lexeme) => lexeme.id === selectedLexemeId) ?? null;

  const selectSequence = (id: string) => {
    navigate({ name: 'prepare', sequenceId: id });
    if (!isMid) setNarrowPane('sequence');
  };

  const selectLexeme = (id: string) => {
    setSelectedLexemeId(id);
    if (!isMid) setNarrowPane('detail');
    else if (!isWide) setMidPane('detail');
  };

  const detailPane = (
    <div className="prepare__pane prepare__pane--detail">
      {selectedLexeme ? (
        <LexemeDetail
          sequence={sequence}
          lexeme={selectedLexeme}
          onClose={
            isWide
              ? () => actions.updateSettings({ detailPaneVisible: false })
              : () => (isMid ? setMidPane('library') : setNarrowPane('sequence'))
          }
        />
      ) : (
        <EmptyState title={t('prepare.noLexeme')}>
          <p className="text-sm">{t('prepare.noLexeme.hint')}</p>
        </EmptyState>
      )}
    </div>
  );

  const libraryPane = (
    <div className="prepare__pane prepare__pane--library">
      <SequenceLibrary activeId={sequence.id} onSelect={selectSequence} />
    </div>
  );

  const headerExtra = isWide ? (
    <Button variant="ghost" onClick={() => actions.updateSettings({ detailPaneVisible: !state.settings.detailPaneVisible })}>
      {state.settings.detailPaneVisible ? t('prepare.hideDetails') : t('prepare.showDetails')}
    </Button>
  ) : isMid ? (
    <div className="row" role="group" aria-label={t('prepare.leftColumn')}>
      <button
        type="button"
        className={midPane === 'library' ? 'nav-link nav-link--active' : 'nav-link'}
        onClick={() => setMidPane('library')}
      >
        {t('prepare.library')}
      </button>
      <button
        type="button"
        className={midPane === 'detail' ? 'nav-link nav-link--active' : 'nav-link'}
        disabled={!selectedLexeme}
        onClick={() => setMidPane('detail')}
      >
        {t('prepare.details')}
      </button>
    </div>
  ) : null;

  const sequencePane = (
    <div className="prepare__pane">
      <SequencePanel
        sequence={sequence}
        selectedLexemeId={selectedLexemeId}
        onSelectLexeme={selectLexeme}
        headerExtra={headerExtra}
      />
    </div>
  );

  if (isWide) {
    const showDetail = state.settings.detailPaneVisible;
    return (
      <div className={showDetail ? 'prepare prepare--three' : 'prepare prepare--two'}>
        {libraryPane}
        {sequencePane}
        {showDetail ? detailPane : null}
      </div>
    );
  }

  if (isMid) {
    const showDetail = midPane === 'detail' && Boolean(selectedLexeme);
    return (
      <div className={`prepare ${showDetail ? 'prepare--mid-detail' : 'prepare--mid-library'}`}>
        {showDetail ? (
          <>
            {sequencePane}
            {detailPane}
          </>
        ) : (
          <>
            {libraryPane}
            {sequencePane}
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="pane-switcher" role="group" aria-label={t('prepare.chooseArea')}>
        {(
          [
            ['library', t('prepare.library')],
            ['sequence', t('prepare.sequence')],
            ['detail', t('prepare.details')],
          ] as [NarrowPane, string][]
        ).map(([pane, label]) => (
          <button
            key={pane}
            type="button"
            className={narrowPane === pane ? 'nav-link nav-link--active' : 'nav-link'}
            aria-current={narrowPane === pane ? 'true' : undefined}
            onClick={() => setNarrowPane(pane)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="prepare">
        {narrowPane === 'library' ? libraryPane : null}
        {narrowPane === 'sequence' ? sequencePane : null}
        {narrowPane === 'detail' ? detailPane : null}
      </div>
    </>
  );
}
