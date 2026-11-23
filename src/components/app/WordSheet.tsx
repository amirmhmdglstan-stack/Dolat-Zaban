'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings, useUi } from '@/lib/store'
import { getWordEntry } from '@/lib/dict'
import { closeWordSheet, openWordSheet } from '@/lib/nav'
import { useT } from './use-app'
import { POS_META, sectionLabel } from './pos'
import { speak, hasVoiceFor } from '@/lib/tts'
import { lookupOnline, type OnlineEntry } from '@/lib/online-dict'
import { translateText } from '@/lib/translate'
import type { WordEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Volume2,
  Heart,
  X,
  Loader2,
  Copy,
  Share2,
  Globe,
  Languages,
  WifiOff,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

function OnlineSection({ word }: { word: string }) {
  const { t, lang } = useT()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')
  const [entries, setEntries] = useState<OnlineEntry[]>([])
  const [translated, setTranslated] = useState<Record<string, string>>({})
  const [busyDef, setBusyDef] = useState<string | null>(null)

  const run = () => {
    setState('loading')
    lookupOnline(word)
      .then((e) => {
        setEntries(e)
        setState('done')
      })
      .catch(() => setState('failed'))
  }

  const translateDef = async (def: string) => {
    if (translated[def]) {
      setTranslated((s) => {
        const next = { ...s }
        delete next[def]
        return next
      })
      return
    }
    setBusyDef(def)
    try {
      const r = await translateText(def, 'en', 'fa')
      setTranslated((s) => ({ ...s, [def]: r.text }))
    } catch {
      toast.error(t.translateFailed)
    } finally {
      setBusyDef(null)
    }
  }

  return (
    <div className="mt-7">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        {t.onlineTitle}
      </h3>
      {state === 'idle' && (
        <Button variant="outline" className="w-full rounded-2xl" onClick={run}>
          <Globe className="h-4 w-4" />
          {t.onlineSearch}
        </Button>
      )}
      {state === 'loading' && (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.onlineSearching}
        </p>
      )}
      {state === 'failed' && (
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
            <WifiOff className="h-4 w-4 shrink-0" />
            {t.onlineNoResult}
          </p>
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={run}>
            {t.retry}
          </Button>
        </div>
      )}
      {state === 'done' && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((e, ei) => (
            <div key={ei} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-primary/[0.06] px-4 py-2.5">
                <div className="min-w-0">
                  <p dir="ltr" className="font-en truncate text-left text-[15px] font-bold">
                    {e.word}
                  </p>
                  {e.phonetic && (
                    <p dir="ltr" className="font-en text-left text-xs text-muted-foreground">
                      {e.phonetic}
                    </p>
                  )}
                </div>
                {e.audio && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg text-primary"
                    aria-label={t.listen}
                    onClick={() => new Audio(e.audio).play().catch(() => undefined)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="divide-y divide-border/60">
                {e.meanings.map((m, mi) => (
                  <div key={mi} className="space-y-2 px-4 py-3">
                    <span
                      dir="ltr"
                      className={`font-en inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${POS_META[m.pos]?.cls ?? POS_META.other.cls}`}
                    >
                      {POS_META[m.pos]?.label ?? m.pos}
                    </span>
                    {m.definitions.map((d, di) => (
                      <div key={di} className="space-y-1">
                        <p dir="ltr" className="font-en text-left text-[14px] leading-relaxed">
                          {d.def}
                        </p>
                        {d.example && (
                          <p dir="ltr" className="font-en text-left text-[12.5px] italic leading-relaxed text-muted-foreground">
                            “{d.example}”
                          </p>
                        )}
                        {translated[d.def] && (
                          <p dir="rtl" className="font-fa rounded-lg bg-primary/10 px-2.5 py-1.5 text-right text-[13.5px] leading-relaxed text-primary">
                            {translated[d.def]}
                          </p>
                        )}
                        <button
                          onClick={() => translateDef(d.def)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary/80 transition-colors hover:text-primary"
                        >
                          {busyDef === d.def ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Languages className="h-3 w-3" />
                          )}
                          {translated[d.def] ? t.clear : t.translateMeaning}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="px-1 text-[11px] text-muted-foreground">{t.onlineDefs}</p>
        </div>
      )}
    </div>
  )
}

function WordContent({ entry }: { entry: WordEntry }) {
  const { t, lang } = useT()
  const favorites = useSettings((s) => s.favorites)
  const toggleFavorite = useSettings((s) => s.toggleFavorite)
  const [speaking, setSpeaking] = useState(false)
  const [voiceOk, setVoiceOk] = useState(true)
  const isFav = favorites.includes(entry.w)

  useEffect(() => {
    hasVoiceFor('en').then(setVoiceOk)
  }, [])

  const onSpeak = () => {
    if (speaking) return
    setSpeaking(true)
    speak(entry.w, 'en')
      .catch(() => toast.error(lang === 'fa' ? 'خواندن واژه ممکن نشد.' : 'Could not play pronunciation.'))
      .finally(() => setSpeaking(false))
  }

  const share = () => {
    const text = `${entry.w} — ${entry.m[0]?.fw ?? ''} | Dolat Zaban`
    if (navigator.share) {
      navigator.share({ title: entry.w, text }).catch(() => undefined)
    } else {
      navigator.clipboard
        ?.writeText(text)
        .then(() => toast(t.copied))
        .catch(() => undefined)
    }
  }

  return (
    <div className="px-5 pb-8 pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 dir="ltr" className="font-en text-left text-[34px] font-extrabold leading-tight tracking-tight">
              {entry.w}
            </h2>
            {entry.src === 'ext' && (
              <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-primary">
                {t.extended}
              </span>
            )}
          </div>
          {entry.via && (
            <button
              onClick={() => openWordSheet(entry.via!)}
              dir="ltr"
              className="font-en mt-1 text-left text-[13px] text-primary"
            >
              {t.formOf} <span className="font-bold underline underline-offset-2">{entry.via}</span>
            </button>
          )}
          {entry.ipa && (
            <p dir="ltr" className="font-en mt-1 text-left text-sm text-muted-foreground">
              /{entry.ipa}/
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-1">
          {voiceOk && (
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 rounded-2xl"
              aria-label={t.listen}
              onClick={onSpeak}
            >
              <Volume2 className={`h-5 w-5 ${speaking ? 'text-primary soft-pulse' : ''}`} />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="h-11 w-11 rounded-2xl"
            aria-label={t.favorites}
            onClick={() => {
              toggleFavorite(entry.w)
              toast(isFav ? t.favoriteRemove : t.favoriteAdd)
            }}
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg text-muted-foreground"
          onClick={() => {
            navigator.clipboard
              ?.writeText(entry.w)
              .then(() => toast(t.copiedWord))
              .catch(() => undefined)
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          {t.copy}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-muted-foreground" onClick={share}>
          <Share2 className="h-3.5 w-3.5" />
          {t.share}
        </Button>
      </div>

      {(entry.al?.length ?? 0) > 0 && (
        <div dir="ltr" className="mt-3 flex flex-wrap gap-1.5">
          {entry.al!.slice(0, 8).map((a) => (
            <button
              key={a}
              onClick={() => openWordSheet(a)}
              className="font-en rounded-full border border-border/80 bg-secondary px-2.5 py-1 text-[11.5px] text-secondary-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{t.meanings}</h3>
        <div className="divide-y divide-border/60">
          {entry.m.map((m, i) => {
            const meta = POS_META[m.p]
            return (
              <div key={i} className="space-y-1.5 py-4">
                <div className="flex items-center gap-2">
                  <span
                    dir="ltr"
                    className={`font-en rounded-md px-2 py-0.5 text-[11px] font-bold ${meta?.cls ?? POS_META.other.cls}`}
                  >
                    {meta?.label ?? m.p}
                  </span>
                  {m.s && (
                    <span
                      dir={lang === 'fa' ? 'rtl' : 'ltr'}
                      className="rounded-md bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                    >
                      {sectionLabel(m.s, lang)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                </div>
                {m.en && (
                  <p dir="ltr" className="font-en text-left text-[15px] leading-relaxed">
                    {m.en}
                  </p>
                )}
                {m.fa && (
                  <p dir="rtl" className="font-fa text-right text-[15px] leading-loose text-amber-800 dark:text-amber-200">
                    {m.fa}
                  </p>
                )}
                {m.fw && (
                  <div dir="rtl" className="flex w-fit">
                    <span className="font-fa rounded-lg bg-primary/10 px-2.5 py-1 text-[14px] font-semibold text-primary">
                      {m.fw}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <OnlineSection word={entry.w} />
    </div>
  )
}

export function WordSheet() {
  const { t } = useT()
  const word = useUi((s) => s.word)
  const [data, setData] = useState<{ word: string; entry: WordEntry | null } | null>(null)

  useEffect(() => {
    if (!word) return
    let active = true
    getWordEntry(word)
      .then((w) => {
        if (active) setData({ word, entry: w })
      })
      .catch(() => {
        if (active) setData({ word, entry: null })
      })
    return () => {
      active = false
    }
  }, [word])

  const entry = data?.word === word ? data.entry : null
  const loading = Boolean(word) && data?.word !== word

  return (
    <AnimatePresence>
      {word && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeWordSheet}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={word}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) closeWordSheet()
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between bg-card/95 px-5 pb-2 pt-3 backdrop-blur-sm">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-2 top-2 h-8 w-8 rounded-lg text-muted-foreground"
                aria-label={t.close}
                onClick={closeWordSheet}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entry ? (
              <WordContent entry={entry} />
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-[15px] font-semibold">{t.notFound}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{t.notFoundHint}</p>
                <div className="mt-5">
                  <OnlineSection word={word} />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
