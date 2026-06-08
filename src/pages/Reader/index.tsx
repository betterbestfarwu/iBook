import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooksStore, useSettingsStore, useReaderStore } from '../../stores'
import { THEME_PRESETS } from '../../types'
import { buildAnnotatedHtml, getSelectionOffsets, getPagePreview } from '../../utils/annotations'
import { LINE_HEIGHT, PADDING } from '../../hooks/useBookLoader'
import { AppToolbar } from '../../components/AppToolbar'
import { SelectionToolbar } from './SelectionToolbar'
import { AnnotationBubble } from './AnnotationBubble'
import { PageThumbnailNav } from './PageThumbnailNav'

export function ReaderPage(): JSX.Element {
  const navigate = useNavigate()
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const {
    book,
    pages,
    currentPage,
    totalPages,
    annotations,
    isBackgroundPaginating,
    setCurrentPage,
    setBook,
    addAnnotation
  } = useReaderStore()
  const updateBookProgress = useBooksStore((s) => s.updateProgress)

  const contentRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const pageScrollRef = useRef<HTMLDivElement>(null)

  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [selection, setSelection] = useState<{ x: number; y: number; start: number; end: number; text: string } | null>(null)
  const [bubble, setBubble] = useState<{ x: number; y: number; note: string } | null>(null)
  const hideSidebarTimer = useRef<ReturnType<typeof setTimeout>>()

  const theme = THEME_PRESETS[settings.theme]
  const pageText = pages[currentPage] ?? ''
  const displayTotal = Math.max(totalPages, pages.length)

  const bgStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundImage ? undefined : settings.backgroundColor || theme.bg,
    backgroundImage: settings.backgroundImage ? `url(file://${settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: theme.text
  }

  const saveProgress = useCallback(
    (page: number) => {
      if (!book) return
      void updateBookProgress(book.id, page)
      setBook({ ...book, lastReadPage: page })
    },
    [book, setBook, updateBookProgress]
  )

  const goToPage = useCallback(
    (page: number, animate?: 'next' | 'prev') => {
      const target = Math.max(0, Math.min(page, displayTotal - 1))
      if (target === currentPage) return

      if (animate) {
        setFlipping(animate)
        setTimeout(() => {
          setCurrentPage(target)
          saveProgress(target)
          setFlipping(null)
        }, 550)
      } else {
        setCurrentPage(target)
        saveProgress(target)
      }
    },
    [currentPage, displayTotal, saveProgress, setCurrentPage]
  )

  const goNext = () => goToPage(currentPage + 1, 'next')
  const goPrev = () => goToPage(currentPage - 1, 'prev')

  useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0 })
  }, [currentPage])

  useEffect(() => {
    return () => {
      const { book: b, currentPage: page } = useReaderStore.getState()
      if (b) void useBooksStore.getState().updateProgress(b.id, page)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selection) return
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!settings.autoPageTurn) return
    const id = setInterval(() => {
      const { currentPage: cp, totalPages: tp, pages: p } = useReaderStore.getState()
      const max = Math.max(tp, p.length)
      if (cp < max - 1) goToPage(cp + 1, 'next')
    }, settings.autoPageTurnInterval * 1000)
    return () => clearInterval(id)
  }, [settings.autoPageTurn, settings.autoPageTurnInterval, goToPage])

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const onMouseUp = () => {
      const offsets = getSelectionOffsets(el)
      if (!offsets) {
        setSelection(null)
        return
      }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelection({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        ...offsets
      })
    }

    el.addEventListener('mouseup', onMouseUp)
    return () => el.removeEventListener('mouseup', onMouseUp)
  }, [currentPage, pageText])

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('mark.annotation-mark') as HTMLElement | null
      if (target?.dataset.note) {
        const rect = target.getBoundingClientRect()
        setBubble({ x: rect.left + rect.width / 2, y: rect.top - 8, note: target.dataset.note })
      }
    }
    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      if (!related?.closest('mark.annotation-mark')) setBubble(null)
    }

    el.addEventListener('mouseover', onOver)
    el.addEventListener('mouseout', onOut)
    return () => {
      el.removeEventListener('mouseover', onOver)
      el.removeEventListener('mouseout', onOut)
    }
  }, [currentPage, pageText, annotations])

  const handleHighlight = async (color: string, withNote?: boolean) => {
    if (!selection || !book) return
    let note: string | undefined
    if (withNote) {
      const input = window.prompt('输入批注内容：')
      if (input === null) return
      note = input || undefined
    }
    await addAnnotation({
      bookId: book.id,
      type: note ? 'note' : 'mark',
      color,
      page: currentPage,
      start: selection.start,
      end: selection.end,
      text: selection.text,
      note
    })
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.clientX <= 20) {
      clearTimeout(hideSidebarTimer.current)
      setSidebarVisible(true)
    }
  }

  const cycleTheme = () => {
    const order: Array<typeof settings.theme> = ['eye-care', 'white', 'dark', 'black']
    const idx = order.indexOf(settings.theme)
    updateSettings({ theme: order[(idx + 1) % order.length] })
  }

  if (!book) {
    return (
      <div className="flex h-full items-center justify-center bg-stone-100">
        <p className="text-stone-500">未加载书籍</p>
        <button type="button" onClick={() => navigate('/')} className="ml-4 text-indigo-600">
          返回主页
        </button>
      </div>
    )
  }

  const annotatedHtml = buildAnnotatedHtml(pageText, currentPage, annotations)

  return (
    <div
      className="relative flex h-full flex-col"
      style={bgStyle}
      onMouseMove={handleMouseMove}
    >
      {/* Left hover trigger zone */}
      <div className="fixed left-0 top-0 z-20 h-full w-5" />

      <PageThumbnailNav
        visible={sidebarVisible}
        pages={pages}
        currentPage={currentPage}
        totalPages={displayTotal}
        theme={theme}
        fontSize={Math.max(8, settings.fontSize * 0.45)}
        onNavigateHome={() => {
          saveProgress(currentPage)
          navigate('/')
        }}
        onGoToPage={(p) => goToPage(p)}
        onMouseEnter={() => clearTimeout(hideSidebarTimer.current)}
        onMouseLeave={() => {
          hideSidebarTimer.current = setTimeout(() => setSidebarVisible(false), 250)
        }}
      />

      <AppToolbar variant="reader" style={{ color: theme.text }}>
        <span className="app-toolbar__title truncate opacity-80">{book.title}</span>
        <div className="app-toolbar__actions">
          <span className="px-2 text-sm tabular-nums opacity-70">
            {currentPage + 1} / {displayTotal}
            {isBackgroundPaginating && ' …'}
          </span>
          <button
            type="button"
            onClick={() => updateSettings({ fontSize: Math.max(12, settings.fontSize - 2) })}
            className="app-toolbar__btn app-toolbar__btn--ghost"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ fontSize: Math.min(36, settings.fontSize + 2) })}
            className="app-toolbar__btn app-toolbar__btn--ghost"
          >
            A+
          </button>
          <button type="button" onClick={cycleTheme} className="app-toolbar__btn app-toolbar__btn--ghost">
            {theme.name}
          </button>
        </div>
      </AppToolbar>

      <main ref={contentRef} className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div
          className="page-flip-container h-full w-full max-w-3xl"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const x = e.clientX - rect.left
            if (x < rect.width * 0.35) goPrev()
            else if (x > rect.width * 0.65) goNext()
          }}
        >
          <div className={`page-flip-inner relative h-full w-full ${flipping ? `flipping-${flipping}` : ''}`}>
            <div
              ref={pageScrollRef}
              className="page-face absolute inset-0 overflow-y-auto rounded-lg p-12 shadow-inner"
              style={{ backgroundColor: settings.backgroundImage ? 'rgba(255,255,255,0.92)' : 'transparent' }}
            >
              <div
                ref={textRef}
                className="reader-text font-serif"
                style={{ fontSize: settings.fontSize, lineHeight: LINE_HEIGHT }}
                dangerouslySetInnerHTML={{ __html: annotatedHtml }}
              />
            </div>
            <div
              className="page-face back absolute inset-0 rounded-lg shadow-inner"
              style={{ backgroundColor: theme.bg }}
            />
          </div>
        </div>
      </main>

      <footer className="flex justify-center gap-4 border-t border-black/10 py-2 text-xs opacity-50">
        <span>点击左侧上一页 · 右侧下一页</span>
        <span>← → 方向键翻页</span>
      </footer>

      {selection && (
        <SelectionToolbar
          x={selection.x}
          y={selection.y}
          colors={settings.highlightColors}
          onHighlight={(c) => handleHighlight(c)}
          onAddNote={() => handleHighlight(settings.highlightColors[0], true)}
          onClose={() => setSelection(null)}
        />
      )}

      {bubble && <AnnotationBubble x={bubble.x} y={bubble.y} note={bubble.note} />}
    </div>
  )
}

export { getPagePreview }
