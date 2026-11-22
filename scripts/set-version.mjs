import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tag = process.argv[2] || 'v1.0.0'
const version = tag.replace(/^v/, '')
const [major, minor, patch] = version.split('.').map((n) => parseInt(n, 10) || 0)
const versionCode = major * 10000 + minor * 100 + patch

const gradlePath = resolve(__dirname, '../android/app/build.gradle')
let gradle = readFileSync(gradlePath, 'utf8')
gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`)
gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${version}"`)
writeFileSync(gradlePath, gradle)

const packagePath = resolve(__dirname, '../package.json')
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
pkg.version = version
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')

const updatePath = resolve(__dirname, '../src/lib/update.ts')
let update = readFileSync(updatePath, 'utf8')
update = update.replace(/export const APP_VERSION = '[^']+'/, `export const APP_VERSION = '${version}'`)
writeFileSync(updatePath, update)

console.log(`version ${version} (code ${versionCode}) applied`)
