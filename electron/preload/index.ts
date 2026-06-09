import { contextBridge, ipcRenderer } from 'electron'
import type {
  Book,
  BookProgress,
  BookContentLoadResult,
  ChapterPagesResult,
  PaginateCacheResult,
  Annotation,
  AppSettings
} from '../../src/types'

export interface ElectronAPI {
  platform: NodeJS.Platform
  openFiles: () => Promise<string[]>
  openImage: () => Promise<string | null>
  books: {
    list: () => Promise<Book[]>
    add: (filePaths: string[]) => Promise<{
      added: Book[]
      duplicates: string[]
      errors: string[]
    }>
    remove: (bookIds: string[]) => Promise<Book[]>
    updateProgress: (
      bookId: string,
      page: number,
      progress?: BookProgress
    ) => Promise<Book | undefined>
    updateFileHash: (bookId: string, fileHash: string) => Promise<Book | undefined>
  }
  files: {
    readText: (filePath: string) => Promise<string>
    loadBookContent: (payload: {
      bookId: string
      filePath: string
    }) => Promise<BookContentLoadResult>
    paginateBook: (payload: {
      bookId: string
      fileHash: string
      charsPerPage: number
      upToPage?: number
    }) => Promise<PaginateCacheResult>
    loadChapterPages: (payload: {
      bookId: string
      fileHash: string
    }) => Promise<ChapterPagesResult>
    readImageThumbnail: (filePath: string) => Promise<string | null>
  }
  annotations: {
    list: (bookId: string) => Promise<Annotation[]>
    add: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Annotation>
    update: (bookId: string, id: string, patch: Partial<Annotation>) => Promise<Annotation | null>
    delete: (bookId: string, id: string) => Promise<Annotation[]>
  }
  settings: {
    get: () => Promise<AppSettings>
    save: (settings: AppSettings) => Promise<AppSettings>
  }
}

const api: ElectronAPI = {
  platform: process.platform,
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  openImage: () => ipcRenderer.invoke('dialog:openImage'),
  books: {
    list: () => ipcRenderer.invoke('books:list'),
    add: (filePaths) => ipcRenderer.invoke('books:add', filePaths),
    remove: (bookIds) => ipcRenderer.invoke('books:remove', bookIds),
    updateProgress: (bookId, page, progress) =>
      ipcRenderer.invoke('books:updateProgress', bookId, page, progress),
    updateFileHash: (bookId, fileHash) =>
      ipcRenderer.invoke('books:updateFileHash', bookId, fileHash)
  },
  files: {
    readText: (filePath) => ipcRenderer.invoke('files:readText', filePath),
    loadBookContent: (payload) => ipcRenderer.invoke('files:loadBookContent', payload),
    paginateBook: (payload) => ipcRenderer.invoke('files:paginateBook', payload),
    loadChapterPages: (payload) => ipcRenderer.invoke('files:loadChapterPages', payload),
    readImageThumbnail: (filePath) => ipcRenderer.invoke('files:readImageThumbnail', filePath)
  },
  annotations: {
    list: (bookId) => ipcRenderer.invoke('annotations:list', bookId),
    add: (annotation) => ipcRenderer.invoke('annotations:add', annotation),
    update: (bookId, id, patch) => ipcRenderer.invoke('annotations:update', bookId, id, patch),
    delete: (bookId, id) => ipcRenderer.invoke('annotations:delete', bookId, id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
