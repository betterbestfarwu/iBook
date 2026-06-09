import { createHash } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { join } from 'path'
import type { Chapter } from '../../../src/types'
import { parseChapters, splitTextByChapters } from '../../../src/utils/chapters'
import { getDataDir } from './storagePaths'
import { decodeBuffer, paginateText, readFileBuffer } from './text'

export interface BookCacheMeta {
  bookId: string
  filePath: string
  fileHash: string
  fileSize: number
  fileMtimeMs: number
  chapters: Chapter[]
  cachedAt: number
}

export interface BookContentLoadResult {
  text: string
  fileHash: string
  chapters: Chapter[]
  fromCache: boolean
}

export interface PaginateCacheResult {
  pages: string[]
  totalPages: number
  fromCache: boolean
  isComplete: boolean
}

export interface ChapterPagesResult {
  pages: string[]
  titles: string[]
  fromCache: boolean
}

interface PaginationCacheFile {
  fileHash: string
  charsPerPage: number
  pages: string[]
  totalPages: number
  cachedAt: number
}

interface ChapterPagesCacheFile {
  fileHash: string
  pages: string[]
  titles: string[]
  cachedAt: number
}

function getCacheDir(): string {
  const dir = join(getDataDir(), 'cache')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getMetaPath(bookId: string): string {
  return join(getCacheDir(), `${bookId}.json`)
}

function getTextPath(bookId: string): string {
  return join(getCacheDir(), `${bookId}.txt`)
}

function getChapterPagesPath(bookId: string): string {
  return join(getCacheDir(), `${bookId}.chapter-pages.json`)
}

function getPagesCacheDir(bookId: string): string {
  const dir = join(getCacheDir(), 'pages', bookId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getPaginationCachePath(bookId: string, charsPerPage: number): string {
  return join(getPagesCacheDir(bookId), `${charsPerPage}.json`)
}

function readMeta(bookId: string): BookCacheMeta | null {
  const path = getMetaPath(bookId)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as BookCacheMeta
  } catch {
    return null
  }
}

function readCachedText(bookId: string): string | null {
  const path = getTextPath(bookId)
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

function hashBuffer(buffer: Buffer): string {
  return createHash('md5').update(buffer).digest('hex')
}

function writeCache(
  bookId: string,
  filePath: string,
  fileHash: string,
  fileSize: number,
  fileMtimeMs: number,
  text: string,
  chapters: Chapter[]
): void {
  const meta: BookCacheMeta = {
    bookId,
    filePath,
    fileHash,
    fileSize,
    fileMtimeMs,
    chapters,
    cachedAt: Date.now()
  }
  writeFileSync(getMetaPath(bookId), JSON.stringify(meta), 'utf-8')
  writeFileSync(getTextPath(bookId), text, 'utf-8')
}

function loadFromCache(meta: BookCacheMeta, bookId: string): BookContentLoadResult | null {
  const text = readCachedText(bookId)
  if (!text) return null
  return {
    text,
    fileHash: meta.fileHash,
    chapters: meta.chapters,
    fromCache: true
  }
}

function readAndDecode(filePath: string): { text: string; fileHash: string; fileSize: number; fileMtimeMs: number } {
  const buffer = readFileBuffer(filePath)
  const stat = statSync(filePath)
  return {
    text: decodeBuffer(buffer),
    fileHash: hashBuffer(buffer),
    fileSize: stat.size,
    fileMtimeMs: stat.mtimeMs
  }
}

export function loadBookContent(bookId: string, filePath: string): BookContentLoadResult {
  const stat = statSync(filePath)
  const meta = readMeta(bookId)

  if (meta && meta.fileHash && meta.fileSize === stat.size && meta.fileMtimeMs === stat.mtimeMs) {
    const cached = loadFromCache(meta, bookId)
    if (cached) return cached
  }

  const { text, fileHash, fileSize, fileMtimeMs } = readAndDecode(filePath)

  if (meta && meta.fileHash === fileHash) {
    writeCache(bookId, filePath, fileHash, fileSize, fileMtimeMs, text, meta.chapters)
    return { text, fileHash, chapters: meta.chapters, fromCache: true }
  }

  clearDerivedCaches(bookId)
  const chapters = parseChapters(text)
  writeCache(bookId, filePath, fileHash, fileSize, fileMtimeMs, text, chapters)
  return { text, fileHash, chapters, fromCache: false }
}

function clearDerivedCaches(bookId: string): void {
  const chapterPath = getChapterPagesPath(bookId)
  if (existsSync(chapterPath)) {
    try {
      unlinkSync(chapterPath)
    } catch {
      // ignore
    }
  }
  const pagesDir = join(getCacheDir(), 'pages', bookId)
  if (existsSync(pagesDir)) {
    try {
      rmSync(pagesDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}

function readPaginationCache(
  bookId: string,
  charsPerPage: number,
  fileHash: string
): PaginationCacheFile | null {
  const path = getPaginationCachePath(bookId, charsPerPage)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as PaginationCacheFile
    if (data.fileHash !== fileHash) return null
    return data
  } catch {
    return null
  }
}

function writePaginationCache(
  bookId: string,
  charsPerPage: number,
  fileHash: string,
  pages: string[],
  totalPages: number
): void {
  const data: PaginationCacheFile = {
    fileHash,
    charsPerPage,
    pages,
    totalPages,
    cachedAt: Date.now()
  }
  writeFileSync(getPaginationCachePath(bookId, charsPerPage), JSON.stringify(data), 'utf-8')
}

function requireCachedText(bookId: string): string {
  const text = readCachedText(bookId)
  if (!text) throw new Error(`书籍缓存不存在: ${bookId}`)
  return text
}

export function paginateBookCached(
  bookId: string,
  fileHash: string,
  charsPerPage: number,
  upToPage?: number
): PaginateCacheResult {
  const cached = readPaginationCache(bookId, charsPerPage, fileHash)

  if (cached) {
    const pages =
      upToPage !== undefined ? cached.pages.slice(0, upToPage + 1) : cached.pages
    return {
      pages,
      totalPages: cached.totalPages,
      fromCache: true,
      isComplete: true
    }
  }

  const text = requireCachedText(bookId)
  const result = paginateText(text, charsPerPage, upToPage)

  if (upToPage === undefined) {
    writePaginationCache(bookId, charsPerPage, fileHash, result.pages, result.totalPages)
    return { ...result, fromCache: false, isComplete: true }
  }

  return { ...result, fromCache: false, isComplete: false }
}

function readChapterPagesCache(bookId: string, fileHash: string): ChapterPagesCacheFile | null {
  const path = getChapterPagesPath(bookId)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as ChapterPagesCacheFile
    if (data.fileHash !== fileHash) return null
    return data
  } catch {
    return null
  }
}

function writeChapterPagesCache(
  bookId: string,
  fileHash: string,
  pages: string[],
  titles: string[]
): void {
  const data: ChapterPagesCacheFile = { fileHash, pages, titles, cachedAt: Date.now() }
  writeFileSync(getChapterPagesPath(bookId), JSON.stringify(data), 'utf-8')
}

export function loadChapterPagesCached(bookId: string, fileHash: string): ChapterPagesResult {
  const cached = readChapterPagesCache(bookId, fileHash)
  if (cached) {
    return { pages: cached.pages, titles: cached.titles, fromCache: true }
  }

  const text = requireCachedText(bookId)
  const meta = readMeta(bookId)
  if (!meta?.chapters.length) {
    return { pages: [], titles: [], fromCache: false }
  }

  const { pages, titles } = splitTextByChapters(text, meta.chapters)
  writeChapterPagesCache(bookId, fileHash, pages, titles)
  return { pages, titles, fromCache: false }
}

export function deleteBookCache(bookId: string): void {
  for (const path of [getMetaPath(bookId), getTextPath(bookId), getChapterPagesPath(bookId)]) {
    if (existsSync(path)) {
      try {
        unlinkSync(path)
      } catch {
        // ignore
      }
    }
  }

  const pagesDir = join(getCacheDir(), 'pages', bookId)
  if (existsSync(pagesDir)) {
    try {
      rmSync(pagesDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}
