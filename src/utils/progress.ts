import type { Book, BookProgress, ReadMode } from '../types'

export function hasChapterPreface(pageTitles: string[]): boolean {
  return pageTitles[0] === '前言'
}

export function getChapterNumber(page: number, pageTitles: string[]): number {
  if (!pageTitles.length) return page + 1
  if (hasChapterPreface(pageTitles)) {
    return pageTitles[page] === '前言' ? 0 : page
  }
  return page + 1
}

export function getDisplayChapter(book: Book): number {
  if (book.lastReadChapter != null && book.lastReadChapter > 0) return book.lastReadChapter
  if (book.readMode === 'chapter') {
    return book.hasChapterPreface !== false ? book.lastReadPage : book.lastReadPage + 1
  }
  return book.lastReadPage + 1
}

export function getChapterProgressMeta(
  page: number,
  pageTitles: string[],
  readMode: ReadMode
): Pick<Book, 'lastReadChapter' | 'totalChapters' | 'hasChapterPreface'> {
  if (readMode !== 'chapter' || !pageTitles.length) return {}

  const preface = hasChapterPreface(pageTitles)
  const totalChapters = pageTitles.filter((title) => title !== '前言').length
  const lastReadChapter = getChapterNumber(page, pageTitles)

  return {
    lastReadChapter,
    totalChapters,
    hasChapterPreface: preface
  }
}

export function computeCharsReadAtPage(
  page: number,
  pages: string[],
  totalCharCount: number,
  totalPages: number
): number {
  if (page < 0) return 0

  let hasHole = false
  let sum = 0
  for (let i = 0; i <= page; i++) {
    const content = pages[i]
    if (content == null) {
      hasHole = true
      break
    }
    sum += content.length
  }

  if (!hasHole) return sum
  if (totalPages > 0 && totalCharCount > 0) {
    return Math.round(((page + 1) / totalPages) * totalCharCount)
  }
  return sum
}

export function buildBookProgress(
  page: number,
  pages: string[],
  text: string,
  totalPages: number,
  readMode: ReadMode,
  pageTitles: string[] = []
): BookProgress | undefined {
  const totalCharCount = text.length
  if (!totalCharCount) return undefined

  const charsRead = computeCharsReadAtPage(page, pages, totalCharCount, totalPages)
  return {
    charsRead,
    totalCharCount,
    readMode,
    ...getChapterProgressMeta(page, pageTitles, readMode)
  }
}

export function getUnreadPercent(book: Book): number | null {
  const { charsRead, totalCharCount } = book
  if (charsRead == null || !totalCharCount) return null
  if (charsRead >= totalCharCount) return 0
  const unread = totalCharCount - charsRead
  return Math.min(99, Math.floor((unread / totalCharCount) * 100))
}
