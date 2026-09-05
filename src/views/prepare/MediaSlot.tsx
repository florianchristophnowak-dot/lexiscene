import { useCallback, useRef, useState } from 'react';
import { useMediaUrl } from '../../app/media';
import { formatDuration, useAudioRecorder } from '../../app/recorder';
import { useStore } from '../../app/storeContext';
import type { Lexeme, MediaKind } from '../../domain/model';
import { formatBytes } from '../../domain/text';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/toastContext';

const FIELD: Record<MediaKind, 'imageId' | 'audioId' | 'videoId'> = {
  image: 'imageId',
  audio: 'audioId',
  video: 'videoId',
};

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
};

const LARGE_FILE_BYTES = 25 * 1024 * 1024;

interface Props {
  sequenceId: string;
  lexeme: Lexeme;
  kind: MediaKind;
  label: string;
}

export function MediaSlot({ sequenceId, lexeme, kind, label }: Props) {
  const { state, actions } = useStore();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const attach = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        await actions.attachMedia(sequenceId, lexeme.id, kind, file);
        toast.show(`${label} hinterlegt.`, 'success');
      } catch {
        toast.show(`${label} konnte nicht gespeichert werden.`, 'error');
      } finally {
        setBusy(false);
      }
    },
    [actions, kind, label, lexeme.id, sequenceId, toast],
  );

  const recorder = useAudioRecorder(attach);

  const mediaId = lexeme[FIELD[kind]];
  const meta = mediaId ? state.mediaIndex[mediaId] : undefined;
  const { url, loading, missing } = useMediaUrl(mediaId);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > LARGE_FILE_BYTES) {
      toast.show(`Große Datei (${formatBytes(file.size)}) – das belegt viel lokalen Speicher.`);
    }
    await attach(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="media-slot">
      <span className="field__label">{label}</span>

      {mediaId && loading ? <span className="field__hint">wird geladen …</span> : null}
      {mediaId && missing ? <span className="field__hint">Datei nicht mehr vorhanden.</span> : null}

      {url ? (
        <div className="media-slot__preview">
          {kind === 'image' ? <img src={url} alt={meta?.name ?? label} /> : null}
          {kind === 'audio' ? <audio src={url} controls preload="metadata" /> : null}
          {kind === 'video' ? <video src={url} controls preload="metadata" /> : null}
        </div>
      ) : null}

      {meta ? (
        <span className="media-slot__name">
          {meta.name} · {formatBytes(meta.size)}
        </span>
      ) : null}

      {kind === 'audio' && recorder.supported ? (
        <div className="row">
          {recorder.state === 'recording' ? (
            <>
              <Button variant="primary" onClick={recorder.stop}>
                Aufnahme beenden ({formatDuration(recorder.seconds)})
              </Button>
              <Button variant="ghost" onClick={recorder.cancel}>
                Verwerfen
              </Button>
              <span className="media-slot__recording" role="status">
                Aufnahme läuft
              </span>
            </>
          ) : (
            <Button disabled={busy || recorder.state === 'requesting'} onClick={() => void recorder.start()}>
              {recorder.state === 'requesting' ? 'Mikrofon wird angefragt …' : 'Selbst aufnehmen'}
            </Button>
          )}
        </div>
      ) : null}

      {recorder.error ? <span className="field__hint">{recorder.error}</span> : null}

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept={ACCEPT[kind]}
        aria-label={`${label} auswählen`}
        disabled={busy || recorder.state === 'recording'}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {mediaId ? (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            void actions.detachMedia(sequenceId, lexeme.id, kind).then(() => toast.show(`${label} entfernt.`));
          }}
        >
          Entfernen
        </Button>
      ) : null}
    </div>
  );
}
