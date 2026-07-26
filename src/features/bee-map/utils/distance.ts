import type { BeeMapPlace, BeeMapUserLocation } from "../model/mapPlace";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function getDistanceKm(
  origin: Pick<BeeMapUserLocation, "lat" | "lng">,
  destination: Pick<BeeMapPlace, "lat" | "lng">,
) {
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function sortPlacesByDistance(
  places: BeeMapPlace[],
  origin?: BeeMapUserLocation,
) {
  if (!origin) return places;

  return [...places].sort(
    (first, second) =>
      getDistanceKm(origin, first) - getDistanceKm(origin, second),
  );
}
