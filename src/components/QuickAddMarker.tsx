import { useState, type CSSProperties } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Category } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER } from '../types'
import { PlacePin } from './PlacePin'

export interface DraftLocation {
  lat: number
  lng: number
  name: string
  address?: string
}

interface QuickAddMarkerProps {
  draft: DraftLocation
  onSave: (name: string, category: Category) => void
  onCancel: () => void
}

export function QuickAddMarker({ draft, onSave, onCancel }: QuickAddMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const [name, setName] = useState(draft.name)
  const [category, setCategory] = useState<Category>('sight')

  const canSave = name.trim().length > 0

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: draft.lat, lng: draft.lng }}>
        <PlacePin color={CATEGORY_COLORS[category]} shape="pin" faded={false} />
      </AdvancedMarker>
      {marker && (
        <InfoWindow anchor={marker} onCloseClick={onCancel}>
          <div className="quick-add">
            <input
              className="quick-add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="장소 이름"
              autoFocus
            />
            <div className="quick-add-categories">
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={c === category ? 'category-dot active' : 'category-dot'}
                  style={{ '--dot-color': CATEGORY_COLORS[c] } as CSSProperties}
                  title={CATEGORY_LABELS[c]}
                  onClick={() => setCategory(c)}
                >
                  <span />
                </button>
              ))}
            </div>
            <div className="quick-add-actions">
              <button type="button" onClick={onCancel}>
                취소
              </button>
              <button
                type="button"
                className="primary"
                disabled={!canSave}
                onClick={() => onSave(name.trim(), category)}
              >
                저장
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}
