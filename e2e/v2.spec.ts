import { expect, test } from '@playwright/test'

test('V2 keeps a single column, filters each collection, and returns to the original home', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Try Bookmarks V2' }).click()
  await expect(page).toHaveURL(/#\/v2$/)
  const web = page.getByRole('list', { name: 'Web bookmarks' })
  await expect(web.getByRole('link')).toHaveCount(11)
  await expect(web.getByRole('link').first()).toHaveAccessibleName(/Disney\+/)
  const rows = await web.getByRole('link').evaluateAll((links) => links.map((link) => {
    const rect = link.getBoundingClientRect()
    return { x: rect.x, y: rect.y, bottom: rect.bottom, width: rect.width }
  }))
  for (let index = 1; index < rows.length; index++) {
    expect(rows[index].x).toBe(rows[0].x)
    expect(rows[index].width).toBe(rows[0].width)
    expect(rows[index].y).toBeGreaterThanOrEqual(rows[index - 1].bottom)
  }
  const fonts = await web.getByRole('link').first().evaluate((row) => ({
    title: getComputedStyle(row.querySelector('strong')!).fontFamily,
    tags: getComputedStyle(row.querySelector('.v2-row__tags')!).fontFamily,
  }))
  expect(fonts.title).not.toBe(fonts.tags)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByRole('button', { name: '#tech', exact: true }).click()
  await expect(web.getByRole('link')).toHaveCount(3)
  await expect(web.locator('.v2-position')).toHaveText(['04', '05', '06'])
  await page.getByRole('navigation', { name: 'Bookmark collections' }).getByRole('link', { name: /YouTube/ }).click()
  const youtube = page.getByRole('list', { name: 'YouTube bookmarks' })
  await expect(youtube.getByRole('link')).toHaveCount(5)
  await page.getByRole('button', { name: '#science', exact: true }).click()
  await expect(youtube.locator('strong')).toHaveText(['Veritasium', 'Mokslo sriuba'])
  await expect(youtube.locator('.v2-position')).toHaveText(['04', '05'])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'YouTube bookmarks' })).toBeVisible()
  await expect(youtube.getByRole('link')).toHaveCount(5)
  await page.getByRole('link', { name: 'Original home' }).click()
  await expect(page.getByRole('heading', { name: 'Daily', exact: true })).toBeVisible()
})
