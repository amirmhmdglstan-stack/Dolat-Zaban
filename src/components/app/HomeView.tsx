'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSettings, useUi } from '@/lib/store'
import { getWordEntry } from '@/lib/dict'
import { openWordSheet, goView } from '@/lib/nav'
import { useT } from './use-app'
import type { WordEntry } from '@/lib/types'
import { ChevronDown, History, Loader2, Search, BookOpen, Languages, FolderDown, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'

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
      className="brand-gradient relative min-h-[34dvh] w-full overflow-hidden rounded-3xl p-6 text-start shadow-lg shadow-primary/25 transition-transform active:scale-[0.985]"
      aria-label={t.wordOfDay}
    >
      <div className="pointer-events-none absolute -end-14 -top-14 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-24 -start-12 h-48 w-48 rounded-full bg-white/[0.07]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="relative flex h-full min-h-[inherit] flex-col justify-between py-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
          <Sparkles className="h-3.5 w-3.5" />
          {t.wordOfDay}
        </p>
        {entry ? (
          <div className="space-y-3">
            <p dir="ltr" className="font-en text-left text-[42px] font-extrabold leading-none text-white drop-shadow-sm">
              {entry.w}
            </p>
            {entry.ipa && (
              <p dir="ltr" className="font-en text-left text-sm text-white/80">
                /{entry.ipa}/
              </p>
            )}
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

function QuickActions() {
  const { t } = useT()
  const items = [
    { key: 'dictionary' as const, label: t.dictionary, icon: BookOpen },
    { key: 'translate' as const, label: t.translate, icon: Languages },
    { key: 'offline' as const, label: t.offlineContent, icon: FolderDown },
  ]
  return (
    <div className="mt-5 grid grid-cols-3 gap-2.5">
      {items.map((item, i) => (
        <motion.button
          key={item.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.06 + i * 0.05 }}
          onClick={() => goView(item.key)}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-2 py-4 text-center transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <item.icon className="h-5 w-5" />
          </span>
          <span className="text-[12px] font-semibold leading-tight">{item.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

function HomeSearch() {
  const { t } = useT()
  const setDictQuery = useUi((s) => s.setDictQuery)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    const q = value.trim()
    if (!q || busy) {
      if (!q) goView('dictionary')
      return
    }
    setBusy(true)
    try {
      setDictQuery(q)
      goView('dictionary')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative mt-5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') go()
        }}
        placeholder={t.searchPlaceholder}
        dir="ltr"
        className="font-en h-12 rounded-2xl bg-card pe-12 text-[15px] shadow-sm"
        aria-label={t.search}
      />
      <button
        onClick={go}
        aria-label={t.search}
        className="absolute inset-y-0 end-1.5 flex w-10 items-center justify-center rounded-xl text-primary"
      >
        {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Search className="h-[18px] w-[18px]" />}
      </button>
    </div>
  )
}

export function HomeView() {
  const { t } = useT()
  const { greeting, sub } = useGreeting()
  const recents = useSettings((s) => s.recents)

  return (
    <div className="px-4 pb-10 pt-6">
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{greeting}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{sub}</p>
      </motion.section>

      <HomeSearch />
      <QuickActions />

      <div className="mt-6">
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
