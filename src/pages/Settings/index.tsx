import { useSettingsStore } from '../../stores'
import { THEME_ORDER, THEME_PRESETS } from '../../types'

export function SettingsPage(): JSX.Element {
  const { settings, updateSettings } = useSettingsStore()

  const handleBgImage = async () => {
    const path = await window.electronAPI.openImage()
    if (path) updateSettings({ backgroundImage: path })
  }

  return (
    <div className="flex h-full flex-col bg-stone-50">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
              阅读主题
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {THEME_ORDER.map((key) => {
                const t = THEME_PRESETS[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const preset = THEME_PRESETS[key]
                      updateSettings({ theme: key, backgroundColor: preset.bg, backgroundImage: '' })
                    }}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      settings.theme === key ? 'border-indigo-500' : 'border-stone-200'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
              字体大小
            </h2>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={12}
                max={36}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm text-stone-600">{settings.fontSize}px</span>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
              背景
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-stone-600">背景色</label>
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => updateSettings({ backgroundColor: e.target.value, backgroundImage: '' })}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBgImage}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-white"
                >
                  选择背景图
                </button>
                {settings.backgroundImage && (
                  <>
                    <span className="truncate text-xs text-stone-400">{settings.backgroundImage.split(/[/\\]/).pop()}</span>
                    <button
                      type="button"
                      onClick={() => updateSettings({ backgroundImage: '' })}
                      className="text-xs text-red-500"
                    >
                      清除
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
              自动翻页
            </h2>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoPageTurn}
                onChange={(e) => updateSettings({ autoPageTurn: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm text-stone-700">开启自动翻页</span>
            </label>
            {settings.autoPageTurn && (
              <div className="mt-3 flex items-center gap-4">
                <span className="text-sm text-stone-600">间隔</span>
                <input
                  type="range"
                  min={3}
                  max={60}
                  value={settings.autoPageTurnInterval}
                  onChange={(e) => updateSettings({ autoPageTurnInterval: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-stone-600">{settings.autoPageTurnInterval} 秒</span>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
              高亮颜色
            </h2>
            <div className="flex gap-2">
              {settings.highlightColors.map((color, i) => (
                <input
                  key={i}
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const colors = [...settings.highlightColors]
                    colors[i] = e.target.value
                    updateSettings({ highlightColors: colors })
                  }}
                  className="h-8 w-8 cursor-pointer rounded border-0"
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
