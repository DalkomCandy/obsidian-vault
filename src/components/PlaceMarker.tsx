import { useState } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Place } from '../types'
import { FALLBACK_CATEGORY_LABEL, FALLBACK_CATEGORY_STYLE } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'
import { applySummaryToMemo, matchCategoryId, summarizePlace } from '../lib/ollama'

interface PlaceMarkerProps {
  place: Place
  faded: boolean
  isOpen: boolean
  onMarkerClick: () => void
  onOpenChange: (open: boolean) => void
  onEditPlace: (place: Place) => void
  onRouteFrom: (place: Place) => void
}

export function PlaceMarker({
  place,
  faded,
  isOpen,
  onMarkerClick,
  onOpenChange,
  onEditPlace,
  onRouteFrom,
}: PlaceMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const removePlace = usePlaceStore((s) => s.removePlace)
  const updatePlace = usePlaceStore((s) => s.updatePlace)
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place.tripId))
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const style = usePlaceStore((s) => s.categoryStyles[place.category]) ?? FALLBACK_CATEGORY_STYLE
  const iconScale = usePlaceStore((s) => s.iconScale)
  const fadedOpacity = usePlaceStore((s) => s.fadedOpacity)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const handleAiSummarize = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const summary = await summarizePlace(place.name, place.memo || undefined, Object.values(categoryLabels))
      const matchedCategory = matchCategoryId(summary.category, categoryLabels)
      updatePlace(place.id, {
        memo: applySummaryToMemo(place.memo, summary),
        ...(matchedCategory ? { category: matchedCategory } : {}),
      })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: place.lat, lng: place.lng }} onClick={onMarkerClick}>
        <PlacePin
          color={style.color}
          shape={style.shape}
          iconUrl={style.iconUrl}
          faded={faded}
          scale={iconScale}
          fadedOpacity={fadedOpacity}
        />
      </AdvancedMarker>
      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => onOpenChange(false)}>
          <div className="popup-content">
            <div className="popup-title">{place.name}</div>
            <div className="popup-meta">
              {categoryLabels[place.category] ?? FALLBACK_CATEGORY_LABEL}
              {trip && ` · ${trip.region} · ${trip.name}`}
            </div>
            {place.memo && <div className="popup-memo">{place.memo}</div>}
            {aiError && <div className="popup-ai-error">{aiError}</div>}
            <div className="popup-actions">
              <button onClick={() => onRouteFrom(place)}>경로</button>
              <button onClick={() => onEditPlace(place)}>수정</button>
              <button onClick={handleAiSummarize} disabled={aiLoading}>
                {aiLoading ? <span className="btn-spinner" role="status" aria-label="AI 정리 중" /> : '🤖 AI 정리'}
              </button>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`"${place.name}"을(를) 삭제할까요?`)) removePlace(place.id)
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}
