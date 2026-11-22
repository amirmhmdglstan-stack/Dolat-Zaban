'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useT } from './use-app'
import { useSettings, useUi } from '@/lib/store'
import { idbDeleteDatabase } from '@/lib/idb'
import { APP_VERSION, checkLatestRelease, isNewerVersion } from '@/lib/update'
import type { Lang, Mode, Palette } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
import { Check, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PALETTES: { key: Palette; color: string; name: string }[] = [
  { key: 'blue', color: '#2563eb', name: 'Blue' },
  { key: 'teal', color: '#0d9488', name: 'Teal' },
  { key: 'green', color: '#16a34a', name: 'Green' },
  { key: 'orange', color: '#ea580c', name: 'Orange' },
  { key: 'rose', color: '#e11d48', name: 'Rose' },
  { key: 'violet', color: '#7c3aed', name: 'Violet' },
]

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <h2 className="mb-3.5 text-[15px] font-bold">{title}</h2>
      {children}
    </motion.section>
  )
}

export function SettingsView() {
  const { t, lang } = useT()
  const settings = useSettings()
  const [checking, setChecking] = useState(false)

  const langs: { key: Lang; label: string; native: string }[] = [
    { key: 'en', label: t.english, native: 'English' },
    { key: 'fa', label: t.persian, native: 'فارسی' },
  ]
  const sizes = [t.sizeSmall, t.sizeDefault, t.sizeLarge, t.sizeLarger, t.sizeLargest]
  const modes: { key: Mode; label: string }[] = [
    { key: 'light', label: t.light },
    { key: 'dark', label: t.dark },
    { key: 'system', label: t.system },
  ]

  const checkUpdate = () => {
    setChecking(true)
    checkLatestRelease(true)
      .then((info) => {
        if (info && isNewerVersion(info.version, APP_VERSION)) {
          useUi.getState().setUpdateInfo(info)
          useUi.getState().setUpdateDismissed(false)
        } else {
          toast(t.upToDate)
        }
      })
      .catch(() => toast.error(t.updateFailed))
      .finally(() => setChecking(false))
  }

  return (
    <div className="space-y-4 px-4 pb-10 pt-4">
      <Group title={t.language}>
        <div className="grid grid-cols-2 gap-2">
          {langs.map((l) => (
            <button
              key={l.key}
              onClick={() => settings.setLang(l.key)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-[15px] font-semibold transition-colors ${
                settings.lang === l.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              <span className={l.key === 'fa' ? 'font-fa' : 'font-en'}>{l.native}</span>
              {settings.lang === l.key && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </Group>

      <Group title={t.themeColor}>
        <div className="flex flex-wrap gap-2.5">
          {PALETTES.map((p) => (
            <button
              key={p.key}
              onClick={() => settings.setPalette(p.key)}
              aria-label={p.name}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                settings.palette === p.key
                  ? 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-card scale-105'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: p.color }}
            >
              {settings.palette === p.key && <Check className="h-4.5 w-4.5 text-white" />}
            </button>
          ))}
        </div>
      </Group>

      <Group title={t.textSize}>
        <div className="grid grid-cols-5 gap-1.5">
          {sizes.map((label, i) => (
            <button
              key={i}
              onClick={() => settings.setTextSize(i)}
              aria-label={label}
              className={`flex items-center justify-center rounded-xl border px-1 py-2.5 transition-colors ${
                settings.textSize === i
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              <span
                className={
                  i === 0
                    ? 'font-en text-[10px] font-semibold'
                    : i === 1
                      ? 'font-en text-xs font-semibold'
                      : i === 2
                        ? 'font-en text-sm font-semibold'
                        : i === 3
                          ? 'font-en text-base font-semibold'
                          : 'font-en text-lg font-semibold'
                }
              >
                Aa
              </span>
            </button>
          ))}
        </div>
      </Group>

      <Group title={t.appearance}>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => settings.setMode(m.key)}
              className={`rounded-2xl border px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                settings.mode === m.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title={t.dataSection}>
        <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">{t.clearDataDesc}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full rounded-2xl">
              <Trash2 className="h-4 w-4" />
              {t.clearData}
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
                  idbDeleteDatabase().then(() => {
                    localStorage.removeItem('dolatzaban-settings')
                    window.location.reload()
                  })
                }}
              >
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Group>

      <div className="flex items-center justify-between rounded-3xl border border-border/70 bg-card px-5 py-4">
        <span className="text-[14px] text-muted-foreground">
          {t.versionLabel}: <span className="font-en font-semibold text-foreground">v{APP_VERSION}</span>
        </span>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={checkUpdate} disabled={checking}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t.checkUpdates}
        </Button>
      </div>
    </div>
  )
}
