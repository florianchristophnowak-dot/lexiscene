import { useMemo, useState } from 'react';
import { navigate } from '../app/router';
import { useStore } from '../app/storeContext';
import type { Sequence } from '../domain/model';
import { DAY_MS, OFFSET_PRESETS, buildImpulses, isSequenceDue as isDue, nextDueAt, unsureCount } from '../domain/reactivation';
import { formatDate, formatRelativeDays } from '../domain/text';
import { summarizeObservations } from '../domain/observations';
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

  const updatePlan = (patch: Partial<Sequence['reactivation']>) =>
    actions.updateSequence(sequence.id, { reactivation: { ...plan, ...patch } });

  return (
    <section className="panel">
      <div className="panel__header">
        <span className="panel__title">Reaktivierungsplanung</span>
      </div>
      <div className="panel__body stack">
        <CheckboxRow
          label="Reaktivierung für diese Sequenz planen"
          hint="Erzeugt Erinnerungen an frei gewählten Abständen – ohne automatische Bewertung."
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
                  key={preset.label}
                  onClick={() => {
                    updatePlan({ offsetsDays: preset.offsets, completedRounds: 0 });
                    setOffsetsText(preset.offsets.join(', '));
                    toast.show(preset.note);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <TextField
              label="Eigene Abstände in Tagen"
              value={offsetsText}
              onChange={setOffsetsText}
              hint="Zum Beispiel: 1, 4, 10. Es gibt kein einzig richtiges Intervall – wählen Sie, was zu Ihrem Stundenplan passt."
            />
            <div className="row">
              <Button
                onClick={() => {
                  const offsets = parseOffsets(offsetsText);
                  if (offsets.length === 0) {
                    toast.show('Bitte mindestens einen Abstand in Tagen angeben.', 'error');
                    return;
                  }
                  updatePlan({ offsetsDays: offsets });
                  toast.show('Abstände übernommen.');
                }}
              >
                Abstände übernehmen
              </Button>
              <Button onClick={() => updatePlan({ anchor: Date.now(), completedRounds: 0 })}>Ab heute rechnen</Button>
            </div>

            <p className="muted text-sm">
              {plan.anchor
                ? `Startpunkt: ${formatDate(plan.anchor)} · Runde ${plan.completedRounds + 1} von ${plan.offsetsDays.length}`
                : 'Noch kein Startpunkt gesetzt.'}
              {due ? ` · nächste Reaktivierung ${formatRelativeDays(due, now)} (${formatDate(due)})` : ' · alle Runden abgeschlossen'}
            </p>

            <CheckboxRow
              label="Unsichere Einheiten zuerst zeigen"
              hint="Einheiten, die zuletzt „mit Hilfe“ oder „noch nicht“ waren, stehen vorn. Eine transparente Heuristik, kein Lernalgorithmus."
              checked={plan.prioritiseUnsure}
              onChange={(prioritiseUnsure) => updatePlan({ prioritiseUnsure })}
            />

            {due !== null ? (
              <div className="row">
                <Button onClick={() => updatePlan({ anchor: Date.now() - DAY_MS * plan.offsetsDays[plan.completedRounds] })}>
                  Jetzt fällig stellen
                </Button>
              </div>
            ) : null}

            <p className="muted text-sm">
              Eine Runde gilt erst als durchgeführt, wenn sie im Unterrichtsmodus mit „Runde abschließen“ beendet wird.
            </p>

            {plan.history.length > 0 ? (
              <div className="stack-tight">
                <span className="field__label">Verlauf</span>
                <ul className="stack-tight">
                  {[...plan.history].reverse().map((round) => (
                    <li key={round.round} className="muted text-sm">
                      Runde {round.round} · {formatDate(round.completedAt)} · {round.secure}× sicher, {round.supported}× mit
                      Hilfe, {round.notYet}× noch nicht
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
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const impulses = useMemo(() => buildImpulses(sequence), [sequence]);

  if (impulses.length === 0) {
    return (
      <EmptyState title="Keine Impulse verfügbar">
        <p className="text-sm">Diese Sequenz enthält noch keine Einheiten mit Ausdruck.</p>
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 className="pane-head__title">Unterrichtsimpulse ({impulses.length})</h2>
        <Button variant="primary" onClick={() => navigate({ name: 'reactivateTeach', sequenceId: sequence.id })}>
          Impulse im Unterricht zeigen
        </Button>
      </div>
      {sequence.reactivation.prioritiseUnsure && unsureCount(sequence) > 0 ? (
        <p className="field__hint">
          {unsureCount(sequence)} Einheiten standen zuletzt auf „mit Hilfe“ oder „noch nicht“ und stehen deshalb vorn.
        </p>
      ) : null}
      {impulses.map((impulse) => {
        const lexeme = sequence.lexemes.find((entry) => entry.id === impulse.lexemeId);
        return (
          <article className="impulse-card" key={impulse.id}>
            <span className="tag">{impulse.label}</span>
            <p className="impulse-card__prompt">{impulse.prompt}</p>
            {impulse.support ? <p className="muted text-sm">Hilfe: {impulse.support}</p> : null}
            {impulse.solution && revealed[impulse.id] ? (
              <p className="impulse-card__solution">{impulse.solution}</p>
            ) : null}
            <div className="row">
              {impulse.solution ? (
                <Button onClick={() => setRevealed((current) => ({ ...current, [impulse.id]: !current[impulse.id] }))}>
                  {revealed[impulse.id] ? 'Lösung verbergen' : 'Lösung zeigen'}
                </Button>
              ) : null}
              {lexeme
                ? summarizeObservations(lexeme.observations)
                    .filter((entry) => entry.result)
                    .map((entry) => (
                      <span key={entry.dimension} className={`tag dimension--${entry.result}`}>
                        {entry.label}: {entry.result === 'secure' ? 'sicher' : entry.result === 'supported' ? 'mit Hilfe' : 'noch nicht'}
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
  const now = useNow();
  const candidates = state.sequences.filter((sequence) => !sequence.archived);
  const selected = candidates.find((sequence) => sequence.id === sequenceId) ?? candidates[0];

  if (!selected) {
    return (
      <div className="page">
        <h1 className="page__title">Reaktivieren</h1>
        <EmptyState title="Keine Sequenz vorhanden">
          <Button variant="primary" onClick={() => navigate({ name: 'prepare' })}>
            Zur Vorbereitung
          </Button>
        </EmptyState>
      </div>
    );
  }

  const dueSoon = nextDueAt(selected);

  return (
    <div className="page">
      <div className="stack-tight">
        <h1 className="page__title">Reaktivieren</h1>
        <p className="muted">
          Kurze Impulse aus bereits eingeführten Einheiten – zum Einstieg in die Stunde, ohne Punkte und ohne
          Bewertung.
        </p>
      </div>

      <SelectField
        label="Sequenz"
        value={selected.id}
        onChange={(id) => navigate({ name: 'reactivate', sequenceId: id })}
        options={candidates.map((sequence) => ({
          value: sequence.id,
          label: `${sequence.title}${isDue(sequence, now) ? ' · fällig' : ''}`,
        }))}
      />

      {dueSoon !== null && dueSoon <= now ? (
        <Notice>Diese Sequenz ist zur Reaktivierung vorgemerkt ({formatRelativeDays(dueSoon, now)} fällig geworden).</Notice>
      ) : null}

      <PlanPanel sequence={selected} />
      <ImpulseList sequence={selected} />
    </div>
  );
}
