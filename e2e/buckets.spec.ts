import { expect, test } from '@playwright/test'
import bookmarkData from '../public/data/bookmarks.json' with { type: 'json' }

test('replaces Starred with YouTube Buckets and keeps Web slots on the second page', async ({ page }) => {
  const bookmark = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'web')!
  await page.goto('./#/starred')
  const navigation = page.getByRole('navigation', { name: 'Bookmark collections' })
  const buckets = page.getByRole('navigation', { name: 'Bucket collections' })
  await expect(navigation.getByRole('link', { name: 'Buckets', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(navigation.getByRole('link', { name: 'Starred', exact: true })).toHaveCount(0)
  await expect(buckets.getByRole('link')).toHaveText(['YouTube', 'Web'])
  await expect(page.getByRole('heading', { name: 'YouTube buckets', exact: true })).toBeVisible()
  await buckets.getByRole('link', { name: 'Web', exact: true }).click()

  const board = page.getByRole('region', { name: 'Web buckets', exact: true })
  await expect(board.getByRole('article')).toHaveCount(3)
  await expect(board.locator('.bucket-slot')).toHaveCount(21)
  await board.getByRole('button', { name: 'Fill Reference slot 2' }).click()
  await board.getByRole('searchbox', { name: 'Search library for Reference' }).fill(bookmark.title)
  await board.getByRole('button', { name: `Add ${bookmark.title} to Reference`, exact: true }).click()
  await page.reload()
  await expect(board.locator('.bucket').first().locator('.bucket-slot').nth(1).getByRole('link')).toHaveAttribute('href', bookmark.url)

  await navigation.getByRole('link', { name: 'Buckets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'YouTube buckets', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: bookmark.title, exact: true })).toHaveCount(0)
})

test('fills and moves channels across the three fixed buckets', async ({ page, isMobile }) => {
  const channel = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'youtube')!
  await page.goto('./#/buckets')
  const buckets = page.getByRole('article')
  await expect(buckets).toHaveCount(3)
  for (const bucket of await buckets.all()) await expect(bucket.locator('.bucket-slot')).toHaveCount(7)
  const first = await buckets.nth(0).boundingBox()
  const second = await buckets.nth(1).boundingBox()
  if (isMobile) expect(second!.y).toBeGreaterThan(first!.y)
  else expect(second!.y).toBe(first!.y)

  const recurring = buckets.getByRole('searchbox', { name: 'Search library for Recurring', exact: true })
  await recurring.fill(channel.title)
  await page.getByRole('button', { name: `Add ${channel.title} to Recurring`, exact: true }).click()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Recurring`, exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search library for Bucket 3', exact: true }).fill(channel.title)
  await page.getByRole('button', { name: `Move ${channel.title} to Bucket 3`, exact: true }).click()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Recurring`, exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Bucket 3`, exact: true })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Bucket 3`, exact: true })).toBeVisible()
})
