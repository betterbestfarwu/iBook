import { useEffect, useRef, useState } from 'react'

interface AnnotationDialogProps {
  onConfirm: (note: string) => void
  onCancel: () => void
}

export function AnnotationDialog({ onConfirm, onCancel }: AnnotationDialogProps): JSX.Element {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="annotation-dialog-overlay" onMouseDown={onCancel}>
      <div className="annotation-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-labelledby="annotation-dialog-label">
        <label id="annotation-dialog-label" className="annotation-dialog__label">
          批注
        </label>
        <textarea
          ref={inputRef}
          className="annotation-dialog__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          placeholder="输入批注内容…"
        />
        <div className="annotation-dialog__actions">
          <button type="button" onClick={onCancel} className="annotation-dialog__btn annotation-dialog__btn--cancel">
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value.trim())}
            disabled={!value.trim()}
            className="annotation-dialog__btn annotation-dialog__btn--confirm"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
