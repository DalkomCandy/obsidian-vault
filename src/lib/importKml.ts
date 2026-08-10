export interface ParsedKmlPlace {
  name: string
  lat: number
  lng: number
  description?: string
}

/**
 * Pulls point placemarks out of a KML file (our own export, or one from
 * Google My Maps/Earth). Folders nest arbitrarily deep, so this walks every
 * Placemark in the document rather than assuming a particular structure --
 * only <Point> ones are kept, since LineString placemarks (routes) have no
 * single coordinate to place a marker at.
 */
export function parseKmlPlaces(xmlText: string): ParsedKmlPlace[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('KML 파일을 읽을 수 없어요. 파일이 올바른 KML 형식인지 확인해주세요.')
  }

  const places: ParsedKmlPlace[] = []
  for (const placemark of Array.from(doc.getElementsByTagName('Placemark'))) {
    const coordinatesText = placemark.getElementsByTagName('Point')[0]?.getElementsByTagName('coordinates')[0]
      ?.textContent
    if (!coordinatesText) continue

    const [lngText, latText] = coordinatesText.trim().split(',')
    const lng = Number(lngText)
    const lat = Number(latText)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const name = placemark.getElementsByTagName('name')[0]?.textContent?.trim() || '이름 없음'
    const description = placemark.getElementsByTagName('description')[0]?.textContent?.trim() || undefined
    places.push({ name, lat, lng, description })
  }
  return places
}
