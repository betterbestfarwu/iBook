import { ipcMain } from 'electron'
import { readTextFile, paginateByLayout } from '../services/text'

export function registerFileHandlers(): void {
  ipcMain.handle('files:readText', (_event, filePath: string) => {
    return readTextFile(filePath)
  })

  ipcMain.handle(
    'files:paginate',
    (
      _event,
      payload: {
        text: string
        containerWidth: number
        containerHeight: number
        fontSize: number
        lineHeight: number
        padding: number
        upToPage?: number
      }
    ) => {
      const result = paginateByLayout(
        payload.text,
        payload.containerWidth,
        payload.containerHeight,
        payload.fontSize,
        payload.lineHeight,
        payload.padding,
        payload.upToPage
      )
      return result
    }
  )

  ipcMain.handle(
    'files:paginateRemaining',
    (
      _event,
      payload: {
        text: string
        containerWidth: number
        containerHeight: number
        fontSize: number
        lineHeight: number
        padding: number
        fromPage: number
      }
    ) => {
      const result = paginateByLayout(
        payload.text,
        payload.containerWidth,
        payload.containerHeight,
        payload.fontSize,
        payload.lineHeight,
        payload.padding
      )
      return {
        pages: result.pages.slice(payload.fromPage),
        totalPages: result.totalPages
      }
    }
  )
}
