import { expect, test } from '@playwright/test'

test('migrated bookmarks use the Web and YouTube routes', async ({ page }) => {
  await page.goto('./')
  const web = page.getByRole('list', { name: 'Web bookmarks' })
  await expect(web.getByRole('link')).toHaveCount(481)
  await expect(web.getByRole('link').first()).toHaveAccessibleName(/LRT/)
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

  const filters = page.locator('details.v2-filters')
  await expect(filters).not.toHaveAttribute('open', '')
  await expect(page.getByRole('button', { name: '#tech', exact: true })).toBeHidden()
  await filters.locator('summary').click()
  await page.getByRole('button', { name: '#tech', exact: true }).click()
  await expect(web.getByRole('link')).toHaveCount(44)
  await page.getByRole('navigation', { name: 'Bookmark collections' }).getByRole('link', { name: /YouTube/ }).click()
  const youtube = page.getByRole('list', { name: 'YouTube bookmarks' })
  await expect(youtube.getByRole('link')).toHaveCount(1179)
  await expect(youtube.getByRole('link').first()).toHaveAccessibleName(/LaisvėsTV/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'YouTube bookmarks' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Old bookmarks' })).toHaveCount(0)
})

test('removed collections fall back to Web and remaining bookmarks filter by review tag', async ({ page }) => {
  for (const route of ['media', 'travel']) {
    await page.goto(`./#/${route}`)
    await page.reload()
    const web = page.getByRole('list', { name: 'Web bookmarks' })
    await expect(web.getByRole('link')).toHaveCount(481)
    const navigation = page.getByRole('navigation', { name: 'Bookmark collections' })
    await expect(navigation.getByRole('link')).toHaveCount(2)
    await expect(navigation.getByRole('link', { name: 'Media' })).toHaveCount(0)
    await expect(navigation.getByRole('link', { name: 'Travel' })).toHaveCount(0)
    await page.locator('details.v2-filters summary').click()
    await page.getByRole('button', { name: '#not-reviewed', exact: true }).click()
    await expect(web.getByRole('link')).toHaveCount(481)
  }
  await page.goto('./#/youtube')
  await page.reload()
  await page.locator('details.v2-filters summary').click()
  await page.getByRole('button', { name: '#not-reviewed', exact: true }).click()
  await expect(page.getByRole('list', { name: 'YouTube bookmarks' }).getByRole('link')).toHaveCount(1179)
})
