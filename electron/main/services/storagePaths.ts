import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'iBook')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}
