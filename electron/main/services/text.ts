import { readFileSync } from 'fs'
import chardet from 'chardet'
import iconv from 'iconv-lite'

export function readTextFile(filePath: string): string {
  const buffer = readFileSync(filePath)
  const detected = chardet.detect(buffer) ?? 'utf-8'
  const encoding = detected.toLowerCase().includes('gb') ? 'gbk' : detected
  try {
    return iconv.decode(buffer, encoding)
  } catch {
    return buffer.toString('utf-8')
  }
}

export function paginateText(
  text: string,
  charsPerPage: number,
  upToPage?: number
): { pages: string[]; totalPages: number } {
  const pages: string[] = []
  let offset = 0
  const limit = upToPage !== undefined ? upToPage + 1 : Infinity

  while (offset < text.length && pages.length < limit) {
    let end = Math.min(offset + charsPerPage, text.length)

    if (end < text.length) {
      const slice = text.slice(offset, end)
      const lastNewline = slice.lastIndexOf('\n')
      const lastPeriod = Math.max(slice.lastIndexOf('。'), slice.lastIndexOf('.'))
      const breakAt = Math.max(lastNewline, lastPeriod)
      if (breakAt > charsPerPage * 0.5) {
        end = offset + breakAt + 1
      }
    }

    pages.push(text.slice(offset, end))
    offset = end
  }

  const estimatedTotal =
    offset < text.length
      ? pages.length + Math.ceil((text.length - offset) / charsPerPage)
      : pages.length

  return { pages, totalPages: estimatedTotal }
}

export function estimateCharsPerPage(
  containerWidth: number,
  containerHeight: number,
  fontSize: number,
  lineHeight: number,
  padding: number
): number {
  const charWidth = fontSize * 0.55
  const cols = Math.floor((containerWidth - padding * 2) / charWidth)
  const rows = Math.floor((containerHeight - padding * 2) / (fontSize * lineHeight))
  return Math.max(cols * rows, 200)
}

export function paginateByLayout(
  text: string,
  containerWidth: number,
  containerHeight: number,
  fontSize: number,
  lineHeight: number,
  padding: number,
  upToPage?: number
): { pages: string[]; totalPages: number } {
  const charsPerPage = estimateCharsPerPage(
    containerWidth,
    containerHeight,
    fontSize,
    lineHeight,
    padding
  )
  return paginateText(text, charsPerPage, upToPage)
}
