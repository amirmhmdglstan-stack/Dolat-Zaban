'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { useT } from './use-app'
import { translateText, MAX_TRANSLATE_CHARS, type TranslateResult } from '@/lib/translate'
import { fmt } from '@/lib/i18n'
import { idbHistoryAll, idbClear } from '@/lib/idb'
import type { TranslationHistoryItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { speak, hasVoiceFor } from '@/lib/tts'
import { ArrowLeftRight, Copy, Trash2, Volume2, Languages, WifiOff, Loader2, History } from 'lucide-react'
import { toast } from 'sonner'

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function TranslatorView() {
  const { t } = useT()
  const [dir, setDir] = useState<'en2fa' | 'fa2en'>('en2fa')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<TranslateResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<TranslationHistoryItem[]>([])
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  )
  const [targetVoice, setTargetVoice] = useState(false)

  const sl: 'en' | 'fa' = dir === 'en2fa' ? 'en' : 'fa'
  const tl: 'en' | 'fa' = dir === 'en2fa' ? 'fa' : 'en'

  const loadHistory = () => {
    idbHistoryAll()
      .then((h) => setHistory(h.slice().reverse()))
      .catch(() => setHistory([]))
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    hasVoiceFor(tl).then(setTargetVoice)
  }, [tl])

  const overLimit = input.length > MAX_TRANSLATE_CHARS

  const run = () => {
    if (!input.trim() || busy || overLimit) return
    setBusy(true)
    translateText(input, sl, tl)
      .then((r) => {
        setOutput(r)
        loadHistory()
      })
      .catch(() => toast.error(t.translateFailed))
      .finally(() => setBusy(false))
  }

  const swap = () => {
    setDir(dir === 'en2fa' ? 'fa2en' : 'en2fa')
    if (output?.text) {
      setInput(output.text)
      setOutput(null)
    }
  }

  const providerLabel = useMemo(() => {
    if (!output) return ''
    if (output.provider === 'google') return t.providerGoogle
    if (output.provider === 'mymemory') return t.providerMyMemory
    if (output.provider === 'offline') return t.providerOffline
    if (output.provider === 'history') return t.providerHistory
    return t.providerServer
  }, [output, t])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-10 pt-4">
      <div className="flex items-center justify-center gap-3">
        <span className={`rounded-xl px-4 py-1.5 text-sm font-semibold ${sl === 'en' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {t.english}
        </span>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" aria-label="swap" onClick={swap}>
          <ArrowLeftRight className="h-4 w-4 rtl:-scale-x-100" />
        </Button>
        <span className={`rounded-xl px-4 py-1.5 text-sm font-semibold ${tl === 'fa' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {t.persian}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run()
            }}
            dir={sl === 'en' ? 'ltr' : 'rtl'}
            placeholder={t.inputPlaceholder.replace('{lang}', sl === 'en' ? t.english : t.persian)}
            className={`min-h-36 resize-none rounded-2xl bg-card p-4 text-[16px] leading-relaxed ${sl === 'en' ? 'font-en text-left' : 'font-fa text-right'}`}
            aria-label={t.translate}
          />
          <span
            dir="ltr"
            className={`font-en absolute bottom-2.5 end-3 text-[11px] ${overLimit ? 'font-bold text-destructive' : 'text-muted-foreground/70'}`}
          >
            {fmt(t.charCount, { n: input.length })}
          </span>
        </div>

        <Button
          onClick={run}
          disabled={!input.trim() || busy || overLimit}
          className="h-12 w-full rounded-2xl text-[15px] font-semibold"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.translating}
            </>
          ) : (
            <>
              <Languages className="h-4.5 w-4.5" />
              {t.translateNow}
            </>
          )}
        </Button>

        {overLimit && (
          <p className="text-center text-[13px] font-medium text-destructive">{t.tooLong}</p>
        )}

        {output && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/70 bg-muted/60 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p
                dir={tl === 'en' ? 'ltr' : 'rtl'}
                className={`min-h-8 flex-1 whitespace-pre-wrap text-[16px] leading-relaxed ${tl === 'en' ? 'font-en text-left' : 'font-fa text-right'}`}
              >
                {output.text}
              </p>
              <div className="flex shrink-0 gap-1">
                {targetVoice && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground"
                    aria-label={t.listen}
                    onClick={() => speak(output.text, tl).catch(() => undefined)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground"
                  aria-label={t.copy}
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(output.text)
                      .then(() => toast(t.copied))
                      .catch(() => undefined)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
              <span className="text-[11px] text-muted-foreground">{providerLabel}</span>
              {output.provider === 'offline' && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <WifiOff className="h-3 w-3" />
                  {t.offlineResult}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {!online && (
          <p className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-center text-[12px] font-medium text-amber-700 dark:text-amber-300">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            {t.offlineModeNote}
          </p>
        )}
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <History className="h-4.5 w-4.5 text-primary" />
            {t.history}
          </h2>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg text-muted-foreground"
              onClick={() => {
                idbClear('history')
                  .then(() => {
                    setHistory([])
                    toast(t.historyCleared)
                  })
                  .catch(() => undefined)
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t.clearHistory}
            </Button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
            {t.historyEmpty}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
              {history.slice(0, 30).map((h) => (
                <li key={h.id ?? `${h.ts}-${h.source.slice(0, 10)}`}>
                  <button
                    onClick={() => {
                      setDir(h.sl === 'en' ? 'en2fa' : 'fa2en')
                      setInput(h.source)
                      setOutput({ text: h.result, provider: 'history' })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="w-full space-y-1 px-4 py-3 text-start transition-colors hover:bg-accent"
                  >
                    <p dir={h.sl === 'en' ? 'ltr' : 'rtl'} className={`truncate text-[13px] text-muted-foreground ${h.sl === 'en' ? 'font-en text-left' : 'font-fa text-right'}`}>
                      {h.source}
                    </p>
                    <p dir={h.tl === 'en' ? 'ltr' : 'rtl'} className={`truncate text-[14px] font-medium ${h.tl === 'en' ? 'font-en text-left' : 'font-fa text-right'}`}>
                      {h.result}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </motion.div>
  )
}
