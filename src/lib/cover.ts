/*
 How far from an address a manager's nearest home can be and still "cover" it (Ben, 19 Nov 2026).
 In metro Sydney and Melbourne the big operators work across the whole city, so 4 km hid them from suburbs they'd plainly take on
 (Rockdale had none within 4 km and three with 80+ homes at 4.5 to 5 km). Outside the two cities it stays 4 km.
*/
export const COVER_KM = 4;
export const CITY_COVER_KM = 8;
const METRO_KM = 35;
const CBDS: [number, number][] = [[-33.8688, 151.2093], [-37.8136, 144.9631]];

const kmBetween = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

/** The coverage radius for a point: 8 km within 35 km of the Sydney or Melbourne CBD, otherwise 4 km. */
export const coverKm = (lat: number, lng: number) => (CBDS.some(([a, b]) => kmBetween(lat, lng, a, b) <= METRO_KM) ? CITY_COVER_KM : COVER_KM);
export const COVER_TEXT = `within ${COVER_KM} km of it, or ${CITY_COVER_KM} km in Sydney and Melbourne`;
