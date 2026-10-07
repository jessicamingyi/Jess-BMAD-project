import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

/** Repo-relative paths of every file under `dir`, recursively. */
function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? walk(path) : [path]
  })
}

const DAYLIGHT: Record<string, string> = {
  desk: '#F5EFDF',
  card: '#FFFAF0',
  ink: '#1F2A44',
  'ink-muted': '#4E5670',
  given: '#1A2036',
  'player-ink': '#24418A',
  note: '#535A70',
  'rule-thin': '#73799A',
  'rule-box': '#1F2A44',
  'fill-selected': '#F6D3D0',
  'fill-highlight': '#E6EAF5',
  'fill-same-digit': '#DFE4F4',
  mistake: '#8A4B16',
  'airmail-red': '#B3262F',
  postmark: '#3C4A6E',
  focus: '#1F3A7A',
}

describe('shell static guards', () => {
  const html = read('index.html')
  const theme = read('src/ui/theme.css')

  it('index.html carries the CSP meta, language and title', () => {
    expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`)
    expect(html).toMatch(/<html lang="en">/)
    expect(html).toContain('<title>Traveller Sudoku</title>')
  })

  it('theme.css defines all 16 Daylight colour tokens with exact hexes', () => {
    expect(Object.keys(DAYLIGHT)).toHaveLength(16)
    for (const [role, hex] of Object.entries(DAYLIGHT)) {
      const match = theme.match(new RegExp(`--color-${role}:\\s*(#[0-9A-Fa-f]{6})\\s*;`))
      expect(match?.[1]?.toUpperCase(), role).toBe(hex)
    }
  })

  it('components and stylesheets in src/ui use tokens, never raw hex', () => {
    const files = walk('src/ui').filter((f) => /\.(?:tsx?|css)$/.test(f) && f !== 'src/ui/theme.css')
    expect(files).toContain('src/ui/app.tsx')
    for (const file of files) {
      expect(read(file), file).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
    }
  })

  it('CI runs install, lint, test and build in order, and deploys only after the build job succeeds', () => {
    const workflow = read('.github/workflows/ci-deploy.yml')
    const runs = [...workflow.matchAll(/^\s*- run: (.+)$/gm)].map((m) => m[1].trim())
    expect(runs).toEqual(['npm ci', 'npm run lint', 'npm test', 'npm run build'])
    expect(workflow).not.toMatch(/continue-on-error|if:\s*always\(\)/)
    const deploy = workflow.slice(workflow.indexOf('\n  deploy:'))
    expect(deploy).toMatch(/^\s+needs: build$/m)
    expect(deploy).toContain('actions/deploy-pages')
    expect(workflow.indexOf('upload-pages-artifact')).toBeGreaterThan(workflow.indexOf('- run: npm run build'))
  })

  it('downloads no fonts and makes no remote or data: requests from CSS', () => {
    expect(theme).not.toMatch(/@font-face/i)
    expect(theme).not.toMatch(/url\(\s*['"]?https?:/i)
    expect(theme).not.toMatch(/url\(\s*['"]?data:/i)
  })
})

describe('CI/CD workflow', () => {
  const workflow = read('.github/workflows/ci-deploy.yml')

  it('runs on pushes and pull requests to main', () => {
    expect(workflow).toMatch(/push:\s*\n\s*branches: \[main\]/)
    expect(workflow).toMatch(/pull_request:\s*\n\s*branches: \[main\]/)
  })

  it('runs lint, test and build in order before uploading', () => {
    const steps = ['npm ci', 'npm run lint', 'npm test', 'npm run build', 'upload-pages-artifact'].map((s) =>
      workflow.indexOf(s),
    )
    expect(steps.every((i) => i >= 0)).toBe(true)
    expect([...steps].sort((a, b) => a - b)).toEqual(steps)
  })

  it('deploys only from main, after the build job', () => {
    const deploy = workflow.slice(workflow.indexOf('\n  deploy:'))
    expect(deploy).toContain('needs: build')
    expect(deploy).toContain("if: github.ref == 'refs/heads/main'")
    expect(deploy).toContain('actions/deploy-pages')
  })

  it('publishes to Pages only when the PAGES_ENABLED repository variable is true', () => {
    const gate = "if: github.ref == 'refs/heads/main' && vars.PAGES_ENABLED == 'true'"
    const deploy = workflow.slice(workflow.indexOf('\n  deploy:'))
    expect(deploy).toContain(gate)
    for (const action of ['actions/configure-pages', 'actions/upload-pages-artifact']) {
      const at = workflow.indexOf(action)
      expect(workflow.lastIndexOf('- if: ', at), action).toBe(workflow.lastIndexOf(`- ${gate}`, at))
    }
  })
})
