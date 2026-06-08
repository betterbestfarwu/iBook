export interface Book {
  id: string
  title: string
  filePath: string
  format: 'txt' | 'pdf'
  fileHash: string
  addedAt: number
  lastReadPage: number
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

export interface AppSettings {
  theme: 'dark' | 'eye-care' | 'white' | 'black'
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

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'eye-care',
  fontSize: 18,
  backgroundColor: '#f5f0dc',
  backgroundImage: '',
  autoPageTurn: false,
  autoPageTurnInterval: 10,
  highlightColors: ['#FFE066', '#A8E6CF', '#87CEEB', '#FFB6C1', '#DDA0DD']
}

export const THEME_PRESETS: Record<
  AppSettings['theme'],
  { bg: string; text: string; name: string }
> = {
  dark: { bg: '#1a1a2e', text: '#e0e0e0', name: '黑夜模式' },
  'eye-care': { bg: '#f5f0dc', text: '#3d3d3d', name: '护眼模式' },
  white: { bg: '#ffffff', text: '#000000', name: '纯白模式' },
  black: { bg: '#000000', text: '#ffffff', name: '纯黑模式' }
}
