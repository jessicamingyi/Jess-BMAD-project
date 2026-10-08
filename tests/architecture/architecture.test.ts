import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkArchitecture, checkBruteImports, checkStorageBoundary, layerOf, type SourceFile } from './check-architecture.ts'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

function messages(files: SourceFile[]): string[] {
  return checkArchitecture(files).map((v) => v.message)
}

describe('AD-1 architecture checker', () => {
  it('passes a clean in-memory tree', () => {
    expect(
      checkArchitecture([
        { path: 'src/engine/grid.ts', source: "import { a } from './cells'\nexport const b = a" },
        { path: 'src/game/reducer.ts', source: "import '../engine/grid'\nimport '../content/sample-puzzle'" },
        { path: 'src/ui/app.tsx', source: "import { useState } from 'react'\nimport '../game/reducer'\nimport './theme.css'" },
        { path: 'src/main.tsx', source: "import './ui/app'\nimport '../src/engine/grid'" },
      ]),
    ).toEqual([])
  })

  it('fails when engine imports game, naming the file and import', () => {
    const v = checkArchitecture([{ path: 'src/engine/x.ts', source: "import { y } from '../game/y'" }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'src/engine/x.ts', kind: 'import', name: '../game/y' })
    expect(v[0].message).toContain('src/engine/x.ts')
    expect(v[0].message).toContain('../game/y')
  })

  it('catches re-exports and dynamic imports too', () => {
    const v = checkArchitecture([
      {
        path: 'src/engine/x.ts',
        source: "export * from '../game/a'\nexport { b } from '../ui/b'\nconst c = () => import('../persistence/c')",
      },
    ])
    expect(v.map((x) => x.name)).toEqual(['../game/a', '../ui/b', '../persistence/c'])
  })

  it.each([
    ['require()', "const y = require('../game/y')", '../game/y'],
    ['import = require()', "import y = require('../game/y')", '../game/y'],
    ["import('…') type", "export type Y = import('../game/y').Y", '../game/y'],
  ])('catches %s', (_kind, source, name) => {
    const v = checkArchitecture([{ path: 'src/engine/x.ts', source }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'src/engine/x.ts', kind: 'import', name })
    expect(v[0].message).toContain('src/engine/x.ts')
    expect(v[0].message).toContain(name)
  })

  it('classifies directory imports by their layer', () => {
    expect(checkArchitecture([{ path: 'src/game/x.ts', source: "import '../engine'" }])).toEqual([])
    const v = checkArchitecture([{ path: 'src/engine/x.ts', source: "import '../game'" }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'src/engine/x.ts', kind: 'import', name: '../game' })
  })

  it('fails when game imports a package, naming the file and package', () => {
    const v = checkArchitecture([{ path: 'src/game/x.ts', source: "import { useState } from 'react'" }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'src/game/x.ts', kind: 'package', name: 'react' })
    expect(v[0].message).toContain('src/game/x.ts')
    expect(v[0].message).toContain('react')
  })

  it('fails when engine imports react-dom', () => {
    expect(messages([{ path: 'src/engine/x.ts', source: "import 'react-dom'" }])).toEqual([
      expect.stringContaining("'react-dom'"),
    ])
  })

  it.each([
    ['Math.random', 'export const r = () => Math.random()'],
    ['Date', 'export const now = () => Date.now()'],
    ['Date', 'export const d = new Date()'],
    ['window', 'export const w = window.innerWidth'],
    ['document', 'export const el = document.body'],
    ['localStorage', "export const s = localStorage.getItem('k')"],
    ['indexedDB', "export const db = indexedDB.open('x')"],
    ['Math.random', "export const r = Math['random']()"],
    ['sessionStorage', "export const s = sessionStorage.getItem('k')"],
    ['globalThis', 'export const n = globalThis.Date.now()'],
    ['self', 'export const s = self.location'],
    ['performance', 'export const t = performance.now()'],
    ['crypto', 'export const id = crypto.randomUUID()'],
  ])('fails when engine uses %s', (name, source) => {
    const v = checkArchitecture([{ path: 'src/engine/x.ts', source }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'src/engine/x.ts', kind: 'global', name })
    expect(v[0].message).toContain('src/engine/x.ts')
    expect(v[0].message).toContain(name)
  })

  it('flags impure globals in game too', () => {
    expect(checkArchitecture([{ path: 'src/game/x.ts', source: 'export const r = Math.random()' }])).toHaveLength(1)
  })

  it('ignores banned names in comments, strings and property names', () => {
    const source = [
      '// Math.random and Date are banned here; window too',
      "export const label = 'document localStorage indexedDB Math.random()'",
      'export const o = { window: 1, Date: 2 }',
      'export const p = o.window + o.Date',
      'export type T = { document: string }',
    ].join('\n')
    expect(checkArchitecture([{ path: 'src/engine/x.ts', source }])).toEqual([])
  })

  it('allows impure globals and packages outside the pure core', () => {
    expect(
      checkArchitecture([
        { path: 'src/ui/x.tsx', source: "import 'react'\nexport const n = Date.now() + Math.random()" },
        { path: 'src/main.tsx', source: 'document.getElementById("root")' },
      ]),
    ).toEqual([])
  })

  it('allows scripts to import game/journey but nothing else in game', () => {
    expect(
      checkArchitecture([
        { path: 'scripts/build-cities.ts', source: "import '../src/game/journey'\nimport '../src/engine/brute'\nimport '../src/content/cities'" },
        { path: 'src/scripts/build-cities.ts', source: "import '../game/journey'" },
      ]),
    ).toEqual([])
    const v = checkArchitecture([{ path: 'scripts/build-cities.ts', source: "import '../src/game/reducer'" }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'scripts/build-cities.ts', name: '../src/game/reducer' })
  })

  it('does not let scripts import game/journey look-alikes', () => {
    const v = checkArchitecture([{ path: 'scripts/x.ts', source: "import '../src/game/journey-secrets'" }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'scripts/x.ts', kind: 'import', name: '../src/game/journey-secrets' })
  })

  it.each([
    ['src/game/x.ts', '../ui/app'],
    ['src/game/x.ts', '../persistence/save'],
    ['src/persistence/x.ts', '../ui/app'],
    ['src/persistence/x.ts', '../workers/w'],
    ['src/workers/x.ts', '../game/reducer'],
    ['src/ui/x.tsx', '../engine/grid'],
    ['src/content/x.ts', '../game/reducer'],
    ['scripts/x.ts', '../src/ui/app'],
  ])('fails %s importing %s', (path, spec) => {
    const v = checkArchitecture([{ path, source: `import '${spec}'` }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: path, kind: 'import', name: spec })
  })
})

function collect(dir: string): SourceFile[] {
  const out: SourceFile[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collect(full))
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push({ path: relative(ROOT, full).replace(/\\/g, '/'), source: readFileSync(full, 'utf8') })
    }
  }
  return out
}

describe('AD-1 architecture of the real tree', () => {
  it('src/ and scripts/ have zero violations', () => {
    const files = [...collect(join(ROOT, 'src')), ...collect(join(ROOT, 'scripts'))]
    expect(files.length).toBeGreaterThan(0)
    // Guard against vacuous passes: some real file must land in a checked layer.
    expect(files.some((f) => !['entry', 'outside'].includes(layerOf(f.path)))).toBe(true)
    expect(messages(files)).toEqual([])
  })

  it('only src/persistence/ touches storage', () => {
    const files = [...collect(join(ROOT, 'src')), ...collect(join(ROOT, 'scripts'))]
    expect(files.some((f) => f.path === 'src/persistence/store.ts')).toBe(true)
    expect(checkStorageBoundary(files)).toEqual([])
  })

  it('only the generator imports engine/brute', () => {
    const files = collect(join(ROOT, 'src'))
    expect(files.some((f) => f.path === 'src/engine/brute.ts')).toBe(true)
    expect(checkBruteImports(files)).toEqual([])
  })
})

describe('brute import guard', () => {
  it('flags the solver importing engine/brute, naming the file', () => {
    const v = checkBruteImports([{ path: 'src/engine/solver.ts', source: "import { countSolutions } from './brute.ts'" }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: 'src/engine/solver.ts', kind: 'brute', name: './brute.ts' })
    expect(v[0].message).toContain('src/engine/solver.ts')
  })

  it.each([
    ['src/engine/grader.ts', "export * from './brute'"],
    ['src/engine/index.ts', "export { countSolutions } from './brute.ts'"],
    ['src/engine/hints/next.ts', "import '../brute'"],
    ['src/workers/generate.ts', "const b = () => import('../engine/brute.ts')"],
    ['src/ui/app.tsx', "import '../engine/brute'"],
  ])('flags %s', (path, source) => {
    const v = checkBruteImports([{ path, source }])
    expect(v).toHaveLength(1)
    expect(v[0].file).toBe(path)
  })

  it('allows the generator (and brute itself), and ignores look-alikes and files outside src/', () => {
    expect(
      checkBruteImports([
        { path: 'src/engine/generator.ts', source: "import { countSolutions } from './brute.ts'" },
        { path: 'src/engine/generator-helpers.ts', source: "import './brute'" },
        { path: 'src/engine/brute.ts', source: "import './candidates.ts'" },
        { path: 'src/engine/solver.ts', source: "import './brute-force-notes.ts'\nimport './grid.ts'" },
        { path: 'tests/engine/brute.test.ts', source: "import '../../src/engine/brute.ts'" },
        { path: 'scripts/verify.ts', source: "import '../src/engine/brute.ts'" },
      ]),
    ).toEqual([])
  })
})

describe('storage boundary guard', () => {
  it.each([
    ['src/ui/app.tsx', "import { get } from 'idb-keyval'", 'idb-keyval'],
    ['src/ui/app.tsx', "const m = () => import('idb-keyval/dist/index.js')", 'idb-keyval/dist/index.js'],
    ['src/main.tsx', "indexedDB.open('x')", 'indexedDB'],
    ['src/ui/theme.ts', "localStorage.setItem('theme', 'x')", 'localStorage'],
    ['src/ui/theme.ts', "window.localStorage.getItem('theme')", 'localStorage'],
    ['src/workers/w.ts', "self['indexedDB'].open('x')", 'indexedDB'],
    ['src/ui/persist.ts', 'navigator.storage.persist()', 'navigator.storage'],
    ['src/ui/persist.ts', 'window.navigator.storage.persisted()', 'navigator.storage'],
    ['src/ui/persist.ts', "navigator['storage'].estimate()", 'navigator.storage'],
    ['src/game/x.ts', "import 'idb-keyval'", 'idb-keyval'],
    ['src/ui/theme.ts', 'const { localStorage } = window', 'localStorage'],
    ['src/ui/theme.ts', 'const { indexedDB: db } = self', 'indexedDB'],
    ['src/ui/persist.ts', 'const { storage } = navigator', 'navigator.storage'],
    ['src/ui/persist.ts', 'const { storage: s } = window.navigator', 'navigator.storage'],
    ['src/ui/persist.ts', "window.navigator['storage'].persist()", 'navigator.storage'],
    ['scripts/x.ts', "import { set } from 'idb-keyval'", 'idb-keyval'],
    ['src/ui/tabs.ts', "navigator.locks.request('traveller-save', () => {})", 'navigator.locks'],
    ['src/ui/tabs.ts', "window.navigator.locks.query()", 'navigator.locks'],
    ['src/ui/tabs.ts', "navigator['locks'].query()", 'navigator.locks'],
    ['src/ui/tabs.ts', 'const { locks } = navigator', 'navigator.locks'],
  ])('flags %s using %s', (path, source, name) => {
    const v = checkStorageBoundary([{ path, source }])
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ file: path, kind: 'storage', name })
    expect(v[0].message).toContain(path)
  })

  it('allows src/persistence/, ignores comments, strings, object keys and files outside src/ and scripts/', () => {
    expect(
      checkStorageBoundary([
        { path: 'src/persistence/store.ts', source: "import { get } from 'idb-keyval'\nnavigator.storage.persist()\nindexedDB.open('x')" },
        { path: 'src/persistence/storage-persist.ts', source: "localStorage.getItem('k')" },
        { path: 'src/persistence/lock.ts', source: "navigator.locks.request('traveller-save', () => {})" },
        {
          path: 'src/ui/x.tsx',
          source: "// localStorage and indexedDB are off limits\nexport const s = 'navigator.storage'\nexport const o = { localStorage: 1 }\nexport const storage = 2\nconst { storage: st } = options\nexport const locks = 3\nconst { locks: l } = options",
        },
        { path: 'tests/persistence/x.test.ts', source: "import 'idb-keyval'\nindexedDB.open('x')" },
      ]),
    ).toEqual([])
  })
})
