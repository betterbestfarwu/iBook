import { ipcMain, nativeImage } from 'electron'
import { loadBookContent, loadChapterPagesCached, paginateBookCached } from '../services/bookCache'
import { readTextFile } from '../services/text'

export function registerFileHandlers(): void {
  ipcMain.handle('files:readText', (_event, filePath: string) => {
    return readTextFile(filePath)
  })

  ipcMain.handle(
    'files:loadBookContent',
    (_event, payload: { bookId: string; filePath: string }) => {
      return loadBookContent(payload.bookId, payload.filePath)
    }
  )

  ipcMain.handle(
    'files:paginateBook',
    (
      _event,
      payload: {
        bookId: string
        fileHash: string
        charsPerPage: number
        upToPage?: number
      }
    ) => {
      const { bookId, fileHash, charsPerPage, upToPage } = payload
      return paginateBookCached(bookId, fileHash, charsPerPage, upToPage)
    }
  )

  ipcMain.handle(
    'files:loadChapterPages',
    (_event, payload: { bookId: string; fileHash: string }) => {
      return loadChapterPagesCached(payload.bookId, payload.fileHash)
    }
  )

  ipcMain.handle('files:readImageThumbnail', (_event, filePath: string) => {
    const image = nativeImage.createFromPath(filePath)
    if (image.isEmpty()) return null
    const { width, height } = image.getSize()
    const scale = Math.min(256 / width, 160 / height, 1)
    const resized =
      scale < 1
        ? image.resize({
            width: Math.max(1, Math.round(width * scale)),
            height: Math.max(1, Math.round(height * scale)),
            quality: 'good'
          })
        : image
    return resized.toDataURL()
  })

}
