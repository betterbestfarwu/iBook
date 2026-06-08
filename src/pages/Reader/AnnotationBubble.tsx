interface AnnotationBubbleProps {
  x: number
  y: number
  note: string
}

export function AnnotationBubble({ x, y, note }: AnnotationBubbleProps): JSX.Element {
  return (
    <div
      className="pointer-events-none fixed z-[90] max-w-xs -translate-x-1/2 -translate-y-full"
      style={{ left: x, top: y }}
    >
      <div className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-white shadow-lg">
        {note}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-stone-800" />
      </div>
    </div>
  )
}
