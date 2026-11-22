import type { PosCode } from '@/lib/types'

export const POS_META: Record<PosCode, { label: string; nameEn: string; nameFa: string; cls: string }> = {
  n: {
    label: 'n.',
    nameEn: 'noun',
    nameFa: 'اسم',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  v: {
    label: 'v.',
    nameEn: 'verb',
    nameFa: 'فعل',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  adj: {
    label: 'adj.',
    nameEn: 'adjective',
    nameFa: 'صفت',
    cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  },
  adv: {
    label: 'adv.',
    nameEn: 'adverb',
    nameFa: 'قید',
    cls: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
  },
  prep: {
    label: 'prep.',
    nameEn: 'preposition',
    nameFa: 'حرف اضافه',
    cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300',
  },
  conj: {
    label: 'conj.',
    nameEn: 'conjunction',
    nameFa: 'حرف ربط',
    cls: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300',
  },
  pron: {
    label: 'pron.',
    nameEn: 'pronoun',
    nameFa: 'ضمیر',
    cls: 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300',
  },
  interj: {
    label: 'interj.',
    nameEn: 'interjection',
    nameFa: 'واکه',
    cls: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  },
  num: {
    label: 'num.',
    nameEn: 'numeral',
    nameFa: 'عدد',
    cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  },
  phr: {
    label: 'phr.',
    nameEn: 'phrase',
    nameFa: 'عبارت',
    cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
  },
  idm: {
    label: 'idm.',
    nameEn: 'idiom',
    nameFa: 'اصطلاح',
    cls: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300',
  },
}
