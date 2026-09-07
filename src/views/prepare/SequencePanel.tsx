import { useState } from 'react';
import { navigate } from '../../app/router';
import { useStore } from '../../app/storeContext';
import { downloadText } from '../../app/download';
import { INFERENCE_MODES, LANGUAGES, LEARNER_LEVELS, TASK_TYPES, type Sequence } from '../../domain/model';
import { PHASES, PHASE_VISIBILITY, STEP_IDS, effectiveStepOrder, moveStep, stepPhase, visibilityLabel } from '../../domain/steps';
import { buildSequenceExport, sequenceExportFileName } from '../../storage/backup';
import { truncate } from '../../domain/text';
import { summarizeReadiness } from '../../domain/readiness';
import { summarizeObservations } from '../../domain/observations';
import type { TranslationKey } from '../../i18n';
import { useLocale, useT, useTid } from '../../i18n/context';
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
  const t = useT();
  const tid = useTid();
  const locale = useLocale();
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
    setAnnouncement(
      t('sequence.order.announce', {
        name: sequence.lexemes[from].expression || t('sequence.lexeme.unnamed'),
        position: to + 1,
        total: sequence.lexemes.length,
      }),
    );
  };

  return (
    <div className="stack">
      <div className="pane-head">
        <h2 className="pane-head__title">{t('sequence.title')}</h2>
        <div className="row">
          {headerExtra}
          <Button
            variant="secondary"
            onClick={() => {
              downloadText(
                JSON.stringify(
                  buildSequenceExport(sequence, {
                    locale,
                    label: (stepId) => tid('step', stepId),
                    purpose: (stepId) => tid('step', `${stepId}.purpose`),
                  }),
                  null,
                  2,
                ),
                sequenceExportFileName(sequence),
              );
              toast.show(t('sequence.exported'));
            }}
          >
            {t('common.export')}
          </Button>
          <Button
            variant="primary"
            large
            disabled={sequence.lexemes.length === 0}
            onClick={() => navigate({ name: 'teach', sequenceId: sequence.id })}
          >
            {sequence.session ? t('sequence.resume') : t('sequence.teach')}
          </Button>
        </div>
      </div>

      <div className="sequence-head">
        <div className="sequence-form">
          <TextField label={t('sequence.field.title')} value={sequence.title} onChange={(title) => update({ title })} wide />
          <SelectField
            label={t('sequence.field.language')}
            value={sequence.targetLanguage}
            onChange={(targetLanguage) => update({ targetLanguage })}
            options={LANGUAGES.map((language) => ({ value: language.code, label: tid('language', language.code) }))}
          />
          <TextField
            label={t('sequence.field.group')}
            value={sequence.learningGroup}
            onChange={(learningGroup) => update({ learningGroup })}
            placeholder={t('sequence.field.group.placeholder')}
          />
          <SelectField
            label={t('sequence.field.level')}
            value={sequence.learnerLevel}
            onChange={(learnerLevel) => update({ learnerLevel: learnerLevel as Sequence['learnerLevel'] })}
            options={LEARNER_LEVELS.map((level) => ({ value: level, label: tid('learnerLevel', level) }))}
            hint={t('sequence.field.level.hint')}
          />
          <TextField
            label={t('sequence.field.topic')}
            value={sequence.topic}
            onChange={(topic) => update({ topic })}
            placeholder={t('sequence.field.topic.placeholder')}
            wide
          />
          <TextArea
            label={t('sequence.field.canDo')}
            value={sequence.canDoGoal}
            onChange={(canDoGoal) => update({ canDoGoal })}
            placeholder={t('sequence.field.canDo.placeholder')}
            rows={2}
            wide
          />
        </div>

        {/*
          * Die Aufgabe steht vor der Wortliste: Aus ihr ergibt sich, welche
          * Einheiten die Lernenden wirklich brauchen.
          */}
        <section className="core-panel">
          <p className="core-panel__title">{t('sequence.task.title')}</p>
          <p className="field__hint">{t('sequence.task.hint')}</p>
          <div className="sequence-form">
            <SelectField
              label={t('sequence.field.taskType')}
              value={sequence.taskType}
              onChange={(taskType) => update({ taskType: taskType as Sequence['taskType'] })}
              options={TASK_TYPES.map((type) => ({ value: type, label: tid('taskType', type) }))}
            />
            <TextArea
              label={t('sequence.field.targetTask')}
              value={sequence.targetTask}
              onChange={(targetTask) => update({ targetTask })}
              placeholder={t('sequence.field.targetTask.placeholder')}
              hint={sequence.targetTask.trim() ? t('sequence.field.targetTask.hint') : t('sequence.task.missing')}
              rows={2}
              wide
            />
          </div>
        </section>

        <Collapsible title={t('sequence.note')}>
          <TextArea
            label={t('sequence.note.field')}
            value={sequence.teacherNote}
            onChange={(teacherNote) => update({ teacherNote })}
            rows={3}
            hint={t('sequence.note.hint')}
          />
        </Collapsible>

        <Collapsible title={t('sequence.dramaturgy')}>
          <p className="field__hint">
            {t('sequence.dramaturgy.hint', {
              phases: PHASES.map((phase) => tid('phase', phase.id)).join(' – '),
            })}
          </p>
          <SelectField
            label={t('sequence.inference')}
            value={sequence.inferenceMode}
            onChange={(inferenceMode) => update({ inferenceMode: inferenceMode as Sequence['inferenceMode'] })}
            options={INFERENCE_MODES.map((mode) => ({ value: mode, label: tid('inferenceMode', mode) }))}
            hint={tid('inferenceMode', `${sequence.inferenceMode}.hint`)}
          />
          <StepOrderList
            order={effectiveStepOrder(sequence)}
            isEnabled={(stepId) => sequence.steps[stepId] !== false}
            onToggle={(stepId, enabled) => actions.setSequenceStep(sequence.id, stepId, enabled)}
            onMove={(from, to) => update({ stepOrder: moveStep(effectiveStepOrder(sequence), from, to) })}
            phaseFor={(stepId) => {
              const phase = stepPhase(stepId);
              return phase ? tid('phase', phase.id) : undefined;
            }}
          />
          <Button variant="ghost" onClick={() => update({ stepOrder: [...STEP_IDS] })}>
            {t('sequence.restoreOrder')}
          </Button>

          <div className="stack-tight">
            <span className="field__label">{t('sequence.visibility')}</span>
            <ul className="phase-visibility">
              {PHASES.filter((phase) => phase.id !== 'wiederbegegnung').map((phase) => (
                <li key={phase.id}>
                  <span className="tag">{tid('phase', phase.id)}</span>
                  <span className="field__hint">{visibilityLabel(PHASE_VISIBILITY[phase.id], tid, t('sequence.visibility.nothing'))}</span>
                </li>
              ))}
            </ul>
            <p className="field__hint">{t('sequence.visibility.hint')}</p>
          </div>
        </Collapsible>
      </div>

      <Collapsible
        title={
          readiness.toComplete > 0
            ? t('sequence.readiness.toComplete', { count: readiness.toComplete })
            : readiness.optional > 0
              ? t('sequence.readiness.optional', { count: readiness.optional })
              : t('sequence.readiness.clear')
        }
      >
        <p className="field__hint">{t('sequence.readiness.hint')}</p>
        {readiness.findings.length === 0 ? (
          <p className="muted text-sm">{t('sequence.readiness.ok')}</p>
        ) : (
          <ul className="readiness">
            {readiness.findings.map((finding) => (
              <li key={finding.id} className={`readiness__item readiness__item--${finding.severity}`}>
                <span className="tag">{tid('readiness.severity', finding.severity)}</span>
                <p className="readiness__title">{tid('readiness', `${finding.key}.title`)}</p>
                <p className="readiness__detail">{t(`readiness.${finding.key}.detail` as TranslationKey, finding.params)}</p>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <div>
        <h3 className="pane-head__title" style={{ marginBottom: 'var(--space-2)' }}>
          {t('sequence.lexemes', { count: sequence.lexemes.length })}
        </h3>

        <p className="visually-hidden" role="status" aria-live="polite" aria-label={t('sequence.order.label')}>
          {announcement}
        </p>

        {sequence.lexemes.length === 0 ? (
          <EmptyState title={t('sequence.noLexeme')}>
            <p className="text-sm">{t('sequence.noLexeme.hint')}</p>
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
                  <span className="lexeme-row__expression">{lexeme.expression || t('sequence.lexeme.unnamed')}</span>
                  <span className="lexeme-row__meta">
                    <span>
                      {truncate(
                        lexeme.communicativeFunction || lexeme.coreMeaning || t('sequence.lexeme.noMeaning'),
                        42,
                      )}
                    </span>
                    {lexeme.semantisationMethod ? <span>{truncate(lexeme.semantisationMethod, 28)}</span> : null}
                    <span className={`tag tag--${lexeme.repertoire}`}>{tid('repertoire', lexeme.repertoire)}</span>
                    {summarizeObservations(lexeme.observations)
                      .filter((entry) => entry.result)
                      .map((entry) => (
                        <span key={entry.dimension} className={`tag dimension--${entry.result}`}>
                          {tid('dimension', entry.dimension)}
                        </span>
                      ))}
                  </span>
                </button>

                <span className="lexeme-row__actions">
                  <IconButton label={t('common.moveUp')} disabled={index === 0} onClick={() => move(index, index - 1)}>
                    ↑
                  </IconButton>
                  <IconButton
                    label={t('common.moveDown')}
                    disabled={index === sequence.lexemes.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label={t('sequence.lexeme.duplicate')}
                    onClick={() => {
                      const id = actions.duplicateLexeme(sequence.id, lexeme.id);
                      if (id) onSelectLexeme(id);
                    }}
                  >
                    ⧉
                  </IconButton>
                  <IconButton
                    label={t('sequence.lexeme.remove')}
                    onClick={() => {
                      actions.removeLexeme(sequence.id, lexeme.id);
                      toast.show(t('sequence.lexeme.removed'));
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
            label={t('sequence.quick.expression')}
            value={quickExpression}
            onChange={setQuickExpression}
            placeholder={t('sequence.quick.expression.placeholder')}
            target
            onKeyDown={(event) => {
              if (event.key === 'Enter') addQuickLexeme();
            }}
          />
          <TextField
            label={t('sequence.quick.meaning')}
            value={quickMeaning}
            onChange={setQuickMeaning}
            placeholder={t('sequence.quick.meaning.placeholder')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addQuickLexeme();
            }}
          />
          <Button variant="primary" onClick={addQuickLexeme} disabled={!quickExpression.trim()}>
            {t('common.add')}
          </Button>
        </div>

        <Collapsible title={t('sequence.table')}>
          <TableImport sequence={sequence} />
        </Collapsible>
      </div>
    </div>
  );
}
