export type ReadMode = 'chapter' | 'page'

export interface Book {
  id: string
  title: string
  filePath: string
  format: 'txt' | 'pdf'
  fileHash: string
  addedAt: number
  lastReadPage: number
  readMode?: ReadMode
  charsRead?: number
  totalCharCount?: number
}

export interface BookProgress {
  charsRead: number
  totalCharCount: number
  readMode?: ReadMode
}

export function getReadPercent(book: Book): number | null {
  const { charsRead, totalCharCount } = book
  if (charsRead == null || !totalCharCount) return null
  return Math.min(100, Math.round((charsRead / totalCharCount) * 100))
}

export interface Annotation {
  id: string
  bookId: string
  type: 'mark' | 'note'
  color: string
  page: number
  start: number
  end: number
  text: string
  note?: string
  createdAt: number
  updatedAt: number
}

export type ThemeKey = 'cream' | 'dark' | 'sand' | 'grey' | 'green' | 'charcoal'

export interface ThemePreset {
  bg: string
  text: string
  name: string
  moon?: boolean
}

export interface AppSettings {
  theme: ThemeKey
  fontSize: number
  backgroundColor: string
  backgroundImage: string
  autoPageTurn: boolean
  autoPageTurnInterval: number
  highlightColors: string[]
}

export interface BookContent {
  text: string
  format: 'txt' | 'pdf'
}

export interface PaginateResult {
  pages: string[]
  totalPages: number
}

export interface Chapter {
  title: string
  charOffset: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'cream',
  fontSize: 18,
  backgroundColor: '#f5f0dc',
  backgroundImage: '',
  autoPageTurn: false,
  autoPageTurnInterval: 10,
  highlightColors: ['#FFE066', '#A8E6CF', '#87CEEB', '#FFB6C1', '#DDA0DD']
}

export const THEME_PRESETS: Record<ThemeKey, ThemePreset> = {
  cream: { bg: '#f5f0dc', text: '#3d3d3d', name: '米色' },
  dark: { bg: '#000000', text: '#f0f0f0', name: '黑夜模式', moon: true },
  sand: { bg: '#e8d5b5', text: '#3d3d3d', name: '沙色' },
  grey: { bg: '#e5e5e5', text: '#333333', name: '灰色' },
  green: { bg: '#d4e8d4', text: '#2d3d2d', name: '绿色' },
  charcoal: { bg: '#4a4a4a', text: '#e8e8e8', name: '深灰' }
}

export const THEME_ORDER: ThemeKey[] = ['cream', 'dark', 'sand', 'grey', 'green', 'charcoal']

const LEGACY_THEME_MAP: Record<string, ThemeKey> = {
  'eye-care': 'cream',
  white: 'grey',
  black: 'dark'
}

export function normalizeThemeKey(theme: string): ThemeKey {
  if (theme in THEME_PRESETS) return theme as ThemeKey
  return LEGACY_THEME_MAP[theme] ?? DEFAULT_SETTINGS.theme
}

export function getThemePreset(theme: string): ThemePreset {
  return THEME_PRESETS[normalizeThemeKey(theme)]
}
