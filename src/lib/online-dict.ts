'use client'

import type { PosCode } from './types'

/**
 * Online lookup when the offline data does not cover a word.
 * Uses The Free Dictionary API (https://dictionaryapi.dev) — free, no key.
 */
export interface OnlineDefinition {
  def: string
  example?: string
}

export interface OnlineMeaning {
  pos: PosCode
  definitions: OnlineDefinition[]
}

export interface OnlineEntry {
  word: string
  phonetic: string
  audio: string
  meanings: OnlineMeaning[]
}

const POS_FROM_API: Record<string, PosCode> = {
  noun: 'n',
  verb: 'v',
  adjective: 'adj',
  adverb: 'adv',
  preposition: 'prep',
  conjunction: 'conj',
  pronoun: 'pron',
  interjection: 'interj',
  numeral: 'num',
  phrase: 'phr',
  idiom: 'idm',
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

export async function lookupOnline(word: string): Promise<OnlineEntry[]> {
  const w = word.trim().toLowerCase()
  if (!w || !/^[a-z][a-z' -]*$/.test(w)) throw new Error('bad-word')
  const res = await withTimeout(
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`, {
      headers: { Accept: 'application/json' },
    }),
    12000
  )
  if (!res.ok) throw new Error(res.status === 404 ? 'not-found' : 'online-failed')
  const data = (await res.json()) as unknown[]
  if (!Array.isArray(data) || !data.length) throw new Error('not-found')

  const entries: OnlineEntry[] = []
  for (const raw of data.slice(0, 3)) {
    const e = raw as {
      word?: string
      phonetic?: string
      phonetics?: { text?: string; audio?: string }[]
      meanings?: {
        partOfSpeech?: string
        definitions?: { definition?: string; example?: string }[]
      }[]
    }
    const phonetics = Array.isArray(e.phonetics) ? e.phonetics : []
    const audio = phonetics.map((p) => p?.audio ?? '').find((a) => a) ?? ''
    const phonetic =
      e.phonetic ?? phonetics.map((p) => p?.text ?? '').find((t) => t) ?? ''
    const meanings: OnlineMeaning[] = []
    for (const m of e.meanings ?? []) {
      const pos = POS_FROM_API[(m.partOfSpeech ?? '').toLowerCase()] ?? 'other'
      const defs = (m.definitions ?? [])
        .filter((d) => d?.definition)
        .slice(0, 4)
        .map((d) => ({ def: String(d.definition), example: d.example ? String(d.example) : undefined }))
      if (defs.length) meanings.push({ pos, definitions: defs })
    }
    if (meanings.length) {
      entries.push({ word: String(e.word ?? w), phonetic, audio, meanings })
    }
  }
  if (!entries.length) throw new Error('not-found')
  return entries
}
