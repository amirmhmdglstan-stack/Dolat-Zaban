# Dolat Zaban

English-Persian dictionary and translator for Android, Windows and the web.

## Features

- Dictionary with 2000+ common English words, grouped letter by letter
- Search by prefix, by substring, and by Persian meaning
- Word pages with IPA pronunciation, text-to-speech, color-coded part of speech, Persian meaning translation and one-word equivalent
- Word of the Day and recently viewed words
- English-Persian translator (both directions, up to 5000 characters)
- Offline dictionary download, offline text-to-speech and offline word-by-word translation
- Backup export and import to share offline data between devices
- English and Persian interface with full right-to-left support
- Light and dark mode, multiple color themes, adjustable text size
- Built-in updater that checks for new releases and downloads them directly

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Open http://localhost:3000

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
