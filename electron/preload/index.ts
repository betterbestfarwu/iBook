import { contextBridge, ipcRenderer } from 'electron'
import type { Book, BookProgress, Annotation, AppSettings } from '../../src/types'

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
  }
  files: {
    readText: (filePath: string) => Promise<string>
    readImageThumbnail: (filePath: string) => Promise<string | null>
    paginate: (payload: {
      text: string
      containerWidth: number
      containerHeight: number
      fontSize: number
      lineHeight: number
      padding: number
      upToPage?: number
    }) => Promise<{ pages: string[]; totalPages: number }>
    paginateRemaining: (payload: {
      text: string
      containerWidth: number
      containerHeight: number
      fontSize: number
      lineHeight: number
      padding: number
      fromPage: number
    }) => Promise<{ pages: string[]; totalPages: number }>
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
      ipcRenderer.invoke('books:updateProgress', bookId, page, progress)
  },
  files: {
    readText: (filePath) => ipcRenderer.invoke('files:readText', filePath),
    readImageThumbnail: (filePath) => ipcRenderer.invoke('files:readImageThumbnail', filePath),
    paginate: (payload) => ipcRenderer.invoke('files:paginate', payload),
    paginateRemaining: (payload) => ipcRenderer.invoke('files:paginateRemaining', payload)
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
