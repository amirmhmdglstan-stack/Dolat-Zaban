'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useT } from './use-app'
import { APP_VERSION } from '@/lib/update'
import { Button } from '@/components/ui/button'
import { Mail, Heart } from 'lucide-react'

export function AboutView() {
  const { t } = useT()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pb-10 pt-6"
    >
      <div className="flex flex-col items-center rounded-3xl border border-border/70 bg-card px-6 py-10 text-center shadow-sm">
        <Image
          src="/icon.png"
          alt="Dolat Zaban"
          width={88}
          height={88}
          className="h-[88px] w-[88px] rounded-3xl object-cover shadow-md"
        />
        <h1 className="mt-4 text-[22px] font-extrabold tracking-tight">{t.appName}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t.appTagline}</p>

        <div className="mt-8 space-y-2 text-[15px] leading-loose">
          <p>{t.aboutBody1}</p>
          <p className="text-[17px] font-bold text-primary">{t.aboutAuthor}</p>
          <p>{t.aboutBody2}</p>
        </div>

        <div className="mt-8 w-full space-y-3">
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {t.aboutContact}{' '}
            <Heart className="inline h-4 w-4 align-[-2px] fill-rose-400 text-rose-400" />
          </p>
          <Button asChild variant="outline" className="font-en w-full rounded-2xl" dir="ltr">
            <a href="mailto:amirmhmdglstan@gmail.com">
              <Mail className="h-4 w-4" />
              amirmhmdglstan@gmail.com
            </a>
          </Button>
        </div>

        <p className="font-en mt-8 text-[11px] text-muted-foreground">v{APP_VERSION}</p>
      </div>
    </motion.div>
  )
}
