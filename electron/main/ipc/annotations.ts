import { ipcMain } from 'electron'
import {
  readAnnotations,
  appendAnnotation,
  rewriteAnnotations,
  uuidv4
} from '../services/storage'
import type { Annotation } from '../../../src/types'

export function registerAnnotationHandlers(): void {
  ipcMain.handle('annotations:list', (_event, bookId: string) => {
    return readAnnotations(bookId)
  })

  ipcMain.handle('annotations:add', (_event, annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const full: Annotation = {
      ...annotation,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    appendAnnotation(full)
    return full
  })

  ipcMain.handle(
    'annotations:update',
    (_event, bookId: string, id: string, patch: Partial<Annotation>) => {
      const annotations = readAnnotations(bookId)
      const index = annotations.findIndex((a) => a.id === id)
      if (index === -1) return null
      annotations[index] = { ...annotations[index], ...patch, updatedAt: Date.now() }
      rewriteAnnotations(bookId, annotations)
      return annotations[index]
    }
  )

  ipcMain.handle('annotations:delete', (_event, bookId: string, id: string) => {
    const annotations = readAnnotations(bookId).filter((a) => a.id !== id)
    rewriteAnnotations(bookId, annotations)
    return annotations
  })
}
