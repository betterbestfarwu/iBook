import type { Chapter } from '../types'

export type { Chapter }

const MAX_TITLE_LEN = 80
const CN_NUM = `[\\d零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+`

// ###第三章 七玄门### — 优先级最高；全文存在此格式时忽略其他章节规则
const HASH_CHAPTER_PATTERN = /^\s*#{3}\s*(.+?)\s*#{3}\s*$/

const FALLBACK_PATTERNS: RegExp[] = [
  // 【第一章】初入江湖 / ※第一章※ / [第一章]
  /^\s*[【※［\[].+?[】※］\]]/,
  // 第二章 石头哥哥 / 第一章 / 第 123 回
  new RegExp(`^\\s{0,4}第\\s*${CN_NUM}\\s*[章节回卷篇集部]\\s*.*$`),
  // 序章、楔子、前言、后记、尾声、番外
  /^\s{0,4}(?:序章|楔子|前言|引子|序言|后记|尾声|终章|番外(?:篇)?)(?:\s|·|\.|:|：|$).{0,30}$/,
  /^\s{0,4}(?:序章|楔子|前言|引子|序言|后记|尾声|终章|番外(?:篇)?)\s*$/,
  // Chapter 5 / CHAPTER XII
  /^\s{0,4}(?:Chapter|CHAPTER)\s+[\dIVXivx]+(?:\s+.+)?$/i,
  // 第一卷 / 卷三 / Volume 1
  new RegExp(`^\\s{0,4}(?:第\\s*${CN_NUM}\\s*卷|卷\\s*${CN_NUM}|Volume\\s+\\d+).+$`, 'i'),
  // 1. 标题 / 2、标题 / 3- 标题
  /^\s{0,4}\d{1,5}[\.,、\-]\s*.[^\n]{1,30}$/
]

function textHasHashChapters(text: string): boolean {
  for (const line of text.split('\n')) {
    if (HASH_CHAPTER_PATTERN.test(line)) return true
  }
  return false
}

function resolveChapterPatterns(text: string): RegExp[] {
  return textHasHashChapters(text) ? [HASH_CHAPTER_PATTERN] : FALLBACK_PATTERNS
}

/** 常见 TXT 站点水印：正文(www.xxx.com) 第九二二章 … */
const SITE_BODY_PREFIX = /^\s*正文\s*[\(（][^)）]*[\)）]\s*/

function stripSitePrefix(line: string): string {
  return line.replace(SITE_BODY_PREFIX, '').trim()
}

function normalizeTitle(line: string): string {
  const trimmed = stripSitePrefix(line.trim())
  const hash = trimmed.match(/^#{3}\s*(.+?)\s*#{3}$/)
  if (hash) return hash[1].trim()
  return trimmed
}

export function detectChapterTitle(line: string, patterns?: RegExp[]): string | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > MAX_TITLE_LEN) return null

  const stripped = stripSitePrefix(trimmed)
  const candidates = stripped !== trimmed ? [stripped, trimmed] : [trimmed]
  const rules = patterns ?? [HASH_CHAPTER_PATTERN, ...FALLBACK_PATTERNS]

  for (const candidate of candidates) {
    for (const pattern of rules) {
      if (pattern.test(candidate)) {
        return normalizeTitle(candidate)
      }
    }
  }
  return null
}

export function parseChapters(text: string): Chapter[] {
  const patterns = resolveChapterPatterns(text)
  const chapters: Chapter[] = []
  let offset = 0

  for (const line of text.split('\n')) {
    const title = detectChapterTitle(line, patterns)
    if (title) {
      chapters.push({ title, charOffset: offset })
    }
    offset += line.length + 1
  }

  return chapters
}

export function hasRecognizedChapters(chapters: Chapter[]): boolean {
  return chapters.length > 0
}

export function splitTextByChapters(
  text: string,
  chapters: Chapter[]
): { pages: string[]; titles: string[] } {
  if (!chapters.length) return { pages: [], titles: [] }

  const pages: string[] = []
  const titles: string[] = []

  if (chapters[0].charOffset > 0) {
    pages.push(text.slice(0, chapters[0].charOffset))
    titles.push('前言')
  }

  for (let i = 0; i < chapters.length; i++) {
    const start = chapters[i].charOffset
    const end = i + 1 < chapters.length ? chapters[i + 1].charOffset : text.length
    pages.push(text.slice(start, end))
    titles.push(chapters[i].title)
  }

  return { pages, titles }
}

export function getPageStartOffsets(pages: string[]): number[] {
  const offsets: number[] = []
  let sum = 0
  for (const page of pages) {
    offsets.push(sum)
    sum += page.length
  }
  return offsets
}

export function getChapterForOffset(chapters: Chapter[], offset: number): Chapter | null {
  if (!chapters.length) return null
  let result: Chapter | null = null
  for (const chapter of chapters) {
    if (chapter.charOffset <= offset) result = chapter
    else break
  }
  return result
}

export function getChapterForPage(
  chapters: Chapter[],
  pages: string[],
  pageIndex: number
): string {
  if (!pages[pageIndex]) return ''
  const offsets = getPageStartOffsets(pages)
  return getChapterForOffset(chapters, offsets[pageIndex])?.title ?? ''
}

export function buildPageChapterMap(chapters: Chapter[], pages: string[]): string[] {
  if (!chapters.length || !pages.length) return pages.map(() => '')
  const offsets = getPageStartOffsets(pages)
  return offsets.map((offset) => getChapterForOffset(chapters, offset)?.title ?? '')
}

/** 章节正文预览：去掉开头的章节标题行，避免与导航栏标签重复显示 */
export function stripChapterHeading(text: string): string {
  if (!text) return text
  const lines = text.split('\n')
  if (!lines[0] || !detectChapterTitle(lines[0])) return text

  let start = 1
  while (start < lines.length && !lines[start].trim()) start++
  const body = lines.slice(start).join('\n').trim()
  return body || text
}
