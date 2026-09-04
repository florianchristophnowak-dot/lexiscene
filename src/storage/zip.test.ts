// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { bytesToText, createZip, crc32, readZip, textToBytes, ZipError } from './zip';

async function zipBytes(entries: { name: string; data: Uint8Array }[]): Promise<Uint8Array> {
  const blob = await createZip(entries);
  return new Uint8Array(await blob.arrayBuffer());
}

describe('crc32', () => {
  it('entspricht dem bekannten Prüfwert', () => {
    expect(crc32(textToBytes('123456789')).toString(16)).toBe('cbf43926');
  });
});

describe('ZIP', () => {
  it('schreibt und liest kleine Einträge unkomprimiert', async () => {
    const bytes = await zipBytes([{ name: 'manifest.json', data: textToBytes('{"a":1}') }]);
    const files = await readZip(bytes);
    expect(bytesToText(files.get('manifest.json')!)).toBe('{"a":1}');
  });

  it('komprimiert große Einträge und liest sie wieder', async () => {
    const text = 'Ça te dit de… ? '.repeat(400);
    const bytes = await zipBytes([{ name: 'manifest.json', data: textToBytes(text) }]);
    expect(bytes.length).toBeLessThan(textToBytes(text).length);
    const files = await readZip(bytes);
    expect(bytesToText(files.get('manifest.json')!)).toBe(text);
  });

  it('erhält Binärdaten und Umlaute in Dateinamen', async () => {
    const binary = new Uint8Array(1024);
    for (let index = 0; index < binary.length; index += 1) binary[index] = (index * 37) % 256;
    const bytes = await zipBytes([
      { name: 'media/bild-öäü.png', data: binary },
      { name: 'LIESMICH.txt', data: textToBytes('Hinweis') },
    ]);
    const files = await readZip(bytes);
    expect(Array.from(files.keys())).toEqual(['media/bild-öäü.png', 'LIESMICH.txt']);
    expect(files.get('media/bild-öäü.png')).toEqual(binary);
  });

  it('meldet ungültige Archive verständlich', async () => {
    await expect(readZip(textToBytes('keine zip-datei'))).rejects.toBeInstanceOf(ZipError);
  });
});
