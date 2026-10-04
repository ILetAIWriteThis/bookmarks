import { expect, test } from '@playwright/test'
import bookmarkData from '../public/data/bookmarks.json' with { type: 'json' }

const webBookmarkCount = bookmarkData.bookmarks.filter(({ placement }) => placement.collection === 'web').length

test('production base path renders migrated Web bookmarks and the manifest', async ({ page, request }) => {
  await page.goto('./')
  await expect(page.getByRole('list', { name: 'Web bookmarks' }).getByRole('link')).toHaveCount(webBookmarkCount)
  await expect(page.getByRole('link', { name: 'Old bookmarks' })).toHaveCount(0)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest')
  expect((await request.get('./manifest.webmanifest')).ok()).toBeTruthy()
  expect((await request.get('./data/bookmarks.json')).ok()).toBeTruthy()
})

test('keyboard shortcut focuses search', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('searchbox')).toBeVisible()
  const search = page.getByRole('searchbox')
  await expect.poll(async () => {
    await page.keyboard.press('/')
    return search.evaluate((element) => element === document.activeElement)
  }).toBe(true)
})

test('retired old routes show the Web collection', async ({ page }) => {
  await page.goto('./#/old/category/youtube')
  await expect(page.getByRole('heading', { name: 'Web bookmarks' })).toBeVisible()
  await expect(page.locator('a[href^="#/old"]')).toHaveCount(0)
})

test('app shell reloads offline after it has been cached', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('list', { name: 'Web bookmarks' })).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /A little less browsing/ })).toBeVisible()
  await expect(page.getByText('You’re offline')).toBeVisible()
})
