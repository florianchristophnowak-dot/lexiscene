/**
 * Sicherung und Wiederherstellung als ZIP mit JSON-Manifest und Mediendateien.
 *
 * Aufbau der Sicherungsdatei:
 *   manifest.json          – Format, Version, Sequenzen, Medienverzeichnis
 *   media/<id>.<endung>    – Bild-, Audio- und Videodateien
 *   LIESMICH.txt           – Kurzhinweis für Menschen, die das Archiv öffnen
 */
import { APP_NAME, APP_VERSION, SCHEMA_VERSION, type MediaMeta, type MediaRecord, type Sequence } from '../domain/model';
import { SchemaError, normalizeMediaMeta, normalizeSequence } from '../domain/schema';
import { resolveSteps, STEPS } from '../domain/steps';
import { slugify } from '../domain/text';
import { createZip, readZip, textToBytes, bytesToText, ZipError } from './zip';

export const BACKUP_FORMAT = 'lexiscene-backup';
export const BACKUP_VERSION = 1;
export const SEQUENCE_EXPORT_FORMAT = 'lexiscene.sequence';
export const SEQUENCE_EXPORT_VERSION = 1;

export interface BackupMediaEntry extends MediaMeta {
  file: string;
}

export interface BackupManifest {
  format: string;
  version: number;
  schemaVersion: number;
  app: { name: string; version: string };
  createdAt: string;
  sequences: Sequence[];
  media: BackupMediaEntry[];
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
};

export function mediaExtension(meta: MediaMeta): string {
  const known = EXTENSIONS[meta.mimeType.toLowerCase()];
  if (known) return known;
  const fromName = meta.name.includes('.') ? meta.name.split('.').pop() : undefined;
  return (fromName ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
}

export function backupFileName(now = new Date()): string {
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `lexiscene-sicherung-${stamp}.zip`;
}

const README_TEXT = `${APP_NAME} – Sicherungsdatei

Diese ZIP-Datei enthält alle Sequenzen und Medien einer lokalen ${APP_NAME}-Installation.
Wiederherstellung: ${APP_NAME} öffnen, Bereich "Daten", "Sicherung einspielen" wählen und diese Datei auswählen.

manifest.json  – alle Sequenzen und das Medienverzeichnis (JSON, Schemaversion ${SCHEMA_VERSION})
media/         – die dazugehörigen Bild-, Audio- und Videodateien
`;

export async function buildBackup(sequences: Sequence[], media: MediaRecord[], now = new Date()): Promise<Blob> {
  const mediaEntries: BackupMediaEntry[] = [];
  const files: { name: string; data: Uint8Array }[] = [];

  for (const record of media) {
    const file = `media/${record.id}.${mediaExtension(record)}`;
    mediaEntries.push({
      id: record.id,
      name: record.name,
      mimeType: record.mimeType,
      kind: record.kind,
      size: record.size,
      createdAt: record.createdAt,
      file,
    });
    files.push({ name: file, data: new Uint8Array(await record.blob.arrayBuffer()) });
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    app: { name: APP_NAME, version: APP_VERSION },
    createdAt: now.toISOString(),
    sequences,
    media: mediaEntries,
  };

  return createZip(
    [
      { name: 'manifest.json', data: textToBytes(JSON.stringify(manifest, null, 2)) },
      { name: 'LIESMICH.txt', data: textToBytes(README_TEXT) },
      ...files,
    ],
    now,
  );
}

export interface RestoreResult {
  sequences: Sequence[];
  media: MediaRecord[];
  warnings: string[];
}

export async function parseBackup(input: ArrayBuffer | Uint8Array): Promise<RestoreResult> {
  let files: Map<string, Uint8Array>;
  try {
    files = await readZip(input);
  } catch (error) {
    if (error instanceof ZipError) throw error;
    throw new ZipError('Die Datei konnte nicht als ZIP-Archiv gelesen werden.');
  }

  const manifestBytes = files.get('manifest.json');
  if (!manifestBytes) throw new SchemaError('In der Sicherungsdatei fehlt die Datei „manifest.json“.');

  let manifest: Partial<BackupManifest>;
  try {
    manifest = JSON.parse(bytesToText(manifestBytes)) as Partial<BackupManifest>;
  } catch {
    throw new SchemaError('Das Manifest der Sicherungsdatei ist nicht lesbar.');
  }

  if (manifest.format !== BACKUP_FORMAT) {
    throw new SchemaError('Diese Datei ist keine LexiScène-Sicherung.');
  }
  if (typeof manifest.version === 'number' && manifest.version > BACKUP_VERSION) {
    throw new SchemaError(`Die Sicherung stammt aus einer neueren Version (Format ${manifest.version}).`);
  }

  const warnings: string[] = [];
  const sequences = (Array.isArray(manifest.sequences) ? manifest.sequences : []).map(normalizeSequence);

  const media: MediaRecord[] = [];
  for (const raw of Array.isArray(manifest.media) ? manifest.media : []) {
    const meta = normalizeMediaMeta(raw);
    if (!meta) continue;
    const fileName = typeof (raw as BackupMediaEntry).file === 'string' ? (raw as BackupMediaEntry).file : `media/${meta.id}`;
    const bytes = files.get(fileName);
    if (!bytes) {
      warnings.push(`Mediendatei fehlt im Archiv: ${meta.name}`);
      continue;
    }
    media.push({ ...meta, size: bytes.length, blob: new Blob([bytes as BlobPart], { type: meta.mimeType }) });
  }

  if (sequences.length === 0) warnings.push('Die Sicherung enthält keine Sequenzen.');
  return { sequences, media, warnings };
}

/* ------------------------------------------------- Einzelexport (Austausch) */

export interface SequenceExportDocument {
  format: string;
  version: number;
  schemaVersion: number;
  app: { name: string; version: string };
  exportedAt: string;
  /** Sprache der beschreibenden Texte in `phase` (nicht der Inhalte). */
  locale: string;
  /**
   * Beschreibung der Sequenz als Unterrichtsphase. Bewusst rein deskriptiv:
   * Solange kein Prép-ybara-Datenformat vorliegt, wird keine Schnittstelle
   * erfunden – die Angaben lassen sich aber direkt darauf abbilden.
   */
  phase: {
    title: string;
    canDo: string;
    targetLanguage: string;
    learningGroup: string;
    lexemeCount: number;
    steps: { position: number; id: string; label: string; purpose: string }[];
  };
  sequence: Sequence;
}

/**
 * Beschreibende Texte werden in der Bediensprache mitgeschrieben; welche das
 * war, hält `locale` fest. Die Inhalte der Sequenz bleiben unverändert.
 */
export function buildSequenceExport(
  sequence: Sequence,
  describe: { locale: string; label: (stepId: string) => string; purpose: (stepId: string) => string },
  now = new Date(),
): SequenceExportDocument {
  // Beschrieben werden die Schritte, die im Unterricht wirklich laufen: eingeschaltet und mit Material.
  const running = new Set(sequence.lexemes.flatMap((lexeme) => resolveSteps(sequence, lexeme).map((step) => step.id)));
  const activeSteps = STEPS.filter(
    (step) => sequence.steps[step.id] !== false && (sequence.lexemes.length === 0 || running.has(step.id)),
  );
  return {
    format: SEQUENCE_EXPORT_FORMAT,
    version: SEQUENCE_EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    app: { name: APP_NAME, version: APP_VERSION },
    exportedAt: now.toISOString(),
    locale: describe.locale,
    phase: {
      title: sequence.title,
      canDo: sequence.canDoGoal,
      targetLanguage: sequence.targetLanguage,
      learningGroup: sequence.learningGroup,
      lexemeCount: sequence.lexemes.length,
      steps: activeSteps.map((step) => ({
        position: step.position,
        id: step.id,
        label: describe.label(step.id),
        purpose: describe.purpose(step.id),
      })),
    },
    sequence,
  };
}

export function sequenceExportFileName(sequence: Sequence): string {
  return `lexiscene-${slugify(sequence.title)}.json`;
}

/** Liest sowohl Austauschdokumente als auch nackte Sequenz-Objekte. */
export function parseSequenceDocument(text: string): Sequence[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SchemaError('Die Datei enthält kein gültiges JSON.');
  }

  if (Array.isArray(raw)) return raw.map(normalizeSequence);

  const record = raw as Record<string, unknown>;
  if (record.sequence) return [normalizeSequence(record.sequence)];
  if (Array.isArray(record.sequences)) return (record.sequences as unknown[]).map(normalizeSequence);
  return [normalizeSequence(record)];
}
