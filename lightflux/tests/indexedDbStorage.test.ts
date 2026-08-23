import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeRequest<T = unknown> {
  error: Error | null;
  result: T;
  onblocked: (() => void) | null;
  onerror: (() => void) | null;
  onsuccess: (() => void) | null;
  onupgradeneeded: (() => void) | null;
}

const request = <T,>(result: T): FakeRequest<T> => ({
  error: null,
  result,
  onblocked: null,
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null,
});

const createIndexedDb = (records: Map<string, string>) => ({
  open: () => {
    const openRequest = request<unknown>(undefined);
    queueMicrotask(() => {
      const database = {
        objectStoreNames: {
          contains: () => true,
        },
        transaction: (_name: string, mode: IDBTransactionMode) => {
          const transaction = {
            error: null,
            onabort: null as (() => void) | null,
            oncomplete: null as (() => void) | null,
            onerror: null as (() => void) | null,
            objectStore: () => ({
              get: (key: string) => {
                const getRequest = request<string | undefined>(undefined);
                queueMicrotask(() => {
                  getRequest.result = records.get(key);
                  getRequest.onsuccess?.();
                });
                return getRequest;
              },
              delete: (key: string) => {
                const deleteRequest = request(undefined);
                queueMicrotask(() => {
                  records.delete(key);
                  deleteRequest.onsuccess?.();
                  queueMicrotask(() => transaction.oncomplete?.());
                });
                return deleteRequest;
              },
              put: (value: string, key: string) => {
                const putRequest = request(key);
                queueMicrotask(() => {
                  records.set(key, value);
                  putRequest.onsuccess?.();
                  queueMicrotask(() => transaction.oncomplete?.());
                });
                return putRequest;
              },
            }),
          };
          expect(['readonly', 'readwrite']).toContain(mode);
          return transaction;
        },
      };
      openRequest.result = database;
      openRequest.onsuccess?.();
    });
    return openRequest;
  },
});

describe('indexedDbStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('moves a matching localStorage value and keeps business keys isolated', async () => {
    const records = new Map<string, string>();
    const localRecords = new Map([
      ['lightflux.app-state.v12', 'local-app-state'],
    ]);
    vi.stubGlobal('indexedDB', createIndexedDb(records));
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localRecords.get(key) ?? null,
      removeItem: (key: string) => localRecords.delete(key),
      setItem: (key: string, value: string) =>
        localRecords.set(key, value),
    });
    vi.resetModules();

    const { deleteWebState, loadWebState, saveWebState } = await import(
      '../services/indexedDbStorage'
    );

    await expect(loadWebState('lightflux.app-state.v12')).resolves.toBe(
      'local-app-state',
    );
    await expect(
      loadWebState('lightflux.agent-runtime.v1'),
    ).resolves.toBeNull();

    await saveWebState('lightflux.app-state.v12', 'next-app-state');
    await saveWebState('lightflux.agent-runtime.v1', 'agent-runtime');

    await expect(loadWebState('lightflux.app-state.v12')).resolves.toBe(
      'next-app-state',
    );
    await expect(
      loadWebState('lightflux.agent-runtime.v1'),
    ).resolves.toBe('agent-runtime');

    await deleteWebState('lightflux.app-state.v12');
    expect(records.has('lightflux.app-state.v12')).toBe(false);
    expect(localRecords.has('lightflux.app-state.v12')).toBe(false);
    expect(localRecords.has('lightflux.app-state.v12.backup')).toBe(false);
  });
});
