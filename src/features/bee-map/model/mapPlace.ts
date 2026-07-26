export type BeeMapPlaceKind = "seller" | "farm";

export interface BeeMapPlace {
  id: string;
  kind: BeeMapPlaceKind;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  description?: string;
  sourceName?: string;
  sourceUrl?: string;
}

export interface BeeMapUserLocation {
  lat: number;
  lng: number;
  requestedAt: number;
}

export type BeeMapFilter = "all" | BeeMapPlaceKind;
