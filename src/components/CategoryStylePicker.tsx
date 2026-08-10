import type { Category } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { StylePicker } from './StylePicker'

interface CategoryStylePickerProps {
  category: Category
  onClose: () => void
}

export function CategoryStylePicker({ category, onClose }: CategoryStylePickerProps) {
  const current = usePlaceStore((s) => s.categoryStyles[category])
  const setCategoryStyle = usePlaceStore((s) => s.setCategoryStyle)

  return (
    <StylePicker
      initial={current}
      applyLabel="이 카테고리 전체에 적용"
      onApply={(style) => {
        setCategoryStyle(category, style)
        onClose()
      }}
      onClose={onClose}
    />
  )
}
