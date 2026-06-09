import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooksStore, useSettingsStore, useReaderStore } from '../../stores'
import { getThemePreset, type ThemeKey } from '../../types'
import { BackgroundPicker } from '../../components/BackgroundPicker'
import { buildAnnotatedHtml, getSelectionOffsets, getPagePreview } from '../../utils/annotations'
import { buildPageChapterMap } from '../../utils/chapters'
import { buildBookProgress } from '../../utils/progress'
import { LINE_HEIGHT } from '../../hooks/useBookLoader'
import { AppToolbar } from '../../components/AppToolbar'
import { SelectionToolbar } from './SelectionToolbar'
import { AnnotationDialog } from './AnnotationDialog'
import { AnnotationBubble } from './AnnotationBubble'
import { PageThumbnailNav } from './PageThumbnailNav'
import { PageNoteList } from './PageNoteList'
import { HighlightList } from './HighlightList'

export function ReaderPage(): JSX.Element {
  const navigate = useNavigate()
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const {
    book,
    pages,
    chapters,
    pageTitles,
    readMode,
    currentPage,
    totalPages,
    annotations,
    isBackgroundPaginating,
    setCurrentPage,
    setBook,
    addAnnotation,
    removeAnnotation
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
  const [noteDialog, setNoteDialog] = useState<{ x: number; y: number; start: number; end: number; text: string } | null>(null)
  const [bubble, setBubble] = useState<{ x: number; y: number; note: string } | null>(null)
  const [noteListOpen, setNoteListOpen] = useState(false)
  const [highlightListOpen, setHighlightListOpen] = useState(false)
  const hideSidebarTimer = useRef<ReturnType<typeof setTimeout>>()
  const actionsWrapRef = useRef<HTMLDivElement>(null)
  const pendingHighlightRef = useRef<string | null>(null)

  const theme = getThemePreset(settings.theme)
  const pageText = pages[currentPage] ?? ''
  const displayTotal = Math.max(totalPages, pages.length)
  const pageNotes = useMemo(
    () =>
      annotations
        .filter((a) => a.page === currentPage && a.type === 'note')
        .sort((a, b) => a.start - b.start),
    [annotations, currentPage]
  )
  const allHighlights = useMemo(
    () =>
      annotations
        .filter((a) => a.type === 'mark' && a.text.trim())
        .sort((a, b) => a.page - b.page || a.start - b.start),
    [annotations]
  )
  const hasHighlights = allHighlights.length > 0
  const isChapterMode = readMode === 'chapter'
  const unitLabel = isChapterMode ? '章' : '页'
  const navTitles = useMemo(
    () => (isChapterMode ? pageTitles : buildPageChapterMap(chapters, pages)),
    [isChapterMode, pageTitles, chapters, pages]
  )
  const currentChapterTitle = navTitles[currentPage] ?? ''
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
      const {
        pages: currentPages,
        text,
        totalPages: storeTotalPages,
        readMode: mode,
        pageTitles
      } = useReaderStore.getState()
      const progress = buildBookProgress(
        page,
        currentPages,
        text,
        Math.max(storeTotalPages, currentPages.length),
        mode,
        pageTitles
      )
      void updateBookProgress(book.id, page, progress ?? { readMode: mode })
      if (progress) {
        setBook({
          ...book,
          lastReadPage: page,
          charsRead: progress.charsRead,
          totalCharCount: progress.totalCharCount,
          readMode: mode
        })
      } else {
        setBook({ ...book, lastReadPage: page, readMode: mode })
      }
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
    setNoteListOpen(false)
    setHighlightListOpen(false)
  }, [currentPage])

  useEffect(() => {
    const id = pendingHighlightRef.current
    if (!id) return
    pendingHighlightRef.current = null
    const timer = setTimeout(() => {
      textRef.current?.querySelector(`mark[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => clearTimeout(timer)
  }, [currentPage, pageText])

  useEffect(() => {
    if (!noteListOpen && !highlightListOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!actionsWrapRef.current?.contains(e.target as Node)) {
        setNoteListOpen(false)
        setHighlightListOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [noteListOpen, highlightListOpen])

  useEffect(() => {
    if (pageNotes.length === 0) setNoteListOpen(false)
  }, [pageNotes.length])

  useEffect(() => {
    if (!hasHighlights) setHighlightListOpen(false)
  }, [hasHighlights])

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
      const {
        book: b,
        currentPage: page,
        pages: currentPages,
        text,
        totalPages: storeTotalPages,
        readMode: mode,
        pageTitles
      } = useReaderStore.getState()
      if (!b) return
      const progress = buildBookProgress(
        page,
        currentPages,
        text,
        Math.max(storeTotalPages, currentPages.length),
        mode,
        pageTitles
      )
      void useBooksStore.getState().updateProgress(b.id, page, progress ?? { readMode: mode })
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selection || noteDialog) return
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

  const handleErase = async () => {
    if (!selection || !book) return
    const overlapping = annotations.filter(
      (a) => a.page === currentPage && a.start < selection.end && a.end > selection.start
    )
    for (const ann of overlapping) {
      await removeAnnotation(ann.id)
    }
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleHighlight = async (color: string) => {
    if (!selection || !book) return
    await addAnnotation({
      bookId: book.id,
      type: 'mark',
      color,
      page: currentPage,
      start: selection.start,
      end: selection.end,
      text: selection.text
    })
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleOpenNoteDialog = () => {
    if (!selection) return
    setNoteDialog(selection)
    setSelection(null)
  }

  const handleCancelNote = () => {
    if (!noteDialog) return
    setSelection(noteDialog)
    setNoteDialog(null)
  }

  const handleConfirmNote = async (note: string) => {
    if (!noteDialog || !book || !note) return
    await addAnnotation({
      bookId: book.id,
      type: 'note',
      color: 'transparent',
      page: currentPage,
      start: noteDialog.start,
      end: noteDialog.end,
      text: noteDialog.text,
      note
    })
    setNoteDialog(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.clientX <= 20) {
      clearTimeout(hideSidebarTimer.current)
      setSidebarVisible(true)
    }
  }

  const scrollToAnnotation = (id: string) => {
    textRef.current?.querySelector(`mark[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToNote = (id: string) => {
    scrollToAnnotation(id)
    setNoteListOpen(false)
  }

  const goToHighlight = (highlight: (typeof annotations)[number]) => {
    setHighlightListOpen(false)
    if (highlight.page !== currentPage) {
      pendingHighlightRef.current = highlight.id
      goToPage(highlight.page)
    } else {
      scrollToAnnotation(highlight.id)
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
          <span
            className={`truncate ${isChapterMode ? 'text-xs opacity-50' : 'app-toolbar__title opacity-80'}`}
          >
            {book.title}
          </span>
        </div>
        <div className="app-toolbar__chapter-wrap min-w-0 flex-1 px-3">
          <span
            className={`app-toolbar__chapter truncate ${isChapterMode ? 'app-toolbar__chapter--primary' : ''}`}
            title={currentChapterTitle || undefined}
          >
            {currentChapterTitle ||
              (isChapterMode ? `第 ${currentPage + 1} 章` : `第 ${currentPage + 1} 页`)}
          </span>
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
        navTitles={navTitles}
        readMode={readMode}
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

      <footer className="reader-footer">
        <div className="reader-footer__center">
          <span className="tabular-nums">
            {isChapterMode && currentChapterTitle ? (
              <>
                <span className="max-w-[40vw] truncate">{currentChapterTitle}</span>
                <span className="mx-1.5 opacity-40">·</span>
              </>
            ) : null}
            {currentPage + 1} / {displayTotal} {unitLabel}
            {!isChapterMode && isBackgroundPaginating && ' …'}
          </span>
          <span className="reader-footer__divider" aria-hidden="true" />
          <span>← → 方向键{isChapterMode ? '切章' : '翻页'}</span>
        </div>
        {(hasHighlights || pageNotes.length > 0) && (
          <div ref={actionsWrapRef} className="reader-footer__actions">
            {hasHighlights && (
              <div className="reader-footer__notes">
                <button
                  type="button"
                  className={`reader-footer__notes-btn ${highlightListOpen ? 'reader-footer__notes-btn--active' : ''}`}
                  onClick={() => {
                    setHighlightListOpen((open) => !open)
                    setNoteListOpen(false)
                  }}
                  aria-expanded={highlightListOpen}
                  aria-haspopup="dialog"
                >
                  高亮 {allHighlights.length}
                </button>
                {highlightListOpen && (
                  <HighlightList
                    highlights={allHighlights}
                    navTitles={navTitles}
                    onSelect={goToHighlight}
                  />
                )}
              </div>
            )}
            {pageNotes.length > 0 && (
              <div className="reader-footer__notes">
                <button
                  type="button"
                  className={`reader-footer__notes-btn ${noteListOpen ? 'reader-footer__notes-btn--active' : ''}`}
                  onClick={() => {
                    setNoteListOpen((open) => !open)
                    setHighlightListOpen(false)
                  }}
                  aria-expanded={noteListOpen}
                  aria-haspopup="dialog"
                >
                  批注 {pageNotes.length}
                </button>
                {noteListOpen && <PageNoteList notes={pageNotes} onSelect={scrollToNote} />}
              </div>
            )}
          </div>
        )}
      </footer>

      {selection && (
        <SelectionToolbar
          x={selection.x}
          y={selection.y}
          colors={settings.highlightColors}
          onErase={handleErase}
          onHighlight={(c) => handleHighlight(c)}
          onAddNote={handleOpenNoteDialog}
          onClose={() => setSelection(null)}
        />
      )}

      {noteDialog && <AnnotationDialog onConfirm={handleConfirmNote} onCancel={handleCancelNote} />}

      {bubble && <AnnotationBubble x={bubble.x} y={bubble.y} note={bubble.note} />}
    </div>
  )
}

export { getPagePreview }
