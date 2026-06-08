import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooksStore, useSettingsStore, useReaderStore } from '../../stores'
import { getThemePreset, type ThemeKey } from '../../types'
import { BackgroundPicker } from '../../components/BackgroundPicker'
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
  const toolbarRef = useRef<HTMLElement>(null)

  const [slideAnim, setSlideAnim] = useState<'next-out' | 'next-in' | 'prev-out' | 'prev-in' | null>(null)

  const SLIDE_MS = 280
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [toolbarBottom, setToolbarBottom] = useState(48)
  const [selection, setSelection] = useState<{ x: number; y: number; start: number; end: number; text: string } | null>(null)
  const [bubble, setBubble] = useState<{ x: number; y: number; note: string } | null>(null)
  const hideSidebarTimer = useRef<ReturnType<typeof setTimeout>>()

  const theme = getThemePreset(settings.theme)
  const pageText = pages[currentPage] ?? ''
  const displayTotal = Math.max(totalPages, pages.length)
  const pageBg = settings.backgroundImage ? 'rgba(255,255,255,0.92)' : settings.backgroundColor || theme.bg

  const bgStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundImage ? undefined : pageBg,
    backgroundImage: settings.backgroundImage ? `url(file://${settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: theme.text
  }

  const saveProgress = useCallback(
    (page: number) => {
      if (!book) return
      const { pages: currentPages, text } = useReaderStore.getState()
      const charsRead = currentPages.slice(0, page + 1).reduce((sum, p) => sum + p.length, 0)
      const totalCharCount = text.length || book.totalCharCount
      const progress = totalCharCount > 0 ? { charsRead, totalCharCount } : undefined
      void updateBookProgress(book.id, page, progress)
      setBook({
        ...book,
        lastReadPage: page,
        charsRead,
        totalCharCount
      })
    },
    [book, setBook, updateBookProgress]
  )

  const goToPage = useCallback(
    (page: number, animate?: 'next' | 'prev') => {
      const target = Math.max(0, Math.min(page, displayTotal - 1))
      if (target === currentPage) return

      if (animate) {
        const out = animate === 'next' ? 'next-out' : 'prev-out'
        const inn = animate === 'next' ? 'next-in' : 'prev-in'
        setSlideAnim(out)
        setTimeout(() => {
          setCurrentPage(target)
          saveProgress(target)
          setSlideAnim(inn)
          setTimeout(() => setSlideAnim(null), SLIDE_MS)
        }, SLIDE_MS)
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
    const el = toolbarRef.current
    if (!el) return

    const update = () => {
      setToolbarBottom(el.getBoundingClientRect().bottom)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [book])

  useEffect(() => {
    return () => {
      const { book: b, currentPage: page, pages: currentPages, text } = useReaderStore.getState()
      if (!b) return
      const charsRead = currentPages.slice(0, page + 1).reduce((sum, p) => sum + p.length, 0)
      const totalCharCount = text.length || b.totalCharCount
      const progress = totalCharCount > 0 ? { charsRead, totalCharCount } : undefined
      void useBooksStore.getState().updateProgress(b.id, page, progress)
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

  const selectBackground = (key: ThemeKey) => {
    const preset = getThemePreset(key)
    updateSettings({ theme: key, backgroundColor: preset.bg, backgroundImage: '' })
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

      <AppToolbar ref={toolbarRef} variant="reader" style={{ color: theme.text }}>
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              saveProgress(currentPage)
              navigate('/')
            }}
            className="app-toolbar__btn app-toolbar__btn--ghost app-toolbar__btn--icon shrink-0"
            aria-label="返回主页"
            title="返回主页"
          >
            ←
          </button>
          <span className="app-toolbar__title truncate opacity-80">{book.title}</span>
        </div>
        <div className="app-toolbar__actions">
          <div className="font-size-control">
            <button
              type="button"
              onClick={() => updateSettings({ fontSize: Math.max(12, settings.fontSize - 2) })}
              className="app-toolbar__btn app-toolbar__btn--ghost"
            >
              A−
            </button>
            <span className="font-size-control__value tabular-nums">{settings.fontSize}</span>
            <button
              type="button"
              onClick={() => updateSettings({ fontSize: Math.min(36, settings.fontSize + 2) })}
              className="app-toolbar__btn app-toolbar__btn--ghost"
            >
              A+
            </button>
          </div>
          <BackgroundPicker theme={settings.theme} onSelect={selectBackground} />
        </div>
      </AppToolbar>

      <PageThumbnailNav
        visible={sidebarVisible}
        topOffset={toolbarBottom}
        pages={pages}
        currentPage={currentPage}
        totalPages={displayTotal}
        theme={theme}
        fontSize={Math.max(8, settings.fontSize * 0.45)}
        onGoToPage={(p) => goToPage(p)}
        onMouseEnter={() => clearTimeout(hideSidebarTimer.current)}
        onMouseLeave={() => {
          hideSidebarTimer.current = setTimeout(() => setSidebarVisible(false), 250)
        }}
      />

      <main ref={contentRef} className="relative flex flex-1 overflow-hidden">
        <div className="page-flip-container h-full w-full">
          <div className={`page-flip-inner relative h-full w-full ${slideAnim ? `sliding-${slideAnim}` : ''}`}>
            <div
              ref={pageScrollRef}
              className="absolute inset-0 overflow-y-auto rounded-lg p-12 shadow-inner"
              style={{ backgroundColor: settings.backgroundImage ? pageBg : 'transparent' }}
            >
              <div
                ref={textRef}
                className="reader-text font-serif"
                style={{ fontSize: settings.fontSize, lineHeight: LINE_HEIGHT }}
                dangerouslySetInnerHTML={{ __html: annotatedHtml }}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 border-t border-black/10 px-4 py-2 text-xs opacity-50">
        <span className="tabular-nums">
          {currentPage + 1} / {displayTotal}
          {isBackgroundPaginating && ' …'}
        </span>
        <span className="h-3 w-px shrink-0 bg-current opacity-30" aria-hidden="true" />
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
