/**
 * Deploy gate: `npm run check:placeholders [cities.json]`. Exits 1 while any City
 * is still a placeholder (Postcard line not written yet, TS-40). Node built-ins
 * only, so CI can run it without `npm ci`.
 */
import { readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

type CityLike = { readonly id: string; readonly placeholder?: boolean }

const DEFAULT_CITIES = fileURLToPath(new URL('../src/content/cities.json', import.meta.url))

/** Ids of placeholder Cities, in catalogue order. */
export function placeholderIds(cities: readonly CityLike[]): string[] {
  return cities.filter((c) => c.placeholder === true).map((c) => c.id)
}

function main(argv: readonly string[]): number {
  const cities = JSON.parse(readFileSync(argv[0] ?? DEFAULT_CITIES, 'utf8')) as CityLike[]
  const ids = placeholderIds(cities)
  if (ids.length > 0) {
    console.error(`Deploy blocked: ${ids.length} placeholder Cities: ${ids.join(', ')}`)
    return 1
  }
  console.log('No placeholder Cities.')
  return 0
}

/** True when Node was started on this file (real paths, so symlinks and casing can't skip `main`). */
function isEntryPoint(): boolean {
  if (!process.argv[1]) return false
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2))
}
