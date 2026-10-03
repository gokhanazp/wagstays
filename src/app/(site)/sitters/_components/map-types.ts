export type MapPin = {
  id: string;
  slug: string;
  displayName: string;
  lat: number;
  lng: number;
  priceCents: number;
  unit: string;
  rating: number;
  avatarUrl: string;
  locationNote: string | null;
  distanceKm: number;
  kinds: string[];
};
