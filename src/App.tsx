import { useEffect } from 'react'
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
  const book = useReaderStore((s) => s.book)

  useEffect(() => {
    if (!book || book.id !== bookId) {
      navigate('/', { replace: true })
    }
  }, [book, bookId, navigate])

  return <ReaderPage />
}

function SettingsWithBack(): JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <AppToolbar>
        <span className="app-toolbar__title text-lg">设置</span>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="app-toolbar__btn app-toolbar__btn--ghost text-indigo-600"
        >
          ← 返回书架
        </button>
      </AppToolbar>
      <div className="flex-1 overflow-hidden">
        <SettingsPage />
      </div>
    </div>
  )
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="h-full">
        <AppRoutes />
        <Toast />
      </div>
    </BrowserRouter>
  )
}
