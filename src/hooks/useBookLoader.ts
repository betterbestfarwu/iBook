import { useCallback } from 'react'
import { useBooksStore, useReaderStore, useSettingsStore } from '../stores'
import type { Book } from '../types'
import { hasRecognizedChapters } from '../utils/chapters'
import { buildBookProgress } from '../utils/progress'

const LINE_HEIGHT = 1.8

export function useBookLoader() {
  const charsPerPage = useSettingsStore((s) => s.settings.charsPerPage)
  const {
    setBook,
    setText,
    setChapters,
    setReadMode,
    setPages,
    setCurrentPage,
    setLoading,
    setBackgroundPaginating,
    loadAnnotations
  } = useReaderStore()

  const loadBook = useCallback(
    async (book: Book) => {
      setBook(book)

      if (book.format === 'pdf') {
        setLoading(false)
        throw new Error('PDF 格式即将支持，请先使用 TXT 文件')
      }

      setLoading(true, '正在校验文件…')
      const { text, fileHash, chapters, fromCache } =
        await window.electronAPI.files.loadBookContent({
          bookId: book.id,
          filePath: book.filePath
        })
      if (!text.trim()) {
        setLoading(false)
        throw new Error('TXT 文件为空或无法识别编码，请另存为 UTF-8 后重试')
      }
      if (book.fileHash !== fileHash) {
        void useBooksStore.getState().syncFileHash(book.id, fileHash)
      }
      setText(text)
      setChapters(chapters)
      if (fromCache) {
        setLoading(true, '正在加载缓存…')
      }

      const targetPage = book.lastReadPage ?? 0
      const useChapterMode = hasRecognizedChapters(chapters)

      if (useChapterMode) {
        setLoading(true, targetPage > 0 ? `恢复至第 ${targetPage + 1} 章…` : '正在分章…')
        const { pages, titles } = await window.electronAPI.files.loadChapterPages({
          bookId: book.id,
          fileHash
        })
        setReadMode('chapter', titles)
        setPages(pages, pages.length)
        const page = pages.length > 0 ? Math.min(targetPage, pages.length - 1) : 0
        setCurrentPage(page)
        const progress = buildBookProgress(page, pages, text, pages.length, 'chapter', titles)
        if (progress) {
          void useBooksStore.getState().updateProgress(book.id, page, progress)
        }
        setLoading(false)
        void loadAnnotations(book.id)
        return
      }

      setReadMode('page', [])
      setLoading(true, targetPage > 0 ? `恢复至第 ${targetPage + 1} 页…` : '正在排版…')

      const { pages, totalPages, isComplete } = await window.electronAPI.files.paginateBook({
        bookId: book.id,
        fileHash,
        charsPerPage,
        upToPage: targetPage
      })

      setPages(pages, totalPages)
      const page = pages.length > 0 ? Math.min(targetPage, pages.length - 1) : 0
      setCurrentPage(page)
      const progress = buildBookProgress(page, pages, text, totalPages, 'page')
      if (progress) {
        void useBooksStore.getState().updateProgress(book.id, page, progress)
      }
      setLoading(false)

      void loadAnnotations(book.id)

      if (!isComplete) {
        setBackgroundPaginating(true)
        window.electronAPI.files
          .paginateBook({ bookId: book.id, fileHash, charsPerPage })
          .then(({ pages: allPages, totalPages: fullTotal }) => {
            useReaderStore.setState({ pages: allPages, totalPages: fullTotal })
          })
          .finally(() => setBackgroundPaginating(false))
      }
    },
    [
      charsPerPage,
      loadAnnotations,
      setBackgroundPaginating,
      setBook,
      setChapters,
      setReadMode,
      setCurrentPage,
      setLoading,
      setPages,
      setText
    ]
  )

  return { loadBook }
}

export { LINE_HEIGHT }
