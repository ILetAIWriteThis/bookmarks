import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import { testData } from './fixtures'

describe('Bookmarks UI', () => {
  it('saves, restores, removes, and clears temporary bookmarks on this device', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App data={testData} />)

    expect(screen.queryByRole('heading', { name: 'Temporary inbox' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open quick save' }))

    await user.type(screen.getByLabelText('Link'), 'example.org/read-later')
    await user.type(screen.getByLabelText(/Name/), 'Read this')
    await user.click(screen.getByRole('button', { name: 'Save for later' }))

    const saved = screen.getByRole('link', { name: /Read this/ })
    expect(saved).toHaveAttribute('href', 'https://example.org/read-later')
    expect(JSON.parse(localStorage.getItem('bookmarks-temporary-inbox-v1') ?? '[]')).toHaveLength(1)

    unmount()
    render(<App data={testData} />)
    await user.click(screen.getByRole('button', { name: 'Open quick save' }))
    expect(screen.getByRole('link', { name: /Read this/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Read this' }))
    expect(screen.queryByRole('link', { name: /Read this/ })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Link'), 'https://another.example')
    await user.click(screen.getByRole('button', { name: 'Save for later' }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    confirm.mockRestore()
    expect(screen.getByText(/Links saved here stay on this device/)).toBeInTheDocument()
    expect(localStorage.getItem('bookmarks-temporary-inbox-v1')).toBeNull()
  })

  it('rejects invalid and duplicate temporary links', async () => {
    const user = userEvent.setup()
    render(<App data={testData} />)
    await user.click(screen.getByRole('button', { name: 'Open quick save' }))

    await user.type(screen.getByLabelText('Link'), 'not a link')
    await user.click(screen.getByRole('button', { name: 'Save for later' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid web address.')

    await user.clear(screen.getByLabelText('Link'))
    await user.type(screen.getByLabelText('Link'), 'https://example.org')
    await user.click(screen.getByRole('button', { name: 'Save for later' }))
    await user.type(screen.getByLabelText('Link'), 'https://example.org')
    await user.click(screen.getByRole('button', { name: 'Save for later' }))
    expect(screen.getByRole('alert')).toHaveTextContent('already in your temporary inbox')
    expect(screen.getAllByRole('link', { name: /example.org/ })).toHaveLength(1)
  })

  it('renders Daily first with ordered bookmarks and an empty category', () => {
    render(<App data={testData} />)
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings[0]).toHaveTextContent('Daily')
    const dailySection = screen.getByRole('heading', { name: 'Daily' }).closest('section')!
    expect(within(dailySection).getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining('Alpha News'),
      expect.stringContaining('Example Journal'),
    ])
    expect(screen.getByRole('link', { name: /Empty shelf/ })).toHaveTextContent('Ready for bookmarks')
  })

  it('keeps child categories off Home and renders them inside their parent', () => {
    const nestedData = {
      ...testData,
      categories: [...testData.categories, { id: 'podcasts', name: 'Podcasts', position: 1, parentId: 'tech' }],
    }
    render(<App data={nestedData} />)
    expect(screen.queryByRole('link', { name: /Podcasts/ })).not.toBeInTheDocument()
    window.location.hash = '#/category/tech'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'Subcategories' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Podcasts/ })).toHaveAttribute('href', '#/category/podcasts')
  })

  it('searches instantly and keeps external links safe', async () => {
    const user = userEvent.setup()
    render(<App data={testData} />)
    await user.type(screen.getByRole('searchbox'), 'analysis')
    expect(screen.getByRole('heading', { name: 'Search results' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Example Journal/ })
    expect(link).toHaveAttribute('href', 'https://example.com/journal')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: /Alpha News/ })).not.toBeInTheDocument()
  })

  it('navigates to category hash routes and renders ordered bookmarks', () => {
    render(<App data={testData} />)
    window.location.hash = '#/category/news'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'News', level: 1 })).toBeInTheDocument()
    const links = screen.getByLabelText('News bookmarks').querySelectorAll('.bookmark-card')
    expect(Array.from(links).map((link) => link.textContent)).toEqual([
      expect.stringContaining('Alpha News'),
      expect.stringContaining('Example Journal'),
    ])
  })

  it('renders category and daily empty states', () => {
    render(<App data={{ ...testData, bookmarks: [] }} />)
    expect(screen.getByText('Your daily desk is clear')).toBeInTheDocument()
    window.location.hash = '#/category/empty'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByText('This shelf is ready')).toBeInTheDocument()
  })
})
