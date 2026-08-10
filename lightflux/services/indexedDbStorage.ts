const DATABASE_NAME = 'lightflux';
const DATABASE_VERSION = 1;
const STORE_NAME = 'app-state';
const STATE_KEY = 'current';

interface WebStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const runtime = globalThis as typeof globalThis & {
  indexedDB?: IDBFactory;
  localStorage?: WebStorage;
};

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (!runtime.indexedDB) {
    return Promise.reject(new Error('IndexedDB is unavailable.'));
  }

  if (!databasePromise) {
    const openingPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = runtime.indexedDB?.open(DATABASE_NAME, DATABASE_VERSION);
      if (!request) {
        reject(new Error('Unable to open IndexedDB.'));
        return;
      }

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Unable to open IndexedDB.'));
      request.onblocked = () =>
        reject(new Error('The IndexedDB upgrade was blocked.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
    databasePromise = openingPromise;
    return openingPromise;
  }

  return databasePromise;
};

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed.'));
  });

const transactionComplete = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });

const readIndexedState = async (): Promise<string | null> => {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const value = await requestResult(
    transaction.objectStore(STORE_NAME).get(STATE_KEY),
  );
  return typeof value === 'string' ? value : null;
};

const writeIndexedState = async (value: string): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const completion = transactionComplete(transaction);
  await requestResult(
    transaction.objectStore(STORE_NAME).put(value, STATE_KEY),
  );
  await completion;
};

export const loadWebState = async (
  legacyStorageKey: string,
): Promise<string | null> => {
  try {
    const indexedState = await readIndexedState();
    if (indexedState) {
      return indexedState;
    }

    const legacyState = runtime.localStorage?.getItem(legacyStorageKey);
    if (legacyState) {
      await writeIndexedState(legacyState);
      runtime.localStorage?.setItem(
        `${legacyStorageKey}.backup`,
        legacyState,
      );
      runtime.localStorage?.removeItem(legacyStorageKey);
      return legacyState;
    }
    return null;
  } catch (error) {
    console.warn('IndexedDB is unavailable; using localStorage.', error);
    return runtime.localStorage?.getItem(legacyStorageKey) ?? null;
  }
};

export const saveWebState = async (
  legacyStorageKey: string,
  value: string,
): Promise<void> => {
  try {
    await writeIndexedState(value);
  } catch (error) {
    console.warn('Unable to save IndexedDB state; using localStorage.', error);
    runtime.localStorage?.setItem(legacyStorageKey, value);
  }
};
