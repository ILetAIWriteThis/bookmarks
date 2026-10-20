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
  await page.getByRole('textbox', { name: 'Find a tag' }).fill('tech')
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
    await expect(navigation.getByRole('link')).toHaveCount(3)
    await expect(navigation.getByRole('link', { name: 'Media' })).toHaveCount(0)
    await expect(navigation.getByRole('link', { name: 'Travel' })).toHaveCount(0)
    await page.locator('details.v2-filters summary').click()
    await page.getByRole('textbox', { name: 'Find a tag' }).fill('not-reviewed')
    await expect(page.getByRole('button', { name: '#not-reviewed', exact: true }))
      .toHaveCount(unreviewedCount(webBookmarks) > 0 ? 1 : 0)
    await page.getByRole('textbox', { name: 'Find a tag' }).fill('tech')
    await page.getByRole('button', { name: '#tech', exact: true }).click()
    const techBookmarks = webBookmarks.filter(({ tags }) => tags?.includes('tech'))
    await expect(web.getByRole('link')).toHaveCount(techBookmarks.length)
    expect(await web.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort()))
      .toEqual(techBookmarks.map(({ url }) => url).sort())
  }
  await page.goto('./#/youtube')
  await page.reload()
  const youtube = page.getByRole('list', { name: 'YouTube bookmarks' })
  await expect(youtube.getByRole('link')).toHaveCount(youtubeBookmarks.length)
  await page.locator('details.v2-filters summary').click()
  await page.getByRole('textbox', { name: 'Find a tag' }).fill('not-reviewed')
  await expect(page.getByRole('button', { name: '#not-reviewed', exact: true }))
    .toHaveCount(unreviewedCount(youtubeBookmarks) > 0 ? 1 : 0)
  await page.getByRole('textbox', { name: 'Find a tag' }).fill('security')
  await page.getByRole('button', { name: '#security', exact: true }).click()
  const securityBookmarks = youtubeBookmarks.filter(({ tags }) => tags?.includes('security'))
  await expect(youtube.getByRole('link')).toHaveCount(securityBookmarks.length)
  expect(await youtube.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort()))
    .toEqual(securityBookmarks.map(({ url }) => url).sort())
})


test('stars persist after reload and remain separate from saved channel order', async ({ page }) => {
  await page.goto('./#/youtube')
  const list = page.getByRole('list', { name: 'YouTube bookmarks' })
  const row = list.locator('li').first()
  const title = await row.locator('strong').innerText()
  const position = await row.locator('.v2-position').innerText()
  await row.getByRole('button', { name: `Star ${title}`, exact: true }).click()
  await page.getByRole('link', { name: 'Starred', exact: true }).click()
  await page.reload()
  const stars = page.getByRole('list', { name: 'Starred bookmarks' })
  await expect(stars.getByRole('link')).toHaveCount(1)
  await expect(stars.locator('.v2-position')).toHaveText(position)
  await expect(stars.locator('strong')).toHaveText(title)
  const scopes = page.getByRole('group', { name: 'Filter starred by collection' })
  await scopes.getByRole('button', { name: 'Web', exact: true }).click()
  await expect(page.getByText('No starred Web bookmarks yet.')).toBeVisible()
  await scopes.getByRole('button', { name: 'YouTube', exact: true }).click()
  await expect(stars.getByRole('link')).toHaveCount(1)
  await expect(scopes.getByRole('button', { name: 'YouTube', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await stars.getByRole('button', { name: `Unstar ${title}`, exact: true }).click()
  await expect(page.getByText('No starred YouTube bookmarks yet.')).toBeVisible()
})
