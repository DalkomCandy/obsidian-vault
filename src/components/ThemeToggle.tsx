import { useTheme, type ThemeMode } from '../hooks/useTheme'

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-toggle">
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          className={theme === mode ? 'theme-toggle-btn active' : 'theme-toggle-btn'}
          onClick={() => setTheme(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
