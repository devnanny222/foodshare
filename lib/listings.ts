import { supabase } from './supabase';
import type { FoodListing } from './types';

interface CreateListingParams {
  restaurantId: string;
  title: string;
  photoUrl: string | null;
  quantity: string;
  pickupStart: string; // ISO string
  pickupEnd: string; // ISO string
  lat: number;
  lng: number;
}

export async function createListing(params: CreateListingParams): Promise<FoodListing> {
  const { data, error } = await supabase
    .from('food_listings')
    .insert({
      restaurant_id: params.restaurantId,
      title: params.title,
      photo_url: params.photoUrl,
      quantity: params.quantity,
      pickup_start: params.pickupStart,
      pickup_end: params.pickupEnd,
      lat: params.lat,
      lng: params.lng,
      status: 'available',
    })
    .select()
    .single();

  if (error) throw error;
  return data as FoodListing;
}

/** Fetches all currently available listings, newest first. */
export async function getAvailableListings(): Promise<FoodListing[]> {
  const { data, error } = await supabase
    .from('food_listings')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as FoodListing[];
}

/** A charity claims a listing: inserts a claims row and flips the listing status. */
export async function claimListing(listingId: string, charityId: string) {
  const { error: claimError } = await supabase.from('claims').insert({
    listing_id: listingId,
    charity_id: charityId,
    status: 'claimed',
  });

  if (claimError) throw claimError;

  const { error: updateError } = await supabase
    .from('food_listings')
    .update({ status: 'claimed' })
    .eq('id', listingId);

  if (updateError) throw updateError;
}
