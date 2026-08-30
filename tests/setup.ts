import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true })

afterEach(() => {
  window.location.hash = '#/'
  sessionStorage.clear()
})
