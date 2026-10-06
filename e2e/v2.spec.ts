import { expect, test } from '@playwright/test'
import bookmarkData from '../public/data/bookmarks.json' with { type: 'json' }

const webBookmarks = bookmarkData.bookmarks.filter(({ placement }) => placement.collection === 'web')
const youtubeBookmarks = bookmarkData.bookmarks.filter(({ placement }) => placement.collection === 'youtube')
const unreviewedCount = (bookmarks: typeof bookmarkData.bookmarks) => bookmarks.filter(({ tags }) => tags?.includes('not-reviewed')).length

test('migrated bookmarks use the Web and YouTube routes', async ({ page }) => {
  await page.goto('./')
  const web = page.getByRole('list', { name: 'Web bookmarks' })
  await expect(web.getByRole('link')).toHaveCount(webBookmarks.length)
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
  await expect(web.getByRole('link')).toHaveCount(webBookmarks.filter(({ tags }) => tags?.includes('tech')).length)
  await page.getByRole('navigation', { name: 'Bookmark collections' }).getByRole('link', { name: /YouTube/ }).click()
  const youtube = page.getByRole('list', { name: 'YouTube bookmarks' })
  await expect(youtube.getByRole('link')).toHaveCount(youtubeBookmarks.length)
  await expect(youtube.getByRole('link').first()).toHaveAccessibleName(/LaisvėsTV/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'YouTube bookmarks' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Old bookmarks' })).toHaveCount(0)
})

test('removed collections fall back to Web and collection tags filter bookmarks', async ({ page }) => {
  for (const route of ['media', 'travel']) {
    await page.goto(`./#/${route}`)
    await page.reload()
    const web = page.getByRole('list', { name: 'Web bookmarks' })
    await expect(web.getByRole('link')).toHaveCount(webBookmarks.length)
    const navigation = page.getByRole('navigation', { name: 'Bookmark collections' })
    await expect(navigation.getByRole('link')).toHaveCount(2)
    await expect(navigation.getByRole('link', { name: 'Media' })).toHaveCount(0)
    await expect(navigation.getByRole('link', { name: 'Travel' })).toHaveCount(0)
    await page.locator('details.v2-filters summary').click()
    await page.getByRole('button', { name: '#not-reviewed', exact: true }).click()
    await expect(web.getByRole('link')).toHaveCount(unreviewedCount(webBookmarks))
    expect(await web.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort()))
      .toEqual(webBookmarks.filter(({ tags }) => tags?.includes('not-reviewed')).map(({ url }) => url).sort())
  }
  await page.goto('./#/youtube')
  await page.reload()
  const youtube = page.getByRole('list', { name: 'YouTube bookmarks' })
  await expect(youtube.getByRole('link')).toHaveCount(youtubeBookmarks.length)
  await page.locator('details.v2-filters summary').click()
  await expect(page.getByRole('button', { name: '#not-reviewed', exact: true }))
    .toHaveCount(unreviewedCount(youtubeBookmarks) > 0 ? 1 : 0)
  await page.getByRole('button', { name: '#security', exact: true }).click()
  const securityBookmarks = youtubeBookmarks.filter(({ tags }) => tags?.includes('security'))
  await expect(youtube.getByRole('link')).toHaveCount(securityBookmarks.length)
  expect(await youtube.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort()))
    .toEqual(securityBookmarks.map(({ url }) => url).sort())
})
