interface SelectionToolbarProps {
  x: number
  y: number
  colors: string[]
  onHighlight: (color: string) => void
  onAddNote: () => void
  onClose: () => void
}

export function SelectionToolbar({
  x,
  y,
  colors,
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
