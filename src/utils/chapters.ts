import type { Chapter } from '../types'

export type { Chapter }

const MAX_TITLE_LEN = 80
const CN_NUM = `[\\d零一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+`
const CHAPTER_NUM_IN_TITLE = new RegExp(`第\\s*${CN_NUM}\\s*[章节回卷篇集部]`)

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

function canonicalTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim()
}

function normalizeTitle(line: string): string {
  const trimmed = stripSitePrefix(line.trim())
  const hash = trimmed.match(/^#{3}\s*(.+?)\s*#{3}$/)
  if (hash) return hash[1].trim()
  return trimmed
}

/** 标题本身已含「第×章」等章节序号时，无需再单独显示「第 N 章」 */
export function titleHasChapterNumber(title: string): boolean {
  return CHAPTER_NUM_IN_TITLE.test(title)
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

function chapterSliceEnd(text: string, chapters: Chapter[], index: number): number {
  return index + 1 < chapters.length ? chapters[index + 1].charOffset : text.length
}

/** 章节标题行之后、下一章节标题行之前是否有正文 */
function hasBodyAfterTitle(lines: string[], titleIndex: number, patterns: RegExp[]): boolean {
  for (let j = titleIndex + 1; j < lines.length; j++) {
    if (detectChapterTitle(lines[j], patterns)) return false
    if (lines[j].trim()) return true
  }
  return false
}

/** 移除无正文的孤立章节标题行（常见于被过滤的空章节） */
function stripOrphanChapterTitles(text: string, patterns: RegExp[]): string {
  const lines = text.split('\n')
  const kept: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const title = detectChapterTitle(lines[i], patterns)
    if (title && !hasBodyAfterTitle(lines, i, patterns)) continue
    kept.push(lines[i])
  }
  return kept.join('\n')
}

function getChapterBody(text: string, start: number, end: number, patterns: RegExp[]): string {
  const raw = text.slice(start, end)
  return stripOrphanChapterTitles(stripChapterHeading(raw), patterns).trim()
}

function filterEmptyChapters(text: string, chapters: Chapter[], patterns: RegExp[]): Chapter[] {
  return chapters.filter((chapter, index) => {
    const end = chapterSliceEnd(text, chapters, index)
    return getChapterBody(text, chapter.charOffset, end, patterns).length > 0
  })
}

export function parseChapters(text: string): Chapter[] {
  const patterns = resolveChapterPatterns(text)
  const chapters: Chapter[] = []
  let offset = 0

  for (const line of text.split('\n')) {
    const title = detectChapterTitle(line, patterns)
    if (title) {
      const last = chapters[chapters.length - 1]
      // 正文(域名) 第二四六章 … 与 第二四六章 … 相邻重复标题只保留第一个分章点
      if (!last || canonicalTitle(last.title) !== canonicalTitle(title)) {
        chapters.push({ title, charOffset: offset })
      }
    }
    offset += line.length + 1
  }

  return filterEmptyChapters(text, chapters, patterns)
}

export function hasRecognizedChapters(chapters: Chapter[]): boolean {
  return chapters.length > 0
}

export function splitTextByChapters(
  text: string,
  chapters: Chapter[]
): { pages: string[]; titles: string[] } {
  if (!chapters.length) return { pages: [], titles: [] }

  const patterns = resolveChapterPatterns(text)
  const pages: string[] = []
  const titles: string[] = []

  if (chapters[0].charOffset > 0) {
    const preface = stripOrphanChapterTitles(
      text.slice(0, chapters[0].charOffset).trim(),
      patterns
    )
    if (preface) {
      pages.push(preface)
      titles.push('前言')
    }
  }

  for (let i = 0; i < chapters.length; i++) {
    const start = chapters[i].charOffset
    const end = chapterSliceEnd(text, chapters, i)
    const body = getChapterBody(text, start, end, patterns)
    if (!body) continue
    pages.push(body)
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

/** 去掉章节开头重复的标题行（含水印版与纯标题版） */
export function stripChapterHeading(text: string): string {
  if (!text) return text
  const lines = text.split('\n')
  let start = 0
  let seenCanonical: string | null = null

  while (start < lines.length) {
    const line = lines[start]
    if (!line.trim()) {
      start++
      continue
    }

    const title = detectChapterTitle(line)
    if (!title) break

    const canonical = canonicalTitle(title)
    if (seenCanonical === canonical) {
      start++
      continue
    }
    if (seenCanonical !== null) break

    seenCanonical = canonical
    start++
  }

  const body = lines.slice(start).join('\n').trim()
  return body || text
}
