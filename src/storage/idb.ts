/**
 * Sehr schlanke IndexedDB-Hülle.
 *
 * Bewusst ohne Bibliothek: Es werden nur drei Objektspeicher benötigt.
 * Alle Daten bleiben auf dem Gerät; es gibt keinerlei Netzwerkzugriff.
 */

export const DB_NAME = 'lexiscene';
export const DB_VERSION = 1;
export const STORE_SEQUENCES = 'sequences';
export const STORE_MEDIA = 'media';
export const STORE_SETTINGS = 'settings';

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('Dieser Browser stellt keine lokale Datenbank (IndexedDB) bereit.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SEQUENCES)) db.createObjectStore(STORE_SEQUENCES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_MEDIA)) db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new StorageError('Die lokale Datenbank konnte nicht geöffnet werden.', { cause: request.error }));
    request.onblocked = () =>
      reject(new StorageError('Die Datenbank wird von einem anderen Tab blockiert. Bitte andere LexiScène-Tabs schließen.'));
  });

  return dbPromise;
}

/** Nur für Tests: erzwingt beim nächsten Zugriff eine neue Verbindung. */
export function resetDatabaseHandle(): void {
  dbPromise = null;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new StorageError('Datenbankzugriff fehlgeschlagen.', { cause: request.error }));
  });
}

async function withStore<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(storeNames, mode);
  const result = await run(transaction);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new StorageError('Die Änderung wurde abgebrochen.', { cause: transaction.error }));
    transaction.onerror = () => reject(new StorageError('Die Änderung konnte nicht gespeichert werden.', { cause: transaction.error }));
  });
  return result;
}

export async function getAllRecords<T>(storeName: string): Promise<T[]> {
  return withStore(storeName, 'readonly', (transaction) => promisify<T[]>(transaction.objectStore(storeName).getAll()));
}

export async function getRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return withStore(storeName, 'readonly', (transaction) => promisify<T | undefined>(transaction.objectStore(storeName).get(key)));
}

export async function putRecord<T>(storeName: string, value: T): Promise<void> {
  await withStore(storeName, 'readwrite', (transaction) => {
    transaction.objectStore(storeName).put(value);
  });
}

export async function putRecords<T>(storeName: string, values: T[]): Promise<void> {
  await withStore(storeName, 'readwrite', (transaction) => {
    const store = transaction.objectStore(storeName);
    for (const value of values) store.put(value);
  });
}

export async function deleteRecord(storeName: string, key: IDBValidKey): Promise<void> {
  await withStore(storeName, 'readwrite', (transaction) => {
    transaction.objectStore(storeName).delete(key);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  await withStore(storeName, 'readwrite', (transaction) => {
    transaction.objectStore(storeName).clear();
  });
}

export async function getAllKeys(storeName: string): Promise<IDBValidKey[]> {
  return withStore(storeName, 'readonly', (transaction) => promisify<IDBValidKey[]>(transaction.objectStore(storeName).getAllKeys()));
}
