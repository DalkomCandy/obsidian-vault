import { useState } from 'react'
import { isValidTime } from '../types'

interface TimeCellProps {
  value: string | undefined
  onChange: (time: string | undefined) => void
}

/**
 * Shows a stop's time as plain 24-hour text, and only becomes a real
 * <input type="time"> while being edited.
 *
 * A permanently-visible time input is the obvious implementation, but its
 * rendered format follows the browser locale rather than the stored value:
 * in an en-US locale "13:00" draws as "01:00 PM", and at sidebar widths the
 * AM/PM marker is clipped off entirely -- so an afternoon stop reads as one
 * in the small hours. Rendering the stored string ourselves keeps the list
 * unambiguous at any width, while the picker still appears (with the native
 * mobile wheel) the moment you tap it.
 */
export function TimeCell({ value, onChange }: TimeCellProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <input
        type="time"
        className="place-time-input editing"
        defaultValue={value ?? ''}
        autoFocus
        title="방문 시간"
        onBlur={(e) => {
          if (isValidTime(e.target.value)) onChange(e.target.value || undefined)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={value ? 'place-time-btn' : 'place-time-btn unset'}
      title="방문 시간 설정"
      onClick={() => setEditing(true)}
    >
      {value ?? '--:--'}
    </button>
  )
}
