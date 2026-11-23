'use client'

export const APP_VERSION = '1.1.0'
export const GITHUB_REPO = 'amirmhmdglstan-stack/Dolat-Zaban'

export interface ReleaseAsset {
  name: string
  url: string
  size: number
}

export interface ReleaseInfo {
  version: string
  notes: string
  date: string
  assets: ReleaseAsset[]
}

const CACHE_KEY = 'dz-update-check'
const TTL = 30 * 60 * 1000

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      ctrl.abort()
      reject(new Error('timeout'))
    }, ms)
    fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } }).then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

export async function checkLatestRelease(force = false): Promise<ReleaseInfo | null> {
  if (typeof window === 'undefined') return null
  if (!force) {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw)
        if (Date.now() - cached.ts < TTL && cached.data) return cached.data
      }
    } catch {
      /* noop */
    }
  }
  const res = await fetchWithTimeout(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, 9000)
  if (!res.ok) return null
  const data = await res.json()
  const info: ReleaseInfo = {
    version: String(data.tag_name || '').replace(/^v/, ''),
    notes: String(data.body || ''),
    date: String(data.published_at || ''),
    assets: (Array.isArray(data.assets) ? data.assets : []).map((a: { name?: string; browser_download_url?: string; size?: number }) => ({
      name: String(a.name || ''),
      url: String(a.browser_download_url || ''),
      size: Number(a.size) || 0,
    })),
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: info }))
  } catch {
    /* noop */
  }
  return info
}

export function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split('.').map((n) => parseInt(n, 10) || 0)
  const l = local.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true
    if ((r[i] || 0) < (l[i] || 0)) return false
  }
  return false
}

export function pickAsset(info: ReleaseInfo, kind: 'apk' | 'exe'): ReleaseAsset | undefined {
  return info.assets.find((a) => a.name.toLowerCase().endsWith(`.${kind}`))
}

export function formatBytes(n: number): string {
  if (!n || n <= 0) return ''
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function cleanReleaseNotes(notes: string, maxLen = 420): string {
  const lines = notes
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/^[-*]\s*/, '').replace(/`/g, '').trim())
    .filter(Boolean)
  let out = ''
  for (const line of lines) {
    if ((out + line).length > maxLen) break
    out += line + '\n'
  }
  return out.trim()
}
