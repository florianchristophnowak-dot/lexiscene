/**
 * Object-URLs für lokal gespeicherte Medien.
 * Die URLs werden zwischengespeichert, da Medien-Ids beim Ersetzen neu
 * vergeben werden und damit nie veraltete Daten liefern können.
 */
import { useEffect, useState } from 'react';
import type { MediaKind } from '../domain/model';
import { loadMedia } from '../storage/repository';

const urlCache = new Map<string, string>();
const pendingLoads = new Map<string, Promise<string | null>>();

export function mediaKindFromMime(mimeType: string): MediaKind {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'image';
}

export async function getMediaUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;

  const pending = pendingLoads.get(id);
  if (pending) return pending;

  const load = loadMedia(id)
    .then((record) => {
      if (!record) return null;
      const url = URL.createObjectURL(record.blob);
      urlCache.set(id, url);
      return url;
    })
    .finally(() => pendingLoads.delete(id));

  pendingLoads.set(id, load);
  return load;
}

export function releaseMediaUrl(id: string): void {
  const url = urlCache.get(id);
  if (!url) return;
  URL.revokeObjectURL(url);
  urlCache.delete(id);
}

export function clearMediaUrls(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

export interface MediaUrlState {
  url: string | null;
  loading: boolean;
  missing: boolean;
}

/** Synchroner Blick in den Zwischenspeicher – ohne Datenbankzugriff. */
export function peekMediaUrl(id: string): string | null {
  return urlCache.get(id) ?? null;
}

interface LoadedEntry {
  id: string;
  url: string | null;
}

export function useMediaUrl(id: string | undefined): MediaUrlState {
  const [loaded, setLoaded] = useState<LoadedEntry | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getMediaUrl(id)
      .then((url) => {
        if (active) setLoaded({ id, url });
      })
      .catch(() => {
        if (active) setLoaded({ id, url: null });
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!id) return { url: null, loading: false, missing: false };

  const cached = peekMediaUrl(id);
  if (cached) return { url: cached, loading: false, missing: false };
  if (loaded && loaded.id === id) return { url: loaded.url, loading: false, missing: loaded.url === null };
  return { url: null, loading: true, missing: false };
}
