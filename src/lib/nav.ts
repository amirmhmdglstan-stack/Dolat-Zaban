'use client'

import { useUi, useSettings } from './store'
import type { View } from './types'

interface DzState {
  dz: true
  view: View
  word?: string
  menu?: boolean
}

export function goView(view: View) {
  const ui = useUi.getState()
  ui.setView(view)
  const prev = (history.state as DzState | null) ?? undefined
  if (prev?.view === view && !prev.word && !prev.menu) return
  history.pushState({ dz: true, view } satisfies DzState, '')
}

export function openWordSheet(word: string) {
  const settings = useSettings.getState()
  settings.pushRecent(word)
  const ui = useUi.getState()
  ui.setWord(word)
  const cur = (history.state as DzState | null) ?? { dz: true as const, view: 'home' as View }
  history.pushState({ ...cur, word } satisfies DzState, '')
}

export function closeWordSheet() {
  const s = history.state as DzState | null
  if (s?.word) history.back()
  else useUi.getState().setWord(null)
}

export function setMenuOpen(open: boolean) {
  const s = (history.state as DzState | null) ?? { dz: true as const, view: 'home' as View }
  if (open) {
    useUi.getState().setMenu(true)
    history.pushState({ ...s, menu: true } satisfies DzState, '')
  } else if (s?.menu) {
    history.back()
  } else {
    useUi.getState().setMenu(false)
  }
}

export function initHistory(): () => void {
  const ui = useUi.getState()
  history.replaceState({ dz: true, view: ui.view } satisfies DzState, '')
  const onPop = (e: PopStateEvent) => {
    const s = e.state as DzState | null
    const u = useUi.getState()
    if (s && s.dz) {
      const targetView = s.view ?? 'home'
      if (u.view !== targetView) u.setView(targetView)
      u.setMenu(Boolean(s.menu))
      u.setWord(s.word ?? null)
    } else {
      history.replaceState({ dz: true, view: 'home' } satisfies DzState, '')
      u.setView('home')
      u.setMenu(false)
      u.setWord(null)
    }
  }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}
