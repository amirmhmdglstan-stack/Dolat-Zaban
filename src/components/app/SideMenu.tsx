'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useUi, useSettings } from '@/lib/store'
import { goView, setMenuOpen } from '@/lib/nav'
import { useT } from './use-app'
import { APP_VERSION, formatBytes } from '@/lib/update'
import { Button } from '@/components/ui/button'
import type { View } from '@/lib/types'
import { BookOpen, Languages, FolderDown, Settings2, Info, X, Download } from 'lucide-react'

export function SideMenu() {
  const { t, isFa } = useT()
  const menuOpen = useUi((s) => s.menuOpen)
  const view = useUi((s) => s.view)
  const updateInfo = useUi((s) => s.updateInfo)
  const lang = useSettings((s) => s.lang)

  const items: { key: View; label: string; icon: typeof BookOpen }[] = [
    { key: 'dictionary', label: t.dictionary, icon: BookOpen },
    { key: 'translate', label: t.translate, icon: Languages },
    { key: 'offline', label: t.offlineContent, icon: FolderDown },
    { key: 'settings', label: t.settings, icon: Settings2 },
    { key: 'about', label: t.aboutUs, icon: Info },
  ]

  const hideX = isFa ? '100%' : '-100%'

  return (
    <AnimatePresence>
      {menuOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMenuOpen(false)}
          />
          <motion.aside
            className="fixed inset-y-0 start-0 z-50 flex w-[292px] max-w-[86vw] flex-col bg-card shadow-2xl"
            initial={{ x: hideX }}
            animate={{ x: 0 }}
            exit={{ x: hideX }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            dir={lang === 'fa' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 p-5 pb-4">
              <Image src="/icon.png" alt="Dolat Zaban" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold leading-tight">{t.appName}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.appTagline}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg" aria-label={t.close} onClick={() => setMenuOpen(false)}>
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-1">
              {items.map((item) => {
                const active = view === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => goView(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[15px] font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="space-y-2 p-4 pt-2">
              {updateInfo && (
                <button
                  onClick={() => {
                    useUi.getState().setUpdateDismissed(false)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-start text-[13px] font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="flex-1 leading-snug">
                    {t.updateBanner.replace('{v}', updateInfo.version)}
                    {updateInfo.assets.length > 0 && (
                      <span className="ms-1 text-primary/70">
                        ({formatBytes(updateInfo.assets.reduce((s, a) => Math.max(s, a.size), 0))})
                      </span>
                    )}
                  </span>
                </button>
              )}
              <p className="text-center text-[11px] text-muted-foreground">v{APP_VERSION}</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
