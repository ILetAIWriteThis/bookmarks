import { expect, test } from '@playwright/test'
import bookmarkData from '../public/data/bookmarks.json' with { type: 'json' }

const bookmarks = bookmarkData.bookmarks.filter(({ placement }) => placement.collection === 'web').slice(0, 3)

test.beforeEach(async ({ context, page }) => {
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue()
    return route.fulfill({ contentType: 'text/html', body: '<title>Bookmark destination</title>' })
  })
  await page.addInitScript((slots) => {
    localStorage.setItem('bookmarks:buckets:v2:web', JSON.stringify([
      { id: 'group', name: 'Group', buckets: [{ id: 'test', name: 'Reading list', slots }] },
    ]))
  }, bookmarks.map(({ id }) => id))
  await page.goto('./#/buckets/web')
})

test('opens filled bucket slots with isolated tabs when pop-ups are allowed', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Open all in Reading list', exact: true }).click()
  await expect.poll(() => context.pages().length).toBe(4)
  const tabs = context.pages().filter((tab) => tab !== page)
  for (let index = 0; index < tabs.length; index++) {
    await expect(tabs[index]).toHaveURL(bookmarks[index].url)
    expect(await tabs[index].evaluate(() => window.opener)).toBeNull()
    expect(await tabs[index].evaluate(() => document.referrer)).toBe('')
  }
  await expect(page.getByRole('status')).toHaveText('Reading list: all bookmarks opened.')
})
