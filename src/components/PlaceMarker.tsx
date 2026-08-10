import { useState } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Place } from '../types'
import { FALLBACK_CATEGORY_LABEL, FALLBACK_CATEGORY_STYLE, googleMapsNavigationUrl, googleMapsViewUrl } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'
import { PopupClose } from './PopupClose'
import { applySummaryToMemo, matchCategoryId, summarizePlace } from '../lib/ollama'

interface PlaceMarkerProps {
  place: Place
  /** Position in the focused day's plan, drawn as a badge on the pin. */
  visitOrder?: number
  faded: boolean
  isOpen: boolean
  onMarkerClick: () => void
  onOpenChange: (open: boolean) => void
  onEditPlace: (place: Place) => void
  onEditStyle: (place: Place) => void
  onRouteFrom: (place: Place) => void
}

export function PlaceMarker({
  place,
  visitOrder,
  faded,
  isOpen,
  onMarkerClick,
  onOpenChange,
  onEditPlace,
  onEditStyle,
  onRouteFrom,
}: PlaceMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const deletePlaceWithUndo = usePlaceStore((s) => s.deletePlaceWithUndo)
  const duplicatePlace = usePlaceStore((s) => s.duplicatePlace)
  const updatePlace = usePlaceStore((s) => s.updatePlace)
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place.tripId))
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const categoryStyle = usePlaceStore((s) => s.categoryStyles[place.category]) ?? FALLBACK_CATEGORY_STYLE
  // A place-level override takes over from the category's style entirely
  // (not merged field-by-field) -- picking one always sets color+shape+icon
  // together, so there's no risk of an override with a stale icon from a
  // since-changed category style.
  const style = place.style ?? categoryStyle
  const iconScale = usePlaceStore((s) => s.iconScale)
  const fadedOpacity = usePlaceStore((s) => s.fadedOpacity)
  const showPlaceLabels = usePlaceStore((s) => s.showPlaceLabels)
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
          visitOrder={visitOrder}
          label={showPlaceLabels ? place.name : undefined}
        />
      </AdvancedMarker>
      {isOpen && marker && (
        <InfoWindow anchor={marker} headerDisabled onCloseClick={() => onOpenChange(false)}>
          <div className="popup-content">
            <PopupClose onClick={() => onOpenChange(false)} />
            <a
              className="popup-title popup-title-link"
              href={googleMapsViewUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              title="Google 지도에서 보기"
            >
              {place.name}
            </a>
            <div className="popup-meta">
              {place.time && <span className="popup-time">{place.time}</span>}
              {categoryLabels[place.category] ?? FALLBACK_CATEGORY_LABEL}
              {trip && ` · ${trip.region} · ${trip.name}`}
            </div>
            {place.imageUrl && (
              <img
                className="popup-photo"
                src={place.imageUrl}
                alt=""
                onError={(e) => e.currentTarget.remove()}
              />
            )}
            {place.memo && <div className="popup-memo">{place.memo}</div>}
            {place.linkUrl && (
              <a className="popup-link" href={place.linkUrl} target="_blank" rel="noopener noreferrer">
                참고 링크 열기 ↗
              </a>
            )}
            {aiError && <div className="popup-ai-error">{aiError}</div>}
            <div className="popup-actions">
              {/* Hands off to the Google Maps app for real turn-by-turn
                  walking directions from wherever you're standing. */}
              <a
                className="popup-action-link primary"
                href={googleMapsNavigationUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
              >
                길찾기
              </a>
              <button onClick={() => onRouteFrom(place)}>경로</button>
              <button onClick={() => onEditPlace(place)}>수정</button>
              <button
                title={place.style ? '이 장소만의 색/모양/아이콘 (지정됨)' : '이 장소만 카테고리와 다른 색/모양/아이콘 지정'}
                onClick={() => onEditStyle(place)}
              >
                🎨
              </button>
              <button
                title="숙소처럼 여러 번 들를 곳이나 두 번째 방문을 위해 복사본을 만들어요"
                onClick={() => {
                  const copy = duplicatePlace(place.id)
                  onOpenChange(false)
                  if (copy) onEditPlace(copy)
                }}
              >
                복제
              </button>
              <button onClick={handleAiSummarize} disabled={aiLoading}>
                {aiLoading ? <span className="btn-spinner" role="status" aria-label="AI 정리 중" /> : '🤖 AI 정리'}
              </button>
              <button
                className="danger"
                onClick={() => {
                  onOpenChange(false)
                  deletePlaceWithUndo(place.id)
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
