import { useId } from 'react';
import { useStore } from '../../app/storeContext';
import { EVIDENCE_LABELS, SEMANTISATION_METHODS, advisorContextFromLexeme, recommendMethods } from '../../domain/advisor';
import {
  CHECK_TEMPLATES,
  buildCheckPrompt,
  buildSecondaryPrompt,
  checkDemandLabel,
  checkDirectionLabel,
  checkTargetLabel,
  checkTemplate,
  counterpartCheck,
  coversBothDirections,
  recommendedChecks,
  suggestRetrievalProgression,
} from '../../domain/checks';
import {
  IMPULSE_KINDS,
} from '../../domain/reactivation';
import {
  IMAGEABILITIES,
  INFERENCE_SUITABILITIES,
  LEARNING_GOALS,
  LEXICAL_TYPES,
  REPERTOIRES,
  TRANSFER_RISKS,
  dimensionLabel,
  resultLabel,
  type Lexeme,
  type Sequence,
} from '../../domain/model';
import { summarizeObservations } from '../../domain/observations';
import { effectiveStepOrder, isStepEnabled, moveStep, stepHasContent, stepPhase } from '../../domain/steps';
import { formatDate, formatDateTime } from '../../domain/text';
import { Button, IconButton } from '../../ui/Button';
import { CheckboxRow, SelectField, TextArea, TextField } from '../../ui/Field';
import { Collapsible } from '../../ui/Feedback';
import { MediaSlot } from './MediaSlot';
import { StepOrderList } from './StepOrderList';

interface Props {
  sequence: Sequence;
  lexeme: Lexeme;
  onClose?: () => void;
}

export function LexemeDetail({ sequence, lexeme, onClose }: Props) {
  const { actions } = useStore();
  const methodListId = useId();
  const set = (patch: Partial<Lexeme>) => actions.updateLexeme(sequence.id, lexeme.id, patch);

  const recommendations = recommendMethods(advisorContextFromLexeme(lexeme, sequence));
  const recommended = recommendedChecks(lexeme.lexicalType);
  const progression = suggestRetrievalProgression(lexeme);
  const selectedCheck = checkTemplate(lexeme.checkTemplateId);
  const counterpart = counterpartCheck(lexeme);
  const secondaryTemplate = checkTemplate(lexeme.checkTemplateIdSecondary);
  const checkPreview = buildCheckPrompt(lexeme);
  const secondaryPreview = buildSecondaryPrompt(lexeme);
  const bothDirections = coversBothDirections(lexeme);
  const history = [...lexeme.observations].sort((a, b) => b.at - a.at);
  const summary = summarizeObservations(lexeme.observations);

  const stepOrder = effectiveStepOrder(sequence, lexeme);
  const hasOwnOrder = Boolean(lexeme.stepOrderOverride);
  const anchorMissing = lexeme.learningGoal === 'productive' && lexeme.repertoire === 'kern' && !lexeme.sentenceFrame.trim();

  return (
    <div className="stack">
      <div className="pane-head">
        <h2 className="pane-head__title">Ausgewählte Einheit</h2>
        <div className="row">
          {onClose ? (
            <IconButton label="Detailspalte schließen" onClick={onClose}>
              ✕
            </IconButton>
          ) : null}
        </div>
      </div>

      <p className="detail-expression">{lexeme.expression || 'Ohne Ausdruck'}</p>

      <section className="core-panel">
        <p className="core-panel__title">Für den Erstkontakt</p>
        <p className="field__hint">
          Diese Angaben tragen die erste Begegnung. Alles Weitere ist Vertiefung und kann später ergänzt werden.
        </p>

        <div className="stack-tight">
          <TextField label="Ausdruck oder Chunk" value={lexeme.expression} onChange={(expression) => set({ expression })} target />
          <TextField
            label="Kernbedeutung"
            value={lexeme.coreMeaning}
            onChange={(coreMeaning) => set({ coreMeaning })}
            placeholder="in Alltagssprache, kurz"
          />
          <TextField
            label="Kommunikative Funktion"
            value={lexeme.communicativeFunction}
            onChange={(communicativeFunction) => set({ communicativeFunction })}
            placeholder="z. B. einen Vorschlag machen"
          />
          <TextArea
            label="Modelläußerung"
            value={lexeme.modelUtterance}
            onChange={(modelUtterance) => set({ modelUtterance })}
            rows={2}
            target
            hint="Vollständige Äußerung im Kontext."
          />
          <TextField
            label="Musteranker"
            value={lexeme.sentenceFrame}
            onChange={(sentenceFrame) => set({ sentenceFrame })}
            target
            placeholder="z. B. avoir peur de + nom/infinitif"
            hint={
              anchorMissing
                ? 'Diese Einheit ist produktiv geplant und gehört zum Kernrepertoire – ohne Musteranker fehlt der Rahmen für die eigene Verwendung.'
                : 'Fester Teil und variable Bausteine, z. B. „jouer à + Sportart“ oder „prendre une décision“.'
            }
          />
          <SelectField
            label="Lexikalischer Typ"
            value={lexeme.lexicalType}
            onChange={(value) => set({ lexicalType: value as Lexeme['lexicalType'] })}
            options={LEXICAL_TYPES.map((type) => ({ value: type.id, label: type.label }))}
          />
          <SelectField
            label="Lernziel"
            value={lexeme.learningGoal}
            onChange={(value) => set({ learningGoal: value as Lexeme['learningGoal'] })}
            options={LEARNING_GOALS.map((goal) => ({ value: goal.id, label: goal.label }))}
            hint={LEARNING_GOALS.find((goal) => goal.id === lexeme.learningGoal)?.description}
          />
        </div>
      </section>

      <SelectField
        label="Repertoire"
        value={lexeme.repertoire}
        onChange={(value) => set({ repertoire: value as Lexeme['repertoire'] })}
        options={REPERTOIRES.map((entry) => ({ value: entry.id, label: entry.label }))}
        hint={REPERTOIRES.find((entry) => entry.id === lexeme.repertoire)?.description}
      />

      <div className="field">
        <label className="field__label" htmlFor={`${methodListId}-input`}>
          Semantisierungsmethode
        </label>
        <input
          id={`${methodListId}-input`}
          className="input"
          list={methodListId}
          value={lexeme.semantisationMethod}
          placeholder="frei wählbar"
          onChange={(event) => set({ semantisationMethod: event.target.value })}
        />
        <datalist id={methodListId}>
          {SEMANTISATION_METHODS.map((method) => (
            <option key={method} value={method} />
          ))}
        </datalist>
      </div>

      <div className="advisor">
        <p className="advisor__title">Vorschläge für diese Einheit</p>
        {recommendations.map((recommendation) => (
          <div className="advisor__item" key={recommendation.id}>
            <button type="button" className="advisor__method" onClick={() => set({ semantisationMethod: recommendation.method })}>
              {recommendation.method}
            </button>
            <span className={`evidence evidence--${recommendation.evidence}`}>{EVIDENCE_LABELS[recommendation.evidence]}</span>
            <span className="advisor__rationale">{recommendation.rationale}</span>
            <span className="advisor__rationale">
              <strong>Bestätigen:</strong> {recommendation.confirmation}
            </span>
            <span className="advisor__rationale">
              <strong>Risiko:</strong> {recommendation.risk}
            </span>
          </div>
        ))}
        <p className="advisor__rationale" style={{ marginTop: 'var(--space-2)' }}>
          Unverbindliche Vorschläge auf Grundlage von Typ, Lernziel, Niveau, Bildhaftigkeit und Transferrisiko. Die
          Entscheidung bleibt bei Ihnen.
        </p>
      </div>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Beobachtungen der Lerngruppe</span>
        </div>
        <div className="panel__body">
          <ul className="dimension-grid">
            {summary.map((entry) => (
              <li key={entry.dimension} className={`dimension dimension--${entry.result ?? 'none'}`}>
                <span className="dimension__label">{entry.label}</span>
                <span className="dimension__value">
                  {entry.result === 'secure' ? 'sicher' : null}
                  {entry.result === 'supported' ? 'mit Hilfe' : null}
                  {entry.result === 'not-yet' ? 'noch nicht' : null}
                  {entry.result === null ? 'noch keine Beobachtung' : null}
                </span>
                {entry.at ? <span className="dimension__meta">{formatDate(entry.at)}</span> : null}
              </li>
            ))}
          </ul>
          <p className="field__hint">
            Beobachtungen der Klasse, nicht einzelner Lernender. Es werden bewusst keine Punkte oder Noten daraus
            berechnet. Erfasst wird im Unterrichts- und Reaktivierungsmodus.
          </p>

          {history.length > 0 ? (
            <details className="collapsible">
              <summary>Verlauf ({history.length})</summary>
              <ul className="observation-log">
                {history.map((entry) => (
                  <li className="observation-log__item" key={entry.id}>
                    <span className="observation-log__when">{formatDateTime(entry.at)}</span>
                    <span>
                      {entry.dimension && entry.result
                        ? `${dimensionLabel(entry.dimension)}: ${resultLabel(entry.result)}`
                        : 'Ereignis ohne Kompetenzaussage'}
                      <span className="field__hint" style={{ display: 'block' }}>
                        {entry.source === 'reactivation' ? 'Reaktivierung' : 'Einführung'}
                        {entry.round ? ` · Runde ${entry.round}` : ''}
                        {entry.impulseKind
                          ? ` · ${IMPULSE_KINDS.find((kind) => kind.id === entry.impulseKind)?.label ?? entry.impulseKind}`
                          : ''}
                      </span>
                    </span>
                    <IconButton
                      label="Diese Beobachtung entfernen"
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

      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="image" label="Bild" />
      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="audio" label="Audio" />
      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="video" label="Kurzes Video" />

      <Collapsible title="Einordnung für den Berater">
        <SelectField
          label="Bildhaftigkeit"
          value={lexeme.imageability}
          onChange={(value) => set({ imageability: value as Lexeme['imageability'] })}
          options={IMAGEABILITIES.map((entry) => ({ value: entry.id, label: entry.label }))}
          hint={IMAGEABILITIES.find((entry) => entry.id === lexeme.imageability)?.description}
        />
        <SelectField
          label="Eignung zur Erschließung"
          value={lexeme.inferenceSuitability}
          onChange={(value) => set({ inferenceSuitability: value as Lexeme['inferenceSuitability'] })}
          options={INFERENCE_SUITABILITIES.map((entry) => ({ value: entry.id, label: entry.label }))}
          hint={INFERENCE_SUITABILITIES.find((entry) => entry.id === lexeme.inferenceSuitability)?.description}
        />
        <SelectField
          label="Transfer- oder Verwechslungsrisiko"
          value={lexeme.transferRisk}
          onChange={(value) => set({ transferRisk: value as Lexeme['transferRisk'] })}
          options={TRANSFER_RISKS.map((entry) => ({ value: entry.id, label: entry.label }))}
          hint={TRANSFER_RISKS.find((entry) => entry.id === lexeme.transferRisk)?.description}
        />
        <TextField
          label="Verwechslungsgruppe"
          value={lexeme.confusionGroup}
          onChange={(confusionGroup) => set({ confusionGroup })}
          placeholder="z. B. Kleidungsstücke"
          hint="Frei gewählte Bezeichnung. Mehrere Einheiten derselben Gruppe in einer Sequenz werden im Bereitschaftscheck angemerkt."
        />
      </Collapsible>

      <Collapsible title="Aussprache und Form">
        <TextField
          label="Aussprachehinweis"
          value={lexeme.pronunciationHint}
          onChange={(pronunciationHint) => set({ pronunciationHint })}
        />
        <TextField
          label="Betonung, Liaison, problematische Lautung"
          value={lexeme.prosodyNote}
          onChange={(prosodyNote) => set({ prosodyNote })}
        />
        <TextField label="IPA (optional)" value={lexeme.ipa} onChange={(ipa) => set({ ipa })} target />
        <TextField
          label="Artikel, Genus, Plural, unregelmäßige Form"
          value={lexeme.morphology}
          onChange={(morphology) => set({ morphology })}
        />
        <p className="field__hint">Eine eigene Aufnahme hinterlegen Sie oben im Feld „Audio“.</p>
      </Collapsible>

      <Collapsible title="Sprachliches Muster vertiefen">
        <TextField label="Valenz" value={lexeme.valency} onChange={(valency) => set({ valency })} />
        <TextArea
          label="Weitere Kollokationen"
          value={lexeme.collocations}
          onChange={(collocations) => set({ collocations })}
          rows={2}
        />
        <TextField label="Wortfamilie" value={lexeme.wordFamily} onChange={(wordFamily) => set({ wordFamily })} />
        <TextField label="Register" value={lexeme.register} onChange={(register) => set({ register })} />
        <TextArea
          label="Kulturelle oder pragmatische Besonderheit"
          value={lexeme.culturalNote}
          onChange={(culturalNote) => set({ culturalNote })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Bedeutungssicherung und Abruf">
        <TextArea label="Beispiel" value={lexeme.example} onChange={(example) => set({ example })} rows={2} target />
        <TextArea label="Nichtbeispiel" value={lexeme.nonExample} onChange={(nonExample) => set({ nonExample })} rows={2} />
        <TextArea
          label="Kontrastbeispiel"
          value={lexeme.contrastExample}
          onChange={(contrastExample) => set({ contrastExample })}
          rows={2}
        />
        <TextField
          label="Mögliche Verwechslung oder falscher Freund"
          value={lexeme.confusionRisk}
          onChange={(confusionRisk) => set({ confusionRisk })}
        />

        <SelectField
          label="Abrufaufgabe"
          value={lexeme.checkTemplateId}
          onChange={(checkTemplateId) => set({ checkTemplateId })}
          options={[
            { value: '', label: 'keine' },
            ...CHECK_TEMPLATES.map((template) => ({
              value: template.id,
              label: recommended.some((entry) => entry.id === template.id) ? `${template.label} (empfohlen)` : template.label,
            })),
          ]}
          hint={selectedCheck?.purpose}
        />
        {selectedCheck ? (
          <p className="tag-row">
            <span className="tag">{checkTargetLabel(selectedCheck.target)}</span>
            <span className="tag">{checkDirectionLabel(selectedCheck.direction)}</span>
            <span className="tag">{checkDemandLabel(selectedCheck.demand)}</span>
          </p>
        ) : null}

        <div className="stack-tight">
          <span className="field__label">Progression der Abrufaufgaben</span>
          <p className="field__hint">
            Von auswählen über beurteilen und erinnern bis zur freien Verwendung. Ein Klick übernimmt die Vorlage.
          </p>
          <ol className="progression">
            {progression.map((template) => (
              <li key={template.id} className={template.id === lexeme.checkTemplateId ? 'progression__item progression__item--active' : 'progression__item'}>
                <button type="button" className="progression__button" onClick={() => set({ checkTemplateId: template.id })}>
                  {template.label}
                </button>
                <span className="field__hint">
                  {checkDemandLabel(template.demand)} · {checkDirectionLabel(template.direction)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <TextArea
          label="Eigene Formulierung der Aufgabe"
          value={lexeme.checkPrompt}
          onChange={(checkPrompt) => set({ checkPrompt })}
          rows={2}
          hint="Leer lassen, um die Vorlage zu verwenden."
        />
        {checkPreview ? <p className="notice">Im Unterricht erscheint: {checkPreview}</p> : null}

        <SelectField
          label="Zweite Aufgabe in der Gegenrichtung"
          value={lexeme.checkTemplateIdSecondary}
          onChange={(checkTemplateIdSecondary) => set({ checkTemplateIdSecondary })}
          options={[
            { value: '', label: counterpart ? `Vorschlag der App: ${counterpart.label}` : 'keine' },
            ...CHECK_TEMPLATES.map((template) => ({
              value: template.id,
              label: `${template.label} – ${checkDirectionLabel(template.direction)}`,
            })),
          ]}
          hint={
            lexeme.learningGoal === 'productive' && !bothDirections
              ? 'Für produktive Einheiten lohnen beide Richtungen: Form → Bedeutung und Bedeutung oder Situation → Form.'
              : secondaryTemplate?.purpose
          }
        />
        {secondaryPreview ? (
          <p className="notice">
            Im Unterricht zusätzlich einblendbar: {secondaryPreview}
            {secondaryTemplate ? null : ' (Vorschlag der App)'}
          </p>
        ) : null}

      </Collapsible>

      <Collapsible title="Differenzierung">
        <TextArea label="Zusätzlicher Hinweis" value={lexeme.extraHint} onChange={(extraHint) => set({ extraHint })} rows={2} />
        <TextArea
          label="Vereinfachte Erklärung"
          value={lexeme.simplifiedExplanation}
          onChange={(simplifiedExplanation) => set({ simplifiedExplanation })}
          rows={2}
        />
        <TextField
          label="Übersetzung (optional)"
          value={lexeme.translation}
          onChange={(translation) => set({ translation })}
          hint="Legitime Klärungshilfe – im Unterricht gezielt einblendbar."
        />
        <TextField
          label="Mehrsprachiger Vergleich"
          value={lexeme.multilingualComparison}
          onChange={(multilingualComparison) => set({ multilingualComparison })}
        />
        <TextArea
          label="Erweiterungsaufgabe"
          value={lexeme.extensionTask}
          onChange={(extensionTask) => set({ extensionTask })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Unterricht und Dramaturgie">
        <TextArea
          label="Einstiegssituation"
          value={lexeme.situation}
          onChange={(situation) => set({ situation })}
          rows={2}
          hint="Trägt die Phase „Kontext“ im Unterrichtsmodus."
        />
        <TextArea
          label="Kommunikative Mini-Aufgabe"
          value={lexeme.communicativeTask}
          onChange={(communicativeTask) => set({ communicativeTask })}
          rows={2}
          hint="Trägt die Phase „Gebrauch“."
        />
        <CheckboxRow
          label="Einheit im Unterrichtsmodus überspringen"
          checked={lexeme.skipped}
          onChange={(skipped) => set({ skipped })}
        />

        <div className="stack-tight">
          <span className="field__label">Schritte für diese Einheit</span>
          <p className="field__hint">
            {hasOwnOrder ? 'Diese Einheit hat eine eigene Reihenfolge.' : 'Es gilt die Reihenfolge der Sequenz.'}
          </p>
          <StepOrderList
            order={stepOrder}
            isEnabled={(stepId) => isStepEnabled(sequence, lexeme, stepId)}
            onToggle={(stepId, checked) => set({ stepOverrides: { ...lexeme.stepOverrides, [stepId]: checked } })}
            onMove={hasOwnOrder ? (from, to) => set({ stepOrderOverride: moveStep(stepOrder, from, to) }) : undefined}
            lockedHint="Erst eine eigene Reihenfolge für diese Einheit anlegen"
            hintFor={(stepId) =>
              stepHasContent(stepId, lexeme, sequence)
                ? undefined
                : stepId === 'vermuten'
                  ? 'Erschließen ist hier nicht vorgesehen – siehe Sequenzeinstellung und Eignung'
                  : 'kein Material hinterlegt – wird übersprungen'
            }
            phaseFor={(stepId) => stepPhase(stepId)?.label}
          />
          <div className="row">
            {hasOwnOrder ? (
              <Button variant="ghost" onClick={() => set({ stepOrderOverride: null })}>
                Reihenfolge der Sequenz übernehmen
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => set({ stepOrderOverride: stepOrder })}>
                Eigene Reihenfolge für diese Einheit
              </Button>
            )}
            <Button variant="ghost" onClick={() => set({ stepOverrides: {} })}>
              Schrittauswahl zurücksetzen
            </Button>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
