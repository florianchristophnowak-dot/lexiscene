import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '../app/download';
import { useStore } from '../app/storeContext';
import {
  APP_NAME,
  APP_VERSION,
  LANGUAGES,
  SCHEMA_VERSION,
  TEACHING_LANGUAGE_MODES,
  type TeachingLanguageMode,
  type UiLanguageSetting,
} from '../domain/model';
import { LOCALE_NAMES, UI_LOCALES } from '../i18n';
import { useT, useTid } from '../i18n/context';
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
  const t = useT();
  const tid = useTid();
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
      toast.show(t('data.backup.created'), 'success');
    } catch {
      toast.show(t('data.backup.failed'), 'error');
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
        t('data.backup.restored', { sequences: result.sequences.length, media: result.media.length }),
        'success',
      );
      for (const warning of result.warnings) toast.show(warning);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('data.backup.unreadable'), 'error');
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
      toast.show(t('data.exchange.imported', { count }), 'success');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : t('data.exchange.unreadable'), 'error');
    } finally {
      setBusy(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  return (
    <div className="page">
      <div className="stack-tight">
        <h1 className="page__title">{t('data.title')}</h1>
        <p className="muted">{t('data.lede', { name: APP_NAME })}</p>
      </div>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('data.backup')}</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">{t('data.backup.hint')}</p>
          <div className="row">
            <Button variant="primary" disabled={busy} onClick={() => void createBackup()}>
              {t('data.backup.create')}
            </Button>
            <Button disabled={busy} onClick={() => backupInputRef.current?.click()}>
              {t('data.backup.restore')}
            </Button>
          </div>
          <input
            ref={backupInputRef}
            type="file"
            accept=".zip,application/zip"
            className="visually-hidden"
            aria-label={t('data.backup.choose')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPendingRestore(file);
            }}
          />
          <Notice>{t('data.backup.warning')}</Notice>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('data.exchange')}</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">{t('data.exchange.hint', { schema: SCHEMA_VERSION })}</p>
          <div className="row">
            <Button disabled={busy} onClick={() => jsonInputRef.current?.click()}>
              {t('data.exchange.import')}
            </Button>
          </div>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label={t('data.exchange.choose')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importJson(file);
            }}
          />
          <p className="field__hint">{t('data.exchange.exportHint')}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('data.storage')}</span>
        </div>
        <div className="panel__body stack">
          <div className="data-grid">
            <p className="muted text-sm">
              {t('data.storage.counts', {
                sequences: state.sequences.length,
                lexemes: lexemeCount,
                media: mediaCount,
              })}
            </p>
            <p className="muted text-sm">
              {estimate
                ? t('data.storage.used', { usage: formatBytes(estimate.usage), quota: formatBytes(estimate.quota) })
                : t('data.storage.unknown')}
            </p>
          </div>
          <div className="row">
            <Button
              disabled={busy}
              onClick={() => {
                void actions.cleanUpMedia().then((removed) =>
                  toast.show(
                    removed > 0 ? t('data.storage.cleaned', { count: removed }) : t('data.storage.nothingToClean'),
                  ),
                );
              }}
            >
              {t('data.storage.cleanup')}
            </Button>
            <Button
              disabled={persistent === true}
              onClick={() => {
                void requestPersistentStorage().then((granted) => {
                  setPersistent(granted);
                  toast.show(
                    granted ? t('data.storage.persistGranted') : t('data.storage.persistDenied'),
                    granted ? 'success' : 'error',
                  );
                });
              }}
            >
              {persistent === true ? t('data.storage.persistActive') : t('data.storage.persist')}
            </Button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('settings.language')}</span>
        </div>
        <div className="panel__body stack">
          <SelectField
            label={t('settings.uiLanguage')}
            value={state.settings.uiLanguage}
            onChange={(value) => actions.updateSettings({ uiLanguage: value as UiLanguageSetting })}
            options={[
              ...UI_LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] ?? locale })),
              { value: 'sequence', label: t('settings.uiLanguage.sequence') },
            ]}
            hint={t('settings.uiLanguage.hint')}
          />
          <SelectField
            label={t('settings.teachingMode')}
            value={state.settings.teachingLanguageMode}
            onChange={(value) => actions.updateSettings({ teachingLanguageMode: value as TeachingLanguageMode })}
            options={TEACHING_LANGUAGE_MODES.map((mode) => ({ value: mode, label: t(`teachingMode.${mode}`) }))}
            hint={t(`teachingMode.${state.settings.teachingLanguageMode}.hint`)}
          />
          <p className="field__hint">
            {t('settings.teachingMode.hint')} {t('data.language.targets', { languages: LANGUAGES.map((language) => tid('language', language.code)).join(', ') })}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('data.appearance')}</span>
        </div>
        <div className="panel__body">
          <SelectField
            label={t('data.theme')}
            value={state.settings.theme}
            onChange={(theme) => actions.updateSettings({ theme: theme as 'system' | 'light' | 'dark' })}
            options={[
              { value: 'system', label: t('data.theme.system') },
              { value: 'light', label: t('data.theme.light') },
              { value: 'dark', label: t('data.theme.dark') },
            ]}
          />
        </div>
      </section>

      <p className="faint text-sm">
        {t('data.footer', { name: APP_NAME, version: APP_VERSION, schema: SCHEMA_VERSION })}
      </p>

      {pendingRestore ? (
        <ConfirmDialog
          title={t('data.backup.confirm')}
          message={t('data.backup.confirmText', {
            sequences: state.sequences.length,
            media: mediaCount,
            file: pendingRestore.name,
          })}
          confirmLabel={t('data.backup.replace')}
          cancelLabel={t('common.cancel')}
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
