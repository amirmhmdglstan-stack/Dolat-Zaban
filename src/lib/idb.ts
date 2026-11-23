'use client'

const DB_NAME = 'dolat-zaban'
const DB_VERSION = 2

export type StoreName = 'letters' | 'history' | 'meta' | 'ext'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-idb'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('letters')) db.createObjectStore('letters')
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
      if (!db.objectStoreNames.contains('ext')) db.createObjectStore('ext')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      })
  )
}

export function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  return tx<T>(store, 'readonly', (s) => s.get(key))
}

export function idbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  return tx(store, 'readwrite', (s) => s.put(value, key)).then(() => undefined)
}

export function idbDelete(store: StoreName, key: string): Promise<void> {
  return tx(store, 'readwrite', (s) => s.delete(key)).then(() => undefined)
}

export function idbClear(store: StoreName): Promise<void> {
  return tx(store, 'readwrite', (s) => s.clear()).then(() => undefined)
}

export function idbKeys(store: StoreName): Promise<IDBValidKey[]> {
  return tx<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys())
}

export async function idbHistoryAll(): Promise<import('./types').TranslationHistoryItem[]> {
  const items = await tx<import('./types').TranslationHistoryItem[]>('history', 'readonly', (s) => s.getAll())
  return items ?? []
}

export async function idbHistoryAdd(item: import('./types').TranslationHistoryItem): Promise<void> {
  const all = await idbHistoryAll()
  const dup = all.find((h) => h.source === item.source && h.sl === item.sl && h.tl === item.tl)
  if (dup) return
  const rest = all.filter((h) => h !== dup).slice(0, 199)
  await idbClear('history')
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction('history', 'readwrite')
    const s = t.objectStore('history')
    ;[item, ...rest].forEach((h) => s.add({ ts: h.ts, sl: h.sl, tl: h.tl, source: h.source, result: h.result }))
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export function idbDeleteDatabase(): Promise<void> {
  dbPromise = null
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

export async function idbStorageSize(): Promise<number> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (est?.usage) return est.usage
  } catch {
    /* noop */
  }
  let total = 0
  for (const store of ['letters', 'history', 'ext'] as StoreName[]) {
    const vals = await tx<unknown[]>(store, 'readonly', (s) => s.getAll()).catch(() => [])
    for (const v of vals ?? []) total += JSON.stringify(v).length
  }
  return total
}
