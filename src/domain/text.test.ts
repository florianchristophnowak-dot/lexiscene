import { describe, expect, it } from 'vitest';
import { firstFilled, formatBytes, formatRelativeDays, gapText, slugify, truncate } from './text';

describe('gapText', () => {
  it('ersetzt das längste Wort durch eine Lücke', () => {
    expect(gapText('Je préfère faire du skate.')).toBe('Je … faire du skate.');
  });

  it('behält Satzzeichen bei', () => {
    expect(gapText('On se retrouve à 15 heures ?')).toBe('On se … à 15 heures ?');
  });

  it('kommt mit sehr kurzen Eingaben zurecht', () => {
    expect(gapText('Va !')).toBe('… Va !');
  });
});

describe('Textwerkzeuge', () => {
  it('kürzt mit Auslassungszeichen', () => {
    expect(truncate('Ein sehr langer Text', 10)).toBe('Ein sehr …');
    expect(truncate('kurz', 10)).toBe('kurz');
  });

  it('liefert den ersten gefüllten Wert', () => {
    expect(firstFilled('', '   ', 'dritter')).toBe('dritter');
    expect(firstFilled('', undefined)).toBe('');
  });

  it('erzeugt dateisichere Namen', () => {
    expect(slugify('Freizeit verabreden – Ça te dit ?')).toBe('freizeit-verabreden-ca-te-dit');
    expect(slugify('***')).toBe('sequenz');
  });

  it('formatiert relative Tage auf Deutsch', () => {
    const now = Date.now();
    expect(formatRelativeDays(now, now)).toBe('heute');
    expect(formatRelativeDays(now + 86400000, now)).toBe('morgen');
    expect(formatRelativeDays(now - 3 * 86400000, now)).toBe('vor 3 Tagen');
  });

  it('formatiert Dateigrößen', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

