import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { SearchResult } from './SearchBox'

interface SearchResultMarkerProps {
  result: SearchResult
  onAdd: () => void
  onClose: () => void
}

export function SearchResultMarker({ result, onAdd, onClose }: SearchResultMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: result.lat, lng: result.lng }}>
        <div className="search-pin">
          <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13 0C5.8 0 0 5.8 0 13c0 9.3 13 21 13 21s13-11.7 13-21C26 5.8 20.2 0 13 0z"
              fill="#ea580c"
            />
            <circle cx="13" cy="13" r="5.5" fill="white" />
          </svg>
        </div>
      </AdvancedMarker>
      {marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="popup-content">
            <div className="popup-title">{result.name || '검색된 위치'}</div>
            {result.address && <div className="popup-meta">{result.address}</div>}
            <div className="popup-actions">
              <button className="primary" onClick={onAdd}>
                여행지로 추가
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}
