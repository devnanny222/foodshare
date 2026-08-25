export type Role = 'restaurant' | 'charity' | 'driver';

export type ListingStatus = 'available' | 'claimed' | 'picked_up' | 'expired';

export type ClaimStatus = 'claimed' | 'in_transit' | 'delivered';

export interface Profile {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

export interface FoodListing {
  id: string;
  restaurant_id: string;
  title: string;
  photo_url: string | null;
  quantity: string;
  pickup_start: string; // ISO timestamp
  pickup_end: string; // ISO timestamp
  lat: number;
  lng: number;
  status: ListingStatus;
  created_at: string;
}

export interface Claim {
  id: string;
  listing_id: string;
  charity_id: string;
  driver_id: string | null;
  status: ClaimStatus;
  claimed_at: string;
}
