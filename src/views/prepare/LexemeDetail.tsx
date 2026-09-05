import { useId } from 'react';
import { useStore } from '../../app/storeContext';
import { suggestMethods, SEMANTISATION_METHODS } from '../../domain/advisor';
import { CHECK_TEMPLATES, buildCheckPrompt, recommendedChecks } from '../../domain/checks';
import { CLASS_STATUSES, LEXICAL_TYPES, REPERTOIRES, type Lexeme, type Sequence } from '../../domain/model';
import { effectiveStepOrder, isStepEnabled, moveStep, stepHasContent } from '../../domain/steps';
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
  const suggestions = suggestMethods(lexeme.lexicalType);
  const recommended = recommendedChecks(lexeme.lexicalType);
  const checkPreview = buildCheckPrompt(lexeme);
  const stepOrder = effectiveStepOrder(sequence, lexeme);
  const hasOwnOrder = Boolean(lexeme.stepOrderOverride);

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
        hint="Vollständiger Satz im Kontext – Grundlage für Hören und Nachsprechen."
      />

      <SelectField
        label="Lexikalischer Typ"
        value={lexeme.lexicalType}
        onChange={(value) => set({ lexicalType: value as Lexeme['lexicalType'] })}
        options={LEXICAL_TYPES.map((type) => ({ value: type.id, label: type.label }))}
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
        <p className="advisor__title">Vorschläge für diesen Typ</p>
        {suggestions.map((suggestion) => (
          <div className="advisor__item" key={suggestion.method}>
            <button type="button" className="advisor__method" onClick={() => set({ semantisationMethod: suggestion.method })}>
              {suggestion.method}
            </button>
            <span className="advisor__rationale">{suggestion.rationale}</span>
          </div>
        ))}
        <p className="advisor__rationale" style={{ marginTop: 'var(--space-2)' }}>
          Unverbindliche Vorschläge – die Methode bleibt Ihre Entscheidung.
        </p>
      </div>

      <SelectField
        label="Repertoire"
        value={lexeme.repertoire}
        onChange={(value) => set({ repertoire: value as Lexeme['repertoire'] })}
        options={REPERTOIRES.map((entry) => ({ value: entry.id, label: entry.label }))}
        hint={REPERTOIRES.find((entry) => entry.id === lexeme.repertoire)?.description}
      />

      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="image" label="Bild" />
      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="audio" label="Audio" />
      <MediaSlot sequenceId={sequence.id} lexeme={lexeme} kind="video" label="Kurzes Video" />

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

      <Collapsible title="Sprachliches Muster">
        <TextField label="Valenz" value={lexeme.valency} onChange={(valency) => set({ valency })} />
        <TextField label="Satzrahmen" value={lexeme.sentenceFrame} onChange={(sentenceFrame) => set({ sentenceFrame })} target />
        <TextArea label="Kollokationen" value={lexeme.collocations} onChange={(collocations) => set({ collocations })} rows={2} />
        <TextField label="Wortfamilie" value={lexeme.wordFamily} onChange={(wordFamily) => set({ wordFamily })} />
        <TextField label="Register" value={lexeme.register} onChange={(register) => set({ register })} />
        <TextArea
          label="Kulturelle oder pragmatische Besonderheit"
          value={lexeme.culturalNote}
          onChange={(culturalNote) => set({ culturalNote })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Bedeutungssicherung">
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
          label="Verständniskontrolle"
          value={lexeme.checkTemplateId}
          onChange={(checkTemplateId) => set({ checkTemplateId })}
          options={[
            { value: '', label: 'keine' },
            ...CHECK_TEMPLATES.map((template) => ({
              value: template.id,
              label: recommended.some((entry) => entry.id === template.id) ? `${template.label} (empfohlen)` : template.label,
            })),
          ]}
          hint={CHECK_TEMPLATES.find((template) => template.id === lexeme.checkTemplateId)?.purpose}
        />
        <TextArea
          label="Eigene Formulierung der Kontrolle"
          value={lexeme.checkPrompt}
          onChange={(checkPrompt) => set({ checkPrompt })}
          rows={2}
          hint="Leer lassen, um die Vorlage zu verwenden."
        />
        {checkPreview ? <p className="notice">Im Unterricht erscheint: {checkPreview}</p> : null}
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
          hint="Wird im Unterrichtsmodus als erster Schritt gezeigt."
        />
        <TextArea
          label="Kommunikative Mini-Aufgabe"
          value={lexeme.communicativeTask}
          onChange={(communicativeTask) => set({ communicativeTask })}
          rows={2}
        />
        <SelectField
          label="Klassenstatus"
          value={lexeme.status ?? ''}
          onChange={(value) => actions.setLexemeStatus(sequence.id, lexeme.id, value ? (value as Lexeme['status']) : null)}
          options={[
            { value: '', label: 'noch kein Status' },
            ...CLASS_STATUSES.map((status) => ({ value: status.id, label: status.label })),
          ]}
          hint={CLASS_STATUSES.find((status) => status.id === lexeme.status)?.description}
        />
        <CheckboxRow
          label="Einheit im Unterrichtsmodus überspringen"
          checked={lexeme.skipped}
          onChange={(skipped) => set({ skipped })}
        />

        <div className="stack-tight">
          <span className="field__label">Schritte für diese Einheit</span>
          <p className="field__hint">
            {hasOwnOrder
              ? 'Diese Einheit hat eine eigene Reihenfolge.'
              : 'Es gilt die Reihenfolge der Sequenz.'}
          </p>
          <StepOrderList
            order={stepOrder}
            isEnabled={(stepId) => isStepEnabled(sequence, lexeme, stepId)}
            onToggle={(stepId, checked) => set({ stepOverrides: { ...lexeme.stepOverrides, [stepId]: checked } })}
            onMove={hasOwnOrder ? (from, to) => set({ stepOrderOverride: moveStep(stepOrder, from, to) }) : undefined}
            lockedHint="Erst eine eigene Reihenfolge für diese Einheit anlegen"
            hintFor={(stepId) => (stepHasContent(stepId, lexeme) ? undefined : 'kein Material hinterlegt – wird übersprungen')}
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
