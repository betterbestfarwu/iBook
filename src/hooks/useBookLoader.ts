import { useCallback } from 'react'
import { useReaderStore, useSettingsStore } from '../stores'
import type { Book } from '../types'

const LINE_HEIGHT = 1.8
const PADDING = 48
const TOOLBAR_HEIGHT = 48
const FOOTER_HEIGHT = 36

export function useBookLoader() {
  const settings = useSettingsStore((s) => s.settings)
  const {
    setBook,
    setText,
    setPages,
    setCurrentPage,
    setLoading,
    setBackgroundPaginating,
    loadAnnotations
  } = useReaderStore()

  const getLayout = useCallback(() => {
    return {
      containerWidth: Math.max(window.innerWidth, 400),
      containerHeight: Math.max(window.innerHeight - TOOLBAR_HEIGHT - FOOTER_HEIGHT, 500),
      fontSize: settings.fontSize,
      lineHeight: LINE_HEIGHT,
      padding: PADDING
    }
  }, [settings.fontSize])

  const loadBook = useCallback(
    async (book: Book) => {
      setBook(book)
      setLoading(true, '正在读取文件…')

      if (book.format === 'pdf') {
        setLoading(false)
        throw new Error('PDF 格式即将支持，请先使用 TXT 文件')
      }

      const text = await window.electronAPI.files.readText(book.filePath)
      if (!text.trim()) {
        setLoading(false)
        throw new Error('TXT 文件为空或无法识别编码，请另存为 UTF-8 后重试')
      }
      setText(text)

      const targetPage = book.lastReadPage ?? 0
      setLoading(true, targetPage > 0 ? `恢复至第 ${targetPage + 1} 页…` : '正在排版…')

      const layout = getLayout()
      const { pages, totalPages } = await window.electronAPI.files.paginate({
        text,
        ...layout,
        upToPage: targetPage
      })

      setPages(pages, totalPages)
      setCurrentPage(pages.length > 0 ? Math.min(targetPage, pages.length - 1) : 0)
      setLoading(false)

      void loadAnnotations(book.id)

      setBackgroundPaginating(true)
      window.electronAPI.files
        .paginate({ text, ...layout })
        .then(({ pages: allPages, totalPages: fullTotal }) => {
          useReaderStore.setState({ pages: allPages, totalPages: fullTotal })
        })
        .finally(() => setBackgroundPaginating(false))
    },
    [
      getLayout,
      loadAnnotations,
      setBackgroundPaginating,
      setBook,
      setCurrentPage,
      setLoading,
      setPages,
      setText
    ]
  )

  return { loadBook, getLayout }
}

export { LINE_HEIGHT, PADDING }
