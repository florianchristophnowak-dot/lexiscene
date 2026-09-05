/**
 * Kopplung von Lehrkraftansicht und Projektionsfenster.
 *
 * Beide Fenster gehören zur selben Herkunft und tauschen über einen
 * BroadcastChannel nur die aktuelle Position aus – die Inhalte liest jedes
 * Fenster selbst aus der lokalen Datenbank. Es gibt keinen Server und keine
 * Übertragung nach außen.
 */
import { useEffect, useState } from 'react';
import type { StepId } from '../domain/model';
import type { StepVisibility } from '../domain/steps';

export const PRESENTATION_CHANNEL = 'lexiscene-praesentation';
export const PROJECTION_WINDOW_NAME = 'lexiscene-projektion';

export interface StageState {
  sequenceId: string;
  lexemeId: string;
  stepId: StepId;
  visibility: StepVisibility;
  showTranslation: boolean;
  finished: boolean;
}

type Message = { type: 'state'; state: StageState | null } | { type: 'hello' } | { type: 'bye' };

export function isPresentationSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

function openChannel(): BroadcastChannel | null {
  return isPresentationSupported() ? new BroadcastChannel(PRESENTATION_CHANNEL) : null;
}

/** Sendet den aktuellen Stand an ein geöffnetes Projektionsfenster. */
export function publishStage(state: StageState | null): void {
  const channel = openChannel();
  if (!channel) return;
  channel.postMessage({ type: 'state', state } satisfies Message);
  channel.close();
}

/** Fordert von der Lehrkraftansicht den aktuellen Stand an. */
export function requestStage(): void {
  const channel = openChannel();
  if (!channel) return;
  channel.postMessage({ type: 'hello' } satisfies Message);
  channel.close();
}

/** Meldet das Projektionsfenster ab. */
export function announceProjectionClosed(): void {
  const channel = openChannel();
  if (!channel) return;
  channel.postMessage({ type: 'bye' } satisfies Message);
  channel.close();
}

/** Lehrkraftansicht: reagiert auf Anmeldungen des Projektionsfensters. */
export function useProjectionRequests(onRequest: () => void, onClosed: () => void): void {
  useEffect(() => {
    if (!isPresentationSupported()) return;
    const channel = new BroadcastChannel(PRESENTATION_CHANNEL);
    channel.onmessage = (event: MessageEvent<Message>) => {
      if (event.data?.type === 'hello') onRequest();
      else if (event.data?.type === 'bye') onClosed();
    };
    return () => channel.close();
  }, [onClosed, onRequest]);
}

/** Projektionsfenster: folgt der Lehrkraftansicht. */
export function useStageSubscription(): StageState | null {
  const [stage, setStage] = useState<StageState | null>(null);

  useEffect(() => {
    if (!isPresentationSupported()) return;
    const channel = new BroadcastChannel(PRESENTATION_CHANNEL);
    channel.onmessage = (event: MessageEvent<Message>) => {
      if (event.data?.type === 'state') setStage(event.data.state);
    };
    requestStage();
    return () => {
      announceProjectionClosed();
      channel.close();
    };
  }, []);

  return stage;
}
