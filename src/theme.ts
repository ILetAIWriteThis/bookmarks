import type { Category, ThemeColors } from './types'

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function fallbackTheme(categoryId: string): ThemeColors {
  const hue = hashString(categoryId) % 360
  const secondHue = (hue + 34) % 360
  return {
    from: `hsl(${hue} 45% 24%)`,
    to: `hsl(${secondHue} 48% 43%)`,
    accent: `hsl(${hue} 80% 91%)`,
  }
}

export const getCategoryTheme = (category: Category) => category.theme ?? fallbackTheme(category.id)
