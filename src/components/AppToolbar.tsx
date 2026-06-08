import type { CSSProperties, ReactNode } from 'react'

interface AppToolbarProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: 'default' | 'reader'
}

export function AppToolbar({
  children,
  className = '',
  style,
  variant = 'default'
}: AppToolbarProps): JSX.Element {
  const isDarwin = window.electronAPI?.platform === 'darwin'

  return (
    <header
      className={`app-toolbar app-toolbar--${variant} ${isDarwin ? 'app-toolbar--darwin' : ''} ${className}`}
      style={style}
    >
      {children}
    </header>
  )
}
