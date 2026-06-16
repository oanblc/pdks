// geo.ts — şube geofence: mesafe hesabı + şube merkezi (oturum içi eşleme)
export type LatLng = { lat: number; lng: number };

export const GEOFENCE_RADIUS_M = 100; // sunucu varsayılanıyla (PUNCH_RADIUS_M) hizalı

// Haversine — iki nokta arası mesafe (metre)
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Şube merkezi — gerçekte yönetici panelinden gelir; prototipte ilk eşlemede kaydedilir.
let branchCenter: LatLng | null = null;
export const getBranchCenter = (): LatLng | null => branchCenter;
export const setBranchCenter = (c: LatLng): void => { branchCenter = c; };
