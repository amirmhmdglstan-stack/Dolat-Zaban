import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_CHARS = 5000
const LANGS = new Set(['en', 'fa'])

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

async function viaGoogle(text: string, sl: string, tl: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=` +
    encodeURIComponent(text)
  const res = await withTimeout(fetch(url, { cache: 'no-store' }), 8000)
  if (!res.ok) throw new Error('google-http')
  const data = await res.json()
  if (!Array.isArray(data?.[0])) throw new Error('google-shape')
  const out = (data[0] as unknown[][])
    .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
    .join('')
  if (!out.trim()) throw new Error('google-empty')
  return out
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

async function viaMyMemory(text: string, sl: string, tl: string): Promise<string> {
  const results: string[] = []
  for (const chunk of chunkText(text)) {
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${sl}|${tl}` +
      `&de=amirmhmdglstan@gmail.com`
    const res = await withTimeout(fetch(url, { cache: 'no-store' }), 8000)
    if (!res.ok) throw new Error('mymemory-http')
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (!translated || typeof translated !== 'string' || translated.includes('MYMEMORY WARNING')) {
      throw new Error('mymemory-quota')
    }
    const status = Number(data?.responseStatus)
    if (status !== 200 && status !== 0) throw new Error('mymemory-status')
    results.push(translated)
  }
  return results.join(' ')
}

function cleanTranslation(s: string): string {
  return s
    .replace(/^\s*(translation|ترجمه)\s*[:：]\s*/i, '')
    .replace(/^["«]([\s\S]*)["»]$/, '$1')
    .trim()
}

async function viaAI(text: string, sl: string, tl: string): Promise<string> {
  const { default: ZAI } = await import('z-ai-web-dev-sdk')
  const zai = await ZAI.create()
  const from = sl === 'en' ? 'English' : 'Persian (Farsi)'
  const to = tl === 'en' ? 'English' : 'Persian (Farsi)'
  const completion = await withTimeout(
    zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            `You are a professional translator between English and Persian (Farsi). Translate the user's text from ${from} to ${to}. Output ONLY the translation. Keep the same tone, keep line breaks, do not add explanations, quotes or notes.`,
        },
        { role: 'user', content: text },
      ],
      thinking: { type: 'disabled' },
    }),
    60000
  )
  const out = completion.choices[0]?.message?.content ?? ''
  const cleaned = cleanTranslation(out)
  if (!cleaned) throw new Error('ai-empty')
  return cleaned
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const text = searchParams.get('text') ?? ''
  const sl = searchParams.get('sl') ?? 'en'
  const tl = searchParams.get('tl') ?? 'fa'

  if (!text.trim()) {
    return NextResponse.json({ error: 'empty-text' }, { status: 400 })
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: 'too-long' }, { status: 400 })
  }
  if (!LANGS.has(sl) || !LANGS.has(tl)) {
    return NextResponse.json({ error: 'bad-lang' }, { status: 400 })
  }
  if (sl === tl) {
    return NextResponse.json({ text, provider: 'server' })
  }

  const providers: [string, () => Promise<string>][] = [
    ['google', () => viaGoogle(text, sl, tl)],
    ['mymemory', () => viaMyMemory(text, sl, tl)],
    ['ai', () => viaAI(text, sl, tl)],
  ]

  for (const [name, run] of providers) {
    try {
      const result = await run()
      if (result.trim()) {
        return NextResponse.json({ text: result, provider: name })
      }
    } catch {
      /* try next provider */
    }
  }

  return NextResponse.json({ error: 'all-providers-failed' }, { status: 502 })
}
