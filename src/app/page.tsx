'use client'

import { useAppInit, useT } from '@/components/app/use-app'
import { AppHeader } from '@/components/app/AppHeader'
import { SideMenu } from '@/components/app/SideMenu'
import { HomeView } from '@/components/app/HomeView'
import { DictionaryView } from '@/components/app/DictionaryView'
import { TranslatorView } from '@/components/app/TranslatorView'
import { OfflineView } from '@/components/app/OfflineView'
import { SettingsView } from '@/components/app/SettingsView'
import { AboutView } from '@/components/app/AboutView'
import { WordSheet } from '@/components/app/WordSheet'
import { UpdateCard } from '@/components/app/UpdateCard'
import { useUi, useSettings } from '@/lib/store'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'

export default function Page() {
  useAppInit()
  const { t } = useT()
  const view = useUi((s) => s.view)
  const mode = useSettings((s) => s.mode)

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <span className="sr-only">{t.appName}</span>
            {view === 'home' && <HomeView />}
            {view === 'dictionary' && <DictionaryView />}
            {view === 'translate' && <TranslatorView />}
            {view === 'offline' && <OfflineView />}
            {view === 'settings' && <SettingsView />}
            {view === 'about' && <AboutView />}
          </motion.div>
        </AnimatePresence>
      </main>
      <SideMenu />
      <WordSheet />
      <UpdateCard />
      <Toaster
        position="top-center"
        theme={mode === 'dark' ? 'dark' : 'light'}
        toastOptions={{ className: 'font-en' }}
      />
    </div>
  )
}
