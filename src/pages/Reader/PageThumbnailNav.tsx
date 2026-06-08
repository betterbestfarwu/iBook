import { useEffect, useRef } from 'react'
import { getPagePreview } from '../../utils/annotations'
import { stripChapterHeading } from '../../utils/chapters'
import { getChapterNumber } from '../../utils/progress'
import type { ReadMode } from '../../types'

interface PageThumbnailNavProps {
  visible: boolean
  topOffset: number
  pages: string[]
  navTitles: string[]
  readMode: ReadMode
  currentPage: number
  totalPages: number
  theme: { bg: string; text: string }
  fontSize: number
  onGoToPage: (page: number) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function PageThumbnailNav({
  visible,
  topOffset,
  pages,
  navTitles,
  readMode,
  currentPage,
  totalPages,
  theme,
  fontSize,
  onGoToPage,
  onMouseEnter,
  onMouseLeave
}: PageThumbnailNavProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const isChapterMode = readMode === 'chapter'
  const unitLabel = isChapterMode ? '章' : '页'

  useEffect(() => {
    if (visible && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [visible, currentPage])

  const count = Math.max(totalPages, pages.length)

  return (
    <aside
      className={`sidebar-enter fixed left-0 z-30 flex w-[130px] flex-col border-r shadow-xl ${visible ? 'visible' : ''}`}
      style={{
        top: topOffset,
        height: `calc(100% - ${topOffset}px)`,
        backgroundColor: theme.bg,
        color: theme.text,
        borderColor: `${theme.text}1a`
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div ref={listRef} className="scrollbar-hidden flex-1 overflow-y-auto p-2">
        {Array.from({ length: count }, (_, i) => {
          const text = pages[i]
          const isActive = i === currentPage
          const isLoading = text === undefined
          const title = navTitles[i]
          const label =
            isChapterMode && title ? title : `第 ${i + 1} ${unitLabel}`

          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              className="mx-auto mb-2 w-[110px]"
            >
              <button
                type="button"
                onClick={() => onGoToPage(i)}
                className={`thumbnail-item block w-full overflow-hidden rounded border-2 text-left ${
                  isActive ? 'active' : ''
                }`}
                style={{
                  borderColor: isActive ? undefined : `${theme.text}33`
                }}
              >
                <div
                  className="h-[140px] w-[110px] overflow-hidden p-2 font-serif leading-tight"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize
                  }}
                >
                  {isLoading ? (
                    <span style={{ opacity: 0.45 }}>加载中…</span>
                  ) : (
                    getPagePreview(
                      isChapterMode && title && title !== '前言'
                        ? stripChapterHeading(text)
                        : text,
                      110
                    )
                  )}
                </div>
              </button>
              <div
                className="mt-1 text-center text-[10px] leading-tight"
                style={{ color: theme.text, opacity: isChapterMode ? 0.85 : 0.55 }}
              >
                <div className="truncate px-0.5 font-medium" title={label}>
                  {label}
                </div>
                {isChapterMode && title && title !== '前言' ? (
                  <div style={{ opacity: 0.5 }}>第 {getChapterNumber(i, navTitles)} 章</div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
