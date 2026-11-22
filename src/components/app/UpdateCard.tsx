'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUi } from '@/lib/store'
import { useT } from './use-app'
import { cleanReleaseNotes, formatBytes, pickAsset, type ReleaseAsset } from '@/lib/update'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Download, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react'

type Phase = 'idle' | 'downloading' | 'done' | 'browser' | 'failed'

function detectKind(): 'apk' | 'exe' {
  if (typeof navigator === 'undefined') return 'apk'
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'apk'
  if (/windows|win32|win64/i.test(ua)) return 'exe'
  return 'apk'
}

function triggerAnchorDownload(blobOrUrl: Blob | string, filename: string) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function UpdateCard() {
  const { t } = useT()
  const updateInfo = useUi((s) => s.updateInfo)
  const dismissed = useUi((s) => s.updateDismissed)
  const setDismissed = useUi((s) => s.setUpdateDismissed)
  const [phase, setPhase] = useState<Phase>('idle')
  const [percent, setPercent] = useState(0)

  const asset: ReleaseAsset | undefined = useMemo(() => {
    if (!updateInfo) return undefined
    return pickAsset(updateInfo, detectKind()) ?? updateInfo.assets[0]
  }, [updateInfo])

  const otherAsset = useMemo(() => {
    if (!updateInfo || !asset) return undefined
    return updateInfo.assets.find((a) => a !== asset)
  }, [updateInfo, asset])

  const notes = useMemo(() => (updateInfo ? cleanReleaseNotes(updateInfo.notes) : ''), [updateInfo])
  const visible = Boolean(updateInfo) && !dismissed

  const startDownload = async () => {
    if (!asset) return
    setPhase('downloading')
    setPercent(0)
    try {
      const res = await fetch(asset.url)
      if (!res.ok || !res.body) throw new Error('fetch-failed')
      const total = Number(res.headers.get('content-length')) || asset.size || 0
      const reader = res.body.getReader()
      const chunks: BlobPart[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (total > 0) setPercent(Math.min(100, Math.round((received / total) * 100)))
        else setPercent(Math.min(95, Math.round((received / 65536) * 2)))
      }
      triggerAnchorDownload(new Blob(chunks, { type: 'application/octet-stream' }), asset.name)
      setPhase('done')
    } catch {
      try {
        triggerAnchorDownload(asset.url, asset.name)
        setPhase('browser')
      } catch {
        setPhase('failed')
      }
    }
  }

  const notify = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    try {
      let perm = Notification.permission
      if (perm === 'default') perm = await Notification.requestPermission()
      if (perm === 'granted') new Notification(t.notifTitle, { body: t.notifBody, icon: '/icon.png' })
    } catch {
      /* noop */
    }
  }

  const later = async () => {
    setDismissed(true)
    notify()
  }

  return (
    <AnimatePresence>
      {visible && updateInfo && (
        <>
          <motion.div
            className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="pointer-events-auto w-full max-w-md rounded-3xl border border-border/70 bg-card p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={t.updateTitle}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[17px] font-bold">{t.updateTitle}</h2>
                  <p className="font-en mt-0.5 text-[12.5px] text-muted-foreground" dir="ltr">
                    v{updateInfo.version}
                    {asset && asset.size > 0 ? ` · ${t.size}: ${formatBytes(asset.size)}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground"
                  aria-label={t.close}
                  onClick={later}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {notes && (
                <div className="mt-4 rounded-2xl bg-muted/60 p-3.5">
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.whatsNew}
                  </p>
                  <p className="max-h-36 overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed">
                    {notes}
                  </p>
                </div>
              )}

              {phase === 'downloading' ? (
                <div className="mt-4 space-y-1.5">
                  <Progress value={percent} className="h-2.5" />
                  <p className="text-center text-[12px] font-medium text-muted-foreground">
                    {t.downloadingUpdate} {percent}%
                  </p>
                </div>
              ) : phase === 'done' || phase === 'browser' ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-emerald-500/10 p-3.5 text-[13px] leading-relaxed text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t.doneHint}
                    {phase === 'browser' && ` (${t.fallbackNote})`}
                  </span>
                </div>
              ) : phase === 'failed' ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-3.5 text-[13px] leading-relaxed text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t.updateFailed}</span>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <Button onClick={startDownload} className="h-11 flex-1 rounded-2xl text-[14px] font-semibold">
                    <Download className="h-4 w-4" />
                    {t.updateNow}
                  </Button>
                  <Button variant="ghost" onClick={later} className="h-11 rounded-2xl px-5 text-[14px]">
                    {t.later}
                  </Button>
                </div>
              )}

              {otherAsset && otherAsset.size > 0 && (
                <button
                  onClick={() => triggerAnchorDownload(otherAsset.url, otherAsset.name)}
                  className="mt-3 block w-full text-center text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {otherAsset.name.toLowerCase().endsWith('.exe') ? t.windowsApp : t.androidApp} (
                  {formatBytes(otherAsset.size)})
                </button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
