import { EraserIcon } from '../../components/icons'

interface SelectionToolbarProps {
  x: number
  y: number
  colors: string[]
  onErase: () => void
  onHighlight: (color: string) => void
  onAddNote: () => void
  onClose: () => void
}

export function SelectionToolbar({
  x,
  y,
  colors,
  onErase,
  onHighlight,
  onAddNote,
  onClose
}: SelectionToolbarProps): JSX.Element {
  return (
    <div
      className="selection-toolbar"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" title="抹除" onClick={onErase} className="selection-toolbar__icon">
        <EraserIcon className="h-4 w-4" />
      </button>
      <div className="selection-toolbar__divider" />
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          title="高亮"
          onClick={() => onHighlight(color)}
          className="selection-toolbar__color"
          style={{ backgroundColor: color }}
        />
      ))}
      <div className="selection-toolbar__divider" />
      <button type="button" onClick={onAddNote} className="selection-toolbar__action">
        批注
      </button>
      <button type="button" onClick={onClose} className="selection-toolbar__close">
        ✕
      </button>
    </div>
  )
}
