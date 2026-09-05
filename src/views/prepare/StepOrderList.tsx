import { useState } from 'react';
import type { StepId } from '../../domain/model';
import { stepDefinition } from '../../domain/steps';
import { IconButton } from '../../ui/Button';

interface Props {
  order: StepId[];
  isEnabled: (stepId: StepId) => boolean;
  onToggle: (stepId: StepId, enabled: boolean) => void;
  /** Fehlt die Funktion, ist die Reihenfolge an dieser Stelle nicht änderbar. */
  onMove?: (from: number, to: number) => void;
  lockedHint?: string;
  hintFor?: (stepId: StepId) => string | undefined;
  /** Phasenbezeichnung, die über dem ersten Schritt einer Phase erscheint. */
  phaseFor?: (stepId: StepId) => string | undefined;
}

export function StepOrderList({ order, isEnabled, onToggle, onMove, lockedHint, hintFor, phaseFor }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const move = (from: number, to: number) => {
    if (!onMove || to < 0 || to >= order.length) return;
    onMove(from, to);
    setAnnouncement(`„${stepDefinition(order[from])?.label ?? 'Schritt'}“ ist jetzt an Position ${to + 1} von ${order.length}.`);
  };

  return (
    <div className="stack-tight">
      <p className="visually-hidden" role="status" aria-live="polite" aria-label="Reihenfolge der Schritte">
        {announcement}
      </p>

      <ol className="step-list">
        {order.map((stepId, index) => {
          const step = stepDefinition(stepId);
          if (!step) return null;
          const hint = hintFor?.(stepId);
          const enabled = isEnabled(stepId);
          const phase = phaseFor?.(stepId);
          const phaseChanged = phase !== undefined && phase !== phaseFor?.(order[index - 1]);

          return (
            <li
              key={stepId}
              className={[
                'step-item',
                enabled ? '' : 'step-item--off',
                dragIndex === index ? 'step-item--dragging' : '',
                dropIndex === index && dragIndex !== null && dragIndex !== index ? 'step-item--drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={Boolean(onMove)}
              onDragStart={(event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
              }}
              onDragOver={(event) => {
                if (!onMove) return;
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
              <span className="step-item__position" aria-hidden="true">
                {index + 1}
              </span>

              <label className="step-item__label">
                <input type="checkbox" checked={enabled} onChange={(event) => onToggle(stepId, event.target.checked)} />
                <span>
                  {phaseChanged ? <span className="step-item__phase">Phase: {phase}</span> : null}
                  <span className="step-item__name">{step.label}</span>
                  <span className="field__hint" style={{ display: 'block' }}>
                    {hint ?? step.purpose}
                  </span>
                </span>
              </label>

              <span className="step-item__actions">
                <IconButton
                  label={onMove ? `„${step.label}“ nach oben verschieben` : (lockedHint ?? 'Reihenfolge nicht änderbar')}
                  disabled={!onMove || index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label={onMove ? `„${step.label}“ nach unten verschieben` : (lockedHint ?? 'Reihenfolge nicht änderbar')}
                  disabled={!onMove || index === order.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </IconButton>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
