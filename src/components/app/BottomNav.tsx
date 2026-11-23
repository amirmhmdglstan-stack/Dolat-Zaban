'use client'

import { motion } from 'framer-motion'
import { useUi } from '@/lib/store'
import { goView } from '@/lib/nav'
import { useT } from './use-app'
import type { View } from '@/lib/types'
import { Home, BookOpen, Languages, FolderDown } from 'lucide-react'

const TABS: { key: View; labelKey: 'home' | 'dictionary' | 'translate' | 'offlineContent'; icon: typeof Home }[] = [
  { key: 'home', labelKey: 'home', icon: Home },
  { key: 'dictionary', labelKey: 'dictionary', icon: BookOpen },
  { key: 'translate', labelKey: 'translate', icon: Languages },
  { key: 'offline', labelKey: 'offlineContent', icon: FolderDown },
]

export function BottomNav() {
  const { t } = useT()
  const view = useUi((s) => s.view)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-2 flex items-center gap-1 rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-lg shadow-black/10 backdrop-blur-md">
        {TABS.map((tab) => {
          const active = view === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => goView(tab.key)}
              aria-label={t[tab.labelKey]}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10.5px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-pill"
                  className="absolute inset-0 rounded-xl bg-primary/12"
                  transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                />
              )}
              <tab.icon className={`relative h-[19px] w-[19px] ${active ? '' : 'opacity-80'}`} />
              <span className="relative truncate px-1">{t[tab.labelKey]}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
