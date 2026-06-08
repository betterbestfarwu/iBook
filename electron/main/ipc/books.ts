import { ipcMain } from 'electron'
import {
  readLibrary,
  writeLibrary,
  createBookFromPath,
  hashFile
} from '../services/storage'

export function registerBookHandlers(): void {
  ipcMain.handle('books:list', () => readLibrary())

  ipcMain.handle('books:add', (_event, filePaths: string[]) => {
    const library = readLibrary()
    const added: typeof library = []
    const duplicates: string[] = []
    const errors: string[] = []

    for (const filePath of filePaths) {
      try {
        const hash = hashFile(filePath)
        const existing = library.find((b) => b.fileHash === hash || b.filePath === filePath)
        if (existing) {
          duplicates.push(existing.title)
          continue
        }

        const book = createBookFromPath(filePath)
        if (!book) {
          errors.push(filePath)
          continue
        }

        library.push(book)
        added.push(book)
      } catch {
        errors.push(filePath)
      }
    }

    writeLibrary(library)
    return { added, duplicates, errors }
  })

  ipcMain.handle('books:remove', (_event, bookIds: string[]) => {
    const library = readLibrary().filter((b) => !bookIds.includes(b.id))
    writeLibrary(library)
    return library
  })

  ipcMain.handle('books:updateProgress', (_event, bookId: string, page: number) => {
    const library = readLibrary()
    const book = library.find((b) => b.id === bookId)
    if (book) {
      book.lastReadPage = page
      writeLibrary(library)
    }
    return book
  })
}
