'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang, Mode, Palette, TranslationHistoryItem, View } from './types'
import type { ReleaseInfo } from './update'

export interface SettingsState {
  lang: Lang
  palette: Palette
  textSize: number
  mode: Mode
  favorites: string[]
  recents: string[]
  wotdDate: string
  wotdWord: string
  wotdHistory: string[]
  setLang: (lang: Lang) => void
  setPalette: (palette: Palette) => void
  setTextSize: (size: number) => void
  setMode: (mode: Mode) => void
  toggleFavorite: (word: string) => void
  pushRecent: (word: string) => void
  setWotd: (date: string, word: string) => void
  importSettings: (partial: Partial<SettingsState>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'en',
      palette: 'blue',
      textSize: 2,
      mode: 'system',
      favorites: [],
      recents: [],
      wotdDate: '',
      wotdWord: '',
      wotdHistory: [],
      setLang: (lang) => set({ lang }),
      setPalette: (palette) => set({ palette }),
      setTextSize: (textSize) => set({ textSize }),
      setMode: (mode) => set({ mode }),
      toggleFavorite: (word) =>
        set((s) => ({
          favorites: s.favorites.includes(word)
            ? s.favorites.filter((w) => w !== word)
            : [word, ...s.favorites].slice(0, 500),
        })),
      pushRecent: (word) =>
        set((s) => ({ recents: [word, ...s.recents.filter((w) => w !== word)].slice(0, 100) })),
      setWotd: (date, word) =>
        set((s) => ({ wotdDate: date, wotdWord: word, wotdHistory: [word, ...s.wotdHistory].slice(0, 100) })),
      importSettings: (partial) =>
        set((s) => ({
          lang: partial.lang ?? s.lang,
          palette: partial.palette ?? s.palette,
          textSize: typeof partial.textSize === 'number' ? partial.textSize : s.textSize,
          mode: partial.mode ?? s.mode,
          favorites: Array.isArray(partial.favorites) ? partial.favorites : s.favorites,
          recents: Array.isArray(partial.recents) ? partial.recents : s.recents,
        })),
    }),
    { name: 'dolatzaban-settings' }
  )
)

export interface UiState {
  view: View
  menuOpen: boolean
  word: string | null
  dictLetter: string
  dictQuery: string
  favoritesOnly: boolean
  updateInfo: ReleaseInfo | null
  updateDismissed: boolean
  setView: (view: View) => void
  setMenu: (open: boolean) => void
  setWord: (word: string | null) => void
  setDictLetter: (letter: string) => void
  setDictQuery: (query: string) => void
  setFavoritesOnly: (v: boolean) => void
  setUpdateInfo: (info: ReleaseInfo | null) => void
  setUpdateDismissed: (v: boolean) => void
}

export const useUi = create<UiState>()((set) => ({
  view: 'home',
  menuOpen: false,
  word: null,
  dictLetter: 'a',
  dictQuery: '',
  favoritesOnly: false,
  updateInfo: null,
  updateDismissed: false,
  setView: (view) => set({ view, menuOpen: false }),
  setMenu: (menuOpen) => set({ menuOpen }),
  setWord: (word) => set({ word }),
  setDictLetter: (dictLetter) => set({ dictLetter }),
  setDictQuery: (dictQuery) => set({ dictQuery }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
  setUpdateInfo: (updateInfo) => set({ updateInfo }),
  setUpdateDismissed: (updateDismissed) => set({ updateDismissed }),
}))

export type { TranslationHistoryItem }
