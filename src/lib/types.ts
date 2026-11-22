export type Lang = 'en' | 'fa'
export type Palette = 'blue' | 'teal' | 'green' | 'orange' | 'rose' | 'violet'
export type Mode = 'light' | 'dark' | 'system'
export type View = 'home' | 'dictionary' | 'translate' | 'offline' | 'settings' | 'about'

export type PosCode = 'n' | 'v' | 'adj' | 'adv' | 'prep' | 'conj' | 'pron' | 'interj' | 'num' | 'phr' | 'idm'

export interface Meaning {
  p: PosCode
  en: string
  fa: string
  fw: string
}

export interface WordEntry {
  w: string
  ipa: string
  m: Meaning[]
}

export interface TranslationHistoryItem {
  id?: number
  ts: number
  sl: 'en' | 'fa'
  tl: 'en' | 'fa'
  source: string
  result: string
}
