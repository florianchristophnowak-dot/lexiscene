import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSequence } from '../domain/demo';
import { buildImpulses } from '../domain/reactivation';
import { renderWithStore } from '../test/renderWithStore';
import { ReactivateTeachView } from './ReactivateTeachView';

function setup() {
  const sequence = createDemoSequence();
  const impulses = buildImpulses(sequence);
  const view = renderWithStore(<ReactivateTeachView sequenceId={sequence.id} />, [sequence]);
  return { sequence, impulses, ...view };
}

/** Springt bis hinter den letzten Impuls zur Abschlussansicht. */
async function goToEnd(user: ReturnType<typeof userEvent.setup>, count: number) {
  for (let index = 0; index < count; index += 1) await user.keyboard('{ArrowRight}');
}

describe('Reaktivierung im Unterricht', () => {
  it('zeigt den ersten Impuls in der Phase Wiederbegegnung ohne Lösung', () => {
    const { impulses } = setup();
    expect(screen.getByText('Phase 6: Wiederbegegnung')).toBeInTheDocument();
    expect(screen.getByText(`Impuls 1 von ${impulses.length} · Freizeit verabreden`)).toBeInTheDocument();
    expect(screen.getByText(impulses[0].prompt)).toBeInTheDocument();
    expect(screen.queryByText(impulses[0].solution)).not.toBeInTheDocument();
  });

  it('deckt die Lösung mit der Leertaste auf und geht dann weiter', async () => {
    const user = userEvent.setup();
    const { impulses } = setup();

    await user.keyboard(' ');
    expect(screen.getByText(impulses[0].solution)).toBeInTheDocument();

    await user.keyboard(' ');
    expect(screen.getByText(`Impuls 2 von ${impulses.length} · Freizeit verabreden`)).toBeInTheDocument();
  });

  it('blättert mit den Pfeiltasten', async () => {
    const user = userEvent.setup();
    const { impulses } = setup();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(`Impuls 2 von ${impulses.length} · Freizeit verabreden`)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(`Impuls 1 von ${impulses.length} · Freizeit verabreden`)).toBeInTheDocument();
  });

  it('erfasst die Rückmeldung der Klasse zum einzelnen Impuls', async () => {
    const user = userEvent.setup();
    setup();

    const button = screen.getByRole('button', { name: 'mit Hilfe' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('schließt die Runde erst am Ende ab und übergibt die Ergebnisse', async () => {
    const user = userEvent.setup();
    const { actions, impulses, sequence } = setup();

    await user.click(screen.getByRole('button', { name: 'sicher' }));
    await goToEnd(user, impulses.length);

    expect(screen.getByText('Alle Impulse gezeigt')).toBeInTheDocument();
    expect(screen.getByText(/1× sicher/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Runde abschließen' }));
    expect(actions.completeReactivationRound).toHaveBeenCalledWith(sequence.id, [
      expect.objectContaining({ lexemeId: impulses[0].lexemeId, result: 'secure', dimension: impulses[0].dimension }),
    ]);
  });

  it('meldet verständlich, wenn es nichts zu reaktivieren gibt', () => {
    const sequence = createDemoSequence();
    sequence.lexemes = [];
    renderWithStore(<ReactivateTeachView sequenceId={sequence.id} />, [sequence]);
    expect(screen.getByText('Keine Impulse verfügbar')).toBeInTheDocument();
  });
});
