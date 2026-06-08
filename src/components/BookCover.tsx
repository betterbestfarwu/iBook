import type { Book } from '../types'
import { getReadPercent } from '../types'

interface BookCoverProps {
  book: Book
  selected?: boolean
  onClick?: () => void
  onToggleSelect?: () => void
  innerRef?: (el: HTMLDivElement | null) => void
  style?: React.CSSProperties
  className?: string
}

export function BookCover({
  book,
  selected,
  onClick,
  onToggleSelect,
  innerRef,
  style,
  className = ''
}: BookCoverProps): JSX.Element {
  const hue = hashToHue(book.title)
  const readPercent = getReadPercent(book)

  return (
    <div
      ref={innerRef}
      style={style}
      className={`group relative flex w-[200px] flex-col ${className}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        className={`relative h-[300px] w-[200px] cursor-pointer overflow-hidden rounded-md shadow-lg transition-transform duration-200 hover:scale-[1.03] hover:shadow-xl ${
          selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
        }`}
        style={{
          background: `linear-gradient(145deg, hsl(${hue}, 45%, 35%) 0%, hsl(${hue}, 55%, 22%) 100%)`
        }}
      >
        <div className="absolute inset-y-0 left-0 w-3 bg-black/20" />
        <div className="flex h-full flex-col justify-between p-5 pl-7">
          <span className="text-[10px] uppercase tracking-widest text-white/50">
            {book.format}
          </span>
          <h3 className="line-clamp-4 font-serif text-lg font-bold leading-snug text-white">
            {book.title}
          </h3>
          {book.lastReadPage > 0 && (
            <span className="text-xs text-white/60">
              读到第 {book.lastReadPage + 1} {book.readMode === 'chapter' ? '章' : '页'}
              {readPercent !== null && (
                <span className="ml-1.5 tabular-nums">{readPercent}%</span>
              )}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect?.()
        }}
        className={`mt-2 self-center rounded px-2 py-0.5 text-xs transition-colors ${
          selected ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {selected ? '已选' : '选择'}
      </button>
    </div>
  )
}

function hashToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}
