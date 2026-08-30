import { expect, test } from '@playwright/test'

test('production base path renders only root categories and the manifest', async ({ page, request }) => {
  await page.goto('./')
  await expect(page.getByRole('searchbox')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Where do you want/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Daily' })).toBeVisible()
  await expect(page.locator('a[href="#/category/youtube"]')).toBeVisible()
  await expect(page.locator('a[href="#/category/youtube-security"]')).toHaveCount(0)
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

test('direct parent and child hash routes preserve hierarchy', async ({ page }) => {
  await page.goto('./#/category/youtube')
  await expect(page.getByRole('heading', { name: 'YouTube', level: 1 })).toBeVisible()
  await expect(page.locator('a[href="#/category/youtube-podcasts"]')).toBeVisible()

  await page.goto('./#/category/youtube-podcasts')
  await expect(page.getByRole('heading', { name: 'Podcasts', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /LaisvėsTV/ })).toHaveAttribute(
    'href',
    'https://www.youtube.com/@LaisvesTV/videos',
  )
  await expect(page.getByRole('link', { name: 'YouTube', exact: true })).toHaveAttribute('href', '#/category/youtube')
})

test('app shell reloads offline after it has been cached', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('searchbox')).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Where do you want/ })).toBeVisible()
  await expect(page.getByText('You’re offline')).toBeVisible()
})
