import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

export interface SearchResult {
  name: string
  lat: number
  lng: number
  address?: string
}

interface SearchBoxProps {
  onPlaceSelected: (result: SearchResult) => void
}

export function SearchBox({ onPlaceSelected }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const placesLib = useMapsLibrary('places')
  const map = useMap()

  useEffect(() => {
    if (!placesLib || !inputRef.current || !map) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
    })
    autocomplete.bindTo('bounds', map)

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const location = place.geometry?.location
      if (!location) return

      map.panTo(location)
      map.setZoom(15)
      onPlaceSelected({
        name: place.name ?? '',
        lat: location.lat(),
        lng: location.lng(),
        address: place.formatted_address ?? '',
      })
      if (inputRef.current) inputRef.current.value = ''
    })

    return () => listener.remove()
  }, [placesLib, map, onPlaceSelected])

  return (
    <div className="search-box">
      <input ref={inputRef} type="text" placeholder="장소 검색 (예: 도쿄 타워)" />
    </div>
  )
}
