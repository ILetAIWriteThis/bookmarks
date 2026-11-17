import { expect, test } from '@playwright/test'
import bookmarkData from '../public/data/bookmarks.json' with { type: 'json' }

test('organizes six buckets into separate groups and reuses channels between groups', async ({ page }) => {
  const channel = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'youtube')!
  await page.goto('./#/starred')
  await page.evaluate(() => {
    localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify(
      Array.from({ length: 3 }, (_, index) => ({ id: `bucket-${index}`, name: `Original ${index + 1}`, slots: [null, null] })),
    ))
  })
  await page.reload()
  await page.getByRole('button', { name: 'YouTube Listen', exact: true }).click()
  await page.getByLabel('New group', { exact: true }).fill('By mood')
  await page.getByRole('button', { name: '+ Create group', exact: true }).click()
  for (const name of ['Calm', 'Curious', 'Lively']) {
    await page.getByLabel('New bucket', { exact: true }).fill(name)
    await page.getByRole('button', { name: '+ Create bucket', exact: true }).click()
  }
  const original = page.getByRole('region', { name: 'Bucket group My buckets', exact: true })
  const mood = page.getByRole('region', { name: 'Bucket group By mood', exact: true })
  await expect(original.locator('.bucket')).toHaveCount(3)
  await expect(mood.locator('.bucket')).toHaveCount(3)
  const originalBox = await original.boundingBox()
  const moodBox = await mood.boundingBox()
  expect(moodBox!.y).toBeGreaterThanOrEqual(originalBox!.y + originalBox!.height)
  for (const bucket of ['Original 1', 'Calm']) {
    await page.getByRole('searchbox', { name: `Search library for ${bucket}`, exact: true }).fill(channel.title)
    await page.getByRole('button', { name: `Add ${channel.title} to ${bucket}`, exact: true }).click()
  }
  await page.getByRole('searchbox', { name: 'Search library for Curious', exact: true }).fill(channel.title)
  const move = page.getByRole('button', { name: `Move ${channel.title} to Curious`, exact: true })
  await expect(move).toHaveText('Move here')
  await move.click()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Calm`, exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: 'YouTube Listen', exact: true }).click()
  for (const bucket of ['Original 1', 'Curious']) {
    await expect(page.getByRole('button', { name: `Remove ${channel.title} from ${bucket}`, exact: true })).toBeVisible()
  }
})

test('fills and moves channels in a six-bucket board without stars or dragging', async ({ page, isMobile }) => {
  const channel = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'youtube')!
  await page.goto('./#/starred')
  await page.evaluate(() => {
    localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify(
      Array.from({ length: 6 }, (_, index) => ({ id: `bucket-${index}`, name: `Shelf ${index + 1}`, slots: Array(5).fill(null) })),
    ))
  })
  await page.reload()
  await page.getByRole('button', { name: 'YouTube Listen', exact: true }).click()
  const buckets = page.locator('.bucket')
  await expect(buckets).toHaveCount(6)
  const first = await buckets.nth(0).boundingBox()
  const second = await buckets.nth(1).boundingBox()
  if (isMobile) expect(second!.y).toBeGreaterThan(first!.y)
  else expect(second!.y).toBe(first!.y)
  await page.getByRole('searchbox', { name: 'Search library for Shelf 1', exact: true }).fill(channel.title)
  await page.getByRole('button', { name: `Add ${channel.title} to Shelf 1`, exact: true }).click()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Shelf 1`, exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search library for Shelf 6', exact: true }).fill(channel.title)
  await page.getByRole('button', { name: `Move ${channel.title} to Shelf 6`, exact: true }).click()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Shelf 1`, exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Shelf 6`, exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('bookmarks:starred:v1'))).toBeNull()
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: 'YouTube Listen', exact: true }).click()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Shelf 6`, exact: true })).toBeVisible()
})
