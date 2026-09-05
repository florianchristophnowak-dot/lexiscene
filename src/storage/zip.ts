/**
 * Minimaler ZIP-Codec ohne externe Abhängigkeit.
 *
 * Geschrieben wird „stored“ (unkomprimiert) oder – sofern die Compression
 * Streams verfügbar sind – „deflate“. Gelesen werden beide Verfahren.
 * Das genügt vollständig für Sicherungsdateien mit JSON-Manifest und Medien.
 */

export interface ZipInputEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const UTF8_FLAG = 0x0800;
/** Ab dieser Größe lohnt sich das Komprimieren. */
const COMPRESSION_THRESHOLD = 512;

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
  const day = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { time, date: day };
}

async function pipeThroughStream(data: Uint8Array, stream: ReadableWritablePair<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const source = new Blob([data as BlobPart]).stream() as unknown as ReadableStream<Uint8Array>;
  const buffer = await new Response(source.pipeThrough(stream) as unknown as BodyInit).arrayBuffer();
  return new Uint8Array(buffer);
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    return await pipeThroughStream(data, new CompressionStream('deflate-raw') as ReadableWritablePair<Uint8Array, Uint8Array>);
  } catch {
    return null;
  }
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new ZipError('Dieser Browser kann komprimierte ZIP-Einträge nicht lesen.');
  }
  return pipeThroughStream(data, new DecompressionStream('deflate-raw') as ReadableWritablePair<Uint8Array, Uint8Array>);
}

/* -------------------------------------------------------------- Schreiben */

interface PreparedEntry {
  nameBytes: Uint8Array;
  payload: Uint8Array;
  method: number;
  crc: number;
  uncompressedSize: number;
  offset: number;
}

export async function createZip(entries: ZipInputEntry[], now = new Date()): Promise<Blob> {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);
  const parts: Uint8Array[] = [];
  const prepared: PreparedEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    let payload = entry.data;
    let method = METHOD_STORE;

    if (entry.data.length >= COMPRESSION_THRESHOLD) {
      const compressed = await deflateRaw(entry.data);
      if (compressed && compressed.length < entry.data.length) {
        payload = compressed;
        method = METHOD_DEFLATE;
      }
    }

    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);
    view.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
    view.setUint16(4, 20, true); // benötigte Version
    view.setUint16(6, UTF8_FLAG, true);
    view.setUint16(8, method, true);
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, payload.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);

    parts.push(header, nameBytes, payload);
    prepared.push({ nameBytes, payload, method, crc, uncompressedSize: entry.data.length, offset });
    offset += header.length + nameBytes.length + payload.length;
  }

  const centralStart = offset;
  for (const entry of prepared) {
    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);
    view.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
    view.setUint16(4, 20, true); // erstellt von
    view.setUint16(6, 20, true); // benötigte Version
    view.setUint16(8, UTF8_FLAG, true);
    view.setUint16(10, entry.method, true);
    view.setUint16(12, time, true);
    view.setUint16(14, date, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.payload.length, true);
    view.setUint32(24, entry.uncompressedSize, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true); // extra
    view.setUint16(32, 0, true); // Kommentar
    view.setUint16(34, 0, true); // Datenträger
    view.setUint16(36, 0, true); // interne Attribute
    view.setUint32(38, 0, true); // externe Attribute
    view.setUint32(42, entry.offset, true);

    parts.push(header, entry.nameBytes);
    offset += header.length + entry.nameBytes.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, prepared.length, true);
  endView.setUint16(10, prepared.length, true);
  endView.setUint32(12, offset - centralStart, true);
  endView.setUint32(16, centralStart, true);
  endView.setUint16(20, 0, true);
  parts.push(end);

  return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

/* ----------------------------------------------------------------- Lesen */

export async function readZip(input: ArrayBuffer | Uint8Array): Promise<Map<string, Uint8Array>> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();

  let endOffset = -1;
  const scanLimit = Math.max(0, bytes.length - 22 - 0xffff);
  for (let index = bytes.length - 22; index >= scanLimit; index -= 1) {
    if (view.getUint32(index, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      endOffset = index;
      break;
    }
  }
  if (endOffset < 0) throw new ZipError('Die Datei ist kein gültiges ZIP-Archiv.');

  const entryCount = view.getUint16(endOffset + 10, true);
  let pointer = view.getUint32(endOffset + 16, true);
  const result = new Map<string, Uint8Array>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== CENTRAL_HEADER_SIGNATURE) {
      throw new ZipError('Das ZIP-Verzeichnis ist beschädigt.');
    }
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));

    if (view.getUint32(localOffset, true) !== LOCAL_HEADER_SIGNATURE) {
      throw new ZipError(`Der Eintrag „${name}“ ist beschädigt.`);
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);

    if (!name.endsWith('/')) {
      if (method === METHOD_STORE) result.set(name, raw.slice());
      else if (method === METHOD_DEFLATE) result.set(name, await inflateRaw(raw));
      else throw new ZipError(`Unbekanntes Kompressionsverfahren im Eintrag „${name}“.`);
    }

    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return result;
}

export const textToBytes = (text: string): Uint8Array => new TextEncoder().encode(text);
export const bytesToText = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
