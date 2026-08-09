import { useState } from 'react'
import type { Category, Place } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

export interface PlaceDraft {
  id: string
  name: string
  lat: number
  lng: number
  category: Category
  memo: string
  imageUrl: string
  linkUrl: string
  time: string
}

interface PlaceFormProps {
  draft: PlaceDraft
  onSave: (draft: PlaceDraft) => void
  onCancel: () => void
}

export function PlaceForm({ draft, onSave, onCancel }: PlaceFormProps) {
  const [name, setName] = useState(draft.name)
  const [category, setCategory] = useState<Category>(draft.category)
  const [memo, setMemo] = useState(draft.memo)
  const [imageUrl, setImageUrl] = useState(draft.imageUrl)
  const [linkUrl, setLinkUrl] = useState(draft.linkUrl)
  const [time, setTime] = useState(draft.time)

  const place = usePlaceStore((s) => s.places.find((p) => p.id === draft.id))
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place?.tripId))
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const style = usePlaceStore((s) => s.categoryStyles[category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      ...draft,
      name: name.trim(),
      category,
      memo: memo.trim(),
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim(),
      time,
    })
  }

  return (
    <div className="form-overlay" onClick={onCancel}>
      <form className="place-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>여행지 수정</h3>
        {trip && (
          <p className="form-trip-label">
            {trip.region} · {trip.name}
          </p>
        )}

        <label>
          이름
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <div className="icon-picker">
          <div className="icon-preview">
            <PlacePin color={style.color} shape={style.shape} iconUrl={style.iconUrl} faded={false} />
          </div>
          <label className="icon-picker-controls">
            카테고리
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOrder.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </select>
            <span className="icon-picker-hint">
              색/아이콘은 사이드바의 카테고리 🎨 버튼으로 한 번에 바꿀 수 있어요.
            </span>
          </label>
        </div>

        <label>
          방문 시간
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>

        <label>
          메모
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="메모 (선택)" />
        </label>

        <label>
          사진 주소
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… (선택)"
          />
        </label>

        <label>
          참고 링크
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="블로그/예약 페이지 주소 (선택)"
          />
        </label>

        {imageUrl.trim() && (
          <img className="place-form-preview" src={imageUrl.trim()} alt="" onError={(e) => e.currentTarget.classList.add('broken')} />
        )}

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
    category: place.category,
    memo: place.memo,
    imageUrl: place.imageUrl ?? '',
    linkUrl: place.linkUrl ?? '',
    time: place.time ?? '',
  }
}
