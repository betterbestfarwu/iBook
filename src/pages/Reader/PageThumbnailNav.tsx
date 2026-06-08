import { useEffect, useRef } from 'react'
import { getPagePreview } from '../../utils/annotations'

interface PageThumbnailNavProps {
  visible: boolean
  pages: string[]
  currentPage: number
  totalPages: number
  theme: { bg: string; text: string }
  fontSize: number
  onNavigateHome: () => void
  onGoToPage: (page: number) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function PageThumbnailNav({
  visible,
  pages,
  currentPage,
  totalPages,
  theme,
  fontSize,
  onNavigateHome,
  onGoToPage,
  onMouseEnter,
  onMouseLeave
}: PageThumbnailNavProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (visible && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [visible, currentPage])

  const count = Math.max(totalPages, pages.length)

  return (
    <aside
      className={`sidebar-enter fixed left-0 top-0 z-30 flex h-full w-[200px] flex-col border-r border-black/10 bg-white/95 shadow-xl backdrop-blur ${visible ? 'visible' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        onClick={onNavigateHome}
        className="flex h-10 shrink-0 items-center gap-2 border-b border-black/10 px-3 text-sm text-stone-700 hover:bg-stone-100"
      >
        <span>←</span>
        <span>返回主页</span>
      </button>

      <div ref={listRef} className="flex-1 overflow-y-auto p-2">
        {Array.from({ length: count }, (_, i) => {
          const text = pages[i]
          const isActive = i === currentPage
          const isLoading = text === undefined

          return (
            <button
              key={i}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onGoToPage(i)}
              className={`thumbnail-item mb-2 w-full overflow-hidden rounded border-2 text-left ${
                isActive ? 'active border-indigo-500' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div
                className="h-[110px] overflow-hidden p-2 font-serif leading-tight"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize
                }}
              >
                {isLoading ? (
                  <span className="text-stone-400">加载中…</span>
                ) : (
                  getPagePreview(text, 100)
                )}
              </div>
              <div className="bg-stone-50 px-2 py-1 text-center text-[10px] text-stone-500">
                第 {i + 1} 页
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
