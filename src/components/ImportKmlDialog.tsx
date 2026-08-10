import { useState } from 'react'
import type { Category } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { parseKmlPlaces, type ParsedKmlPlace } from '../lib/importKml'

interface ImportKmlDialogProps {
  targetTripId: string
  defaultCategory: Category
  onClose: () => void
  onImported: (count: number) => void
}

/** Reads placemarks out of a .kml file (ours, or one from Google My Maps) and adds them as places. */
export function ImportKmlDialog({ targetTripId, defaultCategory, onClose, onImported }: ImportKmlDialogProps) {
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const addPlace = usePlaceStore((s) => s.addPlace)

  const [parsed, setParsed] = useState<ParsedKmlPlace[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [category, setCategory] = useState<Category>(defaultCategory)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setFileError(null)
    try {
      const text = await file.text()
      const places = parseKmlPlaces(text)
      if (places.length === 0) {
        setFileError('이 파일에서 가져올 수 있는 장소를 찾지 못했어요.')
        setParsed(null)
        return
      }
      setParsed(places)
      setSelected(new Set(places.map((_, i) => i)))
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'KML 파일을 읽지 못했어요.')
      setParsed(null)
    }
  }

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleImport = () => {
    if (!parsed) return
    let added = 0
    for (const index of selected) {
      const place = parsed[index]
      if (!place) continue
      addPlace({
        tripId: targetTripId,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        category,
        memo: place.description ?? '',
      })
      added += 1
    }
    onImported(added)
    onClose()
  }

  return (
    <div className="form-overlay" onClick={onClose}>
      <div className="place-form" onClick={(e) => e.stopPropagation()}>
        <h3>KML 파일에서 가져오기</h3>
        <p className="form-trip-label">Google 내 지도 등에서 내보낸 .kml 파일의 장소를 이 여행에 추가해요.</p>

        <input
          type="file"
          accept=".kml,application/vnd.google-earth.kml+xml"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        {fileError && <p className="form-error">{fileError}</p>}

        {parsed && (
          <>
            <label>
              가져올 카테고리
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categoryOrder.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            <div className="import-toolbar">
              <span>{selected.size}개 선택됨</span>
              <button
                type="button"
                onClick={() =>
                  setSelected(selected.size === parsed.length ? new Set() : new Set(parsed.map((_, i) => i)))
                }
              >
                {selected.size === parsed.length && parsed.length > 0 ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            <div className="import-list">
              {parsed.map((place, i) => (
                <label key={i} className="import-row">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                  <span className="import-row-name">{place.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={!parsed || selected.size === 0} onClick={handleImport}>
            가져오기
          </button>
        </div>
      </div>
    </div>
  )
}
