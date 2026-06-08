import type { Annotation } from '../types'

export function buildAnnotatedHtml(
  pageText: string,
  pageIndex: number,
  annotations: Annotation[]
): string {
  const pageAnnotations = annotations
    .filter((a) => a.page === pageIndex)
    .sort((a, b) => a.start - b.start)

  if (!pageAnnotations.length) return escapeHtml(pageText)

  let html = ''
  let cursor = 0

  for (const ann of pageAnnotations) {
    const start = Math.max(0, Math.min(ann.start, pageText.length))
    const end = Math.max(start, Math.min(ann.end, pageText.length))
    if (start > cursor) html += escapeHtml(pageText.slice(cursor, start))
    const slice = pageText.slice(start, end)
    if (slice) {
      const isNote = ann.type === 'note' || !!ann.note
      const noteAttr = ann.note ? ` data-note="${escapeAttr(ann.note)}"` : ''
      if (isNote) {
        html += `<mark class="annotation-mark annotation-mark--note" data-id="${ann.id}"${noteAttr}>${escapeHtml(slice)}</mark>`
      } else {
        html += `<mark class="annotation-mark" data-id="${ann.id}" style="background-color:${ann.color}"${noteAttr}>${escapeHtml(slice)}</mark>`
      }
    }
    cursor = end
  }

  if (cursor < pageText.length) html += escapeHtml(pageText.slice(cursor))
  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export function getSelectionOffsets(container: HTMLElement): { start: number; end: number; text: string } | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null

  const range = sel.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null

  const text = range.toString()
  if (!text.trim()) return null

  const start = getTextOffset(container, range.startContainer, range.startOffset)
  const end = getTextOffset(container, range.endContainer, range.endOffset)
  return { start, end, text }
}

function getTextOffset(root: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let count = 0
  let current: Node | null
  while ((current = walker.nextNode())) {
    if (current === node) return count + offset
    count += current.textContent?.length ?? 0
  }
  return count
}

export function getPagePreview(text: string, maxLen = 60): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned || '(空白页)'
}
