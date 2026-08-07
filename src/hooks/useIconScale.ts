import { useState } from 'react'

export const ICON_SCALE_OPTIONS = [0.75, 1, 1.3, 1.6] as const
export type IconScale = (typeof ICON_SCALE_OPTIONS)[number]

const ICON_SCALE_KEY = 'travel-map.iconScale'
const DEFAULT_SCALE: IconScale = 1

function loadIconScale(): IconScale {
  const stored = Number(localStorage.getItem(ICON_SCALE_KEY))
  return (ICON_SCALE_OPTIONS as readonly number[]).includes(stored) ? (stored as IconScale) : DEFAULT_SCALE
}

export function useIconScale() {
  const [iconScale, setIconScaleState] = useState<IconScale>(loadIconScale)

  const setIconScale = (scale: IconScale) => {
    localStorage.setItem(ICON_SCALE_KEY, String(scale))
    setIconScaleState(scale)
  }

  return { iconScale, setIconScale }
}
