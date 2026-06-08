import type { Annotation } from '../../types'
import { getPagePreview } from '../../utils/annotations'

interface PageNoteListProps {
  notes: Annotation[]
  onSelect: (id: string) => void
}

export function PageNoteList({ notes, onSelect }: PageNoteListProps): JSX.Element {
  return (
    <div className="page-note-list" role="dialog" aria-label="本页批注列表">
      <div className="page-note-list__header">本页批注</div>
      {notes.length === 0 ? (
        <p className="page-note-list__empty">本页暂无批注</p>
      ) : (
        <ul className="page-note-list__items">
          {notes.map((note) => (
            <li key={note.id}>
              <button type="button" className="page-note-list__item" onClick={() => onSelect(note.id)}>
                <span className="page-note-list__quote">「{getPagePreview(note.text, 36)}」</span>
                {note.note && <span className="page-note-list__content">{note.note}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
