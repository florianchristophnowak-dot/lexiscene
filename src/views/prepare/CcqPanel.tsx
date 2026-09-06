import { useState } from 'react';
import { useStore } from '../../app/storeContext';
import {
  CCQ_STEMS,
  CCQ_TEMPLATES,
  ccqTemplate,
  ccqTemplateFits,
  ccqWarnings,
  createConceptCheck,
  moveCcq,
  recommendedCcqTemplates,
  resolveCcqQuestion,
} from '../../domain/ccq';
import { buildCcqView } from '../../domain/stage';
import { buildCheckPrompt } from '../../domain/checks';
import {
  CCQ_FEATURES,
  CCQ_FORMATS,
  CCQ_TARGETS,
  type CcqFeature,
  type CcqFormat,
  type CcqTarget,
  type ConceptCheck,
  type Lexeme,
  type Sequence,
} from '../../domain/model';
import type { TranslationKey } from '../../i18n';
import { usePhrase, useT, useTid } from '../../i18n/context';
import { Button, IconButton } from '../../ui/Button';
import { Modal } from '../../ui/Dialog';
import { SelectField, TextArea, TextField } from '../../ui/Field';
import { CcqStage } from '../teach/CcqStage';

/** Vorschau der Fragen – dieselbe Bühne wie im Unterricht. */
function CcqPreview({ lexeme, sequence, onClose }: { lexeme: Lexeme; sequence: Sequence; onClose: () => void }) {
  const t = useT();
  const phrase = usePhrase(sequence.targetLanguage);
  const [index, setIndex] = useState(0);
  const checks = lexeme.ccqs.filter((check) => check.question.trim() || ccqTemplate(check.templateId));
  const current = checks[Math.min(index, Math.max(checks.length - 1, 0))];

  return (
    <Modal
      title={t('ccq.previewTitle')}
      onClose={onClose}
      actions={<Button onClick={onClose}>{t('common.close')}</Button>}
    >
      <div className="stack-tight">
        {checks.length > 1 ? (
          <div className="row">
            <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>
              {t('ccq.prev')}
            </Button>
            <Button disabled={index >= checks.length - 1} onClick={() => setIndex(index + 1)}>
              {t('ccq.nextQuestion')}
            </Button>
          </div>
        ) : null}
        <div className="corpus-preview">
          {current ? (
            <CcqStage
              view={buildCcqView({ check: current, lexeme, audience: 'class', showAnswer: false, phrase })}
              index={Math.min(index, checks.length - 1)}
              total={checks.length}
              teacherView={false}
            />
          ) : null}
        </div>
        <p className="field__hint">{t('ccq.previewNote')}</p>
      </div>
    </Modal>
  );
}

interface Props {
  sequence: Sequence;
  lexeme: Lexeme;
}

/**
 * Vorbereitung der Bedeutungsprüfung.
 *
 * Vorlagen und Fragestämme sind Gerüste: Sie setzen eine Frage in die Zeile,
 * die die Lehrkraft prüft und ergänzt. Automatisch entsteht keine inhaltliche
 * Behauptung über die Einheit.
 */
export function CcqPanel({ sequence, lexeme }: Props) {
  const { actions } = useStore();
  const t = useT();
  const tid = useTid();
  const phrase = usePhrase(sequence.targetLanguage);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const checks = lexeme.ccqs;
  const warnings = ccqWarnings(checks);
  const recommended = recommendedCcqTemplates(lexeme);
  const retrievalPrompt = buildCheckPrompt(lexeme, phrase);

  const setChecks = (next: ConceptCheck[]) => actions.updateLexeme(sequence.id, lexeme.id, { ccqs: next });

  const updateCheck = (id: string, patch: Partial<ConceptCheck>) =>
    setChecks(checks.map((check) => (check.id === id ? { ...check, ...patch } : check)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= checks.length) return;
    setChecks(moveCcq(checks, from, to));
    setAnnouncement(t('ccq.moved', { from: from + 1, to: to + 1, total: checks.length }));
  };

  const addFromTemplate = (templateId: string) => {
    const template = ccqTemplate(templateId);
    if (!template) return;
    setChecks([
      ...checks,
      createConceptCheck({
        templateId,
        feature: template.feature,
        format: template.format,
        target: template.target,
        language: sequence.targetLanguage,
      }),
    ]);
  };

  const addFromStem = (stemId: string) => {
    const stem = CCQ_STEMS.find((entry) => entry.id === stemId);
    if (!stem) return;
    setChecks([
      ...checks,
      createConceptCheck({
        // Der Stamm wird als bearbeitbarer Text eingesetzt, nicht als Behauptung.
        question: phrase(`ccq.stem.${stem.id}`),
        feature: stem.feature,
        format: stem.format,
        target: stem.target,
        language: sequence.targetLanguage,
      }),
    ]);
  };

  return (
    <>
      <div className="stack-tight">
        <span className="field__label">{t('ccq.panel.title')}</span>
        <p className="field__hint">{t('ccq.panel.hint')}</p>
      </div>

      {warnings.length > 0 ? (
        <ul className="corpus-warnings">
          {warnings.map((warning) => (
            <li className="notice" key={warning.id}>
              {t(warning.key as TranslationKey)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="stack-tight">
        <span className="field__label">{t('ccq.count', { count: checks.length })}</span>
        <p className="visually-hidden" role="status" aria-live="polite" aria-label={t('ccq.order')}>
          {announcement}
        </p>

        {checks.length === 0 ? <p className="field__hint">{t('ccq.empty')}</p> : null}

        <ol className="corpus-edit">
          {checks.map((check, index) => {
            const template = ccqTemplate(check.templateId);
            const scaffold = template ? resolveCcqQuestion({ ...check, question: '' }, lexeme, phrase) : '';

            return (
              <li
                key={check.id}
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
                onDragLeave={() => setDropIndex((entry) => (entry === index ? null : entry))}
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
                    label={t('ccq.field.question', { index: index + 1 })}
                    value={check.question}
                    onChange={(question) => updateCheck(check.id, { question })}
                    rows={3}
                    target
                    placeholder={t('ccq.field.question.placeholder')}
                    hint={scaffold ? t('ccq.field.question.template', { scaffold }) : undefined}
                  />
                  <TextField
                    label={t('ccq.field.expected', { index: index + 1 })}
                    value={check.expectedAnswer}
                    onChange={(expectedAnswer) => updateCheck(check.id, { expectedAnswer })}
                    target
                    placeholder={t('ccq.field.expected.placeholder')}
                  />
                  <TextArea
                    label={t('ccq.field.options', { index: index + 1 })}
                    value={check.options.join('\n')}
                    onChange={(value) =>
                      updateCheck(check.id, {
                        options: value
                          .split(/\r?\n/)
                          .map((option) => option.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={2}
                    target
                    hint={t('ccq.field.options.hint')}
                  />
                  <SelectField
                    label={t('ccq.field.feature', { index: index + 1 })}
                    value={check.feature}
                    onChange={(feature) => updateCheck(check.id, { feature: feature as CcqFeature })}
                    options={CCQ_FEATURES.map((feature) => ({ value: feature, label: tid('ccq.feature', feature) }))}
                  />
                  <SelectField
                    label={t('ccq.field.format', { index: index + 1 })}
                    value={check.format}
                    onChange={(format) => updateCheck(check.id, { format: format as CcqFormat })}
                    options={CCQ_FORMATS.map((format) => ({ value: format, label: tid('ccq.format', format) }))}
                  />
                  <SelectField
                    label={t('ccq.field.target', { index: index + 1 })}
                    value={check.target}
                    onChange={(target) => updateCheck(check.id, { target: target as CcqTarget })}
                    options={CCQ_TARGETS.map((target) => ({ value: target, label: tid('ccq.target', target) }))}
                  />
                  <TextField
                    label={t('ccq.field.misconception', { index: index + 1 })}
                    value={check.misconception}
                    onChange={(misconception) => updateCheck(check.id, { misconception })}
                    hint={t('ccq.field.misconception.hint')}
                  />
                  <TextField
                    label={t('ccq.field.alternative', { index: index + 1 })}
                    value={check.alternativeClarification}
                    onChange={(alternativeClarification) => updateCheck(check.id, { alternativeClarification })}
                    hint={t('ccq.field.alternative.hint')}
                  />
                </div>

                <span className="corpus-edit__actions">
                  <IconButton
                    label={t('ccq.up', { index: index + 1 })}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label={t('ccq.down', { index: index + 1 })}
                    disabled={index === checks.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    label={t('ccq.duplicate', { index: index + 1 })}
                    onClick={() => {
                      const copy = createConceptCheck({
                        templateId: check.templateId,
                        question: check.question,
                        expectedAnswer: check.expectedAnswer,
                        options: [...check.options],
                        feature: check.feature,
                        format: check.format,
                        misconception: check.misconception,
                        alternativeClarification: check.alternativeClarification,
                        language: check.language,
                        target: check.target,
                      });
                      const next = [...checks];
                      next.splice(index + 1, 0, copy);
                      setChecks(next);
                    }}
                  >
                    ⧉
                  </IconButton>
                  <IconButton
                    label={t('ccq.remove', { index: index + 1 })}
                    onClick={() => setChecks(checks.filter((entry) => entry.id !== check.id))}
                  >
                    ✕
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="row">
          <Button onClick={() => setChecks([...checks, createConceptCheck({ language: sequence.targetLanguage })])}>
            {t('ccq.add')}
          </Button>
          <Button variant="ghost" disabled={checks.length === 0} onClick={() => setPreviewOpen(true)}>
            {t('common.preview')}
          </Button>
        </div>

        <SelectField
          label={t('ccq.addTemplate')}
          value=""
          onChange={addFromTemplate}
          options={[
            { value: '', label: t('common.none') },
            ...CCQ_TEMPLATES.filter((template) => ccqTemplateFits(template, lexeme)).map((template) => ({
              value: template.id,
              label: recommended.some((entry) => entry.id === template.id)
                ? `${tid('ccq.template', template.id)} ★`
                : tid('ccq.template', template.id),
            })),
          ]}
          hint={t('ccq.addTemplate.hint')}
        />

        <SelectField
          label={t('ccq.addStem')}
          value=""
          onChange={addFromStem}
          options={[
            { value: '', label: t('common.none') },
            ...CCQ_STEMS.map((stem) => ({ value: stem.id, label: tid('ccq.stem', stem.id) })),
          ]}
        />

        {retrievalPrompt ? (
          <div className="stack-tight">
            <Button
              variant="ghost"
              onClick={() =>
                setChecks([
                  ...checks,
                  createConceptCheck({ question: retrievalPrompt, language: sequence.targetLanguage }),
                ])
              }
            >
              {t('ccq.adopt')}
            </Button>
            <p className="field__hint">{t('ccq.adopt.hint')}</p>
          </div>
        ) : null}
      </div>

      {previewOpen ? <CcqPreview lexeme={lexeme} sequence={sequence} onClose={() => setPreviewOpen(false)} /> : null}
    </>
  );
}
