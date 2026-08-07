import { useState } from 'react'
import type { Category, Place } from '../types'
import { CATEGORY_LABELS } from '../types'

export interface PlaceDraft {
  id?: string
  name: string
  lat: number
  lng: number
  region: string
  category: Category
  memo: string
  visited: boolean
}

interface PlaceFormProps {
  draft: PlaceDraft
  existingRegions: string[]
  onSave: (draft: PlaceDraft) => void
  onCancel: () => void
}

export function PlaceForm({ draft, existingRegions, onSave, onCancel }: PlaceFormProps) {
  const [name, setName] = useState(draft.name)
  const [region, setRegion] = useState(draft.region)
  const [category, setCategory] = useState<Category>(draft.category)
  const [memo, setMemo] = useState(draft.memo)
  const [visited, setVisited] = useState(draft.visited)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !region.trim()) return
    onSave({ ...draft, name: name.trim(), region: region.trim(), category, memo: memo.trim(), visited })
  }

  return (
    <div className="form-overlay" onClick={onCancel}>
      <form className="place-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>{draft.id ? '여행지 수정' : '여행지 추가'}</h3>

        <label>
          이름
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 경복궁"
            required
          />
        </label>

        <label>
          지역
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="예: 서울"
            list="region-suggestions"
            required
          />
          <datalist id="region-suggestions">
            {existingRegions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label>
          카테고리
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          메모
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="메모 (선택)" />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} />
          이미 방문한 곳이에요
        </label>

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="primary">
            저장
          </button>
        </div>
      </form>
    </div>
  )
}

export function draftFromPlace(place: Place): PlaceDraft {
  return {
    id: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    region: place.region,
    category: place.category,
    memo: place.memo,
    visited: place.visited,
  }
}
