export type Lang = 'en' | 'fa'
export type Palette = 'green' | 'blue' | 'teal' | 'orange' | 'rose' | 'violet'
export type Mode = 'light' | 'dark' | 'system'
export type View = 'home' | 'dictionary' | 'translate' | 'offline' | 'settings' | 'about'

export type PosCode = 'n' | 'v' | 'adj' | 'adv' | 'prep' | 'conj' | 'pron' | 'interj' | 'num' | 'phr' | 'idm' | 'other'

export interface Meaning {
  p: PosCode
  en: string
  fa: string
  fw: string
  /** subject section, e.g. "computing" */
  s?: string
}

export interface WordEntry {
  w: string
  ipa: string
  m: Meaning[]
  /** inflected forms / alternate spellings */
  al?: string[]
  /** entry came from the extended downloadable pack */
  src?: 'ext'
  /** headword this entry was resolved from (e.g. "walked" -> "walk") */
  via?: string
}

/** Compact in-memory search index of the extended pack. */
export interface ExtIndex {
  w: string[]
  f: string[]
  l: string[]
}

export interface TranslationHistoryItem {
  id?: number
  ts: number
  sl: 'en' | 'fa'
  tl: 'en' | 'fa'
  source: string
  result: string
}
