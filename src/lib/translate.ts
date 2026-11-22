'use client'

import { translateOfflineWordByWord } from './dict'
import { idbHistoryAdd, idbHistoryAll } from './idb'
import type { TranslationHistoryItem } from './types'

export const MAX_TRANSLATE_CHARS = 5000

export type TranslateProvider = 'google' | 'mymemory' | 'server' | 'offline'

export interface TranslateResult {
  text: string
  provider: TranslateProvider
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false
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

async function findInHistory(text: string, sl: 'en' | 'fa', tl: 'en' | 'fa'): Promise<string | null> {
  try {
    const all = await idbHistoryAll()
    const hit = all.find((h) => h.source === text && h.sl === sl && h.tl === tl)
    return hit ? hit.result : null
  } catch {
    return null
  }
}

async function viaServer(text: string, sl: 'en' | 'fa', tl: 'en' | 'fa'): Promise<string> {
  const res = await withTimeout(
    fetch(`/api/translate?text=${encodeURIComponent(text)}&sl=${sl}&tl=${tl}`),
    15000
  )
  if (!res.ok) throw new Error('server-failed')
  const data = await res.json()
  if (!data?.text) throw new Error('server-empty')
  return data.text
}

async function viaGoogle(text: string, sl: 'en' | 'fa', tl: 'en' | 'fa'): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=` +
    encodeURIComponent(text)
  const res = await withTimeout(fetch(url), 9000)
  if (!res.ok) throw new Error('google-failed')
  const data = await res.json()
  if (!Array.isArray(data?.[0])) throw new Error('google-bad')
  return data[0]
    .map((seg: unknown[]) => (Array.isArray(seg) ? (seg[0] as string) ?? '' : ''))
    .join('')
}

function chunkText(text: string, max = 420): string[] {
  const chunks: string[] = []
  let current = ''
  for (const part of text.split(/(\s+)/)) {
    if ((current + part).length > max && current.trim()) {
      chunks.push(current)
      current = ''
    }
    if (part.length > max) {
      for (let i = 0; i < part.length; i += max) chunks.push(part.slice(i, i + max))
    } else {
      current += part
    }
  }
  if (current.trim()) chunks.push(current)
  return chunks
}

async function viaMyMemory(text: string, sl: 'en' | 'fa', tl: 'en' | 'fa'): Promise<string> {
  const chunks = chunkText(text)
  const results: string[] = []
  for (const chunk of chunks) {
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${sl}|${tl}` +
      `&de=amirmhmdglstan@gmail.com`
    const res = await withTimeout(fetch(url), 9000)
    if (!res.ok) throw new Error('mymemory-failed')
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    const status = Number(data?.responseStatus)
    if (!translated || typeof translated !== 'string' || translated.includes('MYMEMORY WARNING')) {
      throw new Error('mymemory-quota')
    }
    if (status !== 200 && status !== 0) throw new Error('mymemory-status')
    results.push(translated)
  }
  return results.join(' ')
}

export async function translateText(text: string, sl: 'en' | 'fa', tl: 'en' | 'fa'): Promise<TranslateResult> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('empty')
  if (sl === tl) return { text: trimmed, provider: 'server' }

  if (!isOnline()) {
    const cached = await findInHistory(trimmed, sl, tl)
    if (cached) return { text: cached, provider: 'server' }
    const offline = await translateOfflineWordByWord(trimmed, sl === 'en' ? 'en2fa' : 'fa2en')
    return { text: offline, provider: 'offline' }
  }

  const providers: [TranslateProvider, () => Promise<string>][] = [
    ['server', () => viaServer(text, sl, tl)],
    ['google', () => viaGoogle(text, sl, tl)],
    ['mymemory', () => viaMyMemory(trimmed, sl, tl)],
  ]
  for (const [provider, run] of providers) {
    try {
      const result = await run()
      if (result && result.trim()) {
        const item: TranslationHistoryItem = { ts: Date.now(), sl, tl, source: trimmed, result }
        try {
          await idbHistoryAdd(item)
        } catch {
          /* noop */
        }
        return { text: result, provider }
      }
    } catch {
      /* try next */
    }
  }

  const cached = await findInHistory(trimmed, sl, tl)
  if (cached) return { text: cached, provider: 'server' }
  const offline = await translateOfflineWordByWord(trimmed, sl === 'en' ? 'en2fa' : 'fa2en')
  return { text: offline, provider: 'offline' }
}
