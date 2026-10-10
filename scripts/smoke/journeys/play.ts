import { copy } from '../../../src/content/copy.ts'
import { byText, type Page } from '../cdp.ts'
import {
  cell,
  cellLabel,
  check,
  city,
  countEmpty,
  emptyCells,
  GRID_CELLS,
  navButton,
  open,
  placeDigit,
  travelTo,
  type Journey,
} from '../journey.ts'

const HINT_PANEL = `document.querySelector('[role=region][aria-label=${JSON.stringify(copy.hintPanelLabel)}]')`

export const play: Journey = {
  name: 'Play: digits by key and mouse, Notes, Undo, Hint',
  async run({ browser, url }) {
    const page = await browser.newPage()
    await open(page, url)
    const paris = city('Paris')
    await travelTo(page, paris.name)
    const [a, b, c] = emptyCells(paris.givens)

    // Keyboard: select, then type.
    await placeDigit(page, a, paris.solution[a])
    check((await cellLabel(page, a)).includes(`, ${paris.solution[a]}, your digit`), `typed digit not placed: ${await cellLabel(page, a)}`)

    // Mouse: select, then the digit pad.
    await page.click(cell(b), 30)
    await page.click(`document.querySelectorAll('[role=group][aria-label=${JSON.stringify(copy.digitPadLabel)}] button')[${Number(paris.solution[b]) - 1}]`)
    check((await cellLabel(page, b)).includes(`, ${paris.solution[b]}, your digit`), `pad digit not placed: ${await cellLabel(page, b)}`)

    // Notes (N), a Note, back to digits.
    await page.click(cell(c), 30)
    await page.type('n')
    await page.type(paris.solution[c])
    check((await cellLabel(page, c)).includes(`notes ${paris.solution[c]}`), `Note not added: ${await cellLabel(page, c)}`)
    await page.type('n')

    // Undo (Ctrl/Cmd+Z) removes the Note.
    await page.undo()
    check((await cellLabel(page, c)).endsWith(', empty'), `Undo did not revert the Note: ${await cellLabel(page, c)}`)
    check((await cellLabel(page, b)).includes('your digit'), 'Undo reverted more than one step')

    // Hint (H): nudge, then explanation, then the move.
    const before = await countEmpty(page)
    await page.type('h')
    await page.waitFor(`${HINT_PANEL}?.innerText.includes(${JSON.stringify(copy.hintLabelNudge)})`, 'Hint nudge')
    await page.type('h')
    await page.waitFor(`${HINT_PANEL}?.innerText.includes(${JSON.stringify(copy.hintLabelExplain)})`, 'Hint explanation')
    await page.type('h')
    await page.waitFor(
      `[...${GRID_CELLS}].filter(c=>c.getAttribute('aria-label').includes(', empty')).length===${before - 1}`,
      'Hint move placed',
    )
  },
}

/** Fill every empty cell with the solution. */
async function solve(page: Page, givens: string, solution: string): Promise<void> {
  for (const i of emptyCells(givens)) {
    await page.click(cell(i), 0)
    await page.type(solution[i])
  }
}

export const postcard: Journey = {
  name: 'Postcard: solve a City, reveal, Add to Album, viewer, Play again',
  timeout: 90_000,
  async run({ browser, url }) {
    const page = await browser.newPage()
    await open(page, url)
    const rome = city('Rome')
    await travelTo(page, rome.name)
    await solve(page, rome.givens, rome.solution)

    const dialog = `document.querySelector('[role=dialog][aria-label=${JSON.stringify(copy.postcardFrom(rome.name))}]')`
    await page.waitFor(dialog, 'Postcard reveal')
    const line = await page.eval<string>(`${dialog}.innerText`)
    check(line.includes(rome.line), `Postcard line missing; dialog says: ${line.slice(0, 200)}`)
    check(!rome.line.startsWith('PLACEHOLDER'), 'Postcard line is still a placeholder')
    await page.click(byText('[role=dialog] button', copy.addToAlbum))

    const seeLabel = copy.slotLabel(rome.name, rome.country, 'near', copy.slotSeePostcard)
    const slot = `document.querySelector('[aria-label=${JSON.stringify(seeLabel)}]')`
    if (!(await page.eval<boolean>(`!!${slot}`))) await page.click(navButton(copy.navAlbum))
    await page.waitFor(slot, 'collected slot in the Album')
    check(
      await page.eval<boolean>(`${slot}.closest('li').innerText.includes(${JSON.stringify(copy.justArrived)})`),
      'collected slot does not say "just arrived"',
    )

    await page.click(slot)
    await page.waitFor(`${dialog}?.innerText.includes(${JSON.stringify(rome.line)})`, 'Postcard viewer')
    await page.click(byText('[role=dialog] button', copy.playAgain))
    const fresh = byText('button', copy.startFresh)
    if (await page.eval<boolean>(`!!${fresh}`)) await page.click(fresh)
    const empties = emptyCells(rome.givens).length
    await page.waitFor(
      `${GRID_CELLS}.length===81 && [...${GRID_CELLS}].filter(c=>c.getAttribute('aria-label').includes(', empty')).length===${empties}`,
      'replay grid with only the Givens',
    )
  },
}

/** Free Play: pick the Difficulty and start (confirming a replace if one is in progress); waits for the grid. */
export async function startFreePlay(page: Page): Promise<void> {
  await page.click(navButton(copy.navFreePlay))
  await page.waitFor(byText('[role=group] button', copy.difficultyName('easy')), 'Difficulty picker')
  await page.click(byText('[role=group] button', copy.difficultyName('easy')))
  const start = byText('button', copy.freePlayStart)
  if (await page.eval<boolean>(`!!${start}`)) {
    await page.click(start)
  } else {
    await page.click(byText('button', copy.freePlayStartNew))
    await page.click(byText('[role=group] button', copy.freePlayStartNew))
  }
  await page.waitFor(
    `${GRID_CELLS}.length===81 && document.body.innerText.includes(${JSON.stringify(copy.freePlayTitle('easy'))})`,
    'generated Free Play grid',
    25_000,
  )
  check(!(await page.hasText(copy.freePlayFailed)), 'Free Play generation failed')
}

export const freePlay: Journey = {
  name: 'Free Play: generate an Easy Puzzle',
  async run({ browser, url }) {
    const page = await browser.newPage()
    await open(page, url)
    await startFreePlay(page)
    check((await countEmpty(page)) > 0, 'Free Play grid has no empty cells')
  },
}
