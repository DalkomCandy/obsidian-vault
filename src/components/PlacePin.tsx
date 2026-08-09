import { useState, type ReactNode } from 'react'
import type { MarkerShape } from '../types'

interface PlacePinProps {
  color: string
  shape: MarkerShape
  faded: boolean
  scale?: number
  iconUrl?: string
  fadedOpacity?: number
  visitOrder?: number
}

/**
 * Colored circular badge (like Google's own POI pins) holding a
 * Google-provided icon in white. The icon itself is just a black glyph, so
 * it's rendered via a CSS mask -- once as the white glyph on top of the
 * colored circle, matching how our own vector Badge shapes already look.
 * A visually-hidden <img> of the same source still drives the fallback to
 * the vector shape if the icon somehow fails to load.
 */
function GoogleIconBadge({ iconUrl, color, onError }: { iconUrl: string; color: string; onError: () => void }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: color,
        border: '2px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          backgroundColor: 'white',
          // The data-URI SVGs contain unescaped single quotes (from their own
          // xmlns='...' attributes), which an unquoted url() token rejects
          // outright -- wrapping it in double quotes keeps it valid.
          WebkitMaskImage: `url("${iconUrl}")`,
          maskImage: `url("${iconUrl}")`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      <img
        src={iconUrl}
        alt=""
        onError={onError}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}

/** Colored circle badge with a white glyph inside — used for semantic (non-geometric) icons. */
function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" fill={color} stroke="white" strokeWidth="2" />
      <g fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  )
}

function ShapeSvg({ color, shape }: { color: string; shape: MarkerShape }) {
  switch (shape) {
    case 'bed':
      return (
        <Badge color={color}>
          <path d="M6 20v-7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M14 15h6a2 2 0 0 1 2 2v3" />
          <path d="M6 20v2M22 20v2" />
          <circle cx="9" cy="12.3" r="1.3" fill="white" stroke="none" />
        </Badge>
      )
    case 'cup':
      return (
        <Badge color={color}>
          <path d="M8 9h11l-1 8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3z" />
          <path d="M19 11h1.5a2 2 0 0 1 0 4H19" />
          <path d="M11 7c0-1 1-1 1-2M14 7c0-1 1-1 1-2" />
        </Badge>
      )
    case 'fork':
      return (
        <Badge color={color}>
          <path d="M10 6v6a2 2 0 0 0 4 0V6M12 6v16M18 6c-1.5 0-2 2-2 4s.5 3 2 3 2-1 2-3-.5-4-2-4zM18 13v9" />
        </Badge>
      )
    case 'bag':
      return (
        <Badge color={color}>
          <path d="M9 10V8a5 5 0 0 1 10 0v2" />
          <rect x="6" y="10" width="16" height="12" rx="2" />
        </Badge>
      )
    case 'camera':
      return (
        <Badge color={color}>
          <path d="M6 11a2 2 0 0 1 2-2h1.5l1-2h5l1 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
          <circle cx="14" cy="15" r="3" />
        </Badge>
      )
    case 'car':
      return (
        <Badge color={color}>
          <path d="M6 17v-3l2-5h12l2 5v3" />
          <path d="M6 17h16M9 17v2M19 17v2" />
          <circle cx="9.5" cy="17" r="1.3" fill="white" stroke="none" />
          <circle cx="18.5" cy="17" r="1.3" fill="white" stroke="none" />
        </Badge>
      )
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

export function PlacePin({
  color,
  shape,
  faded,
  scale = 1,
  iconUrl,
  fadedOpacity = 0.38,
  visitOrder,
}: PlacePinProps) {
  const [iconFailed, setIconFailed] = useState(false)
  const showGoogleIcon = Boolean(iconUrl) && !iconFailed

  return (
    <div
      style={{
        position: 'relative',
        opacity: faded ? fadedOpacity : 1,
        cursor: 'pointer',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'bottom center',
      }}
    >
      {showGoogleIcon ? (
        <GoogleIconBadge iconUrl={iconUrl!} color={color} onError={() => setIconFailed(true)} />
      ) : (
        <ShapeSvg color={color} shape={shape} />
      )}
      {visitOrder !== undefined && <span className="pin-order-badge">{visitOrder}</span>}
    </div>
  )
}
