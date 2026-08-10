import { useState } from 'react'
import { isValidTime } from '../types'

interface TimeCellProps {
  value: string | undefined
  onChange: (time: string | undefined) => void
}

/**
 * Shows a stop's time as plain 24-hour text, and only becomes a real
 * editable field while being edited.
 *
 * A permanently-visible native <input type="time"> is the obvious
 * implementation, but its rendered format follows the browser/OS locale
 * rather than the stored value -- in an en-US locale "13:00" draws as
 * "01:00 PM", and even while just editing (not only in read mode) that
 * picker's own internal UI shows AM/PM with no standard way to force 24h
 * display. A plain text field validated against the same HH:MM the app
 * stores everywhere else keeps it unambiguous regardless of locale.
 */
export function TimeCell({ value, onChange }: TimeCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  if (editing) {
    return (
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        maxLength={5}
        className="place-time-input editing"
        value={draft}
        autoFocus
        title="방문 시간 (24시간, 예: 18:30)"
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (isValidTime(draft)) onChange(draft || undefined)
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
      title="방문 시간 설정 (24시간, 예: 18:30)"
      onClick={() => {
        setDraft(value ?? '')
        setEditing(true)
      }}
    >
      {value ?? '--:--'}
    </button>
  )
}
