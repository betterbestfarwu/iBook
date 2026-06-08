import type { Annotation } from '../../types'
import { getPagePreview } from '../../utils/annotations'

interface HighlightListProps {
  highlights: Annotation[]
  navTitles: string[]
  onSelect: (highlight: Annotation) => void
}

export function HighlightList({ highlights, navTitles, onSelect }: HighlightListProps): JSX.Element {
  return (
    <div className="page-note-list" role="dialog" aria-label="高亮列表">
      <div className="page-note-list__header">全部高亮</div>
      {highlights.length === 0 ? (
        <p className="page-note-list__empty">暂无高亮</p>
      ) : (
        <ul className="page-note-list__items">
          {highlights.map((highlight) => {
            const chapterTitle = navTitles[highlight.page]
            return (
              <li key={highlight.id}>
                <button
                  type="button"
                  className="page-note-list__item highlight-list__item"
                  onClick={() => onSelect(highlight)}
                >
                  <span
                    className="highlight-list__swatch"
                    style={{ backgroundColor: highlight.color }}
                    aria-hidden="true"
                  />
                  <span className="highlight-list__body">
                    {chapterTitle && <span className="highlight-list__chapter">{chapterTitle}</span>}
                    <span className="page-note-list__quote">「{getPagePreview(highlight.text, 36)}」</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
