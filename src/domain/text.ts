/** Kleine Textwerkzeuge ohne Abhängigkeiten. */

/** Ersetzt das längste Wort durch eine Lücke – für Chunk-Ergänzungen. */
export function gapText(text: string, placeholder = '…'): string {
  const tokens = text.split(/(\s+)/);
  let bestIndex = -1;
  let bestLength = 0;
  tokens.forEach((token, index) => {
    if (/^\s+$/.test(token)) return;
    const length = token.replace(/[^\p{L}\p{N}]/gu, '').length;
    if (length > bestLength && length > 2) {
      bestLength = length;
      bestIndex = index;
    }
  });
  if (bestIndex < 0) return `${placeholder} ${text}`.trim();
  tokens[bestIndex] = tokens[bestIndex].replace(/[\p{L}\p{N}'’-]+/u, placeholder);
  return tokens.join('');
}

export function truncate(text: string, max: number): string {
  const value = text.trim();
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

export function firstFilled(...values: (string | undefined)[]): string {
  return values.find((value) => value && value.trim())?.trim() ?? '';
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'sequenz'
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(timestamp: number): string {
  return DATE_FORMAT.format(new Date(timestamp));
}

export function formatDateTime(timestamp: number): string {
  return DATE_TIME_FORMAT.format(new Date(timestamp));
}

const DAY = 24 * 60 * 60 * 1000;

export function formatRelativeDays(timestamp: number, now = Date.now()): string {
  const days = Math.round((timestamp - now) / DAY);
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'gestern';
  if (days > 1) return `in ${days} Tagen`;
  return `vor ${Math.abs(days)} Tagen`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
