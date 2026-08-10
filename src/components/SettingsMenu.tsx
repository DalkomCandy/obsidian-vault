import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { IconSizeControl } from './IconSizeControl'
import { FadedOpacityControl } from './FadedOpacityControl'
import { LocationControl } from './LocationControl'
import { PlaceLabelControl } from './PlaceLabelControl'
import { DiagnosticsPanel } from './DiagnosticsPanel'
import { AccountControl } from './AccountControl'
import type { LocationStatus } from '../hooks/useCurrentLocation'

interface SettingsMenuProps {
  locationActive: boolean
  locationStatus: LocationStatus
  onToggleLocation: () => void
}

export function SettingsMenu({ locationActive, locationStatus, onToggleLocation }: SettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="settings-menu" ref={containerRef}>
      <button
        type="button"
        className="settings-menu-btn"
        title="설정"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙️
      </button>
      {open && (
        <div className="settings-menu-panel">
          <div className="settings-menu-section">
            <span className="settings-menu-label">테마</span>
            <ThemeToggle />
          </div>
          <div className="settings-menu-section">
            <IconSizeControl />
          </div>
          <div className="settings-menu-section">
            <FadedOpacityControl />
          </div>
          <div className="settings-menu-section">
            <PlaceLabelControl />
          </div>
          <div className="settings-menu-section">
            <LocationControl active={locationActive} status={locationStatus} onToggle={onToggleLocation} />
          </div>
          <div className="settings-menu-section">
            <AccountControl />
          </div>
          <div className="settings-menu-section">
            <DiagnosticsPanel />
          </div>
        </div>
      )}
    </div>
  )
}
