# Dolat Zaban

English-Persian dictionary and translator for Android, Windows and the web.

## Features

- Dictionary with 2,600 built-in common English words (meanings, IPA, examples, parts of speech)
- **Downloadable full dictionary**: 300,000+ words with Persian meanings and IPA pronunciations, installed on demand and then fully offline
- Online lookup (The Free Dictionary API) for anything the offline dictionary misses, with on-demand Persian translation of the definitions
- Search by prefix, by substring, by Persian meaning, and by inflected forms ("walked" finds "walk")
- Word pages with IPA pronunciation, text-to-speech, color-coded part of speech, subject labels and one-word equivalents
- Word of the Day and recently viewed words
- English-Persian translator (both directions, up to 5000 characters) with Google / MyMemory fallbacks and word-by-word offline mode
- Offline dictionary download per letter, offline text-to-speech and offline word-by-word translation
- Backup export and import to share offline data between devices
- English and Persian interface with full right-to-left support
- Light and dark mode, multiple color themes, adjustable text size
- Built-in updater that checks for new releases and downloads them directly

## Architecture

- Next.js + React + Tailwind CSS, wrapped with Capacitor (Android) and Electron (Windows)
- `public/data/*.json` — the small rich dictionary bundled with the app
- The full dictionary pack (`dict-ext.json.gz`) is built by `scripts/build-ext-dict.mjs`
  from public datasets and published as a GitHub release asset (tag `dict-ext`);
  the app downloads it from the Offline tab and stores it in IndexedDB

### Data sources

- [shahabahreini/English-Persian-Dictionary](https://github.com/shahabahreini/English-Persian-Dictionary) (MIT)
- [shirin-manzari/english-persian-dictionary-dataset](https://github.com/shirin-manzari/english-persian-dictionary-dataset)
- [cmusphinx/cmudict](https://github.com/cmusphinx/cmudict) (BSD) for pronunciations
- [dictionaryapi.dev](https://dictionaryapi.dev) for online definitions

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Open http://localhost:3000

### Rebuild the icon set

```bash
node scripts/gen-icons.mjs
```

Source artwork lives in `scripts/assets/app-icon.webp`.

### Rebuild the full dictionary pack

Download the source datasets into `tmp-data/` (see the header of the script for
the exact repos and paths), then:

```bash
node scripts/build-ext-dict.mjs
```

This writes `tmp-data/out/dict-ext.json.gz` and refreshes `src/lib/ext-pack.ts`.
Upload the `.gz` file to the `dict-ext` release of this repository. For local
testing you can also copy it to `public/data/dict-ext.json.gz` (not committed).

### Lint and type check

```bash
bun run lint
```

### Build

Web app (server mode):

```bash
bun run build
```

Static export for Android and Windows packages:

```bash
rm -rf src/app/api
STATIC_EXPORT=1 bun run build:static
```

### Android

The `android/` folder is a Capacitor project with a committed release keystore so every release is signed with the same key and can be installed over previous versions.

```bash
STATIC_EXPORT=1 bun run build:static
bunx cap sync android
cd android && ./gradlew assembleRelease
```

### Windows

Electron wrapper with NSIS installer:

```bash
STATIC_EXPORT=1 bun run build:static
bunx electron-builder --win nsis --config electron-builder.yml
```

## Releasing

1. Push your changes to the `main` branch.
2. Create and publish a GitHub release with a `vX.Y.Z` tag.
3. The `Release builds` workflow builds the APK and the Windows setup, and attaches both to the release.
4. The app notifies installed users and offers a direct in-app update download.

## Contact

Amir Mohammad Golestan - amirmhmdglstan@gmail.com

## License

MIT
