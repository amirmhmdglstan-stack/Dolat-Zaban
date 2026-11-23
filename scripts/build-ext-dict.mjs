// Builds the downloadable extended dictionary pack for Dolat Zaban.
//
// Sources (downloaded into tmp-data/, not committed):
//   - tmp-data/enfa.tsv            shahabahreini/English-Persian-Dictionary (MIT), 164k curated entries
//   - tmp-data/english-persian-dictionary-dataset-main/slices/by_letter/*.jsonl
//                                  shirin-manzari/english-persian-dictionary-dataset (300k+ headwords)
//   - tmp-data/cmudict-master/cmudict.dict   cmusphinx/cmudict (BSD), IPA pronunciations
//
// Output:
//   - tmp-data/out/dict-ext.json.gz   the downloadable pack
//   - tmp-data/out/ext-meta.json      pack metadata (counts, size, sha256)
//   - src/lib/ext-pack.ts             generated constants embedded in the app
//
// Usage: node scripts/build-ext-dict.mjs [dataDir]

import { createHash } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { gzipSync } from 'zlib'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dataDir = resolve(process.argv[2] ?? resolve(root, 'tmp-data'))
const outDir = resolve(dataDir, 'out')

const PACK_VERSION = '1'
const MAX_MEANINGS = 8
const MAX_SENSES_SHIRIN = 3
const MAX_FW = 28
const MAX_FA = 200
const MAX_ALT = 6

// ---------------------------------------------------------------------------
// CMUdict -> IPA
// ---------------------------------------------------------------------------
const ARPABET = {
  AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð',
  EH: 'ɛ', ER: 'ɜːr', EY: 'eɪ',
  F: 'f', G: 'ɡ', HH: 'h',
  IH: 'ɪ', IY: 'iː',
  JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ',
  OW: 'oʊ', OY: 'ɔɪ', P: 'p', R: 'r', S: 's', SH: 'ʃ',
  T: 't', TH: 'θ', UH: 'ʊ', UW: 'uː', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
}

function loadIpaMap(path) {
  const map = new Map()
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    if (!line || line[0] === ';') continue
    const sp = line.indexOf(' ')
    if (sp < 0) continue
    let word = line.slice(0, sp)
    const variant = word.indexOf('(')
    if (variant > 0) word = word.slice(0, variant)
    if (!/^[a-z][a-z' -]*$/.test(word) || map.has(word)) continue
    const phones = line.slice(sp + 1).trim().split(/\s+/)
    let ipa = ''
    // pending stress marker is placed before the next syllable onset
    // (i.e. before the consonant cluster that follows the previous vowel)
    let pendingStress = ''
    let onset = [] // IPA consonant symbols since the last vowel
    let hasPrevVowel = false
    for (const p of phones) {
      const stress = p[p.length - 1]
      const base = p.replace(/[012]$/, '')
      const sym = ARPABET[base]
      if (!sym) continue
      const isVowel = /^[AEIOU]/.test(base)
      if (isVowel) {
        let lead = onset.join('')
        if (stress === '1' || stress === '2') {
          if (hasPrevVowel && onset.length > 1) {
            // keep one consonant as the previous syllable's coda,
            // move up to two to the stressed onset
            const move = Math.min(2, onset.length - 1)
            ipa += onset.slice(0, onset.length - move).join('')
            lead = onset.slice(onset.length - move).join('')
          }
          pendingStress = stress === '1' ? 'ˈ' : 'ˌ'
        }
        ipa += pendingStress + lead + (base === 'AH' && stress === '0' ? 'ə' : sym)
        pendingStress = ''
        onset = []
        hasPrevVowel = true
      } else {
        onset.push(sym)
      }
    }
    if (onset.length) ipa += onset.join('')
    if (ipa) map.set(word, ipa)
  }
  return map
}

// ---------------------------------------------------------------------------
// TSV (curated) parse
// ---------------------------------------------------------------------------
const POS_MAP = {
  'n.': 'n', 'v.': 'v', 'adj.': 'adj', 'adv.': 'adv', 'prep.': 'prep',
  'conj.': 'conj', 'pron.': 'pron', 'interj.': 'interj', 'num.': 'num',
  'idm.': 'idm', 'phr.': 'phr', 'aux.': 'v', 'inf.': 'v', 'abbr.': 'other',
}

function cleanFw(s) {
  return s
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[«»"”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FW)
    .trim()
}

function parseTsvSense(text) {
  // one sense: "equivalent1، equivalent2، ..." possibly with parenthetical notes
  const parts = text.split('،').map((p) => cleanFw(p)).filter(Boolean)
  const fw = parts[0] ?? cleanFw(text)
  return { fw, fa: text.replace(/\s+/g, ' ').trim().slice(0, MAX_FA).trim() }
}

function parseTsvDefinition(definition) {
  const meanings = []
  for (const group of definition.split(' | ')) {
    let body = group.trim()
    let pos = 'other'
    const tag = body.match(/^\[([^\]]+)\]\s*/)
    if (tag) {
      body = body.slice(tag[0].length)
      const mapped = POS_MAP[tag[1].toLowerCase()]
      if (mapped) pos = mapped
    }
    for (const sense of body.split('؛')) {
      const s = sense.trim()
      if (!s) continue
      const { fw, fa } = parseTsvSense(s)
      if (!fw || !/[\u0600-\u06FF]/.test(fa)) continue
      meanings.push({ p: pos, en: '', fa, fw })
      if (meanings.length >= MAX_MEANINGS) return meanings
    }
  }
  return meanings
}

// ---------------------------------------------------------------------------
// shirin jsonl parse (supplemental breadth)
// ---------------------------------------------------------------------------
const PERSIAN_RE = /[\u0600-\u06FF]/
const ENGLISH_WORD_RE = /^[a-z][a-z0-9' -]{0,39}$/

function okShirinPersian(s) {
  if (!s || s.length < 2 || s.length > 120) return false
  if (!PERSIAN_RE.test(s)) return false
  if (/https?:\/\//.test(s)) return false
  const persian = (s.match(/[\u0600-\u06FF]/g) || []).length
  if (persian < 2) return false
  const latin = (s.match(/[A-Za-z]/g) || []).length
  if (latin > persian * 1.2) return false
  return true
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------
console.log('loading CMU pronunciations...')
const ipaMap = loadIpaMap(resolve(dataDir, 'cmudict-master/cmudict.dict'))
console.log(`  ${ipaMap.size} pronunciations`)

console.log('parsing curated TSV...')
const tsvPath = resolve(dataDir, 'enfa.tsv')
const entries = new Map() // normalized word -> entry

function normalizeWord(w) {
  return w.toLowerCase().replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim()
}

{
  const lines = readFileSync(tsvPath, 'utf8').split('\n')
  let count = 0
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    if (cols.length < 2) continue
    const [headword, definition, sections, , alternateForms] = cols
    const w = normalizeWord(headword)
    if (!w || !ENGLISH_WORD_RE.test(w) || w.length < 2) continue
    const m = parseTsvDefinition(definition)
    if (!m.length) continue
    const al = (alternateForms || '')
      .split('|')
      .map((a) => normalizeWord(a))
      .filter((a) => a && a !== w && ENGLISH_WORD_RE.test(a))
      .slice(0, MAX_ALT)
    const sec = (sections || '').split('|')[0].trim()
    const entry = {
      w,
      ipa: ipaMap.get(w) ?? '',
      m: m.slice(0, MAX_MEANINGS),
      al,
    }
    if (sec && sec !== 'general') entry.s = sec
    entries.set(w, entry)
    count++
  }
  console.log(`  ${count} headwords`)
}

console.log('parsing supplemental word list...')
{
  const dir = resolve(dataDir, 'english-persian-dictionary-dataset-main/slices/by_letter')
  let added = 0
  let rows = 0
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.jsonl')) continue
    const text = readFileSync(resolve(dir, file), 'utf8')
    const byWord = new Map()
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      let row
      try {
        row = JSON.parse(line)
      } catch {
        continue
      }
      rows++
      const w = normalizeWord(String(row.english || ''))
      if (!w || w.length < 2 || !ENGLISH_WORD_RE.test(w)) continue
      if (!/^[a-z]/.test(w)) continue
      const fa = String(row.persian || '').replace(/\s+/g, ' ').trim()
      if (!okShirinPersian(fa)) continue
      if (!byWord.has(w)) byWord.set(w, [])
      byWord.get(w).push({ order: Number(row.sense_order) || 99, fa })
    }
    for (const [w, senses] of byWord) {
      if (entries.has(w)) continue
      senses.sort((a, b) => a.order - b.order)
      const m = []
      const seen = new Set()
      for (const s of senses) {
        const fw = cleanFw(s.fa)
        if (!fw || seen.has(fw)) continue
        seen.add(fw)
        m.push({ p: 'other', en: '', fa: s.fa.slice(0, MAX_FA).trim(), fw })
        if (m.length >= MAX_SENSES_SHIRIN) break
      }
      if (!m.length) continue
      entries.set(w, {
        w,
        ipa: ipaMap.get(w) ?? '',
        m,
        al: [],
      })
      added++
    }
  }
  console.log(`  ${rows} rows scanned, ${added} new headwords`)
}

// Attach IPA to any entry still missing it + tidy
for (const e of entries.values()) {
  if (!e.ipa) e.ipa = ipaMap.get(e.w) ?? ''
}

// ---------------------------------------------------------------------------
// Write pack
// ---------------------------------------------------------------------------
const words = [...entries.values()].sort((a, b) => (a.w < b.w ? -1 : a.w > b.w ? 1 : 0))
const meanings = words.reduce((s, w) => s + w.m.length, 0)
const pack = { v: Number(PACK_VERSION), words }
const json = JSON.stringify(pack)
mkdirSync(outDir, { recursive: true })
const gz = gzipSync(Buffer.from(json), { level: 9 })
writeFileSync(resolve(outDir, 'dict-ext.json'), json)
writeFileSync(resolve(outDir, 'dict-ext.json.gz'), gz)

const sha256 = createHash('sha256').update(gz).digest('hex')
const meta = {
  version: PACK_VERSION,
  words: words.length,
  meanings,
  jsonBytes: Buffer.byteLength(json),
  gzBytes: gz.length,
  sha256,
}
writeFileSync(resolve(outDir, 'ext-meta.json'), JSON.stringify(meta, null, 2))

const url = 'https://github.com/amirmhmdglstan-stack/Dolat-Zaban/releases/download/dict-ext/dict-ext.json.gz'
const ts = `// Generated by scripts/build-ext-dict.mjs — do not edit by hand.
export const EXT_PACK = {
  version: '${PACK_VERSION}',
  words: ${words.length},
  meanings: ${meanings},
  gzBytes: ${gz.length},
  url: '${url}',
}
`
writeFileSync(resolve(root, 'src/lib/ext-pack.ts'), ts)

console.log(`\npack v${PACK_VERSION}: ${words.length} words, ${meanings} meanings`)
console.log(`  json ${(meta.jsonBytes / 1e6).toFixed(1)} MB, gz ${(meta.gzBytes / 1e6).toFixed(1)} MB`)
console.log(`  sha256 ${sha256}`)
console.log(`  written to ${outDir}`)
if (!existsSync(resolve(outDir, 'dict-ext.json.gz'))) throw new Error('pack missing')
