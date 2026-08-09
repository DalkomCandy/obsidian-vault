import type { Place, SavedRoute, Trip } from '../types'
import { TRAVEL_MODE_COLOR, TRAVEL_MODE_LABELS, dayLabel } from '../types'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** KML wants aabbggrr, the reverse byte order of the #rrggbb we store. */
function kmlColor(hex: string): string {
  const rgb = hex.replace('#', '')
  if (rgb.length !== 6) return 'ff2563eb'
  return `ff${rgb.slice(4, 6)}${rgb.slice(2, 4)}${rgb.slice(0, 2)}`.toLowerCase()
}

function placemark(place: Place, categoryLabel: string): string {
  const description = [
    place.memo,
    place.linkUrl ? `참고: ${place.linkUrl}` : '',
    place.imageUrl ? `사진: ${place.imageUrl}` : '',
    `카테고리: ${categoryLabel}`,
    place.day !== undefined ? dayLabel(place.day) : '미배정',
  ]
    .filter(Boolean)
    .join('\n')

  return `    <Placemark>
      <name>${escapeXml(place.name)}</name>
      <description>${escapeXml(description)}</description>
      <Point><coordinates>${place.lng},${place.lat},0</coordinates></Point>
    </Placemark>`
}

function routePlacemark(route: SavedRoute, originName: string, destinationName: string): string {
  const coords = route.path.map((p) => `${p.lng},${p.lat},0`).join(' ')
  return `    <Placemark>
      <name>${escapeXml(`${originName} → ${destinationName} (${TRAVEL_MODE_LABELS[route.mode]} ${route.durationText})`)}</name>
      <Style><LineStyle><color>${kmlColor(TRAVEL_MODE_COLOR[route.mode])}</color><width>4</width></LineStyle></Style>
      <LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString>
    </Placemark>`
}

/**
 * Renders one trip as KML, grouped into a folder per day so it stays readable
 * when opened in Google My Maps (which imports KML but has no idea about our
 * categories or day assignments otherwise).
 */
export function buildTripKml(
  trip: Trip,
  places: Place[],
  routes: SavedRoute[],
  categoryLabels: Record<string, string>,
): string {
  const placeById = new Map(places.map((p) => [p.id, p]))
  const byDay = new Map<number | 'none', Place[]>()
  for (const place of places) {
    const key = place.day ?? 'none'
    const list = byDay.get(key) ?? []
    list.push(place)
    byDay.set(key, list)
  }

  const dayKeys = [...byDay.keys()].sort((a, b) => {
    if (a === 'none') return 1
    if (b === 'none') return -1
    return a - b
  })

  const folders = dayKeys.map((key) => {
    const list = byDay.get(key) ?? []
    const title = key === 'none' ? '미배정' : dayLabel(key)
    const marks = list.map((p) => placemark(p, categoryLabels[p.category] ?? '카테고리 없음')).join('\n')
    return `    <Folder>
      <name>${escapeXml(title)}</name>
${marks}
    </Folder>`
  })

  const routeMarks = routes
    .map((route) => {
      const origin = placeById.get(route.originId)
      const destination = placeById.get(route.destinationId)
      if (!origin || !destination) return ''
      return routePlacemark(route, origin.name, destination.name)
    })
    .filter(Boolean)

  const routeFolder = routeMarks.length
    ? `    <Folder>
      <name>저장된 경로</name>
${routeMarks.join('\n')}
    </Folder>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(`${trip.region} · ${trip.name}`)}</name>
${[...folders, routeFolder].filter(Boolean).join('\n')}
  </Document>
</kml>
`
}

/**
 * Chromium ignores an <a download> filename containing non-ASCII characters
 * on a blob: URL and saves the file as a bare "download" with no extension,
 * which Google My Maps then refuses to import. Korean trip names hit that
 * every time, so build an ASCII-safe name here and let the trip's real name
 * travel inside the KML's own <name> element instead.
 */
export function kmlFilename(trip: Trip): string {
  const ascii = `${trip.region}-${trip.name}`
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const base = ascii.length > 0 ? ascii : 'trip'
  return `${base}-${trip.date}.kml`
}

export function downloadKml(filename: string, kml: string): void {
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.kml') ? filename : `${filename}.kml`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
