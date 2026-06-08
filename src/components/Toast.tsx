import { useEffect } from 'react'
import { useToastStore } from '../stores'

export function Toast(): JSX.Element | null {
  const { message, type, visible } = useToastStore()

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => useToastStore.getState().hide(), 3200)
    return () => clearTimeout(t)
  }, [visible, message])

  if (!visible || !message) return null

  const colors = {
    info: 'bg-slate-800 text-white',
    error: 'bg-red-600 text-white',
    success: 'bg-emerald-600 text-white'
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 toast-enter">
      <div className={`rounded-lg px-5 py-3 text-sm shadow-lg ${colors[type]}`}>{message}</div>
    </div>
  )
}
