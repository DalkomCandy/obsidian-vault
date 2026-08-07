import { useState, type CSSProperties } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Category } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { useIconScale } from '../hooks/useIconScale'
import { PlacePin } from './PlacePin'

export interface DraftLocation {
  lat: number
  lng: number
  name: string
  address?: string
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
}

interface QuickAddMarkerProps {
  draft: DraftLocation
  defaultCategory: Category
  onSave: (category: Category) => void
  onCancel: () => void
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating)
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? 'star filled' : 'star'}>
          ★
        </span>
      ))}
    </span>
  )
}

export function QuickAddMarker({ draft, defaultCategory, onSave, onCancel }: QuickAddMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const [category, setCategory] = useState<Category>(defaultCategory)
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const categoryStyles = usePlaceStore((s) => s.categoryStyles)
  const { iconScale } = useIconScale()
  const style = categoryStyles[category]

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: draft.lat, lng: draft.lng }}>
        <PlacePin color={style.color} shape={style.shape} faded={false} scale={iconScale} />
      </AdvancedMarker>
      {marker && (
        <InfoWindow anchor={marker} onCloseClick={onCancel}>
          <div className="quick-add">
            <div className="quick-add-name">{draft.name || '(이름 없음)'}</div>

            {draft.rating != null && (
              <div className="quick-add-rating">
                <StarRating rating={draft.rating} />
                <span className="quick-add-rating-value">{draft.rating.toFixed(1)}</span>
                {draft.userRatingCount != null && (
                  <span className="quick-add-rating-count">({draft.userRatingCount.toLocaleString()})</span>
                )}
              </div>
            )}

            {draft.address && <div className="quick-add-address">{draft.address}</div>}

            {draft.googleMapsUri && (
              <a
                className="quick-add-gmaps-link"
                href={draft.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google 지도에서 보기 ↗
              </a>
            )}

            <div className="quick-add-categories">
              {categoryOrder.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={c === category ? 'category-dot active' : 'category-dot'}
                  style={{ '--dot-color': categoryStyles[c].color } as CSSProperties}
                  title={categoryLabels[c]}
                  onClick={() => setCategory(c)}
                >
                  <span />
                </button>
              ))}
            </div>
            <div className="quick-add-actions">
              <button type="button" className="primary" onClick={() => onSave(category)}>
                저장
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}
