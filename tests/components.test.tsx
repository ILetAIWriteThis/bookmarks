import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import { testData } from './fixtures'

describe('Bookmarks UI', () => {
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
