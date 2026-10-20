import { expect, test } from '@playwright/test'
import bookmarkData from '../public/data/bookmarks.json' with { type: 'json' }

const bookmarks = bookmarkData.bookmarks.filter(({ placement }) => placement.collection === 'web').slice(0, 3)

test.beforeEach(async ({ context, page }) => {
  // Headless Chromium does not consistently enforce native pop-up blocking.
  // Simulate one permitted tab per user click while opening real browser tabs.
  await page.addInitScript(() => {
    const open = window.open.bind(window)
    let attempts = 0
    document.addEventListener('click', () => { attempts = 0 }, true)
    window.open = (...args) => ++attempts === 1 ? open(...args) : null
  })
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue()
    return route.fulfill({ contentType: 'text/html', body: '<title>Bookmark destination</title>' })
  })
  await page.goto('./')
  await page.evaluate((ids) => localStorage.setItem('bookmarks:starred:v1', JSON.stringify(ids)), bookmarks.map(({ id }) => id))
  await page.goto('./#/starred')
  await page.reload()
})

test('reports simulated blocking and opens only remaining bookmarks on the next click', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Open all (3)', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your browser blocked 2 tabs.')
  await expect.poll(() => context.pages().length).toBe(2)
  await page.bringToFront()
  await page.getByRole('button', { name: 'Open remaining (2)', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your browser blocked 1 tab.')
  await expect.poll(() => context.pages().length).toBe(3)
  const tabs = context.pages().filter((tab) => tab !== page)
  await expect(tabs[0]).toHaveURL(bookmarks[2].url)
  await expect(tabs[1]).toHaveURL(bookmarks[1].url)
})
