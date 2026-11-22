'use client'

let voicesCache: SpeechSynthesisVoice[] = []

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([])
    const now = window.speechSynthesis.getVoices()
    if (now.length) {
      voicesCache = now
      return resolve(now)
    }
    const handler = () => {
      voicesCache = window.speechSynthesis.getVoices()
      resolve(voicesCache)
      window.speechSynthesis.onvoiceschanged = null
    }
    window.speechSynthesis.onvoiceschanged = handler
    setTimeout(() => {
      const v = window.speechSynthesis.getVoices()
      if (v.length) {
        voicesCache = v
        resolve(v)
      } else if (!voicesCache.length) resolve([])
    }, 1200)
  })
}

export function speak(text: string, lang: 'en' | 'fa'): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!ttsSupported() || !text.trim()) return reject(new Error('tts-unavailable'))
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang === 'en' ? 'en-US' : 'fa-IR'
    utter.rate = 0.92
    const voices = await getVoices()
    const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === (lang === 'en' ? 'en-us' : 'fa-ir'))
    const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(lang))
    const voice = exact ?? prefix
    if (voice) utter.voice = voice
    utter.onend = () => resolve()
    utter.onerror = () => reject(new Error('tts-error'))
    window.speechSynthesis.speak(utter)
  })
}

export function hasVoiceFor(lang: 'en' | 'fa'): Promise<boolean> {
  return getVoices().then((voices) => voices.some((v) => v.lang.toLowerCase().startsWith(lang)))
}
