'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useT } from './use-app'
import { APP_VERSION } from '@/lib/update'
import { EXT_PACK } from '@/lib/ext-pack'
import { fmt } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Mail, Heart, Database, BookMarked, Volume2, Globe } from 'lucide-react'

const SOURCES = [
  {
    icon: BookMarked,
    en: 'Full dictionary: English-Persian Dictionary (MIT) by H. Yazdani & shahabahreini',
    fa: 'واژه‌نامهٔ کامل: فرهنگ انگلیسی-فارسی (MIT) اثر اچ. یزدانی و شاهبهری',
    url: 'https://github.com/shahabahreini/English-Persian-Dictionary',
  },
  {
    icon: Database,
    en: 'Word database: english-persian-dictionary-dataset by shirin-manzari',
    fa: 'پایگاه واژگان: english-persian-dictionary-dataset اثر shirin-manzari',
    url: 'https://github.com/shirin-manzari/english-persian-dictionary-dataset',
  },
  {
    icon: Volume2,
    en: 'Pronunciations: CMU Pronouncing Dictionary (BSD)',
    fa: 'تلفظ‌ها: فرهنگ تلفظ دانشگاه کارنگی ملون (BSD)',
    url: 'https://github.com/cmusphinx/cmudict',
  },
  {
    icon: Globe,
    en: 'Online definitions: The Free Dictionary API',
    fa: 'تعریف‌های آنلاین: The Free Dictionary API',
    url: 'https://dictionaryapi.dev',
  },
]

export function AboutView() {
  const { t, lang } = useT()
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
      </div>

      <div className="mt-4 rounded-3xl border border-border/70 bg-card px-5 py-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{t.dataSources}</h2>
        <ul className="mt-3 space-y-3">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground transition-colors hover:text-primary"
              >
                <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                <span>{lang === 'fa' ? s.fa : s.en}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="font-en mt-6 text-center text-[11px] text-muted-foreground">
        v{APP_VERSION} · {fmt(t.wordsCount, { n: EXT_PACK.words })}+
      </p>
    </motion.div>
  )
}
