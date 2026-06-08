import { ipcMain } from 'electron'
import { readSettings, writeSettings } from '../services/storage'
import type { AppSettings } from '../../../src/types'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => readSettings())

  ipcMain.handle('settings:save', (_event, settings: AppSettings) => {
    writeSettings(settings)
    return settings
  })
}
