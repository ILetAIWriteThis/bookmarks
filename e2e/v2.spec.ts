import { expect, test } from '@playwright/test'

test('reviewed bookmarks use the default route while the old collection stays separate', async ({ page }) => {
  await page.goto('./')
  const web = page.getByRole('list', { name: 'Web bookmarks' })
  await expect(web.getByRole('link')).toHaveCount(20)
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

  await page.getByRole('button', { name: '#tech', exact: true }).click()
  await expect(web.getByRole('link')).toHaveCount(3)
  await expect(web.locator('.v2-position')).toHaveText(['05', '06', '07'])
  await page.getByRole('navigation', { name: 'Bookmark collections' }).getByRole('link', { name: /YouTube/ }).click()
  const youtube = page.getByRole('list', { name: 'YouTube bookmarks' })
  await expect(youtube.getByRole('link')).toHaveCount(9)
  await expect(youtube.getByRole('link').first()).toHaveAccessibleName(/LaisvėsTV/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'YouTube bookmarks' })).toBeVisible()
  await page.getByRole('link', { name: 'Old bookmarks' }).click()
  await expect(page.getByRole('heading', { name: 'Daily', exact: true })).toBeVisible()
  await expect(page.getByText('Your daily desk is clear')).toBeVisible()
  await page.goto('./#/old/category/youtube-top')
  await expect(page.getByLabel('Top bookmarks').locator('.bookmark-card')).toHaveCount(0)
})

test('Media and Travel routes search and filter migrated bookmarks', async ({ page }) => {
  await page.goto('./#/media')
  const media = page.getByRole('list', { name: 'Media bookmarks' })
  await expect(media.getByRole('link')).toHaveCount(1260)
  await expect(page.getByRole('navigation', { name: 'Bookmark collections' }).getByText('1260')).toHaveCount(0)
  await expect(page.getByText('1260 of 1260')).toHaveCount(0)
  await page.getByRole('button', { name: '#book', exact: true }).click()
  await expect(media.getByRole('link')).toHaveCount(269)
  await page.getByRole('searchbox', { name: 'Search Media bookmarks' }).fill('Dune')
  await expect(media.getByRole('link').first()).toHaveAttribute('href', /goodreads\.com\/book\/show\//)

  await page.goto('./#/travel')
  const travel = page.getByRole('list', { name: 'Travel bookmarks' })
  await expect(travel.getByRole('link')).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search Travel bookmarks' }).fill('Puckoriu')
  await expect(travel.getByRole('link')).toHaveCount(1)
  await expect(travel.getByRole('link').first()).toHaveAttribute('href', 'https://maps.app.goo.gl/ZkdmJcYNHzzY6LqZ6')
})
