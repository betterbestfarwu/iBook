import { ipcMain, nativeImage } from 'electron'
import { readTextFile, paginateByLayout } from '../services/text'

export function registerFileHandlers(): void {
  ipcMain.handle('files:readText', (_event, filePath: string) => {
    return readTextFile(filePath)
  })

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
