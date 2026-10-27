// Геометрия запретных зон. Чистый JS, без системных API.
// Зона: { name, type: 'poly', pts: [[lat, lon], ...] } или { name, type: 'circle', c: [lat, lon], r: метры }

function distanceM(lat1, lon1, lat2, lon2) {
  var R = 6371000
  var toRad = Math.PI / 180
  var dLat = (lat2 - lat1) * toRad
  var dLon = (lon2 - lon1) * toRad
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Луч вправо: сколько раз пересекли границу многоугольника
function inPolygon(lat, lon, pts) {
  var inside = false
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    var yi = pts[i][0], xi = pts[i][1]
    var yj = pts[j][0], xj = pts[j][1]
    var cross = (yi > lat) !== (yj > lat) &&
      lon < (xj - xi) * (lat - yi) / (yj - yi) + xi
    if (cross) inside = !inside
  }
  return inside
}

function inZone(lat, lon, z) {
  if (!z) return false
  if (z.type === 'circle') return distanceM(lat, lon, z.c[0], z.c[1]) <= z.r
  if (z.type === 'poly' && z.pts && z.pts.length >= 3) return inPolygon(lat, lon, z.pts)
  return false
}

// Расстояние от точки до отрезка a-b в метрах (локальная плоская проекция)
function distToSegmentM(lat, lon, a, b) {
  var k = 111320
  var cosL = Math.cos(lat * Math.PI / 180)
  var ax = (a[1] - lon) * k * cosL, ay = (a[0] - lat) * k
  var bx = (b[1] - lon) * k * cosL, by = (b[0] - lat) * k
  var dx = bx - ax, dy = by - ay
  var len2 = dx * dx + dy * dy
  var t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0
  if (t < 0) t = 0
  if (t > 1) t = 1
  var cx = ax + t * dx, cy = ay + t * dy
  return Math.sqrt(cx * cx + cy * cy)
}

// Сколько метров до границы зоны снаружи (0 — внутри или на границе)
function edgeDistanceM(lat, lon, z) {
  if (!z) return Infinity
  if (inZone(lat, lon, z)) return 0
  if (z.type === 'circle') return Math.max(0, distanceM(lat, lon, z.c[0], z.c[1]) - z.r)
  if (z.type === 'poly' && z.pts && z.pts.length >= 3) {
    var best = Infinity
    for (var i = 0, j = z.pts.length - 1; i < z.pts.length; j = i++) {
      var d = distToSegmentM(lat, lon, z.pts[j], z.pts[i])
      if (d < best) best = d
    }
    return best
  }
  return Infinity
}

// Ближайшая зона: { dist, name } или null
function nearest(lat, lon, zones) {
  var best = null
  for (var i = 0; i < zones.length; i++) {
    var d = edgeDistanceM(lat, lon, zones[i])
    if (best === null || d < best.dist) best = { dist: d, name: zones[i].name || 'Зона' }
  }
  return best
}

export default {
  distanceM: distanceM,
  inPolygon: inPolygon,
  inZone: inZone,
  edgeDistanceM: edgeDistanceM,
  nearest: nearest
}
