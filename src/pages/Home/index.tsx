import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppToolbar } from '../../components/AppToolbar'
import { BookCover } from '../../components/BookCover'
import { MoonIcon, PlusIcon, SettingsIcon, SunIcon, TrashIcon } from '../../components/icons'
import { useBooksStore, useToastStore, useReaderStore, useSettingsStore } from '../../stores'
import { useBookLoader } from '../../hooks/useBookLoader'
import { THEME_PRESETS } from '../../types'
import type { Book } from '../../types'

interface FlipState {
  book: Book
  rect: DOMRect
  phase: 'idle' | 'flipping' | 'loading' | 'done' | 'closing'
  progress: number
}

export function HomePage(): JSX.Element {
  const navigate = useNavigate()
  const { books, selectedIds, addBooks, removeSelected, toggleSelect, loadBooks } = useBooksStore()
  const { settings, updateSettings } = useSettingsStore()
  const showToast = useToastStore((s) => s.show)
  const isDarkMode = settings.theme === 'dark'
  const { loadBook } = useBookLoader()
  const resetReader = useReaderStore((s) => s.reset)

  const [flip, setFlip] = useState<FlipState | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const coverRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    void loadBooks()
  }, [loadBooks])

  const handleAddFiles = async (paths: string[]) => {
    if (!paths.length) return
    const result = await addBooks(paths)
    if (result.added.length) showToast(`已添加 ${result.added.length} 本书`, 'success')
    result.duplicates.forEach((title) => showToast(`《${title}》已存在`, 'error'))
    if (result.errors.length) showToast(`${result.errors.length} 个文件无法添加`, 'error')
  }

  const handleOpenDialog = async () => {
    const paths = await window.electronAPI.openFiles()
    await handleAddFiles(paths)
  }

  const toggleDarkMode = () => {
    const next = isDarkMode ? 'cream' : 'dark'
    const preset = THEME_PRESETS[next]
    void updateSettings({ theme: next, backgroundColor: preset.bg, backgroundImage: '' })
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => (f as File & { path?: string }).path)
      .filter(Boolean) as string[]
    await handleAddFiles(paths)
  }

  const openBook = useCallback(
    async (book: Book) => {
      const freshBook = useBooksStore.getState().books.find((b) => b.id === book.id) ?? book
      const el = coverRefs.current.get(book.id)
      const rect = el?.getBoundingClientRect() ?? new DOMRect(window.innerWidth / 2 - 100, 200, 200, 300)

      resetReader()
      setFlip({ book: freshBook, rect, phase: 'flipping', progress: 0 })

      setTimeout(() => {
        setFlip((f) => (f ? { ...f, phase: 'loading', progress: 20 } : null))
      }, 300)

      try {
        await loadBook(freshBook, () => {
          setFlip((f) => (f ? { ...f, progress: 100, phase: 'done' } : null))
          setTimeout(() => {
            navigate(`/reader/${book.id}`)
            setTimeout(() => setFlip(null), 400)
          }, 350)
        })
      } catch (err) {
        setFlip((f) => (f ? { ...f, phase: 'closing' } : null))
        setTimeout(() => setFlip(null), 650)
        showToast(err instanceof Error ? err.message : '无法打开书籍', 'error')
      }
    },
    [loadBook, navigate, resetReader, showToast]
  )

  return (
    <div
      className={`home-page flex h-full flex-col bg-gradient-to-br ${
        isDarkMode ? 'home-page--dark from-stone-900 to-black' : 'from-stone-100 to-stone-200'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <AppToolbar>
        <h1 className="app-toolbar__title text-lg">iBook 书架</h1>
        <div className="app-toolbar__actions">
          <button
            type="button"
            onClick={handleOpenDialog}
            className="app-toolbar__btn app-toolbar__btn--icon app-toolbar__btn--primary"
            title="添加"
            aria-label="添加"
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            onClick={() => removeSelected()}
            disabled={selectedIds.size === 0}
            className="app-toolbar__btn app-toolbar__btn--icon"
            title="删除"
            aria-label="删除"
          >
            <TrashIcon />
          </button>
          <div className="app-toolbar__divider" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`app-toolbar__btn app-toolbar__btn--icon ${isDarkMode ? 'app-toolbar__btn--active' : ''}`}
            title={isDarkMode ? '浅色模式' : '黑夜模式'}
            aria-label={isDarkMode ? '浅色模式' : '黑夜模式'}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="app-toolbar__btn app-toolbar__btn--icon"
            title="设置"
            aria-label="设置"
          >
            <SettingsIcon />
          </button>
        </div>
      </AppToolbar>

      <main
        className={`flex-1 overflow-y-auto p-8 transition-colors ${
          dragOver ? (isDarkMode ? 'bg-indigo-950/40' : 'bg-indigo-50/80') : ''
        }`}
      >
        {books.length === 0 ? (
          <div
            className={`flex h-full flex-col items-center justify-center ${
              isDarkMode ? 'text-stone-500' : 'text-stone-400'
            }`}
          >
            <p className="mb-2 text-lg">书架空空如也</p>
            <p className="text-sm">拖拽 TXT 文件到此处，或点击上方 + 按钮</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-8">
            {books.map((book) => (
              <BookCover
                key={book.id}
                book={book}
                selected={selectedIds.has(book.id)}
                onClick={() => openBook(book)}
                onToggleSelect={() => toggleSelect(book.id)}
                innerRef={(el) => {
                  if (el) coverRefs.current.set(book.id, el)
                  else coverRefs.current.delete(book.id)
                }}
              />
            ))}
          </div>
        )}
      </main>

      {flip && <BookFlipOverlay flip={flip} />}
    </div>
  )
}

function BookFlipOverlay({ flip }: { flip: FlipState }): JSX.Element {
  const { book, rect, phase, progress } = flip
  const isOpen = phase === 'flipping' || phase === 'loading' || phase === 'done'
  const isClosing = phase === 'closing'

  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const scaleX = 200 / rect.width
  const scaleY = 300 / rect.height

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="book-flip-scene"
        style={{
          width: isOpen || isClosing ? 280 : rect.width,
          height: isOpen || isClosing ? 420 : rect.height,
          transform: isOpen
            ? 'none'
            : `translate(${rect.left + rect.width / 2 - centerX}px, ${rect.top + rect.height / 2 - centerY}px) scale(${1 / scaleX}, ${1 / scaleY})`,
          transition: isOpen ? 'all 0.45s ease-out' : 'none'
        }}
      >
        <div
          className={`book-flip-inner relative h-full w-full ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? '' : ''}`}
          style={isClosing ? { transform: 'rotateY(0deg)', transition: 'transform 0.65s ease-in' } : undefined}
        >
          {/* Front - book cover */}
          <div
            className="book-face absolute inset-0 overflow-hidden rounded-md shadow-2xl"
            style={{
              background: `linear-gradient(145deg, hsl(${hashToHue(book.title)}, 45%, 35%), hsl(${hashToHue(book.title)}, 55%, 22%))`
            }}
          >
            <div className="absolute inset-y-0 left-0 w-4 bg-black/20" />
            <div className="flex h-full flex-col justify-center p-6 pl-8">
              <h2 className="font-serif text-2xl font-bold text-white">{book.title}</h2>
            </div>
          </div>

          {/* Back - loading state */}
          <div className="book-face back absolute inset-0 flex flex-col items-center justify-center rounded-md bg-stone-100 shadow-2xl">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mb-2 text-sm text-stone-600">
              {phase === 'done' ? '即将进入…' : '正在打开…'}
            </p>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function hashToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}
