import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const icon = resolve(root, 'public/icon.png')

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
  await sharp(icon).resize(m.size, m.size, { fit: 'cover' }).png().toFile(resolve(dir, 'ic_launcher.png'))
  await sharp(icon).resize(m.size, m.size, { fit: 'cover' }).png().toFile(resolve(dir, 'ic_launcher_round.png'))
  await sharp({
    create: {
      width: m.fg,
      height: m.fg,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: await sharp(icon).resize(Math.round(m.fg * 0.58)).png().toBuffer(), gravity: 'center' }])
    .png()
    .toFile(resolve(dir, 'ic_launcher_foreground.png'))
}

const drawable = resolve(resRoot, 'drawable')
mkdirSync(drawable, { recursive: true })
await sharp({
  create: {
    width: 900,
    height: 1400,
    channels: 4,
    background: { r: 37, g: 99, b: 235, alpha: 1 },
  },
})
  .composite([{ input: await sharp(icon).resize(260).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(resolve(drawable, 'splash.png'))

mkdirSync(resolve(root, 'build'), { recursive: true })
await sharp(icon).resize(512, 512, { fit: 'cover' }).png().toFile(resolve(root, 'build/icon.png'))

console.log('icons generated')
