'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useUi } from '@/lib/store'
import { goView, setMenuOpen } from '@/lib/nav'
import { useT } from './use-app'
import { Menu, ArrowLeft } from 'lucide-react'

export function AppHeader() {
  const { t } = useT()
  const view = useUi((s) => s.view)
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-1 px-3">
        {view !== 'home' && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.back}
            onClick={() => goView('home')}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="menu" onClick={() => setMenuOpen(true)} className="rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2.5 ps-1">
          <Image
            src="/icon.png"
            alt="Dolat Zaban"
            width={32}
            height={32}
            className="h-8 w-8 rounded-[10px] object-cover"
            priority
          />
          <span className="truncate text-[17px] font-bold tracking-tight">{t.appName}</span>
        </div>
      </div>
    </header>
  )
}
