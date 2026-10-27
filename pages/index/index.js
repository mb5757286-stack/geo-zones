import geolocation from '@system.geolocation'
import vibrator from '@system.vibrator'
import zones from '../../zones.js'

function haversine(a, b) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function inPolygon(p, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].lng, yi = pts[i].lat
    const xj = pts[j].lng, yj = pts[j].lat
    const hit = ((yi > p.lat) !== (yj > p.lat)) &&
                (p.lng < (xj - xi) * (p.lat - yi) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

function findZone(p) {
  for (const z of zones) {
    if (z.type === 'circle' && haversine(p, z.center) <= z.radius) return z
    if (z.type === 'polygon' && inPolygon(p, z.points)) return z
  }
  return null
}

export default {
  data: {
    status: 'Ищу GPS...',
    detail: '',
    alert: false,
    zoneName: '',
    attempts: 0
  },
  onInit() {
    geolocation.subscribe({
      success: (ret) => {
        this.attempts++
        const p = { lat: ret.latitude, lng: ret.longitude }
        this.detail = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`
        const zone = findZone(p)
        if (zone) {
          if (!this.alert) vibrator.vibrate({ mode: 'long' })
          this.alert = true
          this.zoneName = zone.name
          this.status = 'ВНИМАНИЕ: ЗОНА'
        } else {
          this.alert = false
          this.zoneName = ''
          this.status = 'Безопасно'
        }
      },
      fail: (data, code) => {
        this.attempts++
        this.status = 'Нет GPS'
        this.detail = `ошибка ${code}: ${data}`
      }
    })
  },
  onDestroy() {
    geolocation.unsubscribe()
  }
}
