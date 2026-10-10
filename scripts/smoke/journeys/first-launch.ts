import { copy } from '../../../src/content/copy.ts'
import { check, gotIt, open, rendered, sleep, type Journey } from '../journey.ts'

export const firstLaunch: Journey = {
  name: 'First launch: storage notice, Got it, stays hidden after reload',
  async run({ browser, url }) {
    const page = await browser.newPage()
    await open(page, url)
    await page.waitFor(`document.body.innerText.includes(${JSON.stringify(copy.bannerStorageNotice)})`, 'storage notice')
    await page.click(gotIt())
    await page.waitFor(`!document.body.innerText.includes(${JSON.stringify(copy.bannerStorageNotice)})`, 'notice hidden after Got it')
    await sleep(500)
    await page.reload()
    await rendered(page)
    await sleep(500)
    check(!(await page.hasText(copy.bannerStorageNotice)), 'storage notice came back after reload')
  },
}
