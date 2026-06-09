import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { HomePage } from './pages/Home'
import { ReaderPage } from './pages/Reader'
import { SettingsPage } from './pages/Settings'
import { AppToolbar } from './components/AppToolbar'
import { Toast } from './components/Toast'
import { useBooksStore, useSettingsStore, useReaderStore } from './stores'

function AppRoutes(): JSX.Element {
  const navigate = useNavigate()
  const loadBooks = useBooksStore((s) => s.loadBooks)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    loadBooks()
    loadSettings()
  }, [loadBooks, loadSettings])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/reader/:bookId" element={<ReaderRoute />} />
      <Route path="/settings" element={<SettingsWithBack />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ReaderRoute(): JSX.Element {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const books = useBooksStore((s) => s.books)
  const book = useReaderStore((s) => s.book)
  const setBook = useReaderStore((s) => s.setBook)

  useEffect(() => {
    if (!bookId) {
      navigate('/', { replace: true })
      return
    }
    if (book?.id === bookId) return

    const target = books.find((b) => b.id === bookId)
    if (target) {
      setBook(target)
      return
    }

    if (books.length > 0) {
      navigate('/', { replace: true })
    }
  }, [bookId, book, books, navigate, setBook])

  if (!bookId || !book || book.id !== bookId) {
    return (
      <div className="flex h-full items-center justify-center bg-stone-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  return <ReaderPage />
}

function SettingsWithBack(): JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <AppToolbar>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="app-toolbar__btn app-toolbar__btn--ghost text-indigo-600"
        >
          ← 返回书架
        </button>
        <span className="app-toolbar__title text-lg">设置</span>
      </AppToolbar>
      <div className="flex-1 overflow-hidden">
        <SettingsPage />
      </div>
    </div>
  )
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App render error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-stone-100 p-8 text-center">
          <p className="text-lg font-medium text-stone-700">应用渲染出错</p>
          <p className="max-w-md text-sm text-stone-500">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.replace('/')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white"
          >
            返回书架
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <div className="h-full">
          <AppRoutes />
          <Toast />
        </div>
      </BrowserRouter>
    </AppErrorBoundary>
  )
}
