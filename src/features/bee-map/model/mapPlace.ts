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
  sourceUrl?: string;
}

export type BeeMapFilter = "all" | BeeMapPlaceKind;
