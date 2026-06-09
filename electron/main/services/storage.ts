import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type { Book, Annotation, AppSettings } from '../../../src/types'
import { DEFAULT_SETTINGS, normalizeThemeKey } from '../../../src/types'
import { getDataDir } from './storagePaths'
import { readFileBuffer } from './text'

function getLibraryPath(): string {
  return join(getDataDir(), 'library.json')
}

function getSettingsPath(): string {
  return join(getDataDir(), 'settings.json')
}

function getAnnotationsDir(): string {
  const dir = join(getDataDir(), 'annotations')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getAnnotationPath(bookId: string): string {
  return join(getAnnotationsDir(), `${bookId}.jsonl`)
}

export function hashFile(filePath: string): string {
  return createHash('md5').update(readFileBuffer(filePath)).digest('hex')
}

export function readLibrary(): Book[] {
  const path = getLibraryPath()
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Book[]
  } catch {
    return []
  }
}

export function writeLibrary(books: Book[]): void {
  writeFileSync(getLibraryPath(), JSON.stringify(books, null, 2), 'utf-8')
}

function normalizeSettings(raw: Partial<AppSettings>): AppSettings {
  const settings = { ...DEFAULT_SETTINGS, ...raw }
  settings.theme = normalizeThemeKey(settings.theme)
  settings.charsPerPage = Math.min(10000, Math.max(200, settings.charsPerPage || DEFAULT_SETTINGS.charsPerPage))
  return settings
}

export function readSettings(): AppSettings {
  const path = getSettingsPath()
  if (!existsSync(path)) return { ...DEFAULT_SETTINGS }
  try {
    return normalizeSettings(JSON.parse(readFileSync(path, 'utf-8')) as Partial<AppSettings>)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(settings: AppSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function readAnnotations(bookId: string): Annotation[] {
  const path = getAnnotationPath(bookId)
  if (!existsSync(path)) return []
  const content = readFileSync(path, 'utf-8')
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Annotation)
}

export function appendAnnotation(annotation: Annotation): void {
  appendFileSync(getAnnotationPath(annotation.bookId), JSON.stringify(annotation) + '\n', 'utf-8')
}

export function rewriteAnnotations(bookId: string, annotations: Annotation[]): void {
  const path = getAnnotationPath(bookId)
  if (annotations.length === 0) {
    writeFileSync(path, '', 'utf-8')
    return
  }
  writeFileSync(
    path,
    annotations.map((a) => JSON.stringify(a)).join('\n') + '\n',
    'utf-8'
  )
}

export function createBookFromPath(filePath: string): Book | null {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext !== 'txt' && ext !== 'pdf') return null

  const fileName = filePath.split(/[/\\]/).pop() ?? 'Untitled'
  const title = fileName.replace(/\.[^.]+$/, '')

  return {
    id: uuidv4(),
    title,
    filePath,
    format: ext as 'txt' | 'pdf',
    fileHash: hashFile(filePath),
    addedAt: Date.now(),
    lastReadPage: 0
  }
}

export { uuidv4 }
