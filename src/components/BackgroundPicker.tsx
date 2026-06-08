import { useEffect, useRef, useState } from 'react'
import { THEME_ORDER, THEME_PRESETS, type ThemeKey } from '../types'

interface BackgroundPickerProps {
  theme: ThemeKey
  onSelect: (key: ThemeKey) => void
}

function MoonIcon(): JSX.Element {
  return (
    <svg className="bg-picker__moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function ThemeSwatch({ themeKey, size = 'md' }: { themeKey: ThemeKey; size?: 'md' | 'sm' }): JSX.Element {
  const preset = THEME_PRESETS[themeKey]
  return (
    <span
      className={`bg-picker__swatch ${size === 'sm' ? 'bg-picker__swatch--sm' : ''}`}
      style={{ backgroundColor: preset.bg }}
    >
      {preset.moon && <MoonIcon />}
    </span>
  )
}

export function BackgroundPicker({ theme, onSelect }: BackgroundPickerProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const handleSelect = (key: ThemeKey) => {
    onSelect(key)
    setOpen(false)
  }

  return (
    <div className="bg-picker" ref={rootRef}>
      <button
        type="button"
        className="bg-picker__btn"
        title="背景"
        aria-label="背景"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeSwatch themeKey={theme} />
      </button>
      {open && (
        <div className="bg-picker__menu" role="listbox" aria-label="选择背景">
          {THEME_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === theme}
              aria-label={THEME_PRESETS[key].name}
              className={`bg-picker__option ${key === theme ? 'bg-picker__option--active' : ''}`}
              onClick={() => handleSelect(key)}
            >
              <ThemeSwatch themeKey={key} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
