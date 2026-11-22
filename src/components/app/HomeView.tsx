'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSettings, useUi } from '@/lib/store'
import { getWordEntry } from '@/lib/dict'
import { openWordSheet } from '@/lib/nav'
import { useT } from './use-app'
import type { WordEntry } from '@/lib/types'
import { ChevronDown, History, Loader2 } from 'lucide-react'

function useGreeting(): { greeting: string; sub: string } {
  const { t } = useT()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(iv)
  }, [])
  const h = now.getHours()
  let greeting = t.goodNight
  if (h >= 5 && h < 12) greeting = t.goodMorning
  else if (h >= 12 && h < 17) greeting = t.goodNoon
  else if (h >= 17 && h < 21) greeting = t.goodAfternoon
  const dayIndex = Math.floor(now.getTime() / 86400000)
  const sub = t.homeSubs[dayIndex % t.homeSubs.length]
  return { greeting, sub }
}

function WordOfDayCard() {
  const { t } = useT()
  const wotdWord = useSettings((s) => s.wotdWord)
  const [data, setData] = useState<{ word: string; entry: WordEntry | null } | null>(null)

  useEffect(() => {
    if (!wotdWord) return
    let active = true
    getWordEntry(wotdWord)
      .then((w) => {
        if (active) setData({ word: wotdWord, entry: w })
      })
      .catch(() => {
        if (active) setData({ word: wotdWord, entry: null })
      })
    return () => {
      active = false
    }
  }, [wotdWord])

  const entry = data?.word === wotdWord ? data.entry : null
  const failed = Boolean(wotdWord) && data?.word === wotdWord && data.entry === null

  if (!wotdWord || failed) return null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      onClick={() => openWordSheet(wotdWord)}
      className="brand-gradient relative min-h-[38dvh] w-full overflow-hidden rounded-3xl p-6 text-start shadow-lg shadow-primary/20 transition-transform active:scale-[0.985]"
      aria-label={t.wordOfDay}
    >
      <div className="pointer-events-none absolute -end-14 -top-14 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-24 -start-12 h-48 w-48 rounded-full bg-white/[0.07]" />
      <div className="relative flex h-full min-h-[inherit] flex-col justify-between py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">{t.wordOfDay}</p>
        {entry ? (
          <div className="space-y-3">
            <p dir="ltr" className="font-en text-left text-[42px] font-extrabold leading-none text-white">
              {entry.w}
            </p>
            <p dir="ltr" className="font-en text-left text-sm text-white/80">
              /{entry.ipa}/
            </p>
            {entry.m[0]?.fw && (
              <span
                dir="rtl"
                className="font-fa inline-block rounded-full bg-white/20 px-3.5 py-1.5 text-[15px] font-medium text-white backdrop-blur-sm"
              >
                {entry.m[0].fw}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/80">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-white/90">
          {t.tapToSeeMore}
          <ChevronDown className="h-4 w-4" />
        </p>
      </div>
    </motion.button>
  )
}

export function HomeView() {
  const { t } = useT()
  const { greeting, sub } = useGreeting()
  const recents = useSettings((s) => s.recents)
  const menuOpen = useUi((s) => s.menuOpen)

  return (
    <div className="px-4 pb-10 pt-6">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{greeting}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{sub}</p>
      </motion.section>

      <div className="mt-5">
        <WordOfDayCard />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="mt-7"
      >
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <History className="h-4.5 w-4.5 text-primary" />
          {t.recentlyViewed}
        </h2>
        {recents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            {t.noRecentsHint}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
              {recents.slice(0, 30).map((word) => (
                <li key={word}>
                  <button
                    onClick={() => openWordSheet(word)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent"
                  >
                    <span className="font-en flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold uppercase text-primary">
                      {word[0]}
                    </span>
                    <span dir="ltr" className="font-en flex-1 truncate text-left text-[15px] font-medium">
                      {word}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.section>
    </div>
  )
}
