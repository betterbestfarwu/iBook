import { readFileSync } from 'fs'
import chardet from 'chardet'
import iconv from 'iconv-lite'

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function resolveEncoding(buffer: Buffer): string {
  const detected = (chardet.detect(buffer) ?? 'utf-8').toLowerCase()
  if (detected.includes('gb')) return 'gbk'
  if (detected.includes('big5')) return 'big5'
  if (detected.includes('utf-16')) return detected.includes('le') ? 'utf-16le' : 'utf-16be'
  return 'utf-8'
}

export function readFileBuffer(filePath: string): Buffer {
  return readFileSync(filePath)
}

export function decodeBuffer(buffer: Buffer): string {
  const encoding = resolveEncoding(buffer)
  try {
    const text = iconv.decode(buffer, encoding)
    if (encoding === 'utf-8' && text.includes('\uFFFD')) {
      const gbk = iconv.decode(buffer, 'gbk')
      if (!gbk.includes('\uFFFD')) return normalizeLineEndings(gbk)
    }
    return normalizeLineEndings(text)
  } catch {
    return normalizeLineEndings(buffer.toString('utf-8'))
  }
}

export function readTextFile(filePath: string): string {
  return decodeBuffer(readFileBuffer(filePath))
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

