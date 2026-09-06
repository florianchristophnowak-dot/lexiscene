import { useId, useState } from 'react';
import { useStore } from '../../app/storeContext';
import {
  CLOSED_CORPUS_REVEAL,
  CORPUS_MIN_EXAMPLES,
  appendExampleLines,
  corpusCategories,
  corpusStages,
  corpusWarnings,
  createCorpusExample,
  moveCorpusExample,
  parseExampleLines,
  splitHighlight,
  usableExamples,
  type CorpusReveal,
} from '../../domain/corpus';
import {
  CORPUS_FOCUSES,
  CORPUS_PROVENANCES,
  type CorpusExample,
  type CorpusMiniature,
  type Lexeme,
  type Sequence,
} from '../../domain/model';
import { isStepEnabled } from '../../domain/steps';
import { useT, useTid } from '../../i18n/context';
import type { TranslationKey } from '../../i18n';
import { Button, IconButton } from '../../ui/Button';
import { Modal } from '../../ui/Dialog';
import { CheckboxRow, SelectField, TextArea, TextField } from '../../ui/Field';
import { useToast } from '../../ui/toastContext';
import { CorpusStage } from '../teach/CorpusStage';

/** Zeigt, wie die Markierung im Beleg greift – oder dass sie nicht greift. */
function HighlightPreview({ example }: { example: CorpusExample }) {
  if (!example.text.trim() || !example.highlight.trim()) return null;
  return (
    // Rein visuelle Kontrolle der Markierung; der Text steht schon in den Feldern.
    <p className="corpus-edit__preview" aria-hidden="true">
      {splitHighlight(example.text, example.highlight).map((segment, index) =>
        segment.mark ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>,
      )}
    </p>
  );
}

/** Vorschau der gestuften Präsentation – dieselbe Bühne wie im Unterricht. */
function CorpusPreview({ miniature, onClose }: { miniature: CorpusMiniature; onClose: () => void }) {
  const t = useT();
  const [reveal, setReveal] = useState<CorpusReveal>(CLOSED_CORPUS_REVEAL);
  const stages = corpusStages(miniature);
  const toggle = (patch: Partial<CorpusReveal>) => setReveal((current) => ({ ...current, ...patch }));

  return (
    <Modal
      title={t('corpus.previewTitle')}
      onClose={onClose}
      actions={<Button onClick={onClose}>{t('common.close')}</Button>}
    >
      <div className="stack-tight">
        <div className="row">
          {stages.highlight ? (
            <Button
              variant={reveal.highlight ? 'secondary' : 'ghost'}
              aria-pressed={reveal.highlight}
              onClick={() => toggle({ highlight: !reveal.highlight })}
            >
              {t('corpus.reveal.highlight')}
            </Button>
          ) : null}
          {stages.groups ? (
            <Button
              variant={reveal.groups ? 'secondary' : 'ghost'}
              aria-pressed={reveal.groups}
              onClick={() => toggle({ groups: !reveal.groups })}
            >
              {t('corpus.reveal.groups')}
            </Button>
          ) : null}
          {stages.rule ? (
            <Button
              variant={reveal.rule ? 'secondary' : 'ghost'}
              aria-pressed={reveal.rule}
              onClick={() => toggle({ rule: !reveal.rule })}
            >
              {t('corpus.reveal.rule')}
            </Button>
          ) : null}
          {stages.transfer ? (
            <Button
              variant={reveal.transfer ? 'secondary' : 'ghost'}
              aria-pressed={reveal.transfer}
              onClick={() => toggle({ transfer: !reveal.transfer })}
            >
              {t('corpus.reveal.transfer')}
            </Button>
          ) : null}
        </div>
        <div className="corpus-preview">
          <CorpusStage miniature={miniature} reveal={reveal} teacherView={false} />
        </div>
        <p className="field__hint">{t('corpus.previewNote')}</p>
      </div>
    </Modal>
  );
}

interface Props {
  sequence: Sequence;
  lexeme: Lexeme;
}

/**
 * Vorbereitung einer Korpusminiatur.
 *
 * Die Belege trägt die Lehrkraft selbst ein oder fügt sie zeilenweise ein; es
 * wird nichts abgerufen, ergänzt oder sprachlich verändert.
 */
export function CorpusPanel({ sequence, lexeme }: Props) {
  const { actions } = useStore();
  const toast = useToast();
  const t = useT();
  const tid = useTid();
  const categoryListId = useId();
  const [pasted, setPasted] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const miniature = lexeme.corpus;
  const warnings = corpusWarnings(miniature);
  const categories = corpusCategories(miniature);
  const usable = usableExamples(miniature);
  const stepEnabled = isStepEnabled(sequence, lexeme, 'korpusminiatur');

  const patch = (change: Partial<CorpusMiniature>) =>
    actions.updateLexeme(sequence.id, lexeme.id, { corpus: { ...miniature, ...change } });

  const setExamples = (examples: CorpusExample[]) => patch({ examples });

  const updateExample = (id: string, change: Partial<CorpusExample>) =>
    setExamples(miniature.examples.map((example) => (example.id === id ? { ...example, ...change } : example)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= miniature.examples.length) return;
    setExamples(moveCorpusExample(miniature.examples, from, to));
    setAnnouncement(
      t('corpus.example.moved', { from: from + 1, to: to + 1, total: miniature.examples.length }),
    );
  };

  const takeOverLines = () => {
    const lines = parseExampleLines(pasted);
    if (lines.length === 0) return;
    // Angehängt, nie ersetzt: vorhandene Belege bleiben unangetastet.
    setExamples(appendExampleLines(miniature.examples, pasted));
    setPasted('');
    toast.show(t('corpus.paste.taken', { count: lines.length }));
  };

  return (
    <>
      <CheckboxRow
        label={t('corpus.enable')}
        hint={t('corpus.enable.hint')}
        checked={miniature.enabled}
        onChange={(enabled) => patch({ enabled })}
      />

      {miniature.enabled ? (
        <div className="stack">
          <p className="field__hint">{t('corpus.sizeHint')}</p>

          <TextField
            label={t('corpus.field.title')}
            value={miniature.title}
            onChange={(title) => patch({ title })}
            placeholder={t('corpus.field.title.placeholder')}
          />
          <TextArea
            label={t('corpus.field.question')}
            value={miniature.guidingQuestion}
            onChange={(guidingQuestion) => patch({ guidingQuestion })}
            rows={2}
            hint={t('corpus.field.question.hint')}
          />
          <SelectField
            label={t('corpus.field.focus')}
            value={miniature.focus}
            onChange={(focus) => patch({ focus: focus as CorpusMiniature['focus'] })}
            options={CORPUS_FOCUSES.map((focus) => ({ value: focus, label: tid('corpus.focus', focus) }))}
            hint={tid('corpus.focus', `${miniature.focus}.hint`)}
          />

          {warnings.length > 0 ? (
            <ul className="corpus-warnings">
              {warnings.map((warning) => (
                <li className="notice" key={warning.id}>
                  {t(warning.key as TranslationKey, warning.params)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="stack-tight">
            <span className="field__label">{t('corpus.examplesCount', { count: usable.length })}</span>
            <p className="field__hint">{t('corpus.examples.hint')}</p>
            <p className="visually-hidden" role="status" aria-live="polite" aria-label={t('corpus.example.order')}>
              {announcement}
            </p>

            <ol className="corpus-edit">
              {miniature.examples.map((example, index) => (
                <li
                  key={example.id}
                  className={[
                    'corpus-edit__item',
                    dragIndex === index ? 'corpus-edit__item--dragging' : '',
                    dropIndex === index && dragIndex !== null && dragIndex !== index ? 'corpus-edit__item--drop-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable
                  onDragStart={(event) => {
                    setDragIndex(index);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropIndex(index);
                  }}
                  onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = dragIndex ?? Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
                    if (Number.isInteger(from) && from !== index) move(from, index);
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                >
                  <span className="corpus-edit__position" aria-hidden="true">
                    {index + 1}
                  </span>

                  <div className="corpus-edit__fields">
                    <TextArea
                      label={t('corpus.example.text', { index: index + 1 })}
                      value={example.text}
                      onChange={(text) => updateExample(example.id, { text })}
                      rows={2}
                      target
                    />
                    <TextField
                      label={t('corpus.example.highlight', { index: index + 1 })}
                      value={example.highlight}
                      onChange={(highlight) => updateExample(example.id, { highlight })}
                      target
                      placeholder={t('corpus.example.highlight.placeholder')}
                    />
                    <TextField
                      label={t('corpus.example.category', { index: index + 1 })}
                      value={example.category}
                      onChange={(category) => updateExample(example.id, { category })}
                      list={categoryListId}
                      placeholder={t('corpus.example.category.placeholder')}
                    />
                    <TextField
                      label={t('corpus.example.note', { index: index + 1 })}
                      value={example.teacherNote}
                      onChange={(teacherNote) => updateExample(example.id, { teacherNote })}
                    />
                    <HighlightPreview example={example} />
                  </div>

                  <span className="corpus-edit__actions">
                    <IconButton
                      label={t('corpus.example.up', { index: index + 1 })}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label={t('corpus.example.down', { index: index + 1 })}
                      disabled={index === miniature.examples.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label={t('corpus.example.duplicate', { index: index + 1 })}
                      onClick={() => {
                        const copy = createCorpusExample({
                          text: example.text,
                          highlight: example.highlight,
                          category: example.category,
                          teacherNote: example.teacherNote,
                        });
                        const next = [...miniature.examples];
                        next.splice(index + 1, 0, copy);
                        setExamples(next);
                      }}
                    >
                      ⧉
                    </IconButton>
                    <IconButton
                      label={t('corpus.example.remove', { index: index + 1 })}
                      onClick={() => setExamples(miniature.examples.filter((entry) => entry.id !== example.id))}
                    >
                      ✕
                    </IconButton>
                  </span>
                </li>
              ))}
            </ol>

            <datalist id={categoryListId}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>

            <div className="row">
              <Button onClick={() => setExamples([...miniature.examples, createCorpusExample()])}>
                {t('corpus.addExample')}
              </Button>
              <Button variant="ghost" disabled={usable.length === 0} onClick={() => setPreviewOpen(true)}>
                {t('common.preview')}
              </Button>
            </div>
          </div>

          <div className="stack-tight">
            <TextArea
              label={t('corpus.paste')}
              value={pasted}
              onChange={setPasted}
              rows={4}
              target
              placeholder={t('corpus.paste.placeholder')}
              hint={t('corpus.paste.hint')}
            />
            <div className="row">
              <Button variant="primary" disabled={parseExampleLines(pasted).length === 0} onClick={takeOverLines}>
                {parseExampleLines(pasted).length > 0
                  ? t('corpus.paste.takeCount', { count: parseExampleLines(pasted).length })
                  : t('corpus.paste.take')}
              </Button>
            </div>
          </div>

          <TextArea
            label={t('corpus.field.discovery')}
            value={miniature.discoveryPrompt}
            onChange={(discoveryPrompt) => patch({ discoveryPrompt })}
            rows={2}
            hint={t('corpus.field.discovery.hint')}
          />
          <TextArea
            label={t('corpus.field.rule')}
            value={miniature.ruleOrFinding}
            onChange={(ruleOrFinding) => patch({ ruleOrFinding })}
            rows={2}
            target
            hint={t('corpus.field.rule.hint')}
          />
          <TextArea
            label={t('corpus.field.transfer')}
            value={miniature.transferPrompt}
            onChange={(transferPrompt) => patch({ transferPrompt })}
            rows={2}
            hint={t('corpus.field.transfer.hint')}
          />

          <SelectField
            label={t('corpus.field.provenance')}
            value={miniature.provenance}
            onChange={(provenance) => patch({ provenance: provenance as CorpusMiniature['provenance'] })}
            options={CORPUS_PROVENANCES.map((entry) => ({ value: entry, label: tid('corpus.provenance', entry) }))}
            hint={tid('corpus.provenance', `${miniature.provenance}.hint`)}
          />
          <TextField
            label={t('corpus.field.source')}
            value={miniature.sourceNote}
            onChange={(sourceNote) => patch({ sourceNote })}
            hint={t('corpus.field.source.hint')}
          />

          <CheckboxRow
            label={t('corpus.stepToggle')}
            hint={
              usable.length < CORPUS_MIN_EXAMPLES
                ? t('corpus.stepToggle.min', { min: CORPUS_MIN_EXAMPLES })
                : t('corpus.stepToggle.hint')
            }
            checked={stepEnabled}
            onChange={(checked) =>
              actions.updateLexeme(sequence.id, lexeme.id, {
                stepOverrides: { ...lexeme.stepOverrides, korpusminiatur: checked },
              })
            }
          />
        </div>
      ) : null}

      {previewOpen ? <CorpusPreview miniature={miniature} onClose={() => setPreviewOpen(false)} /> : null}
    </>
  );
}
