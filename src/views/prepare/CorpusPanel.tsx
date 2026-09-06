import { useId, useState } from 'react';
import { useStore } from '../../app/storeContext';
import {
  CLOSED_CORPUS_REVEAL,
  CORPUS_MIN_EXAMPLES,
  CORPUS_SIZE_HINT,
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
  const [reveal, setReveal] = useState<CorpusReveal>(CLOSED_CORPUS_REVEAL);
  const stages = corpusStages(miniature);
  const toggle = (patch: Partial<CorpusReveal>) => setReveal((current) => ({ ...current, ...patch }));

  return (
    <Modal title="Vorschau – so sieht es die Klasse" onClose={onClose} actions={<Button onClick={onClose}>Schließen</Button>}>
      <div className="stack-tight">
        <div className="row">
          {stages.highlight ? (
            <Button
              variant={reveal.highlight ? 'secondary' : 'ghost'}
              aria-pressed={reveal.highlight}
              onClick={() => toggle({ highlight: !reveal.highlight })}
            >
              Fokus markieren
            </Button>
          ) : null}
          {stages.groups ? (
            <Button
              variant={reveal.groups ? 'secondary' : 'ghost'}
              aria-pressed={reveal.groups}
              onClick={() => toggle({ groups: !reveal.groups })}
            >
              Gruppen zeigen
            </Button>
          ) : null}
          {stages.rule ? (
            <Button
              variant={reveal.rule ? 'secondary' : 'ghost'}
              aria-pressed={reveal.rule}
              onClick={() => toggle({ rule: !reveal.rule })}
            >
              Regel zeigen
            </Button>
          ) : null}
          {stages.transfer ? (
            <Button
              variant={reveal.transfer ? 'secondary' : 'ghost'}
              aria-pressed={reveal.transfer}
              onClick={() => toggle({ transfer: !reveal.transfer })}
            >
              Transfer zeigen
            </Button>
          ) : null}
        </div>
        <div className="corpus-preview">
          <CorpusStage miniature={miniature} reveal={reveal} teacherView={false} />
        </div>
        <p className="field__hint">
          Lehrkraftnotizen und Quellenhinweis erscheinen weder hier noch im Projektionsfenster.
        </p>
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
    setAnnouncement(`Beleg ${from + 1} steht jetzt an Position ${to + 1} von ${miniature.examples.length}.`);
  };

  const takeOverLines = () => {
    const lines = parseExampleLines(pasted);
    if (lines.length === 0) return;
    // Angehängt, nie ersetzt: vorhandene Belege bleiben unangetastet.
    setExamples(appendExampleLines(miniature.examples, pasted));
    setPasted('');
    toast.show(`${lines.length} ${lines.length === 1 ? 'Beleg' : 'Belege'} übernommen.`);
  };

  return (
    <>
      <CheckboxRow
        label="Korpusminiatur für diese Einheit verwenden"
        hint="Wenige selbst kuratierte Belege, an denen ein Muster entdeckt werden kann. Immer optional."
        checked={miniature.enabled}
        onChange={(enabled) => patch({ enabled })}
      />

      {miniature.enabled ? (
        <div className="stack">
          <p className="field__hint">{CORPUS_SIZE_HINT}</p>

          <TextField label="Titel" value={miniature.title} onChange={(title) => patch({ title })} placeholder="z. B. jouer à oder jouer de?" />
          <TextArea
            label="Leitfrage"
            value={miniature.guidingQuestion}
            onChange={(guidingQuestion) => patch({ guidingQuestion })}
            rows={2}
            hint="Beobachtungsauftrag für die Lernenden – auf ein erkennbares Merkmal beschränken."
          />
          <SelectField
            label="Schwerpunkt"
            value={miniature.focus}
            onChange={(focus) => patch({ focus: focus as CorpusMiniature['focus'] })}
            options={CORPUS_FOCUSES.map((entry) => ({ value: entry.id, label: entry.label }))}
            hint={CORPUS_FOCUSES.find((entry) => entry.id === miniature.focus)?.description}
          />

          {warnings.length > 0 ? (
            <ul className="corpus-warnings">
              {warnings.map((warning) => (
                <li className="notice" key={warning.id}>
                  {warning.message}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="stack-tight">
            <span className="field__label">Belege ({usable.length})</span>
            <p className="field__hint">
              Die Markierung muss genau so im Beleg stehen. Notizen sind nur für die Lehrkraft und erscheinen nie in
              der Projektion.
            </p>
            <p className="visually-hidden" role="status" aria-live="polite" aria-label="Reihenfolge der Belege">
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
                      label={`Beleg ${index + 1}`}
                      value={example.text}
                      onChange={(text) => updateExample(example.id, { text })}
                      rows={2}
                      target
                    />
                    <TextField
                      label={`Markierung in Beleg ${index + 1}`}
                      value={example.highlight}
                      onChange={(highlight) => updateExample(example.id, { highlight })}
                      target
                      placeholder="Textteil aus dem Beleg"
                    />
                    <TextField
                      label={`Kategorie von Beleg ${index + 1}`}
                      value={example.category}
                      onChange={(category) => updateExample(example.id, { category })}
                      list={categoryListId}
                      placeholder="optional, z. B. Sport/Spiel"
                    />
                    <TextField
                      label={`Notiz zu Beleg ${index + 1}`}
                      value={example.teacherNote}
                      onChange={(teacherNote) => updateExample(example.id, { teacherNote })}
                    />
                    <HighlightPreview example={example} />
                  </div>

                  <span className="corpus-edit__actions">
                    <IconButton label={`Beleg ${index + 1} nach oben`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                      ↑
                    </IconButton>
                    <IconButton
                      label={`Beleg ${index + 1} nach unten`}
                      disabled={index === miniature.examples.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label={`Beleg ${index + 1} duplizieren`}
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
                      label={`Beleg ${index + 1} entfernen`}
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
              <Button onClick={() => setExamples([...miniature.examples, createCorpusExample()])}>Beleg hinzufügen</Button>
              <Button variant="ghost" disabled={usable.length === 0} onClick={() => setPreviewOpen(true)}>
                Vorschau
              </Button>
            </div>
          </div>

          <div className="stack-tight">
            <TextArea
              label="Mehrere Belege einfügen"
              value={pasted}
              onChange={setPasted}
              rows={4}
              target
              placeholder={'Ein Beleg je Zeile'}
              hint="Eine Zeile wird ein Beleg. Leere Zeilen werden übergangen; vorhandene Belege bleiben erhalten."
            />
            <div className="row">
              <Button variant="primary" disabled={parseExampleLines(pasted).length === 0} onClick={takeOverLines}>
                {parseExampleLines(pasted).length > 0
                  ? `${parseExampleLines(pasted).length} Zeilen als Belege übernehmen`
                  : 'Zeilen als Belege übernehmen'}
              </Button>
            </div>
          </div>

          <TextArea
            label="Auftrag zum Vergleichen oder Sortieren"
            value={miniature.discoveryPrompt}
            onChange={(discoveryPrompt) => patch({ discoveryPrompt })}
            rows={2}
            hint="Erscheint im Unterricht mit „Gruppen zeigen“."
          />
          <TextArea
            label="Regel oder Musteranker"
            value={miniature.ruleOrFinding}
            onChange={(ruleOrFinding) => patch({ ruleOrFinding })}
            rows={2}
            target
            hint="Das beobachtete Muster wird anschließend ausdrücklich bestätigt."
          />
          <TextArea
            label="Transferaufgabe"
            value={miniature.transferPrompt}
            onChange={(transferPrompt) => patch({ transferPrompt })}
            rows={2}
            hint="Kurze Anwendung im Anschluss."
          />

          <SelectField
            label="Herkunft der Belege"
            value={miniature.provenance}
            onChange={(provenance) => patch({ provenance: provenance as CorpusMiniature['provenance'] })}
            options={CORPUS_PROVENANCES.map((entry) => ({ value: entry.id, label: entry.label }))}
            hint={CORPUS_PROVENANCES.find((entry) => entry.id === miniature.provenance)?.description}
          />
          <TextField
            label="Quellenhinweis (optional)"
            value={miniature.sourceNote}
            onChange={(sourceNote) => patch({ sourceNote })}
            hint="Wird ausschließlich als Text auf diesem Gerät gespeichert – es wird nichts abgerufen."
          />

          <CheckboxRow
            label="Schritt „Korpusminiatur“ im Unterricht dieser Einheit zeigen"
            hint={
              usable.length < CORPUS_MIN_EXAMPLES
                ? `Der Schritt erscheint ab ${CORPUS_MIN_EXAMPLES} Belegen.`
                : 'Andere Einheiten der Sequenz bleiben davon unberührt.'
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
