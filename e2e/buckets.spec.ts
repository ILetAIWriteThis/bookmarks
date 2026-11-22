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
  await board.getByRole('button', { name: 'Place selected bookmark in Reference slot 2' }).click()
  await board.getByRole('searchbox', { name: 'Search library for Reference' }).fill(bookmark.title)
  await board.getByRole('button', { name: `Add ${bookmark.title} to Reference`, exact: true }).click()
  await page.reload()
  await expect(board.locator('.bucket').first().locator('.bucket-slot').nth(1).getByRole('link')).toHaveAttribute('href', bookmark.url)

  await navigation.getByRole('link', { name: 'Buckets', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'YouTube buckets', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: bookmark.title, exact: true })).toHaveCount(0)
})

test('organizes six buckets into separate groups and reuses channels between groups', async ({ page }) => {
  const channel = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'youtube')!
  await page.goto('./#/buckets')
  await page.evaluate(() => {
    localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify(
      Array.from({ length: 3 }, (_, index) => ({ id: `bucket-${index}`, name: `Original ${index + 1}`, slots: [null, null] })),
    ))
  })
  await page.reload()
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
  for (const bucket of ['Original 1', 'Curious']) {
    await expect(page.getByRole('button', { name: `Remove ${channel.title} from ${bucket}`, exact: true })).toBeVisible()
  }
})

test('wraps long group names and keeps category totals inside the group heading', async ({ page }) => {
  const channel = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'youtube')!
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('./#/buckets')

  const originalName = page.getByLabel('Rename My buckets group')
  const originalHeight = (await originalName.boundingBox())!.height
  const longName = 'W'.repeat(60)
  await originalName.fill(longName)
  const group = page.getByRole('region', { name: `Bucket group ${longName}`, exact: true })
  const name = group.getByLabel(`Rename ${longName} group`, { exact: true })
  await expect(name).toHaveValue(longName)
  expect((await name.boundingBox())!.height).toBeGreaterThan(originalHeight)
  expect(await name.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)

  await page.getByText('Buckets settings', { exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Fully checked')
  await page.getByLabel('Display name', { exact: true }).fill('checked')
  await page.getByRole('button', { name: 'Add category', exact: true }).click()
  await page.getByText('Buckets settings', { exact: true }).click()
  await group.getByRole('searchbox', { name: 'Search library for Recurring' }).fill(channel.title)
  await group.getByLabel(`Category when adding ${channel.title} to Recurring`, { exact: true }).selectOption({ label: 'Fully checked' })
  await group.getByRole('button', { name: `Add ${channel.title} to Recurring`, exact: true }).click()
  await page.reload()
  await expect(group.locator('.bucket-group-heading').getByRole('list')).toHaveText('#checked 1')
  await expect(group.locator('.bucket-slot').getByText('#checked', { exact: true })).toBeVisible()
  const filter = group.getByRole('button', { name: '#checked 1', exact: true })
  await filter.click()
  await expect(filter).toHaveAttribute('aria-pressed', 'true')
  await expect(group.getByLabel('Rename Good Stories bucket')).toHaveCount(0)
  await expect(group.locator('.bucket-slot')).toHaveCount(1)
  await filter.press('Space')
  await expect(filter).toHaveAttribute('aria-pressed', 'false')
  await expect(group.getByLabel('Rename Good Stories bucket')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('fills and moves channels in a six-bucket board using bucket search', async ({ page, isMobile }) => {
  const channel = bookmarkData.bookmarks.find(bookmark => bookmark.placement.collection === 'youtube')!
  await page.goto('./#/buckets')
  await page.evaluate(() => {
    localStorage.setItem('bookmarks:buckets:v1:youtube-listen', JSON.stringify(
      Array.from({ length: 6 }, (_, index) => ({ id: `bucket-${index}`, name: `Shelf ${index + 1}`, slots: Array(5).fill(null) })),
    ))
  })
  await page.reload()
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
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: `Remove ${channel.title} from Shelf 6`, exact: true })).toBeVisible()
})
