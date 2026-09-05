/**
 * Audioaufnahme mit der MediaRecorder-Schnittstelle des Browsers.
 *
 * Die Aufnahme bleibt vollständig auf dem Gerät: Der Datenstrom wird nur im
 * Arbeitsspeicher gesammelt und anschließend als Datei in die lokale Datenbank
 * gelegt. Es findet keine Übertragung statt.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'denied' | 'error';

const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}

function fileName(mimeType: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `aufnahme-${stamp}-${time}.${extensionFor(mimeType)}`;
}

export interface AudioRecorder {
  supported: boolean;
  state: RecorderState;
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

export function useAudioRecorder(onFinished: (file: File) => void | Promise<void>): AudioRecorder {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keepRef = useRef(true);

  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => cleanUp, [cleanUp]);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      setError('Dieser Browser kann keine Audioaufnahmen erstellen.');
      setState('error');
      return;
    }

    setError(null);
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      keepRef.current = true;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const chunks = chunksRef.current;
        const keep = keepRef.current;
        cleanUp();
        setState('idle');
        setSeconds(0);
        if (!keep || chunks.length === 0) return;
        const blob = new Blob(chunks, { type });
        void onFinished(new File([blob], fileName(type), { type }));
      };

      recorder.start();
      setSeconds(0);
      setState('recording');
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (recordError) {
      cleanUp();
      const denied = recordError instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(recordError.name);
      setError(
        denied
          ? 'Der Zugriff auf das Mikrofon wurde abgelehnt. Bitte in den Browsereinstellungen erlauben.'
          : 'Die Aufnahme konnte nicht gestartet werden. Ist ein Mikrofon angeschlossen?',
      );
      setState(denied ? 'denied' : 'error');
    }
  }, [cleanUp, onFinished]);

  const stop = useCallback(() => {
    keepRef.current = true;
    recorderRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    keepRef.current = false;
    if (recorderRef.current) recorderRef.current.stop();
    else {
      cleanUp();
      setState('idle');
      setSeconds(0);
    }
  }, [cleanUp]);

  return { supported: isRecordingSupported(), state, seconds, error, start, stop, cancel };
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
