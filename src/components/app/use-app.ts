'use client'

import { useEffect } from 'react'
import { useSettings, useUi } from '@/lib/store'
import { strings } from '@/lib/i18n'
import { initHistory } from '@/lib/nav'
import { pickWordOfDay, todayStr } from '@/lib/dict'
import { APP_VERSION, checkLatestRelease, isNewerVersion } from '@/lib/update'

export function useT() {
  const lang = useSettings((s) => s.lang)
  return { t: strings[lang], lang, isFa: lang === 'fa' }
}

export function useAppInit() {
  useEffect(() => initHistory(), [])

  const lang = useSettings((s) => s.lang)
  useEffect(() => {
    const d = document.documentElement
    d.lang = lang
    d.dir = lang === 'fa' ? 'rtl' : 'ltr'
  }, [lang])

  const mode = useSettings((s) => s.mode)
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark =
        mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode === 'system') apply()
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const palette = useSettings((s) => s.palette)
  useEffect(() => {
    if (palette === 'green') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = palette
  }, [palette])

  const textSize = useSettings((s) => s.textSize)
  useEffect(() => {
    document.documentElement.style.fontSize = [14, 15, 16, 17.5, 19][textSize] + 'px'
  }, [textSize])

  useEffect(() => {
    const s = useSettings.getState()
    const today = todayStr()
    if (s.wotdDate === today && s.wotdWord) return
    const excluded = [...new Set([...s.recents, ...s.wotdHistory])]
    pickWordOfDay(today, excluded)
      .then((w) => useSettings.getState().setWotd(today, w.w))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const info = await checkLatestRelease()
        if (cancelled) return
        const ui = useUi.getState()
        if (info && isNewerVersion(info.version, APP_VERSION)) ui.setUpdateInfo(info)
        else ui.setUpdateInfo(null)
      } catch {
        /* noop */
      }
    }
    run()
    const iv = setInterval(run, 30 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [])
}
