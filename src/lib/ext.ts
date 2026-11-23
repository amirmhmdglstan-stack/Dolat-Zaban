'use client'

import type { ExtIndex, WordEntry } from './types'
import { idbClear, idbDelete, idbGet, idbKeys, idbSet } from './idb'
import { EXT_PACK } from './ext-pack'

export interface ExtMeta {
  version: string
  words: number
  meanings: number
  installedAt: number
}

export interface ExtStatus {
  installed: boolean
  meta: ExtMeta | null
  updateAvailable: boolean
}

let indexCache: ExtIndex | null = null
let aliasCache: Map<string, string> | null = null
let loadingIndex: Promise<{ index: ExtIndex; aliases: Map<string, string> } | null> | null = null

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function bucketOf(w: string): string {
  const c = w[0]
  return c >= 'a' && c <= 'z' ? c : '#'
}

export async function extStatus(): Promise<ExtStatus> {
  const meta = (await idbGet<ExtMeta>('meta', 'ext-meta').catch(() => undefined)) ?? null
  return {
    installed: Boolean(meta),
    meta,
    updateAvailable: meta ? meta.version !== EXT_PACK.version : false,
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

async function fetchPack(onPhase: (phase: 'downloading' | 'processing', done: number, total: number) => void): Promise<string> {
  // try the locally bundled copy first (dev / optional), then the release asset
  const sources = ['/data/dict-ext.json.gz', EXT_PACK.url]
  let res: Response | null = null
  for (const url of sources) {
    try {
      res = await fetch(url)
      if (res.ok) break
      res = null
    } catch {
      res = null
    }
  }
  if (!res || !res.body) throw new Error('pack-unreachable')

  const total = Number(res.headers.get('content-length')) || EXT_PACK.gzBytes
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.length
      onPhase('downloading', received, total)
    }
  }
  const gz = new Blob(chunks as BlobPart[])

  onPhase('processing', 0, 1)
  // DecompressionStream is available in every modern WebView / Electron
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream
  if (!DS) throw new Error('no-decompression')
  const stream = gz.stream().pipeThrough(new DS('gzip'))
  return await new Response(stream).text()
}

export async function installExtPack(
  onPhase: (phase: 'downloading' | 'processing', done: number, total: number) => void
): Promise<ExtMeta> {
  const text = await withTimeout(fetchPack(onPhase), 10 * 60 * 1000)
  const pack = JSON.parse(text) as { v: number; words: WordEntry[] }
  if (!pack?.words?.length) throw new Error('pack-empty')

  const byLetter = new Map<string, WordEntry[]>()
  const w: string[] = []
  const f: string[] = []
  const l: string[] = []
  const aliases: Record<string, string> = {}

  for (const e of pack.words) {
    const bucket = bucketOf(e.w)
    if (!byLetter.has(bucket)) byLetter.set(bucket, [])
    byLetter.get(bucket)!.push(e)
    w.push(e.w)
    f.push(e.m[0]?.fw ?? '')
    l.push(bucket)
    for (const a of e.al ?? []) {
      if (!(a in aliases)) aliases[a] = e.w
    }
  }

  onPhase('processing', 1, 2)
  await idbClear('ext').catch(() => undefined)
  let n = 0
  for (const [letter, words] of byLetter) {
    await idbSet('ext', letter, words)
    n++
    onPhase('processing', n, byLetter.size + 2)
  }

  const index: ExtIndex = { w, f, l }
  await idbSet('meta', 'ext-index', index)
  await idbSet('meta', 'ext-aliases', aliases)
  const meta: ExtMeta = {
    version: EXT_PACK.version,
    words: w.length,
    meanings: pack.words.reduce((s, e) => s + e.m.length, 0),
    installedAt: Date.now(),
  }
  await idbSet('meta', 'ext-meta', meta)

  indexCache = index
  aliasCache = new Map(Object.entries(aliases))
  return meta
}

export async function deleteExtPack(): Promise<void> {
  await idbClear('ext').catch(() => undefined)
  await idbDelete('meta', 'ext-index').catch(() => undefined)
  await idbDelete('meta', 'ext-aliases').catch(() => undefined)
  await idbDelete('meta', 'ext-meta').catch(() => undefined)
  indexCache = null
  aliasCache = null
  loadingIndex = null
}

async function ensureIndex(): Promise<{ index: ExtIndex; aliases: Map<string, string> } | null> {
  if (indexCache && aliasCache) return { index: indexCache, aliases: aliasCache }
  if (!loadingIndex) {
    loadingIndex = (async () => {
      const meta = await idbGet<ExtMeta>('meta', 'ext-meta').catch(() => undefined)
      if (!meta) return null
      const index = await idbGet<ExtIndex>('meta', 'ext-index').catch(() => undefined)
      const aliases = await idbGet<Record<string, string>>('meta', 'ext-aliases').catch(() => undefined)
      if (!index) return null
      indexCache = index
      aliasCache = new Map(Object.entries(aliases ?? {}))
      return { index, aliases: aliasCache }
    })().finally(() => {
      loadingIndex = null
    })
  }
  return loadingIndex
}

export async function extInstalled(): Promise<boolean> {
  const meta = await idbGet<ExtMeta>('meta', 'ext-meta').catch(() => undefined)
  return Boolean(meta)
}

/** Full entry for one word (or its headword via inflected form). */
export async function extLookup(word: string): Promise<WordEntry | null> {
  const got = await ensureIndex()
  if (!got) return null
  const q = word.trim().toLowerCase()
  if (!q) return null
  let head = q
  let via: string | undefined
  const direct = got.index.w.indexOf(q)
  if (direct < 0) {
    const alias = got.aliases.get(q)
    if (!alias) return null
    head = alias
    via = alias
  }
  const bucket = bucketOf(head)
  const words = await idbGet<WordEntry[]>('ext', bucket).catch(() => undefined)
  const entry = words?.find((e) => e.w === head)
  if (!entry) return null
  return { ...entry, src: 'ext', ...(via ? { via } : {}) }
}

/** Entries for one bucket (letter) — used when browsing. */
export async function extLetter(letter: string): Promise<WordEntry[]> {
  const words = await idbGet<WordEntry[]>('ext', letter.toLowerCase()).catch(() => undefined)
  return words ?? []
}

export interface ExtSearchResults {
  starts: WordEntry[]
  contains: WordEntry[]
  meanings: WordEntry[]
}

function liteEntry(index: ExtIndex, i: number): WordEntry {
  return {
    w: index.w[i],
    ipa: '',
    m: [{ p: 'other', en: '', fa: '', fw: index.f[i] }],
    src: 'ext',
  }
}

export async function extSearch(rawQuery: string, hasFa: boolean, limit = 40): Promise<ExtSearchResults> {
  const got = await ensureIndex()
  if (!got) return { starts: [], contains: [], meanings: [] }
  const q = rawQuery.trim().toLowerCase()
  if (!q) return { starts: [], contains: [], meanings: [] }
  const { index, aliases } = got
  const starts: WordEntry[] = []
  const contains: WordEntry[] = []
  const meanings: WordEntry[] = []

  for (let i = 0; i < index.w.length; i++) {
    const word = index.w[i]
    if (hasFa) {
      const fw = index.f[i].replace(/\u200C/g, ' ')
      if (fw && (fw === q || fw.startsWith(q) || fw.includes(q))) {
        if (meanings.length < limit) meanings.push(liteEntry(index, i))
      }
      continue
    }
    if (word.startsWith(q)) {
      if (starts.length < limit) starts.push(liteEntry(index, i))
    } else if (word.includes(q)) {
      if (contains.length < limit) contains.push(liteEntry(index, i))
    }
    if (starts.length >= limit && contains.length >= limit) break
  }

  // inflected forms matching the query surface their headword
  if (!hasFa) {
    let added = 0
    for (const [alias, head] of aliases) {
      if (added >= 10) break
      if (alias.startsWith(q) && alias !== q) {
        const i = index.w.indexOf(head)
        if (i >= 0 && !starts.some((e) => e.w === head)) {
          starts.push({ ...liteEntry(index, i), via: alias })
          added++
        }
      }
    }
  }
  return { starts, contains, meanings }
}

/** word -> one-word Persian translation for the offline translator. */
export async function extWordMap(): Promise<Map<string, string> | null> {
  const got = await ensureIndex()
  if (!got) return null
  const map = new Map<string, string>()
  for (let i = 0; i < got.index.w.length; i++) {
    if (!map.has(got.index.w[i])) map.set(got.index.w[i], got.index.f[i])
  }
  return map
}

export async function extCachedLetters(): Promise<string[]> {
  const keys = await idbKeys('ext').catch(() => [] as IDBValidKey[])
  return keys.map(String).sort()
}
