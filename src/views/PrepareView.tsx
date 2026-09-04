import { useEffect, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import type { Sequence } from '../domain/model';
import { useMediaQuery } from '../ui/hooks';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { SequenceLibrary } from './prepare/SequenceLibrary';
import { SequencePanel } from './prepare/SequencePanel';
import { LexemeDetail } from './prepare/LexemeDetail';

type NarrowPane = 'library' | 'sequence' | 'detail';
type MidPane = 'library' | 'detail';

export function PrepareView({ sequenceId }: { sequenceId?: string }) {
  const { state, actions } = useStore();

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
        <EmptyState title="Noch keine Sequenz vorhanden">
          <p>Legen Sie eine neue Semantisierungssequenz an oder laden Sie die französische Beispielsequenz.</p>
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
              Beispielsequenz laden
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="page">
        <EmptyState title="Sequenz wird geöffnet …">
          <Button onClick={() => navigate({ name: 'prepare' })}>Zur Bibliothek</Button>
        </EmptyState>
      </div>
    );
  }

  // Der Schlüssel setzt die Auswahl zurück, sobald eine andere Sequenz geöffnet wird.
  return <PrepareWorkspace key={sequence.id} sequence={sequence} />;
}

function PrepareWorkspace({ sequence }: { sequence: Sequence }) {
  const { state, actions } = useStore();
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
        <EmptyState title="Keine Einheit ausgewählt">
          <p className="text-sm">Wählen Sie in der mittleren Spalte eine lexikalische Einheit aus.</p>
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
      {state.settings.detailPaneVisible ? 'Details ausblenden' : 'Details einblenden'}
    </Button>
  ) : isMid ? (
    <div className="row" role="group" aria-label="Linke Spalte wählen">
      <button
        type="button"
        className={midPane === 'library' ? 'nav-link nav-link--active' : 'nav-link'}
        onClick={() => setMidPane('library')}
      >
        Bibliothek
      </button>
      <button
        type="button"
        className={midPane === 'detail' ? 'nav-link nav-link--active' : 'nav-link'}
        disabled={!selectedLexeme}
        onClick={() => setMidPane('detail')}
      >
        Details
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
      <div className="pane-switcher" role="group" aria-label="Bereich wählen">
        {(
          [
            ['library', 'Bibliothek'],
            ['sequence', 'Sequenz'],
            ['detail', 'Details'],
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
