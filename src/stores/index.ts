import { create } from 'zustand'
import type { Book, BookProgress, Annotation, AppSettings, Chapter, ReadMode } from '../types'
import { DEFAULT_SETTINGS } from '../types'

interface BooksState {
  books: Book[]
  selectedIds: Set<string>
  loading: boolean
  loadBooks: () => Promise<void>
  addBooks: (paths: string[]) => Promise<{ added: Book[]; duplicates: string[]; errors: string[] }>
  removeSelected: () => Promise<void>
  updateProgress: (bookId: string, page: number, progress?: BookProgress) => Promise<void>
  toggleSelect: (id: string) => void
  clearSelection: () => void
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  selectedIds: new Set(),
  loading: false,

  loadBooks: async () => {
    set({ loading: true })
    const books = await window.electronAPI.books.list()
    set({ books, loading: false })
  },

  addBooks: async (paths) => {
    const result = await window.electronAPI.books.add(paths)
    if (result.added.length) {
      set({ books: [...get().books, ...result.added] })
    }
    return result
  },

  removeSelected: async () => {
    const ids = Array.from(get().selectedIds)
    if (!ids.length) return
    const books = await window.electronAPI.books.remove(ids)
    set({ books, selectedIds: new Set() })
  },

  updateProgress: async (bookId, page, progress) => {
    await window.electronAPI.books.updateProgress(bookId, page, progress)
    set({
      books: get().books.map((b) =>
        b.id === bookId
          ? { ...b, lastReadPage: page, charsRead: progress?.charsRead, totalCharCount: progress?.totalCharCount, readMode: progress?.readMode ?? b.readMode }
          : b
      )
    })
  },

  toggleSelect: (id) => {
    const selectedIds = new Set(get().selectedIds)
    if (selectedIds.has(id)) selectedIds.delete(id)
    else selectedIds.add(id)
    set({ selectedIds })
  },

  clearSelection: () => set({ selectedIds: new Set() })
}))

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    const settings = await window.electronAPI.settings.get()
    set({ settings, loaded: true })
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch }
    await window.electronAPI.settings.save(settings)
    set({ settings })
  }
}))

interface ReaderState {
  book: Book | null
  text: string
  pages: string[]
  chapters: Chapter[]
  pageTitles: string[]
  readMode: ReadMode
  currentPage: number
  totalPages: number
  annotations: Annotation[]
  loading: boolean
  loadStage: string
  isBackgroundPaginating: boolean

  setBook: (book: Book | null) => void
  setText: (text: string) => void
  setChapters: (chapters: Chapter[]) => void
  setReadMode: (mode: ReadMode, pageTitles?: string[]) => void
  setPages: (pages: string[], totalPages?: number) => void
  appendPages: (pages: string[], totalPages: number) => void
  setCurrentPage: (page: number) => void
  setLoading: (loading: boolean, stage?: string) => void
  setBackgroundPaginating: (v: boolean) => void
  loadAnnotations: (bookId: string) => Promise<void>
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Annotation>
  removeAnnotation: (id: string) => Promise<void>
  reset: () => void
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  book: null,
  text: '',
  pages: [],
  chapters: [],
  pageTitles: [],
  readMode: 'page',
  currentPage: 0,
  totalPages: 0,
  annotations: [],
  loading: false,
  loadStage: '',
  isBackgroundPaginating: false,

  setBook: (book) => {
    const prev = get().book
    if (!book || prev?.id !== book.id) {
      set({
        book,
        text: '',
        pages: [],
        chapters: [],
        pageTitles: [],
        readMode: 'page',
        currentPage: 0,
        totalPages: 0,
        annotations: [],
        loading: false,
        loadStage: '',
        isBackgroundPaginating: false
      })
      return
    }
    set({ book })
  },
  setText: (text) => set({ text }),
  setChapters: (chapters) => set({ chapters }),
  setReadMode: (readMode, pageTitles = []) => set({ readMode, pageTitles }),
  setPages: (pages, totalPages) =>
    set({ pages, totalPages: totalPages ?? pages.length }),
  appendPages: (newPages, totalPages) => {
    const { pages, currentPage } = get()
    const merged = [...pages]
    newPages.forEach((p, i) => {
      merged[currentPage + 1 + i] = p
    })
    set({ pages: merged, totalPages })
  },
  setCurrentPage: (page) => set({ currentPage: page }),
  setLoading: (loading, stage = '') => set({ loading, loadStage: stage }),
  setBackgroundPaginating: (v) => set({ isBackgroundPaginating: v }),

  loadAnnotations: async (bookId) => {
    const annotations = await window.electronAPI.annotations.list(bookId)
    set({ annotations })
  },

  addAnnotation: async (annotation) => {
    const created = await window.electronAPI.annotations.add(annotation)
    set({ annotations: [...get().annotations, created] })
    return created
  },

  removeAnnotation: async (id) => {
    const book = get().book
    if (!book) return
    const annotations = await window.electronAPI.annotations.delete(book.id, id)
    set({ annotations })
  },

  reset: () =>
    set({
      book: null,
      text: '',
      pages: [],
      chapters: [],
      pageTitles: [],
      readMode: 'page',
      currentPage: 0,
      totalPages: 0,
      annotations: [],
      loading: false,
      loadStage: '',
      isBackgroundPaginating: false
    })
}))

interface ToastState {
  message: string
  type: 'info' | 'error' | 'success'
  visible: boolean
  show: (message: string, type?: 'info' | 'error' | 'success') => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  type: 'info',
  visible: false,
  show: (message, type = 'info') => {
    set({ message, type, visible: true })
    setTimeout(() => set({ visible: false }), 3200)
  },
  hide: () => set({ visible: false })
}))
