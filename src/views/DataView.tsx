import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '../app/download';
import { useStore } from '../app/storeContext';
import { APP_NAME, APP_VERSION, SCHEMA_VERSION } from '../domain/model';
import { formatBytes } from '../domain/text';
import { backupFileName, parseBackup, parseSequenceDocument } from '../storage/backup';
import { requestPersistentStorage } from '../storage/repository';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { SelectField } from '../ui/Field';
import { Notice } from '../ui/Feedback';
import { useToast } from '../ui/toastContext';

export function DataView() {
  const { state, actions } = useStore();
  const toast = useToast();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);

  useEffect(() => {
    void actions.storageEstimate().then(setEstimate);
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      void navigator.storage.persisted().then(setPersistent).catch(() => setPersistent(null));
    }
  }, [actions]);

  const mediaCount = Object.keys(state.mediaIndex).length;
  const lexemeCount = state.sequences.reduce((sum, sequence) => sum + sequence.lexemes.length, 0);

  const createBackup = async () => {
    setBusy(true);
    try {
      const blob = await actions.createBackup();
      downloadBlob(blob, backupFileName());
      toast.show('Sicherung erstellt.', 'success');
    } catch {
      toast.show('Die Sicherung konnte nicht erstellt werden.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file: File) => {
    setBusy(true);
    try {
      const result = await parseBackup(await file.arrayBuffer());
      await actions.restoreBackup(result);
      toast.show(
        `Wiederhergestellt: ${result.sequences.length} ${result.sequences.length === 1 ? 'Sequenz' : 'Sequenzen'}, ` +
          `${result.media.length} ${result.media.length === 1 ? 'Mediendatei' : 'Mediendateien'}.`,
        'success',
      );
      for (const warning of result.warnings) toast.show(warning);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Die Sicherung konnte nicht gelesen werden.', 'error');
    } finally {
      setBusy(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const importJson = async (file: File) => {
    setBusy(true);
    try {
      const sequences = parseSequenceDocument(await file.text());
      const count = await actions.importSequences(sequences);
      toast.show(`${count} ${count === 1 ? 'Sequenz' : 'Sequenzen'} importiert.`, 'success');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Die Datei konnte nicht gelesen werden.', 'error');
    } finally {
      setBusy(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  return (
    <div className="page">
      <div className="stack-tight">
        <h1 className="page__title">Daten</h1>
        <p className="muted">
          {APP_NAME} arbeitet vollständig lokal. Es gibt kein Benutzerkonto, keine Cloud-Synchronisierung und keine
          Übertragung an Dritte.
        </p>
      </div>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Sicherung</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">
            Die Sicherung enthält alle Sequenzen als JSON-Manifest und sämtliche Bild-, Audio- und Videodateien in
            einer ZIP-Datei.
          </p>
          <div className="row">
            <Button variant="primary" disabled={busy} onClick={() => void createBackup()}>
              Sicherung erstellen (ZIP)
            </Button>
            <Button disabled={busy} onClick={() => backupInputRef.current?.click()}>
              Sicherung einspielen …
            </Button>
          </div>
          <input
            ref={backupInputRef}
            type="file"
            accept=".zip,application/zip"
            className="visually-hidden"
            aria-label="Sicherungsdatei auswählen"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPendingRestore(file);
            }}
          />
          <Notice>Beim Einspielen wird der gesamte lokale Bestand ersetzt. Erstellen Sie vorher eine Sicherung.</Notice>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Einzelne Sequenzen austauschen</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">
            Exportiert wird pro Sequenz eine JSON-Datei (Schemaversion {SCHEMA_VERSION}), dokumentiert in
            <code> docs/schema.md</code>. Der Export beschreibt die Sequenz zusätzlich als Unterrichtsphase, damit sie
            später in eine Unterrichtsplanung übernommen werden kann.
          </p>
          <div className="row">
            <Button disabled={busy} onClick={() => jsonInputRef.current?.click()}>
              Sequenz aus JSON importieren …
            </Button>
          </div>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="JSON-Datei auswählen"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importJson(file);
            }}
          />
          <p className="field__hint">Den Export starten Sie in der Vorbereitung über „Exportieren“.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Lokaler Speicher</span>
        </div>
        <div className="panel__body stack">
          <div className="data-grid">
            <p className="muted text-sm">
              {state.sequences.length} Sequenzen · {lexemeCount} lexikalische Einheiten · {mediaCount} Mediendateien
            </p>
            <p className="muted text-sm">
              {estimate
                ? `Belegt: ${formatBytes(estimate.usage)} von ${formatBytes(estimate.quota)}`
                : 'Speicherbelegung nicht ermittelbar.'}
            </p>
          </div>
          <div className="row">
            <Button
              disabled={busy}
              onClick={() => {
                void actions.cleanUpMedia().then((removed) =>
                  toast.show(removed > 0 ? `${removed} nicht verwendete Mediendateien entfernt.` : 'Keine ungenutzten Medien gefunden.'),
                );
              }}
            >
              Ungenutzte Medien aufräumen
            </Button>
            <Button
              disabled={persistent === true}
              onClick={() => {
                void requestPersistentStorage().then((granted) => {
                  setPersistent(granted);
                  toast.show(
                    granted
                      ? 'Dauerhafter Speicher aktiviert – der Browser räumt die Daten nicht mehr automatisch weg.'
                      : 'Der Browser hat dauerhaften Speicher nicht gewährt.',
                    granted ? 'success' : 'error',
                  );
                });
              }}
            >
              {persistent === true ? 'Dauerhafter Speicher aktiv' : 'Dauerhaften Speicher anfordern'}
            </Button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Darstellung</span>
        </div>
        <div className="panel__body">
          <SelectField
            label="Farbschema"
            value={state.settings.theme}
            onChange={(theme) => actions.updateSettings({ theme: theme as 'system' | 'light' | 'dark' })}
            options={[
              { value: 'system', label: 'Systemeinstellung folgen' },
              { value: 'light', label: 'Immer hell' },
              { value: 'dark', label: 'Immer dunkel' },
            ]}
          />
        </div>
      </section>

      <p className="faint text-sm">
        {APP_NAME} {APP_VERSION} · Schemaversion {SCHEMA_VERSION} · Daten liegen in der lokalen Browserdatenbank
        (IndexedDB) dieses Geräts und Profils.
      </p>

      {pendingRestore ? (
        <ConfirmDialog
          title="Sicherung einspielen?"
          message={`Der gesamte lokale Bestand (${state.sequences.length} Sequenzen, ${mediaCount} Mediendateien) wird durch den Inhalt von „${pendingRestore.name}“ ersetzt.`}
          confirmLabel="Ersetzen"
          danger
          onCancel={() => {
            setPendingRestore(null);
            if (backupInputRef.current) backupInputRef.current.value = '';
          }}
          onConfirm={() => {
            const file = pendingRestore;
            setPendingRestore(null);
            void restore(file);
          }}
        />
      ) : null}
    </div>
  );
}
