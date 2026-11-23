import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const source = resolve(root, 'scripts/assets/app-icon.webp')

// Brand colors sampled from the app icon (deep emerald green)
const GREEN_TOP = { r: 5, g: 119, b: 85 }
const GREEN_BOTTOM = { r: 1, g: 88, b: 75 }
export const BRAND_GREEN = '#057855'

async function gradientPng(width, height) {
  // 1px wide vertical gradient, stretched to the full canvas
  const rows = Buffer.alloc(height * 3)
  for (let y = 0; y < height; y++) {
    const t = height === 1 ? 0 : y / (height - 1)
    rows[y * 3] = Math.round(GREEN_TOP.r + (GREEN_BOTTOM.r - GREEN_TOP.r) * t)
    rows[y * 3 + 1] = Math.round(GREEN_TOP.g + (GREEN_BOTTOM.g - GREEN_TOP.g) * t)
    rows[y * 3 + 2] = Math.round(GREEN_TOP.b + (GREEN_BOTTOM.b - GREEN_TOP.b) * t)
  }
  return sharp(rows, { raw: { width: 1, height, channels: 3 } })
    .resize(width, height, { kernel: 'nearest' })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function splash(width, height, iconRatio = 0.34) {
  const bg = await gradientPng(width, height)
  const iconSize = Math.round(Math.min(width, height) * iconRatio)
  const icon = await sharp(source)
    .resize(iconSize, iconSize, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  return sharp(bg)
    .composite([{ input: icon, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Web / PWA icons
// ---------------------------------------------------------------------------
mkdirSync(resolve(root, 'public'), { recursive: true })
await sharp(source)
  .resize(512, 512, { fit: 'cover' })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(resolve(root, 'public/icon.png'))
await sharp(source)
  .resize(192, 192, { fit: 'cover' })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(resolve(root, 'public/icon-192.png'))

// ---------------------------------------------------------------------------
// Electron / Windows icon
// ---------------------------------------------------------------------------
mkdirSync(resolve(root, 'build'), { recursive: true })
await sharp(source)
  .resize(512, 512, { fit: 'cover' })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(resolve(root, 'build/icon.png'))

// ---------------------------------------------------------------------------
// Android launcher icons
// ---------------------------------------------------------------------------
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48, fg: 108 },
  { dir: 'mipmap-hdpi', size: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fg: 432 },
]

const resRoot = resolve(root, 'android/app/src/main/res')

for (const m of mipmaps) {
  const dir = resolve(resRoot, m.dir)
  mkdirSync(dir, { recursive: true })
  // Legacy square + round icons
  await sharp(source).resize(m.size, m.size, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(resolve(dir, 'ic_launcher.png'))
  await sharp(source)
    .resize(m.size, m.size, { fit: 'cover' })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${m.size}" height="${m.size}"><circle cx="${m.size / 2}" cy="${m.size / 2}" r="${m.size / 2}" fill="white"/></svg>`
        ),
        blend: 'dest-in',
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(resolve(dir, 'ic_launcher_round.png'))
  // Adaptive-icon foreground: full-bleed artwork (corners are flat green,
  // so the launcher mask crops cleanly over the green background layer).
  await sharp(source).resize(m.fg, m.fg, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(resolve(dir, 'ic_launcher_foreground.png'))
}

// ---------------------------------------------------------------------------
// Android splash screens (drawable + per-density land/port)
// ---------------------------------------------------------------------------
mkdirSync(resolve(resRoot, 'drawable'), { recursive: true })
const { writeFile } = await import('fs/promises')
await writeFile(resolve(resRoot, 'drawable/splash.png'), await splash(900, 1400, 0.3))

const splashDensities = [
  { dir: 'drawable-land-mdpi', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', w: 720, h: 480 },
  { dir: 'drawable-land-xhdpi', w: 960, h: 640 },
  { dir: 'drawable-land-xxhdpi', w: 1440, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  { dir: 'drawable-port-mdpi', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', w: 480, h: 720 },
  { dir: 'drawable-port-xhdpi', w: 640, h: 960 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1440 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
]

for (const s of splashDensities) {
  const dir = resolve(resRoot, s.dir)
  mkdirSync(dir, { recursive: true })
  await writeFile(resolve(dir, 'splash.png'), await splash(s.w, s.h, 0.32))
}

console.log('icons and splash screens generated')
