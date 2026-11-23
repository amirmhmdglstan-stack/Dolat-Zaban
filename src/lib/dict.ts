'use client'

import type { Meaning, WordEntry } from './types'
import { idbGet, idbSet } from './idb'
import { extLetter, extLookup, extSearch, extWordMap, type ExtSearchResults } from './ext'

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

const indexCache = new Map<string, WordEntry[]>()
let lettersIndex: Record<string, number> | null = null
let allLoaded = false
let loadingAll: Promise<void> | null = null
let faIndex: Map<string, string> | null = null
let enWordMap: Map<string, string> | null = null

function hasFa(s: string): boolean {
  return /[\u0621-\u064A\u0670-\u06D3\u200C]/.test(s)
}

export async function getLettersIndex(): Promise<Record<string, number>> {
  if (lettersIndex) return lettersIndex
  const cached = await idbGet<Record<string, number>>('meta', 'letters-index').catch(() => undefined)
  if (cached) {
    lettersIndex = cached
    return cached
  }
  const res = await fetch('/data/letters.json')
  if (!res.ok) throw new Error('index-load-failed')
  const idx = (await res.json()) as Record<string, number>
  lettersIndex = idx
  idbSet('meta', 'letters-index', idx).catch(() => undefined)
  return idx
}

export async function loadLetter(letter: string): Promise<WordEntry[]> {
  const l = letter.toLowerCase()
  if (indexCache.has(l)) return indexCache.get(l)!
  const cached = await idbGet<WordEntry[]>('letters', l).catch(() => undefined)
  if (cached) {
    indexCache.set(l, cached)
    return cached
  }
  const res = await fetch(`/data/${l}.json`)
  if (!res.ok) throw new Error('letter-load-failed')
  const data = (await res.json()) as Record<string, WordEntry[]>
  const words = data[l] ?? []
  indexCache.set(l, words)
  idbSet('letters', l, words).catch(() => undefined)
  return words
}

export async function loadAllLetters(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const idx = await getLettersIndex()
  const keys = Object.keys(idx)
  let loaded = 0
  for (const l of keys) {
    await loadLetter(l)
    loaded++
    onProgress?.(loaded, keys.length)
  }
  allLoaded = true
}

export function ensureAllLoaded(): Promise<void> {
  if (allLoaded) return Promise.resolve()
  if (!loadingAll) {
    loadingAll = loadAllLetters().finally(() => {
      loadingAll = null
    })
  }
  return loadingAll
}

export async function cachedLetters(): Promise<string[]> {
  const { idbKeys } = await import('./idb')
  const keys = await idbKeys('letters').catch(() => [] as IDBValidKey[])
  return keys.map(String).sort()
}

/** Core words of a letter merged with the extended pack (for browsing). */
export async function loadLetterFull(letter: string): Promise<WordEntry[]> {
  const core = await loadLetter(letter).catch(() => [] as WordEntry[])
  const extra = await extLetter(letter).catch(() => [] as WordEntry[])
  if (!extra.length) return core
  const seen = new Set(core.map((w) => w.w))
  return [...core, ...extra.filter((w) => !seen.has(w.w))]
}

export function mergeMeanings(core: Meaning[], extra: Meaning[], max = 4): Meaning[] {
  const seen = new Set(core.map((m) => m.fw.trim()).filter(Boolean))
  const out = [...core]
  for (const m of extra) {
    const key = m.fw.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(m)
    if (out.length >= core.length + max) break
  }
  return out
}

export async function getWordEntry(word: string): Promise<WordEntry | null> {
  const q = word.trim().toLowerCase()
  if (!q) return null
  const l = q[0]
  let core: WordEntry | null = null
  if (LETTERS.includes(l)) {
    const words = await loadLetter(l)
    core = words.find((w) => w.w === q) ?? null
  }
  const extEntry = await extLookup(q).catch(() => null)
  if (core && extEntry) {
    return {
      ...core,
      ipa: core.ipa || extEntry.ipa,
      al: [...new Set([...(core.al ?? []), ...(extEntry.al ?? [])])].slice(0, 8),
      m: mergeMeanings(core.m, extEntry.m),
    }
  }
  return core ?? extEntry
}

export interface SearchResults {
  starts: WordEntry[]
  contains: WordEntry[]
  meanings: WordEntry[]
  ext: ExtSearchResults | null
}

export async function searchDictionary(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return { starts: [], contains: [], meanings: [], ext: null }
  await ensureAllLoaded()
  const all: WordEntry[] = []
  for (const l of LETTERS) {
    const cached = indexCache.get(l)
    if (cached) all.push(...cached)
  }

  const fa = hasFa(q)

  const starts: WordEntry[] = []
  const contains: WordEntry[] = []
  const meanings: WordEntry[] = []

  if (fa) {
    const exact: WordEntry[] = []
    const includes: WordEntry[] = []
    for (const w of all) {
      let strength = 0
      for (const m of w.m) {
        const fw = m.fw.replace(/\u200C/g, ' ')
        if (fw === q) {
          strength = 3
        } else if (strength < 3 && fw.startsWith(q)) {
          strength = Math.max(strength, 2)
        } else if (strength < 2 && (fw.includes(q) || m.fa.includes(q))) {
          strength = Math.max(strength, 1)
        }
        if (strength === 3) break
      }
      if (strength === 3) exact.push(w)
      else if (strength > 0) includes.push(w)
    }
    meanings.push(...exact, ...includes)
  } else {
    for (const w of all) {
      if (w.w.startsWith(q)) starts.push(w)
      else if (w.w.includes(q)) contains.push(w)
    }
    starts.sort((a, b) => a.w.localeCompare(b.w))
    contains.sort((a, b) => a.w.localeCompare(b.w))
  }

  const ext = await extSearch(rawQuery, fa).catch(() => null)
  return { starts, contains, meanings, ext }
}

function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export async function pickWordOfDay(dateStr: string, excluded: string[]): Promise<WordEntry> {
  const idx = await getLettersIndex()
  const letters = Object.keys(idx)
  const total = letters.reduce((sum, l) => sum + idx[l], 0)
  if (!total) throw new Error('empty-dictionary')
  const base = hashStr(dateStr)
  for (let n = 0; n < 60; n++) {
    const globalIdx = (base + n * 7919) % total
    let acc = 0
    let letter = letters[0]
    let inLetter = 0
    for (const l of letters) {
      if (globalIdx < acc + idx[l]) {
        letter = l
        inLetter = globalIdx - acc
        break
      }
      acc += idx[l]
    }
    const words = await loadLetter(letter)
    const entry = words[inLetter]
    if (entry && !excluded.includes(entry.w)) return entry
  }
  const fallback = await loadLetter('a')
  return fallback[hashStr(dateStr) % fallback.length]
}

function normalizeFa(s: string): string {
  return s.replace(/\u200C/g, ' ').replace(/\s+/g, ' ').trim()
}

async function buildFaIndex(): Promise<Map<string, string>> {
  if (faIndex) return faIndex
  await ensureAllLoaded()
  const map = new Map<string, string>()
  for (const l of LETTERS) {
    const words = indexCache.get(l)
    if (!words) continue
    for (const w of words) {
      for (const m of w.m) {
        const key = normalizeFa(m.fw)
        if (key && !map.has(key)) map.set(key, w.w)
      }
    }
  }
  const extMap = await extWordMap().catch(() => null)
  if (extMap) {
    for (const [word, fw] of extMap) {
      const key = normalizeFa(fw)
      if (key && !map.has(key)) map.set(key, word)
    }
  }
  faIndex = map
  return map
}

async function buildEnWordMap(): Promise<Map<string, string>> {
  if (enWordMap) return enWordMap
  await ensureAllLoaded()
  const map = new Map<string, string>()
  for (const l of LETTERS) {
    const words = indexCache.get(l)
    if (!words) continue
    for (const w of words) {
      const fw = w.m[0]?.fw
      if (fw && !map.has(w.w)) map.set(w.w, fw)
    }
  }
  const extMap = await extWordMap().catch(() => null)
  if (extMap) {
    for (const [word, fw] of extMap) {
      if (fw && !map.has(word)) map.set(word, fw)
    }
  }
  enWordMap = map
  return map
}

export async function translateOfflineWordByWord(text: string, dir: 'en2fa' | 'fa2en'): Promise<string> {
  const tokens = text.split(/([\s.,!?;:"'()[\]{}\-]+)/)
  if (dir === 'en2fa') {
    const wordMap = await buildEnWordMap()
    return tokens
      .map((t) => {
        if (!t.trim()) return t
        const hit = wordMap.get(t.toLowerCase())
        return hit ?? t
      })
      .join('')
  }
  const map = await buildFaIndex()
  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (!t.trim()) {
      out.push(t)
      i++
      continue
    }
    let matched = false
    for (let span = 3; span >= 1; span--) {
      const phrase: string[] = []
      let j = i
      let wordsTaken = 0
      while (j < tokens.length && wordsTaken < span) {
        if (tokens[j].trim()) {
          phrase.push(tokens[j])
          wordsTaken++
        }
        j++
      }
      if (wordsTaken < span) continue
      const key = normalizeFa(phrase.join(''))
      const hit = map.get(key)
      if (hit) {
        out.push(hit)
        i = j
        matched = true
        break
      }
    }
    if (!matched) {
      out.push(t)
      i++
    }
  }
  return out.join('')
}

export function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
