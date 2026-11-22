'use client'

import type { WordEntry } from './types'
import { idbGet, idbSet } from './idb'

export const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

const indexCache = new Map<string, WordEntry[]>()
let lettersIndex: Record<string, number> | null = null
let allLoaded = false
let loadingAll: Promise<void> | null = null
let faIndex: Map<string, string> | null = null

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

export async function getWordEntry(word: string): Promise<WordEntry | null> {
  const l = word.trim().toLowerCase()[0]
  if (!l || !LETTERS.includes(l)) return null
  const words = await loadLetter(l)
  return words.find((w) => w.w === word.trim().toLowerCase()) ?? null
}

export interface SearchResults {
  starts: WordEntry[]
  contains: WordEntry[]
  meanings: WordEntry[]
}

export async function searchDictionary(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return { starts: [], contains: [], meanings: [] }
  await ensureAllLoaded()
  const all: WordEntry[] = []
  for (const l of LETTERS) {
    const cached = indexCache.get(l)
    if (cached) all.push(...cached)
  }
  if (hasFa(q)) {
    const exact: WordEntry[] = []
    const includes: WordEntry[] = []
    for (const w of all) {
      let strength = 0
      for (const m of w.m) {
        const fw = m.fw.replace(/\u200C/g, ' ')
        if (fw === q) strength = 3
        else if (fw.startsWith(q)) strength = Math.max(strength, 2)
        else if (fw.includes(q)) strength = Math.max(strength, 1)
        else if (m.fa.includes(q)) strength = Math.max(strength, 1)
        if (strength === 3) break
      }
      if (strength === 3) exact.push(w)
      else if (strength > 0) includes.push(w)
    }
    return { starts: [], contains: [], meanings: [...exact, ...includes] }
  }
  const starts: WordEntry[] = []
  const contains: WordEntry[] = []
  for (const w of all) {
    if (w.w.startsWith(q)) starts.push(w)
    else if (w.w.includes(q)) contains.push(w)
  }
  starts.sort((a, b) => a.w.localeCompare(b.w))
  contains.sort((a, b) => a.w.localeCompare(b.w))
  return { starts, contains, meanings: [] }
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
  faIndex = map
  return map
}

export async function translateOfflineWordByWord(text: string, dir: 'en2fa' | 'fa2en'): Promise<string> {
  const tokens = text.split(/([\s.,!?;:"'()[\]{}\-]+)/)
  if (dir === 'en2fa') {
    const words = await loadAllLettersSilent()
    const wordMap = new Map<string, string>()
    for (const w of words) {
      const fw = w.m[0]?.fw
      if (fw) wordMap.set(w.w, fw)
    }
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

async function loadAllLettersSilent(): Promise<WordEntry[]> {
  await ensureAllLoaded()
  const all: WordEntry[] = []
  for (const l of LETTERS) {
    const cached = indexCache.get(l)
    if (cached) all.push(...cached)
  }
  return all
}

export function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
