import ts from 'typescript'

/**
 * AD-1 architecture guard. Pure: takes in-memory files, returns violations.
 *
 * Layers come from the path: `src/<layer>/…` and `scripts/…`. Files directly in
 * `src/` (e.g. `main.tsx`) are the entry point and may import any layer.
 */

export type SourceFile = { path: string; source: string }

export type Violation = {
  file: string
  kind: 'import' | 'package' | 'global' | 'key'
  /** The import specifier or global name that broke the rule. */
  name: string
  message: string
}

export type Layer =
  | 'engine'
  | 'game'
  | 'content'
  | 'persistence'
  | 'workers'
  | 'ui'
  | 'scripts'
  | 'entry'
  | 'outside'

/** Layers each layer may import (besides itself). `entry` may import anything. */
const ALLOWED: Record<Exclude<Layer, 'entry' | 'outside'>, readonly Layer[]> = {
  engine: [],
  game: ['engine', 'content'],
  content: [],
  persistence: ['game'],
  workers: ['engine'],
  ui: ['game', 'content', 'persistence', 'workers'],
  scripts: ['engine', 'content'],
}

/** Layers that must stay pure: no bare packages, no impure globals. */
const PURE_LAYERS: readonly Layer[] = ['engine', 'game']

const IMPURE_IDENTIFIERS = new Set([
  'Date',
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'globalThis',
  'self',
  'performance',
  'crypto',
])

const SRC_LAYERS = new Set(['engine', 'game', 'content', 'persistence', 'workers', 'ui', 'scripts'])

function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop()
      else out.push('..')
    } else {
      out.push(part)
    }
  }
  return out.join('/')
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}

export function layerOf(path: string): Layer {
  const parts = normalize(path).split('/')
  if (parts[0] === 'scripts' && parts.length > 1) return 'scripts'
  if (parts[0] === 'src') {
    if (SRC_LAYERS.has(parts[1])) return parts[1] as Layer
    if (parts.length === 2) return 'entry'
  }
  return 'outside'
}

function isGameJourney(target: string): boolean {
  return /^src\/game\/journey(?:\.[a-z]+|\/.*)?$/.test(target)
}

function isRelative(spec: string): boolean {
  return spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..'
}

function scriptKindFor(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (/\.[cm]?js$/.test(path)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

/** Collect every module specifier: static imports, re-exports, `import =`, dynamic `import()` and `require()`. */
function collectImports(sf: ts.SourceFile): string[] {
  const specs: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specs.push(node.moduleSpecifier.text)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      specs.push(node.moduleReference.expression.text)
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      const [arg] = node.arguments
      if ((isDynamicImport || isRequire) && arg && ts.isStringLiteralLike(arg)) {
        specs.push(arg.text)
      }
    } else if (ts.isImportTypeNode(node)) {
      const arg = node.argument
      if (ts.isLiteralTypeNode(arg) && ts.isStringLiteralLike(arg.literal)) {
        specs.push(arg.literal.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return specs
}

/** True when the identifier is a name slot (property key, member name), not a value reference. */
function isNameSlot(id: ts.Identifier): boolean {
  const p = id.parent
  if (!p) return false
  if (ts.isPropertyAccessExpression(p) && p.name === id) return true
  if (ts.isQualifiedName(p) && p.right === id) return true
  if (
    (ts.isPropertyAssignment(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isMethodSignature(p) ||
      ts.isGetAccessorDeclaration(p) ||
      ts.isSetAccessorDeclaration(p) ||
      ts.isEnumMember(p) ||
      ts.isBindingElement(p)) &&
    p.name === id
  ) {
    return true
  }
  if (ts.isBindingElement(p) && p.propertyName === id) return true
  if ((ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) && p.propertyName === id) return true
  if (ts.isJsxAttribute(p) && p.name === id) return true
  if (ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)) return true
  return false
}

/** Collect impure globals: `Math.random` as a property access, and the banned identifiers as references. */
function collectImpureGlobals(sf: ts.SourceFile): string[] {
  const found: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math' &&
      node.name.text === 'random'
    ) {
      found.push('Math.random')
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math' &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === 'random'
    ) {
      found.push('Math.random')
    } else if (ts.isIdentifier(node) && IMPURE_IDENTIFIERS.has(node.text) && !isNameSlot(node)) {
      found.push(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

function describeAllowed(layer: Exclude<Layer, 'entry' | 'outside'>): string {
  const extra = layer === 'scripts' ? ['game/journey'] : []
  return [layer, ...ALLOWED[layer], ...extra].join(', ')
}

export function checkArchitecture(files: readonly SourceFile[]): Violation[] {
  const violations: Violation[] = []

  for (const file of files) {
    const path = normalize(file.path)
    const layer = layerOf(path)
    if (layer === 'entry' || layer === 'outside') continue

    const sf = ts.createSourceFile(path, file.source, ts.ScriptTarget.Latest, true, scriptKindFor(path))
    const pure = PURE_LAYERS.includes(layer)

    for (const spec of collectImports(sf)) {
      if (!isRelative(spec)) {
        if (pure) {
          violations.push({
            file: path,
            kind: 'package',
            name: spec,
            message: `${path} imports package '${spec}'; ${layer}/ must not import packages`,
          })
        }
        continue
      }
      const target = normalize(`${dirname(path)}/${spec}`)
      const targetLayer = layerOf(target)
      const ok =
        targetLayer === layer ||
        ALLOWED[layer].includes(targetLayer) ||
        (layer === 'scripts' && isGameJourney(target))
      if (!ok) {
        violations.push({
          file: path,
          kind: 'import',
          name: spec,
          message: `${path} imports '${spec}' (${targetLayer}); ${layer}/ may import only ${describeAllowed(layer)}`,
        })
      }
    }

    if (pure) {
      for (const name of collectImpureGlobals(sf)) {
        violations.push({
          file: path,
          kind: 'global',
          name,
          message: `${path} uses '${name}'; ${layer}/ must stay pure (no Math.random, Date, window, document, localStorage, sessionStorage, indexedDB, globalThis, self, performance, crypto)`,
        })
      }
    }
  }

  return violations
}

/** Key handler props (JSX attributes or object keys), case-insensitive, with or without `Capture`. */
const KEY_PROP = /^onkey(?:down|up|press)(?:capture)?$/i

/** The one file family allowed to handle keys (AD-1, UX-DR60). */
const KEYBOARD_FILE = /^src\/ui\/keyboard(?:[^/]*|\/.*)$/

function propName(name: ts.Node): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : null
}

/**
 * Single keyboard handler guard: outside `src/ui/keyboard*`, no `src/**\/*.ts(x)`
 * file may use key props (`onKeyDown`, `onKeyUp`, `onKeyPress`, `onkeydown = …`)
 * or `addEventListener('key…')`. Pure; returns violations naming the file.
 */
export function checkKeyHandlers(files: readonly SourceFile[]): Violation[] {
  const violations: Violation[] = []
  for (const file of files) {
    const path = normalize(file.path)
    if (!/^src\/.*\.tsx?$/.test(path) || path.endsWith('.d.ts') || KEYBOARD_FILE.test(path)) continue
    const sf = ts.createSourceFile(path, file.source, ts.ScriptTarget.Latest, true, scriptKindFor(path))
    const found: string[] = []
    const visit = (node: ts.Node): void => {
      let name: string | null = null
      if (ts.isJsxAttribute(node)) name = propName(node.name)
      else if (
        ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node)
      ) {
        name = propName(node.name)
      } else if (ts.isPropertyAccessExpression(node)) name = node.name.text
      else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
        name = node.argumentExpression.text
      }
      if (name !== null && KEY_PROP.test(name)) found.push(name)

      if (ts.isCallExpression(node)) {
        const callee = node.expression
        const method = ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : ts.isIdentifier(callee)
            ? callee.text
            : null
        const [arg] = node.arguments
        if (method === 'addEventListener' && arg && ts.isStringLiteralLike(arg) && /^key/i.test(arg.text)) {
          found.push(`addEventListener('${arg.text}')`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    for (const name of found) {
      violations.push({
        file: path,
        kind: 'key',
        name,
        message: `${path} uses ${name}; keyboard handling belongs only in src/ui/keyboard* (one handler)`,
      })
    }
  }
  return violations
}
