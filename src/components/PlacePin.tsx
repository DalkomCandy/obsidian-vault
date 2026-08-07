import type { MarkerShape } from '../types'

interface PlacePinProps {
  color: string
  shape: MarkerShape
  faded: boolean
}

function ShapeSvg({ color, shape }: { color: string; shape: MarkerShape }) {
  switch (shape) {
    case 'star':
      return (
        <svg width="28" height="28" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13 0l3.5 9.2L26 10l-7 6.4L21 26l-8-5.3L5 26l2-9.6-7-6.4l9.5-.8z"
            fill={color}
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'heart':
      return (
        <svg width="28" height="26" viewBox="0 0 30 27" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 27S1 17.8 1 9.3C1 4.2 5.1 1 9.6 1c2.3 0 4.5 1.1 5.4 3 .9-1.9 3.1-3 5.4-3C25 1 29 4.2 29 9.3 29 17.8 15 27 15 27z"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      )
    case 'flag':
      return (
        <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="1" x2="3" y2="31" stroke={color} strokeWidth="3" />
          <path d="M3 3h17l-5.5 6L20 15H3z" fill={color} stroke="white" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      )
    case 'circle':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill={color} stroke="white" strokeWidth="2.5" />
        </svg>
      )
    case 'square':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="4" fill={color} stroke="white" strokeWidth="2" />
        </svg>
      )
    case 'diamond':
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="2"
            fill={color}
            stroke="white"
            strokeWidth="2"
            transform="rotate(45 12 12)"
          />
        </svg>
      )
    case 'triangle':
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L24 22H2z" fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 1h18v27l-9-6.5L2 28z"
            fill={color}
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'home':
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13 2L2 11v13h8v-8h6v8h8V11z"
            fill={color}
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'pin':
    default:
      return (
        <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13 0C5.8 0 0 5.8 0 13c0 9.3 13 21 13 21s13-11.7 13-21C26 5.8 20.2 0 13 0z"
            fill={color}
          />
          <circle cx="13" cy="13" r="5.5" fill="white" />
        </svg>
      )
  }
}

export function PlacePin({ color, shape, faded }: PlacePinProps) {
  return (
    <div style={{ opacity: faded ? 0.38 : 1, cursor: 'pointer' }}>
      <ShapeSvg color={color} shape={shape} />
    </div>
  )
}
