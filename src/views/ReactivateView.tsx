import { useMemo, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import type { Sequence } from '../domain/model';
import { DAY_MS, OFFSET_PRESETS, buildImpulses, isSequenceDue as isDue, nextDueAt, unsureCount } from '../domain/reactivation';
import { formatDate, formatRelativeDays } from '../domain/text';
import { summarizeObservations } from '../domain/observations';
import { usePhrase, useT, useTid } from '../i18n/context';
import { Button } from '../ui/Button';
import { CheckboxRow, SelectField, TextField } from '../ui/Field';
import { EmptyState, Notice } from '../ui/Feedback';
import { useNow } from '../ui/hooks';
import { useToast } from '../ui/toastContext';

function parseOffsets(value: string): number[] {
  return value
    .split(/[,;\s]+/)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .slice(0, 8);
}

function PlanPanel({ sequence }: { sequence: Sequence }) {
  const { actions } = useStore();
  const toast = useToast();
  const now = useNow();
  const [offsetsText, setOffsetsText] = useState(sequence.reactivation.offsetsDays.join(', '));
  const plan = sequence.reactivation;
  const due = nextDueAt(sequence);

  const t = useT();
  const tid = useTid();
  const updatePlan = (patch: Partial<Sequence['reactivation']>) =>
    actions.updateSequence(sequence.id, { reactivation: { ...plan, ...patch } });

  return (
    <section className="panel">
      <div className="panel__header">
        <span className="panel__title">{t('reactivate.planning')}</span>
      </div>
      <div className="panel__body stack">
        <CheckboxRow
          label={t('reactivate.plan.enable')}
          hint={t('reactivate.plan.enable.hint')}
          checked={plan.enabled}
          onChange={(enabled) =>
            updatePlan({ enabled, anchor: enabled && plan.anchor === null ? Date.now() : plan.anchor })
          }
        />

        {plan.enabled ? (
          <>
            <div className="offsets">
              {OFFSET_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  onClick={() => {
                    updatePlan({ offsetsDays: preset.offsets, completedRounds: 0 });
                    setOffsetsText(preset.offsets.join(', '));
                    toast.show(tid('reactivate.preset', `${preset.id}.hint`));
                  }}
                >
                  {tid('reactivate.preset', preset.id)}
                </Button>
              ))}
            </div>

            <TextField
              label={t('reactivate.plan.offsets')}
              value={offsetsText}
              onChange={setOffsetsText}
              hint={t('reactivate.plan.offsets.hint')}
            />
            <div className="row">
              <Button
                onClick={() => {
                  const offsets = parseOffsets(offsetsText);
                  if (offsets.length === 0) {
                    toast.show(t('reactivate.offsetsRequired'), 'error');
                    return;
                  }
                  updatePlan({ offsetsDays: offsets });
                  toast.show(t('reactivate.offsetsSaved'));
                }}
              >
                {t('reactivate.plan.apply')}
              </Button>
              <Button onClick={() => updatePlan({ anchor: Date.now(), completedRounds: 0 })}>
                {t('reactivate.fromToday')}
              </Button>
            </div>

            <p className="muted text-sm">
              {plan.anchor
                ? t('reactivate.plan.anchor', {
                    date: formatDate(plan.anchor),
                    round: plan.completedRounds + 1,
                    total: plan.offsetsDays.length,
                  })
                : t('reactivate.noAnchor')}
              {due
                ? t('reactivate.plan.next', { relative: formatRelativeDays(due, now), date: formatDate(due) })
                : t('reactivate.plan.allDone')}
            </p>

            <CheckboxRow
              label={t('reactivate.plan.prioritise')}
              hint={t('reactivate.plan.prioritise.hint')}
              checked={plan.prioritiseUnsure}
              onChange={(prioritiseUnsure) => updatePlan({ prioritiseUnsure })}
            />

            {due !== null ? (
              <div className="row">
                <Button onClick={() => updatePlan({ anchor: Date.now() - DAY_MS * plan.offsetsDays[plan.completedRounds] })}>
                  {t('reactivate.plan.due')}
                </Button>
              </div>
            ) : null}

            <p className="muted text-sm">{t('reactivate.plan.roundNote')}</p>

            {plan.history.length > 0 ? (
              <div className="stack-tight">
                <span className="field__label">{t('reactivate.history')}</span>
                <ul className="stack-tight">
                  {[...plan.history].reverse().map((round) => (
                    <li key={round.round} className="muted text-sm">
                      {t('reactivate.plan.historyEntry', {
                        round: round.round,
                        date: formatDate(round.completedAt),
                        secure: round.secure,
                        supported: round.supported,
                        notYet: round.notYet,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function ImpulseList({ sequence }: { sequence: Sequence }) {
  const t = useT();
  const tid = useTid();
  const phrase = usePhrase(sequence.targetLanguage);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const impulses = useMemo(() => buildImpulses(sequence, phrase), [phrase, sequence]);

  if (impulses.length === 0) {
    return (
      <EmptyState title={t('reactivate.noImpulses')}>
        <p className="text-sm">{t('reactivate.noLexemes')}</p>
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 className="pane-head__title">{t('reactivate.impulses', { count: impulses.length })}</h2>
        <Button variant="primary" onClick={() => navigate({ name: 'reactivateTeach', sequenceId: sequence.id })}>
          {t('reactivate.showInClass')}
        </Button>
      </div>
      {sequence.reactivation.prioritiseUnsure && unsureCount(sequence) > 0 ? (
        <p className="field__hint">{t('reactivate.unsureFirst', { count: unsureCount(sequence) })}</p>
      ) : null}
      {impulses.map((impulse) => {
        const lexeme = sequence.lexemes.find((entry) => entry.id === impulse.lexemeId);
        return (
          <article className="impulse-card" key={impulse.id}>
            <span className="tag">{tid('impulse', impulse.kind)}</span>
            <p className="impulse-card__prompt">{impulse.prompt}</p>
            {impulse.support ? (
              <p className="muted text-sm">{t('reactivate.support', { value: impulse.support })}</p>
            ) : null}
            {impulse.solution && revealed[impulse.id] ? (
              <p className="impulse-card__solution">{impulse.solution}</p>
            ) : null}
            <div className="row">
              {impulse.solution ? (
                <Button onClick={() => setRevealed((current) => ({ ...current, [impulse.id]: !current[impulse.id] }))}>
                  {revealed[impulse.id] ? t('reactivate.hideSolution') : t('reactivate.showSolution')}
                </Button>
              ) : null}
              {lexeme
                ? summarizeObservations(lexeme.observations)
                    .filter((entry) => entry.result)
                    .map((entry) => (
                      <span key={entry.dimension} className={`tag dimension--${entry.result}`}>
                        {t('reactivate.dimensionTag', {
                          dimension: tid('dimension', entry.dimension),
                          result: tid('result', entry.result ?? 'secure'),
                        })}
                      </span>
                    ))
                : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ReactivateView({ sequenceId }: { sequenceId?: string }) {
  const { state } = useStore();
  const t = useT();
  const now = useNow();
  const candidates = state.sequences.filter((sequence) => !sequence.archived);
  const selected = candidates.find((sequence) => sequence.id === sequenceId) ?? candidates[0];

  if (!selected) {
    return (
      <div className="page">
        <h1 className="page__title">{t('reactivate.title')}</h1>
        <EmptyState title={t('reactivate.noSequence')}>
          <Button variant="primary" onClick={() => navigate({ name: 'prepare' })}>
            {t('teach.toPrepare')}
          </Button>
        </EmptyState>
      </div>
    );
  }

  const dueSoon = nextDueAt(selected);

  return (
    <div className="page">
      <div className="stack-tight">
        <h1 className="page__title">{t('reactivate.title')}</h1>
        <p className="muted">{t('reactivate.lede')}</p>
      </div>

      <SelectField
        label={t('reactivate.sequence')}
        value={selected.id}
        onChange={(id) => navigate({ name: 'reactivate', sequenceId: id })}
        options={candidates.map((sequence) => ({
          value: sequence.id,
          label: `${sequence.title}${isDue(sequence, now) ? t('reactivate.dueTag') : ''}`,
        }))}
      />

      {dueSoon !== null && dueSoon <= now ? (
        <Notice>{t('reactivate.dueNotice', { relative: formatRelativeDays(dueSoon, now) })}</Notice>
      ) : null}

      <PlanPanel sequence={selected} />
      <ImpulseList sequence={selected} />
    </div>
  );
}
