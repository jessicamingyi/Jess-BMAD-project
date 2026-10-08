import './ui/theme.css'
import { idbStore } from './persistence/store.ts'
import { boot } from './ui/boot.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

// The saved document loads before the first render (ui/boot); until then theme.css keeps the page blank.
void boot(idbStore, root, document.documentElement)
