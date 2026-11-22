'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings, useUi } from '@/lib/store'
import { getWordEntry } from '@/lib/dict'
import { closeWordSheet } from '@/lib/nav'
import { useT } from './use-app'
import { POS_META } from './pos'
import { speak, hasVoiceFor } from '@/lib/tts'
import type { WordEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Volume2, Heart, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

  return (
    <div className="px-5 pb-8 pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 dir="ltr" className="font-en text-left text-[34px] font-extrabold leading-tight tracking-tight">
            {entry.w}
          </h2>
          <p dir="ltr" className="font-en mt-1 text-left text-sm text-muted-foreground">
            /{entry.ipa}/
          </p>
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
                    className={`font-en rounded-md px-2 py-0.5 text-[11px] font-bold ${meta?.cls ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    {meta?.label ?? m.p}
                  </span>
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                </div>
                <p dir="ltr" className="font-en text-left text-[15px] leading-relaxed">
                  {m.en}
                </p>
                <p dir="rtl" className="font-fa text-right text-[15px] leading-loose text-amber-800 dark:text-amber-200">
                  {m.fa}
                </p>
                <div dir="rtl" className="flex w-fit">
                  <span className="font-fa rounded-lg bg-primary/10 px-2.5 py-1 text-[14px] font-semibold text-primary">
                    {m.fw}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
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
              <p className="px-5 py-16 text-center text-sm text-muted-foreground">{t.notFound}</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
