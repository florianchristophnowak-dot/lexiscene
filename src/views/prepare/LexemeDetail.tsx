import { useId } from 'react';
import { useStore } from '../../app/storeContext';
import { SEMANTISATION_METHOD_IDS, advisorContextFromLexeme, recommendMethods } from '../../domain/advisor';
import {
  CHECK_TEMPLATES,
  buildCheckPrompt,
  buildSecondaryPrompt,
  checkTemplate,
  counterpartCheck,
  coversBothDirections,
  recommendedChecks,
  suggestRetrievalProgression,
} from '../../domain/checks';
import {
  CONNOTATIONS,
  IMAGEABILITIES,
  INFERENCE_SUITABILITIES,
  LEARNING_GOALS,
  LEXICAL_TYPES,
  REPERTOIRES,
  TRANSFER_RISKS,
  WORD_CLASSES,
  type Lexeme,
  type Sequence,
} from '../../domain/model';
import { summarizeObservations } from '../../domain/observations';
import { effectiveStepOrder, isStepEnabled, moveStep, stepHasContent, stepPhase } from '../../domain/steps';
import { firstFilled, formatDate, formatDateTime } from '../../domain/text';
import { usePhrase, useT, useTid } from '../../i18n/context';
import { Button, IconButton } from '../../ui/Button';
import { CheckboxRow, SelectField, TextArea, TextField } from '../../ui/Field';
import { Collapsible } from '../../ui/Feedback';
import { wordCue } from '../../domain/stage';
import { CcqPanel } from './CcqPanel';
import { ElicitingPanel } from './ElicitingPanel';
import { ProfilePanel } from './ProfilePanel';
import { CorpusPanel } from './CorpusPanel';
import { MediaSlot } from './MediaSlot';
import { StepOrderList } from './StepOrderList';

interface Props {
  sequence: Sequence;
  lexeme: Lexeme;
  onClose?: () => void;
}

/** Erste nicht leere Zeile der Kollokationen – als Vorschlag für den Chunk. */
function firstCollocation(collocations: string): string {
  return firstFilled(...collocations.split(/\r?\n/).map((line) => line.trim()));
}

export function LexemeDetail({ sequence, lexeme, onClose }: Props) {
  const { actions } = useStore();
  const t = useT();
  const tid = useTid();
  const phrase = usePhrase(sequence.targetLanguage);
  const methodListId = useId();
  const set = (patch: Partial<Lexeme>) => actions.updateLexeme(sequence.id, lexeme.id, patch);

  const recommendations = recommendMethods(advisorContextFromLexeme(lexeme, sequence));
  const recommended = recommendedChecks(lexeme.lexicalType);
  const progression = suggestRetrievalProgression(lexeme);
  const selectedCheck = checkTemplate(lexeme.checkTemplateId);
  const counterpart = counterpartCheck(lexeme);
  const secondaryTemplate = checkTemplate(lexeme.checkTemplateIdSecondary);
  const checkPreview = buildCheckPrompt(lexeme, phrase);
  const secondaryPreview = buildSecondaryPrompt(lexeme, phrase);
  const bothDirections = coversBothDirections(lexeme);
  const history = [...lexeme.observations].sort((a, b) => b.at - a.at);
  const summary = summarizeObservations(lexeme.observations);

  const stepOrder = effectiveStepOrder(sequence, lexeme);
  const hasOwnOrder = Boolean(lexeme.stepOrderOverride);
  const anchorMissing = lexeme.learningGoal === 'productive' && lexeme.repertoire === 'kern' && !lexeme.sentenceFrame.trim();

  return (
    <div className="stack">
      <div className="pane-head">
        <h2 className="pane-head__title">{t('detail.title')}</h2>
        <div className="row">
          {onClose ? (
            <IconButton label={t('detail.close')} onClick={onClose}>
              ✕
            </IconButton>
          ) : null}
        </div>
      </div>

      <p className="detail-expression">{lexeme.expression || t('sequence.lexeme.unnamed')}</p>

      <section className="core-panel">
        <p className="core-panel__title">{t('detail.core')}</p>
        <p className="field__hint">{t('detail.core.hint')}</p>

        <div className="stack-tight">
          <TextField
            label={t('detail.field.expression')}
            value={lexeme.expression}
            onChange={(expression) => set({ expression })}
            target
          />
          <TextField
            label={t('detail.field.coreMeaning')}
            value={lexeme.coreMeaning}
            onChange={(coreMeaning) => set({ coreMeaning })}
            hint={t('detail.field.coreMeaning.hint')}
          />
          <TextArea
            label={t('detail.field.targetExplanation')}
            value={lexeme.targetExplanation}
            onChange={(targetExplanation) => set({ targetExplanation })}
            rows={2}
            target
            hint={t('detail.field.targetExplanation.hint')}
          />
          <TextField
            label={t('detail.field.function')}
            value={lexeme.communicativeFunction}
            onChange={(communicativeFunction) => set({ communicativeFunction })}
            placeholder={t('detail.field.function.placeholder')}
          />
          <TextArea
            label={t('detail.field.utterance')}
            value={lexeme.modelUtterance}
            onChange={(modelUtterance) => set({ modelUtterance })}
            rows={2}
            target
            hint={t('detail.field.utterance.hint')}
          />
          <TextField
            label={t('detail.field.anchor')}
            value={lexeme.sentenceFrame}
            onChange={(sentenceFrame) => set({ sentenceFrame })}
            target
            placeholder={t('detail.field.anchor.placeholder')}
            hint={anchorMissing ? t('detail.field.anchor.missing') : t('detail.field.anchor.hint')}
          />
          <SelectField
            label={t('detail.field.type')}
            value={lexeme.lexicalType}
            onChange={(value) => set({ lexicalType: value as Lexeme['lexicalType'] })}
            options={LEXICAL_TYPES.map((type) => ({ value: type, label: tid('lexicalType', type) }))}
          />
          <SelectField
            label={t('detail.field.goal')}
            value={lexeme.learningGoal}
            onChange={(value) => set({ learningGoal: value as Lexeme['learningGoal'] })}
            options={LEARNING_GOALS.map((goal) => ({ value: goal, label: tid('learningGoal', goal) }))}
            hint={tid('learningGoal', `${lexeme.learningGoal}.hint`)}
          />
        </div>
      </section>

      <SelectField
        label={t('detail.field.repertoire')}
        value={lexeme.repertoire}
        onChange={(value) => set({ repertoire: value as Lexeme['repertoire'] })}
        options={REPERTOIRES.map((entry) => ({ value: entry, label: tid('repertoire', entry) }))}
        hint={tid('repertoire', `${lexeme.repertoire}.hint`)}
      />

      <div className="field">
        <label className="field__label" htmlFor={`${methodListId}-input`}>
          {t('detail.field.method')}
        </label>
        <input
          id={`${methodListId}-input`}
          className="input"
          list={methodListId}
          value={lexeme.semantisationMethod}
          placeholder={t('detail.field.method.placeholder')}
          onChange={(event) => set({ semantisationMethod: event.target.value })}
        />
        <datalist id={methodListId}>
          {SEMANTISATION_METHOD_IDS.map((id) => (
            <option key={id} value={tid('advisor', `${id}.method`)} />
          ))}
        </datalist>
      </div>

      <div className="advisor">
        <p className="advisor__title">{t('detail.advisor')}</p>
        {recommendations.map((recommendation) => (
          <div className="advisor__item" key={recommendation.id}>
            <button
              type="button"
              className="advisor__method"
              onClick={() => set({ semantisationMethod: tid('advisor', `${recommendation.id}.method`) })}
            >
              {tid('advisor', `${recommendation.id}.method`)}
            </button>
            <span className={`evidence evidence--${recommendation.evidence}`}>
              {tid('evidence', recommendation.evidence)}
            </span>
            <span className="advisor__rationale">{tid('advisor', `${recommendation.id}.rationale`)}</span>
            <span className="advisor__rationale">
              <strong>{t('detail.advisor.confirm')}</strong> {tid('advisor', `${recommendation.id}.confirmation`)}
            </span>
            <span className="advisor__rationale">
              <strong>{t('detail.advisor.risk')}</strong> {tid('advisor', `${recommendation.id}.risk`)}
            </span>
          </div>
        ))}
        <p className="advisor__rationale" style={{ marginTop: 'var(--space-2)' }}>
          {t('detail.advisor.note')}
        </p>
      </div>

      <Collapsible title={t('detail.contributions')} defaultOpen={lexeme.classContributions.length > 0}>
        <p className="field__hint">{t('detail.contributions.hint')}</p>
        {lexeme.classContributions.length === 0 ? (
          <p className="field__hint">{t('detail.contributions.empty')}</p>
        ) : (
          <ul className="stack-tight">
            {lexeme.classContributions.map((entry, index) => (
              <li className="row" key={`${entry}-${index}`}>
                <TextField
                  label={t('teach.contribution.field')}
                  value={entry}
                  onChange={(value) =>
                    set({
                      classContributions: lexeme.classContributions.map((item, position) =>
                        position === index ? value : item,
                      ),
                    })
                  }
                  target
                />
                <IconButton
                  label={t('detail.contributions.remove', { index: index + 1 })}
                  onClick={() =>
                    set({ classContributions: lexeme.classContributions.filter((_, position) => position !== index) })
                  }
                >
                  ✕
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">{t('detail.observations')}</span>
        </div>
        <div className="panel__body">
          <ul className="dimension-grid">
            {summary.map((entry) => (
              <li key={entry.dimension} className={`dimension dimension--${entry.result ?? 'none'}`}>
                <span className="dimension__label">{tid('dimension', entry.dimension)}</span>
                <span className="dimension__value">
                  {entry.result ? tid('result', entry.result) : t('observation.none')}
                </span>
                {entry.at ? <span className="dimension__meta">{formatDate(entry.at)}</span> : null}
              </li>
            ))}
          </ul>
          <p className="field__hint">{t('detail.observations.hint')}</p>

          {history.length > 0 ? (
            <details className="collapsible">
              <summary>{t('detail.observations.log', { count: history.length })}</summary>
              <ul className="observation-log">
                {history.map((entry) => (
                  <li className="observation-log__item" key={entry.id}>
                    <span className="observation-log__when">{formatDateTime(entry.at)}</span>
                    <span>
                      {entry.dimension && entry.result
                        ? `${tid('dimension', entry.dimension)}: ${tid('result', entry.result)}`
                        : t('observation.event')}
                      <span className="field__hint" style={{ display: 'block' }}>
                        {tid('observation.source', entry.source)}
                        {entry.round ? ` · ${t('reactivate.round', { round: entry.round })}` : ''}
                        {entry.impulseKind ? ` · ${tid('impulse', entry.impulseKind)}` : ''}
                      </span>
                    </span>
                    <IconButton
                      label={t('detail.observations.remove')}
                      onClick={() => actions.removeObservation(sequence.id, lexeme.id, entry.id)}
                    >
                      ✕
                    </IconButton>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>

      <TextArea
        label={t('detail.field.selectionReason')}
        value={lexeme.selectionReason}
        onChange={(selectionReason) => set({ selectionReason })}
        hint={t('detail.field.selectionReason.hint')}
        rows={2}
      />

      <Collapsible title={t('profile.title')} defaultOpen>
        <ProfilePanel lexeme={lexeme} />
      </Collapsible>

      <Collapsible title={t('eliciting.title')} defaultOpen>
        <ElicitingPanel sequence={sequence} lexeme={lexeme} />
      </Collapsible>

      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="image" label={t('detail.media.image')} />
      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="audio" label={t('detail.media.audio')} />
      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="video" label={t('detail.media.video')} />

      <Collapsible title={t('detail.advisorProfile')}>
        <SelectField
          label={t('detail.field.imageability')}
          value={lexeme.imageability}
          onChange={(value) => set({ imageability: value as Lexeme['imageability'] })}
          options={IMAGEABILITIES.map((entry) => ({ value: entry, label: tid('imageability', entry) }))}
          hint={tid('imageability', `${lexeme.imageability}.hint`)}
        />
        <SelectField
          label={t('detail.field.inferenceSuitability')}
          value={lexeme.inferenceSuitability}
          onChange={(value) => set({ inferenceSuitability: value as Lexeme['inferenceSuitability'] })}
          options={INFERENCE_SUITABILITIES.map((entry) => ({ value: entry, label: tid('inferenceSuitability', entry) }))}
          hint={tid('inferenceSuitability', `${lexeme.inferenceSuitability}.hint`)}
        />
        <SelectField
          label={t('detail.field.transferRisk')}
          value={lexeme.transferRisk}
          onChange={(value) => set({ transferRisk: value as Lexeme['transferRisk'] })}
          options={TRANSFER_RISKS.map((entry) => ({ value: entry, label: tid('transferRisk', entry) }))}
          hint={tid('transferRisk', `${lexeme.transferRisk}.hint`)}
        />
        <TextField
          label={t('detail.field.confusionGroup')}
          value={lexeme.confusionGroup}
          onChange={(confusionGroup) => set({ confusionGroup })}
          placeholder={t('detail.field.confusionGroup.placeholder')}
          hint={t('detail.field.confusionGroup.hint')}
        />
      </Collapsible>

      <Collapsible title={t('detail.pronunciation')}>
        <TextField
          label={t('detail.field.pronunciation')}
          value={lexeme.pronunciationHint}
          onChange={(pronunciationHint) => set({ pronunciationHint })}
        />
        <TextField
          label={t('detail.field.prosody')}
          value={lexeme.prosodyNote}
          onChange={(prosodyNote) => set({ prosodyNote })}
        />
        <TextField label={t('detail.field.ipa')} value={lexeme.ipa} onChange={(ipa) => set({ ipa })} target />
        <TextField
          label={t('detail.field.morphology')}
          value={lexeme.morphology}
          onChange={(morphology) => set({ morphology })}
        />
        <SelectField
          label={t('detail.field.wordClass')}
          value={lexeme.wordClass}
          onChange={(value) => set({ wordClass: value as Lexeme['wordClass'] })}
          options={WORD_CLASSES.map((entry) => ({ value: entry, label: tid('wordClass', entry) }))}
        />
        <TextField
          label={t('detail.field.wordCue')}
          value={lexeme.wordCue}
          onChange={(wordCue) => set({ wordCue })}
          target
          placeholder={wordCue(lexeme)}
          hint={t('detail.field.wordCue.hint')}
        />
        <p className="field__hint">{t('detail.pronunciation.hint')}</p>
      </Collapsible>

      <Collapsible title={t('detail.pattern')}>
        <TextField label={t('detail.field.valency')} value={lexeme.valency} onChange={(valency) => set({ valency })} />
        <TextArea
          label={t('detail.field.collocations')}
          value={lexeme.collocations}
          onChange={(collocations) => set({ collocations })}
          rows={2}
        />
        <TextField
          label={t('detail.field.keyCollocation')}
          value={lexeme.keyCollocation}
          onChange={(keyCollocation) => set({ keyCollocation })}
          target
          hint={t('detail.field.keyCollocation.hint')}
        />
        {!lexeme.keyCollocation.trim() && firstCollocation(lexeme.collocations) ? (
          <Button onClick={() => set({ keyCollocation: firstCollocation(lexeme.collocations) })}>
            {t('detail.field.keyCollocation.fromCollocations')}
          </Button>
        ) : null}
        <SelectField
          label={t('detail.field.connotation')}
          value={lexeme.connotation}
          onChange={(value) => set({ connotation: value as Lexeme['connotation'] })}
          options={CONNOTATIONS.map((entry) => ({ value: entry, label: tid('connotation', entry) }))}
        />
        <TextField
          label={t('detail.field.wordFamily')}
          value={lexeme.wordFamily}
          onChange={(wordFamily) => set({ wordFamily })}
        />
        <TextField label={t('detail.field.register')} value={lexeme.register} onChange={(register) => set({ register })} />
        <TextArea
          label={t('detail.field.culturalNote')}
          value={lexeme.culturalNote}
          onChange={(culturalNote) => set({ culturalNote })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title={t('corpus.panel.title')}>
        <CorpusPanel sequence={sequence} lexeme={lexeme} />
      </Collapsible>

      <Collapsible title={t('detail.meaning')} defaultOpen>
        <CcqPanel sequence={sequence} lexeme={lexeme} />

        <TextArea
          label={t('detail.field.example')}
          value={lexeme.example}
          onChange={(example) => set({ example })}
          rows={2}
          target
        />
        <TextArea
          label={t('detail.field.nonExample')}
          value={lexeme.nonExample}
          onChange={(nonExample) => set({ nonExample })}
          rows={2}
        />
        <TextArea
          label={t('detail.field.contrastExample')}
          value={lexeme.contrastExample}
          onChange={(contrastExample) => set({ contrastExample })}
          rows={2}
        />
        <TextField
          label={t('detail.field.confusionRisk')}
          value={lexeme.confusionRisk}
          onChange={(confusionRisk) => set({ confusionRisk })}
        />

        <SelectField
          label={t('detail.field.check')}
          value={lexeme.checkTemplateId}
          onChange={(checkTemplateId) => set({ checkTemplateId })}
          options={[
            { value: '', label: t('common.none') },
            ...CHECK_TEMPLATES.map((template) => ({
              value: template.id,
              label: recommended.some((entry) => entry.id === template.id)
                ? t('detail.field.check.recommended', { label: tid('check', template.id) })
                : tid('check', template.id),
            })),
          ]}
          hint={selectedCheck ? tid('check', `${selectedCheck.id}.purpose`) : undefined}
        />
        {selectedCheck ? (
          <p className="tag-row">
            <span className="tag">{tid('check.target', selectedCheck.target)}</span>
            <span className="tag">{tid('check.direction', selectedCheck.direction)}</span>
            <span className="tag">{tid('check.demand', selectedCheck.demand)}</span>
          </p>
        ) : null}

        <div className="stack-tight">
          <span className="field__label">{t('detail.progression')}</span>
          <p className="field__hint">{t('detail.progression.hint')}</p>
          <ol className="progression">
            {progression.map((template) => (
              <li key={template.id} className={template.id === lexeme.checkTemplateId ? 'progression__item progression__item--active' : 'progression__item'}>
                <button type="button" className="progression__button" onClick={() => set({ checkTemplateId: template.id })}>
                  {tid('check', template.id)}
                </button>
                <span className="field__hint">
                  {tid('check.demand', template.demand)} · {tid('check.direction', template.direction)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <TextArea
          label={t('detail.field.checkPrompt')}
          value={lexeme.checkPrompt}
          onChange={(checkPrompt) => set({ checkPrompt })}
          rows={2}
          hint={t('detail.field.checkPrompt.hint')}
        />
        {checkPreview ? <p className="notice">{t('detail.check.preview', { prompt: checkPreview })}</p> : null}

        <SelectField
          label={t('detail.field.secondary')}
          value={lexeme.checkTemplateIdSecondary}
          onChange={(checkTemplateIdSecondary) => set({ checkTemplateIdSecondary })}
          options={[
            {
              value: '',
              label: counterpart
                ? t('detail.field.secondary.app', { label: tid('check', counterpart.id) })
                : t('common.none'),
            },
            ...CHECK_TEMPLATES.map((template) => ({
              value: template.id,
              label: `${tid('check', template.id)} – ${tid('check.direction', template.direction)}`,
            })),
          ]}
          hint={
            lexeme.learningGoal === 'productive' && !bothDirections
              ? t('detail.field.secondary.hint')
              : secondaryTemplate
                ? tid('check', `${secondaryTemplate.id}.purpose`)
                : undefined
          }
        />
        {secondaryPreview ? (
          <p className="notice">
            {t('detail.secondary.preview', { prompt: secondaryPreview })}
            {secondaryTemplate ? null : t('detail.secondary.appHint')}
          </p>
        ) : null}

      </Collapsible>

      <Collapsible title={t('detail.differentiation')}>
        <TextArea
          label={t('detail.field.extraHint')}
          value={lexeme.extraHint}
          onChange={(extraHint) => set({ extraHint })}
          rows={2}
        />
        <TextArea
          label={t('detail.field.simplified')}
          value={lexeme.simplifiedExplanation}
          onChange={(simplifiedExplanation) => set({ simplifiedExplanation })}
          rows={2}
          hint={t('detail.field.simplified.hint')}
        />
        <TextField
          label={t('detail.field.translation')}
          value={lexeme.translation}
          onChange={(translation) => set({ translation })}
          hint={t('detail.field.translation.hint')}
        />
        <TextField
          label={t('detail.field.comparison')}
          value={lexeme.multilingualComparison}
          onChange={(multilingualComparison) => set({ multilingualComparison })}
        />
        <TextArea
          label={t('detail.field.extension')}
          value={lexeme.extensionTask}
          onChange={(extensionTask) => set({ extensionTask })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title={t('detail.lesson')}>
        <TextArea
          label={t('detail.field.situation')}
          value={lexeme.situation}
          onChange={(situation) => set({ situation })}
          rows={2}
          hint={t('detail.field.situation.hint')}
        />
        <TextArea
          label={t('detail.field.task')}
          value={lexeme.communicativeTask}
          onChange={(communicativeTask) => set({ communicativeTask })}
          rows={2}
          hint={t('detail.field.task.hint')}
        />
        <TextArea
          label={t('detail.field.targetPrompt')}
          value={lexeme.targetPrompt}
          onChange={(targetPrompt) => set({ targetPrompt })}
          rows={2}
          target
          hint={t('detail.field.targetPrompt.hint')}
        />
        <TextArea
          label={t('detail.field.teacherNote')}
          value={lexeme.teacherNote}
          onChange={(teacherNote) => set({ teacherNote })}
          rows={2}
          hint={t('detail.field.teacherNote.hint')}
        />
        <CheckboxRow
          label={t('detail.skip')}
          checked={lexeme.skipped}
          onChange={(skipped) => set({ skipped })}
        />

        <div className="stack-tight">
          <span className="field__label">{t('detail.steps')}</span>
          <p className="field__hint">{hasOwnOrder ? t('detail.steps.own') : t('detail.steps.sequence')}</p>
          <StepOrderList
            order={stepOrder}
            isEnabled={(stepId) => isStepEnabled(sequence, lexeme, stepId)}
            onToggle={(stepId, checked) => set({ stepOverrides: { ...lexeme.stepOverrides, [stepId]: checked } })}
            onMove={hasOwnOrder ? (from, to) => set({ stepOrderOverride: moveStep(stepOrder, from, to) }) : undefined}
            lockedHint={t('detail.steps.locked')}
            hintFor={(stepId) =>
              stepHasContent(stepId, lexeme, sequence)
                ? undefined
                : stepId === 'vermuten'
                  ? t('steps.noInference')
                  : t('steps.noMaterial')
            }
            phaseFor={(stepId) => {
              const phase = stepPhase(stepId);
              return phase ? tid('phase', phase.id) : undefined;
            }}
          />
          <div className="row">
            {hasOwnOrder ? (
              <Button variant="ghost" onClick={() => set({ stepOrderOverride: null })}>
                {t('detail.steps.useSequence')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => set({ stepOrderOverride: stepOrder })}>
                {t('detail.steps.useOwn')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => set({ stepOverrides: {} })}>
              {t('detail.steps.reset')}
            </Button>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
