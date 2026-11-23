'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useT } from './use-app'
import { useSettings } from '@/lib/store'
import { fmt } from '@/lib/i18n'
import { cachedLetters, loadAllLetters, loadLetter } from '@/lib/dict'
import { extStatus, installExtPack, deleteExtPack, type ExtStatus } from '@/lib/ext'
import { EXT_PACK } from '@/lib/ext-pack'
import { getVoices, speak } from '@/lib/tts'
import { idbClear, idbGet, idbHistoryAdd, idbHistoryAll, idbSet, idbKeys } from '@/lib/idb'
import { formatBytes } from '@/lib/update'
import type { WordEntry, TranslationHistoryItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  BookOpen,
  Volume2,
  Languages,
  Share2,
  Download,
  Check,
  Loader2,
  Trash2,
  Import,
  HardDrive,
  LibraryBig,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-[15px] font-bold">{title}</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </motion.section>
  )
}

export function OfflineView() {
  const { t, lang } = useT()
  const [lettersReady, setLettersReady] = useState<string[]>([])
  const [dictSize, setDictSize] = useState(0)
  const [progress, setProgress] = useState<{ active: boolean; loaded: number; total: number }>({
    active: false,
    loaded: 0,
    total: 26,
  })
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [historyCount, setHistoryCount] = useState(0)
  const [ext, setExt] = useState<ExtStatus | null>(null)
  const [extProgress, setExtProgress] = useState<{ phase: 'idle' | 'downloading' | 'processing'; done: number; total: number }>({
    phase: 'idle',
    done: 0,
    total: 1,
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const [letters, size, history, extState] = await Promise.all([
      cachedLetters(),
      lettersSize(),
      idbHistoryAll().catch(() => [] as TranslationHistoryItem[]),
      extStatus().catch(() => ({ installed: false, meta: null, updateAvailable: false }) as ExtStatus),
    ])
    setLettersReady(letters)
    setDictSize(size)
    setHistoryCount(history.length)
    setExt(extState)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      refresh()
      getVoices().then((v) => setVoices(v.filter((x) => x.lang.toLowerCase().startsWith('en') || x.lang.toLowerCase().startsWith('fa'))))
    }, 0)
    return () => clearTimeout(id)
  }, [refresh])

  const downloadAll = async () => {
    if (progress.active) return
    setProgress({ active: true, loaded: 0, total: 26 })
    try {
      await loadAllLetters((loaded, total) => setProgress({ active: true, loaded, total }))
      await refresh()
      toast(lang === 'fa' ? 'واژه‌نامهٔ کامل بارگیری شد.' : 'Full dictionary downloaded.')
    } catch {
      toast.error(lang === 'fa' ? 'بارگیری کامل نشد. دوباره تلاش کن.' : 'Download failed. Please try again.')
    } finally {
      setProgress({ active: false, loaded: 26, total: 26 })
    }
  }

  const downloadLetter = async (letter: string) => {
    try {
      await loadLetter(letter)
      await refresh()
    } catch {
      toast.error(lang === 'fa' ? 'بارگیری این حرف ممکن نشد.' : 'Could not download this letter.')
    }
  }

  const installExt = async () => {
    if (extProgress.phase !== 'idle') return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.error(t.extNeedOnline)
      return
    }
    setExtProgress({ phase: 'downloading', done: 0, total: EXT_PACK.gzBytes })
    try {
      await installExtPack((phase, done, total) => setExtProgress({ phase, done, total }))
      await refresh()
      toast(t.extInstallDone)
    } catch {
      toast.error(t.extInstallFail)
    } finally {
      setExtProgress({ phase: 'idle', done: 0, total: 1 })
    }
  }

  const exportData = async () => {
    try {
      const letters: Record<string, WordEntry[]> = {}
      for (const l of lettersReady) {
        const words = await idbGet<WordEntry[]>('letters', l)
        if (words) letters[l] = words
      }
      const history = await idbHistoryAll()
      const s = useSettings.getState()
      const payload = {
        app: 'dolatzaban',
        format: 1,
        letters,
        history,
        settings: {
          lang: s.lang,
          palette: s.palette,
          textSize: s.textSize,
          mode: s.mode,
          favorites: s.favorites,
          recents: s.recents,
        },
      }
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dolatzaban-backup.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t.importFail)
    }
  }

  const importData = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.app !== 'dolatzaban' || typeof data.letters !== 'object' || data.letters === null) {
        throw new Error('bad-file')
      }
      let letterCount = 0
      for (const [l, words] of Object.entries<WordEntry[]>(data.letters)) {
        if (!Array.isArray(words) || !words.length) continue
        await idbSet('letters', l, words)
        letterCount++
      }
      let historyCount = 0
      for (const h of Array.isArray(data.history) ? data.history : []) {
        if (h && h.source && h.result) {
          await idbHistoryAdd({
            ts: Number(h.ts) || Date.now(),
            sl: h.sl === 'fa' ? 'fa' : 'en',
            tl: h.tl === 'fa' ? 'fa' : 'en',
            source: String(h.source),
            result: String(h.result),
          })
          historyCount++
        }
      }
      if (data.settings && typeof data.settings === 'object') {
        useSettings.getState().importSettings(data.settings)
      }
      await refresh()
      toast(
        lang === 'fa'
          ? `وارد انجام شد: ${letterCount} حرف و ${historyCount} ترجمه.`
          : `Imported ${letterCount} letters and ${historyCount} translations.`
      )
    } catch {
      toast.error(t.importFail)
    }
  }

  const allReady = lettersReady.length >= 26

  return (
    <div className="space-y-4 px-4 pb-10 pt-4">
      <Section
        icon={<LibraryBig className="h-5 w-5" />}
        title={t.extTitle}
        desc={t.extDesc}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-muted-foreground">
            {ext?.installed && ext.meta ? (
              <>
                {fmt(t.wordsCount, { n: ext.meta.words })} · v{ext.meta.version}
                {ext.updateAvailable && (
                  <span className="ms-2 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {t.newVersionShort}
                  </span>
                )}
              </>
            ) : (
              <>
                {fmt(t.wordsCount, { n: EXT_PACK.words })} · {formatBytes(EXT_PACK.gzBytes)}
              </>
            )}
          </span>
          <Button
            onClick={installExt}
            disabled={extProgress.phase !== 'idle'}
            className="rounded-xl px-4"
            size="sm"
            variant={ext?.installed ? 'outline' : 'default'}
          >
            {extProgress.phase !== 'idle' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ext?.installed ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {ext?.installed ? t.extUpdateBtn : t.extInstall}
          </Button>
        </div>
        {extProgress.phase !== 'idle' && (
          <div className="mt-3 space-y-1.5">
            <Progress
              value={
                extProgress.phase === 'downloading'
                  ? (extProgress.done / extProgress.total) * 90
                  : 90 + (extProgress.done / extProgress.total) * 10
              }
              className="h-2"
            />
            <p className="text-[12px] text-muted-foreground">
              {extProgress.phase === 'downloading'
                ? fmt(t.extProgressDownload, { p: Math.min(99, Math.round((extProgress.done / extProgress.total) * 100)) })
                : fmt(t.extProgressProcess, { n: Math.min(extProgress.done, extProgress.total), total: extProgress.total })}
            </p>
          </div>
        )}
        {ext?.installed && (
          <div className="mt-3 text-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.extDelete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.clearConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.clearConfirmDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => {
                      deleteExtPack()
                        .then(refresh)
                        .then(() => toast(t.extDeleted))
                        .catch(() => undefined)
                    }}
                  >
                    {t.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </Section>

      <Section icon={<BookOpen className="h-5 w-5" />} title={t.dictTitle} desc={t.dictDesc}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-muted-foreground">
            {fmt(t.lettersReady, { n: lettersReady.length })}
            {dictSize > 0 && ` · ${t.storageUsed}: ${formatBytes(dictSize)}`}
          </span>
          <Button
            onClick={downloadAll}
            disabled={progress.active || allReady}
            className="rounded-xl px-4"
            size="sm"
          >
            {progress.active ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : allReady ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {progress.active ? t.downloadAll : allReady ? t.downloadedAll : t.downloadAll}
          </Button>
        </div>
        {progress.active && (
          <div className="mt-3 space-y-1.5">
            <Progress value={(progress.loaded / progress.total) * 100} className="h-2" />
            <p className="text-[12px] text-muted-foreground">
              {fmt(t.downloading, { n: progress.loaded, total: progress.total })}
            </p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:grid-cols-9" dir="ltr">
          {'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => {
            const ready = lettersReady.includes(l)
            return (
              <button
                key={l}
                onClick={() => !ready && downloadLetter(l)}
                className={`font-en flex h-9 items-center justify-center rounded-lg text-[12px] font-bold uppercase transition-colors ${
                  ready
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                aria-label={l}
              >
                {ready ? <Check className="h-3.5 w-3.5" /> : l}
              </button>
            )
          })}
        </div>
        {lettersReady.length > 0 && (
          <div className="mt-3 text-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.clearDict}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.clearConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.clearConfirmDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => {
                      idbClear('letters')
                        .then(refresh)
                        .catch(() => undefined)
                    }}
                  >
                    {t.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </Section>

      <Section icon={<Volume2 className="h-5 w-5" />} title={t.ttsTitle} desc={t.ttsDesc}>
        <p className="text-[13px] font-medium text-muted-foreground">
          {voices.length > 0 ? fmt(t.voicesCount, { n: voices.length }) : t.noVoices}
        </p>
        {voices.length > 0 && (
          <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pe-1">
            {voices.slice(0, 12).map((v) => (
              <li
                key={v.name}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  {v.name} <span className="text-muted-foreground">({v.lang})</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() =>
                    speak(v.lang.toLowerCase().startsWith('fa') ? 'سلام، دولت زبان به تو سلام می‌کند.' : 'Hello, this is Dolat Zaban.', v.lang.toLowerCase().startsWith('fa') ? 'fa' : 'en').catch(
                      () => undefined
                    )
                  }
                >
                  {t.test}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Languages className="h-5 w-5" />} title={t.transTitle} desc={t.transDesc}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-muted-foreground">{fmt(t.cachedCount, { n: historyCount })}</span>
          {historyCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                idbClear('history')
                  .then(refresh)
                  .catch(() => undefined)
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t.clearCache}
            </Button>
          )}
        </div>
      </Section>

      <Section icon={<Share2 className="h-5 w-5" />} title={t.backupTitle} desc={t.backupDesc}>
        <div className="flex gap-2">
          <Button onClick={exportData} className="flex-1 rounded-xl">
            <HardDrive className="h-4 w-4" />
            {t.exportBtn}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl">
            <Import className="h-4 w-4" />
            {t.importBtn}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
      </Section>
    </div>
  )
}

async function lettersSize(): Promise<number> {
  try {
    const keys = await idbKeys('letters')
    let total = 0
    for (const k of keys) {
      const words = await idbGet<WordEntry[]>('letters', String(k))
      if (words) total += JSON.stringify(words).length
    }
    return total
  } catch {
    return 0
  }
}
