'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useSettings, useUi } from '@/lib/store'
import { LETTERS, loadLetterFull, getWordEntry, searchDictionary, type SearchResults } from '@/lib/dict'
import { fmt } from '@/lib/i18n'
import { openWordSheet } from '@/lib/nav'
import { useT } from './use-app'
import { POS_META } from './pos'
import type { WordEntry } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Search, X, Heart, CircleHelp, ChevronRight, Loader2, Globe } from 'lucide-react'

function WordRow({ word }: { word: WordEntry }) {
  return (
    <button
      onClick={() => openWordSheet(word.w)}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <p dir="ltr" className="font-en truncate text-left text-[15px] font-semibold">
          {word.w}
          {word.via && <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">({word.via})</span>}
        </p>
        {word.m[0]?.fw && (
          <p dir="rtl" className="font-fa truncate text-right text-[13px] text-muted-foreground">
            {word.m[0].fw}
            {word.m.length > 1 ? ` +${word.m.length - 1}` : ''}
          </p>
        )}
      </div>
      {word.src === 'ext' && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-primary">
          ext
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
    </button>
  )
}

function ResultSection({ title, words }: { title: string; words: WordEntry[] }) {
  const { t } = useT()
  const [limit, setLimit] = useState(50)
  if (!words.length) return null
  return (
    <section>
      <h3 className="px-1 pb-2 pt-1 text-[13px] font-semibold text-muted-foreground">
        {title} <span className="font-normal">({words.length})</span>
      </h3>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <ul className="divide-y divide-border/60">
          {words.slice(0, limit).map((w) => (
            <li key={w.w}>
              <WordRow word={w} />
            </li>
          ))}
        </ul>
        {words.length > limit && (
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="w-full py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-accent"
          >
            {t.showMore}
          </button>
        )}
      </div>
    </section>
  )
}

export function DictionaryView() {
  const { t, lang } = useT()
  const dictLetter = useUi((s) => s.dictLetter)
  const setDictLetter = useUi((s) => s.setDictLetter)
  const dictQuery = useUi((s) => s.dictQuery)
  const setDictQuery = useUi((s) => s.setDictQuery)
  const favoritesOnly = useUi((s) => s.favoritesOnly)
  const setFavoritesOnly = useUi((s) => s.setFavoritesOnly)
  const favorites = useSettings((s) => s.favorites)

  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const [listLimit, setListLimit] = useState(60)
  const [listData, setListData] = useState<{ key: string; words: WordEntry[] } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentKey = favoritesOnly ? 'favorites' : dictLetter

  useEffect(() => {
    let active = true
    if (favoritesOnly) {
      Promise.all(favorites.slice(0, 120).map((w) => getWordEntry(w).catch(() => null))).then((entries) => {
        if (active) {
          setListData({ key: 'favorites', words: entries.filter((e): e is WordEntry => Boolean(e)) })
        }
      })
    } else {
      loadLetterFull(dictLetter)
        .then((words) => {
          if (active) setListData({ key: dictLetter, words })
        })
        .catch(() => {
          if (active) setListData({ key: dictLetter, words: [] })
        })
    }
    return () => {
      active = false
    }
  }, [dictLetter, favoritesOnly, favorites])

  const list = listData?.key === currentKey ? listData.words : null

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null)
      return
    }
    setSearching(true)
    try {
      setResults(await searchDictionary(q))
    } catch {
      setResults({ starts: [], contains: [], meanings: [], ext: null })
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!dictQuery.trim()) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(dictQuery), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [dictQuery, runSearch])

  const searchingActive = dictQuery.trim().length > 0

  return (
    <div className="px-4 pb-10 pt-4">
      <div className="relative">
        <Input
          value={dictQuery}
          onChange={(e) => setDictQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              runSearch(dictQuery)
            }
          }}
          placeholder={t.searchPlaceholder}
          dir="ltr"
          className="font-en h-12 rounded-2xl bg-card pe-20 text-[15px]"
          aria-label={t.searchPlaceholder}
        />
        <div className="absolute inset-y-0 end-1 flex items-center gap-0.5">
          {dictQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground"
              aria-label={t.clear}
              onClick={() => setDictQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-primary"
            aria-label={t.search}
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              runSearch(dictQuery)
            }}
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>

      {searchingActive ? (
        <div className="mt-4 space-y-5">
          {searching && !results && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.searching}
            </div>
          )}
          {results && !searching && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {results.starts.length === 0 &&
              results.contains.length === 0 &&
              results.meanings.length === 0 &&
              !results.ext?.starts.length &&
              !results.ext?.contains.length &&
              !results.ext?.meanings.length ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">{t.noResults}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-xl"
                    onClick={() => {
                      const q = dictQuery.trim()
                      if (q) openWordSheet(q)
                    }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {t.onlineSearch}
                  </Button>
                </div>
              ) : (
                <>
                  <ResultSection title={t.startsWith.replace('{q}', dictQuery.trim())} words={results.starts} />
                  <ResultSection title={t.includesWord.replace('{q}', dictQuery.trim())} words={results.contains} />
                  <ResultSection title={t.inMeanings.replace('{q}', dictQuery.trim())} words={results.meanings} />
                  {results.ext && (
                    <>
                      <ResultSection
                        title={`${t.extended} · ${t.startsWith.replace('{q}', dictQuery.trim())}`}
                        words={results.ext.starts}
                      />
                      <ResultSection
                        title={`${t.extended} · ${t.includesWord.replace('{q}', dictQuery.trim())}`}
                        words={results.ext.contains}
                      />
                      <ResultSection
                        title={`${t.extended} · ${t.inMeanings.replace('{q}', dictQuery.trim())}`}
                        words={results.ext.meanings}
                      />
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2" dir="ltr">
            <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {LETTERS.split('').map((l) => {
                const active = l === dictLetter && !favoritesOnly
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setFavoritesOnly(false)
                      setDictLetter(l)
                    }}
                    className={`font-en h-9 w-9 shrink-0 rounded-xl text-[13px] font-bold uppercase transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                    aria-label={l}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground" aria-label={t.legendTitle}>
                  <CircleHelp className="h-[18px] w-[18px]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <p className="mb-2 text-[13px] font-semibold">{t.legendTitle}</p>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {Object.entries(POS_META).map(([code, meta]) => (
                    <li key={code} className="flex items-center gap-1.5">
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                      <span className="truncate text-muted-foreground">
                        {lang === 'fa' ? meta.nameFa : meta.nameEn}
                      </span>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
            <Button
              variant={favoritesOnly ? 'default' : 'secondary'}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              aria-label={t.favorites}
              onClick={() => setFavoritesOnly(!favoritesOnly)}
            >
              <Heart className={`h-[18px] w-[18px] ${favoritesOnly ? 'fill-current' : ''}`} />
            </Button>
          </div>

          <div className="mt-3">
            {list === null ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
                {favoritesOnly ? t.noFavorites : t.noResults}
              </p>
            ) : (
              <>
                <p className="px-1 pb-2 text-[13px] text-muted-foreground">
                  {fmt(t.wordsCount, { n: list.length })}
                </p>
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <ul className="divide-y divide-border/60">
                    {list.slice(0, listLimit).map((w) => (
                      <li key={w.w}>
                        <WordRow word={w} />
                      </li>
                    ))}
                  </ul>
                  {list.length > listLimit && (
                    <button
                      onClick={() => setListLimit((l) => l + 60)}
                      className="w-full py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-accent"
                    >
                      {t.showMore}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
