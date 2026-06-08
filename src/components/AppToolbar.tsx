import { forwardRef, type CSSProperties, type ReactNode } from 'react'

interface AppToolbarProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: 'default' | 'reader'
}

export const AppToolbar = forwardRef<HTMLElement, AppToolbarProps>(function AppToolbar(
  { children, className = '', style, variant = 'default' },
  ref
) {
  const isDarwin = window.electronAPI?.platform === 'darwin'

  return (
    <header
      ref={ref}
      className={`app-toolbar app-toolbar--${variant} ${isDarwin ? 'app-toolbar--darwin' : ''} ${className}`}
      style={style}
    >
      {isDarwin && <div className="app-toolbar__window-controls" aria-hidden="true" />}
      <div className="app-toolbar__inner">{children}</div>
    </header>
  )
})
