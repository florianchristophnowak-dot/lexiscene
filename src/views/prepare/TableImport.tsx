import { useMemo, useState } from 'react';
import { useStore } from '../../app/storeContext';
import { IMPORT_FIELDS, buildPreview, rowsToLexemes, type ImportField } from '../../domain/import';
import type { Sequence } from '../../domain/model';
import { truncate } from '../../domain/text';
import { useT } from '../../i18n/context';
import { Button } from '../../ui/Button';
import { CheckboxRow } from '../../ui/Field';
import { useToast } from '../../ui/toastContext';

const PREVIEW_ROWS = 4;

export function TableImport({ sequence }: { sequence: Sequence }) {
  const t = useT();
  const { actions } = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [hasHeader, setHasHeader] = useState<boolean | null>(null);
  const [mapping, setMapping] = useState<ImportField[] | null>(null);

  const preview = useMemo(
    () => buildPreview(text, { hasHeader: hasHeader ?? undefined, mapping: mapping ?? undefined }),
    [hasHeader, mapping, text],
  );

  const previewRows = preview.rows.slice(0, hasHeader ?? preview.hasHeader ? PREVIEW_ROWS + 1 : PREVIEW_ROWS);
  const headerActive = hasHeader ?? preview.hasHeader;

  const reset = () => {
    setText('');
    setHasHeader(null);
    setMapping(null);
  };

  const insert = () => {
    const lexemes = rowsToLexemes(preview.rows, preview.mapping, headerActive);
    const count = actions.addLexemes(sequence.id, lexemes);
    toast.show(t('import.taken', { count }), count > 0 ? 'success' : 'error');
    if (count > 0) reset();
  };

  return (
    <div className="stack">
      <p className="field__hint">
        Text aus einer Tabelle oder Liste einfügen – eine Zeile je Einheit, Spalten getrennt durch Tabulator,
        Semikolon oder Komma. Die Zuordnung der Spalten lässt sich vor dem Übernehmen ändern.
      </p>

      <label className="field">
        <span className="field__label">{t('import.paste')}</span>
        <textarea
          className="textarea"
          rows={5}
          value={text}
          placeholder={'Ça te dit de… ?\tHast du Lust, …?\teinen Vorschlag machen'}
          onChange={(event) => {
            setText(event.target.value);
            setMapping(null);
            setHasHeader(null);
          }}
        />
      </label>

      {preview.rows.length > 0 ? (
        <>
          <CheckboxRow
            label={t('import.header')}
            checked={headerActive}
            onChange={(checked) => {
              setHasHeader(checked);
              setMapping(null);
            }}
          />

          <div className="import-preview" role="group" aria-label={t('import.preview')}>
            <div className="import-preview__scroll">
              <table className="import-table">
                <thead>
                  <tr>
                    {preview.mapping.map((field, index) => (
                      <th key={index}>
                        <label className="visually-hidden" htmlFor={`import-spalte-${index}`}>
                          Spalte {index + 1} zuordnen
                        </label>
                        <select
                          id={`import-spalte-${index}`}
                          className="select"
                          value={field}
                          onChange={(event) => {
                            const next = [...preview.mapping];
                            next[index] = event.target.value as ImportField;
                            setMapping(next);
                            setHasHeader(headerActive);
                          }}
                        >
                          {IMPORT_FIELDS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={headerActive && rowIndex === 0 ? 'import-table__header-row' : undefined}>
                      {preview.mapping.map((_, columnIndex) => (
                        <td key={columnIndex}>{truncate(row[columnIndex] ?? '', 40)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > previewRows.length ? (
              <p className="field__hint">… und {preview.rows.length - previewRows.length} weitere Zeilen</p>
            ) : null}
          </div>

          <div className="row">
            <Button variant="primary" disabled={preview.usableCount === 0} onClick={insert}>
              {t('import.take', { count: preview.usableCount })}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Verwerfen
            </Button>
          </div>

          {preview.usableCount === 0 ? (
            <p className="notice">
              Ordnen Sie einer Spalte „Ausdruck oder Chunk“ zu – ohne Ausdruck lässt sich keine Einheit anlegen.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
