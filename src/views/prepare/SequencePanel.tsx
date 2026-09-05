import { useState } from 'react';
import { navigate } from '../../app/router';
import { useStore } from '../../app/storeContext';
import { downloadText } from '../../app/download';
import {
  INFERENCE_MODES,
  LANGUAGES,
  LEARNER_LEVELS,
  repertoireLabel,
  type Sequence,
} from '../../domain/model';
import { PHASES, STEP_IDS, effectiveStepOrder, moveStep, stepPhase } from '../../domain/steps';
import { buildSequenceExport, sequenceExportFileName } from '../../storage/backup';
import { truncate } from '../../domain/text';
import { readinessSeverityLabel, summarizeReadiness } from '../../domain/readiness';
import { summarizeObservations } from '../../domain/observations';
import { Button, IconButton } from '../../ui/Button';
import { SelectField, TextArea, TextField } from '../../ui/Field';
import { Collapsible, EmptyState } from '../../ui/Feedback';
import { useToast } from '../../ui/toastContext';
import { StepOrderList } from './StepOrderList';
import { TableImport } from './TableImport';

interface Props {
  sequence: Sequence;
  selectedLexemeId: string | null;
  onSelectLexeme: (id: string) => void;
  headerExtra?: React.ReactNode;
}

export function SequencePanel({ sequence, selectedLexemeId, onSelectLexeme, headerExtra }: Props) {
  const { actions } = useStore();
  const toast = useToast();
  const [quickExpression, setQuickExpression] = useState('');
  const [quickMeaning, setQuickMeaning] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const update = (patch: Partial<Sequence>) => actions.updateSequence(sequence.id, patch);
  const readiness = summarizeReadiness(sequence);

  const addQuickLexeme = () => {
    const expression = quickExpression.trim();
    if (!expression) return;
    const id = actions.addLexeme(sequence.id, { expression, coreMeaning: quickMeaning.trim() });
    setQuickExpression('');
    setQuickMeaning('');
    if (id) onSelectLexeme(id);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sequence.lexemes.length) return;
    actions.moveLexeme(sequence.id, from, to);
    setAnnouncement(`${sequence.lexemes[from].expression || 'Einheit'} ist jetzt an Position ${to + 1} von ${sequence.lexemes.length}.`);
  };

  return (
    <div className="stack">
      <div className="pane-head">
        <h2 className="pane-head__title">Sequenz</h2>
        <div className="row">
          {headerExtra}
          <Button
            variant="secondary"
            onClick={() => {
              downloadText(JSON.stringify(buildSequenceExport(sequence), null, 2), sequenceExportFileName(sequence));
              toast.show('Sequenz als JSON exportiert.');
            }}
          >
            Exportieren
          </Button>
          <Button
            variant="primary"
            large
            disabled={sequence.lexemes.length === 0}
            onClick={() => navigate({ name: 'teach', sequenceId: sequence.id })}
          >
            {sequence.session ? 'Unterricht fortsetzen' : 'Unterrichten'}
          </Button>
        </div>
      </div>

      <div className="sequence-head">
        <div className="sequence-form">
          <TextField label="Titel" value={sequence.title} onChange={(title) => update({ title })} wide />
          <SelectField
            label="Zielsprache"
            value={sequence.targetLanguage}
            onChange={(targetLanguage) => update({ targetLanguage })}
            options={LANGUAGES.map((language) => ({ value: language.code, label: language.label }))}
          />
          <TextField
            label="Lerngruppe"
            value={sequence.learningGroup}
            onChange={(learningGroup) => update({ learningGroup })}
            placeholder="z. B. Klasse 7, 2. Lernjahr"
          />
          <SelectField
            label="Lernniveau"
            value={sequence.learnerLevel}
            onChange={(learnerLevel) => update({ learnerLevel: learnerLevel as Sequence['learnerLevel'] })}
            options={LEARNER_LEVELS.map((level) => ({ value: level.id, label: level.label }))}
            hint="Fließt in die Vorschläge des Methodenberaters ein."
          />
          <TextField
            label="Thema oder Situation"
            value={sequence.topic}
            onChange={(topic) => update({ topic })}
            placeholder="z. B. Am Wochenende etwas unternehmen"
            wide
          />
          <TextArea
            label="Kommunikatives Kann-Ziel"
            value={sequence.canDoGoal}
            onChange={(canDoGoal) => update({ canDoGoal })}
            placeholder="Die Lernenden können …"
            rows={2}
            wide
          />
        </div>

        <Collapsible title="Notiz für die Lehrkraft">
          <TextArea
            label="Notiz"
            value={sequence.teacherNote}
            onChange={(teacherNote) => update({ teacherNote })}
            rows={3}
            hint="Erscheint nur in der Vorbereitung, nicht im Unterrichtsmodus."
          />
        </Collapsible>

        <Collapsible title="Dramaturgie der Einführung">
          <p className="field__hint">
            Grundstruktur sind sechs Phasen: {PHASES.map((phase) => phase.label).join(' – ')}. Welche Schritte darin
            vorkommen und in welcher Reihenfolge, entscheiden Sie. Deaktivierte Schritte werden übersprungen; Schritte
            ohne Material entfallen automatisch.
          </p>
          <SelectField
            label="Bedeutung erschließen lassen"
            value={sequence.inferenceMode}
            onChange={(inferenceMode) => update({ inferenceMode: inferenceMode as Sequence['inferenceMode'] })}
            options={INFERENCE_MODES.map((mode) => ({ value: mode.id, label: mode.label }))}
            hint={INFERENCE_MODES.find((mode) => mode.id === sequence.inferenceMode)?.description}
          />
          <StepOrderList
            order={effectiveStepOrder(sequence)}
            isEnabled={(stepId) => sequence.steps[stepId] !== false}
            onToggle={(stepId, enabled) => actions.setSequenceStep(sequence.id, stepId, enabled)}
            onMove={(from, to) => update({ stepOrder: moveStep(effectiveStepOrder(sequence), from, to) })}
            phaseFor={(stepId) => stepPhase(stepId)?.label}
          />
          <Button variant="ghost" onClick={() => update({ stepOrder: [...STEP_IDS] })}>
            Standardreihenfolge wiederherstellen
          </Button>
        </Collapsible>
      </div>

      <Collapsible
        title={
          readiness.toComplete > 0
            ? `Bereitschaft: ${readiness.toComplete} Hinweis${readiness.toComplete === 1 ? '' : 'e'} zum Ergänzen`
            : readiness.optional > 0
              ? `Bereitschaft: ${readiness.optional} optionale${readiness.optional === 1 ? 'r' : ''} Hinweis${readiness.optional === 1 ? '' : 'e'}`
              : 'Bereitschaft: nichts offen'
        }
      >
        <p className="field__hint">
          Der Check blockiert nichts. Er zeigt nur, was für einen tragfähigen Erstkontakt noch fehlt und was sich
          optional vertiefen lässt.
        </p>
        {readiness.findings.length === 0 ? (
          <p className="muted text-sm">Für diese Sequenz ist alles Wesentliche vorbereitet.</p>
        ) : (
          <ul className="readiness">
            {readiness.findings.map((finding) => (
              <li key={finding.id} className={`readiness__item readiness__item--${finding.severity}`}>
                <span className="tag">{readinessSeverityLabel(finding.severity)}</span>
                <p className="readiness__title">{finding.title}</p>
                <p className="readiness__detail">{finding.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <div>
        <h3 className="pane-head__title" style={{ marginBottom: 'var(--space-2)' }}>
          Lexikalische Einheiten ({sequence.lexemes.length})
        </h3>

        <p className="visually-hidden" role="status" aria-live="polite" aria-label="Reihenfolge der Einheiten">
          {announcement}
        </p>

        {sequence.lexemes.length === 0 ? (
          <EmptyState title="Noch keine Einheit">
            <p className="text-sm">
              Tragen Sie unten einen Ausdruck oder Chunk ein – Details lassen sich jederzeit ergänzen.
            </p>
          </EmptyState>
        ) : (
          <ul className="lexeme-list">
            {sequence.lexemes.map((lexeme, index) => (
              <li
                key={lexeme.id}
                className={[
                  'lexeme-row',
                  lexeme.id === selectedLexemeId ? 'lexeme-row--active' : '',
                  dragIndex === index ? 'lexeme-row--dragging' : '',
                  dropIndex === index && dragIndex !== null && dragIndex !== index ? 'lexeme-row--drop-target' : '',
                  lexeme.skipped ? 'lexeme-row--skipped' : '',
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
                <span className="lexeme-row__handle" aria-hidden="true">
                  ⠿
                </span>

                <button type="button" className="lexeme-row__main" onClick={() => onSelectLexeme(lexeme.id)}>
                  <span className="lexeme-row__expression">{lexeme.expression || 'Ohne Ausdruck'}</span>
                  <span className="lexeme-row__meta">
                    <span>{truncate(lexeme.communicativeFunction || lexeme.coreMeaning || 'ohne Kernbedeutung', 42)}</span>
                    {lexeme.semantisationMethod ? <span>{truncate(lexeme.semantisationMethod, 28)}</span> : null}
                    <span className={`tag tag--${lexeme.repertoire}`}>{repertoireLabel(lexeme.repertoire)}</span>
                    {summarizeObservations(lexeme.observations)
                      .filter((entry) => entry.result)
                      .map((entry) => (
                        <span key={entry.dimension} className={`tag dimension--${entry.result}`}>
                          {entry.label}
                        </span>
                      ))}
                  </span>
                </button>

                <span className="lexeme-row__actions">
                  <IconButton label="Nach oben verschieben" disabled={index === 0} onClick={() => move(index, index - 1)}>
                    ↑
                  </IconButton>
                  <IconButton
                    label="Nach unten verschieben"
                    disabled={index === sequence.lexemes.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label="Einheit duplizieren"
                    onClick={() => {
                      const id = actions.duplicateLexeme(sequence.id, lexeme.id);
                      if (id) onSelectLexeme(id);
                    }}
                  >
                    ⧉
                  </IconButton>
                  <IconButton
                    label="Einheit entfernen"
                    onClick={() => {
                      actions.removeLexeme(sequence.id, lexeme.id);
                      toast.show('Einheit entfernt.');
                    }}
                  >
                    ✕
                  </IconButton>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="quick-add">
          <TextField
            label="Neuer Ausdruck oder Chunk"
            value={quickExpression}
            onChange={setQuickExpression}
            placeholder="z. B. Ça te dit de… ?"
            target
            onKeyDown={(event) => {
              if (event.key === 'Enter') addQuickLexeme();
            }}
          />
          <TextField
            label="Kernbedeutung (optional)"
            value={quickMeaning}
            onChange={setQuickMeaning}
            placeholder="Hast du Lust, …?"
            onKeyDown={(event) => {
              if (event.key === 'Enter') addQuickLexeme();
            }}
          />
          <Button variant="primary" onClick={addQuickLexeme} disabled={!quickExpression.trim()}>
            Hinzufügen
          </Button>
        </div>

        <Collapsible title="Mehrere Einheiten aus einer Tabelle übernehmen">
          <TableImport sequence={sequence} />
        </Collapsible>
      </div>
    </div>
  );
}
