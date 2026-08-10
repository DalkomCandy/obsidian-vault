import type { Place } from '../types'
import { FALLBACK_CATEGORY_STYLE } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { StylePicker } from './StylePicker'

interface PlaceStylePickerProps {
  place: Place
  onClose: () => void
}

/** Overrides one place's marker style independent of its category's -- falls back to (and can revert to) the category's style. */
export function PlaceStylePicker({ place, onClose }: PlaceStylePickerProps) {
  const categoryStyle = usePlaceStore((s) => s.categoryStyles[place.category]) ?? FALLBACK_CATEGORY_STYLE
  const setPlaceStyle = usePlaceStore((s) => s.setPlaceStyle)
  const clearPlaceStyle = usePlaceStore((s) => s.clearPlaceStyle)

  return (
    <StylePicker
      initial={place.style ?? categoryStyle}
      applyLabel="이 장소에만 적용"
      onApply={(style) => {
        setPlaceStyle(place.id, style)
        onClose()
      }}
      onClose={onClose}
      extraAction={
        place.style
          ? {
              label: '카테고리 기본값으로 되돌리기',
              onClick: () => {
                clearPlaceStyle(place.id)
                onClose()
              },
            }
          : undefined
      }
    />
  )
}
