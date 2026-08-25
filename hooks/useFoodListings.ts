'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAvailableListings } from '@/lib/listings';
import type { FoodListing } from '@/lib/types';

/**
 * Loads available food listings once, then keeps the list live via
 * Supabase Realtime — new listings appear instantly, and listings
 * that get claimed disappear from the "available" list automatically.
 *
 * This is the core of FoodShare's "instant alert" feature: no
 * polling, no manual refresh needed.
 */
export function useFoodListings() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch
    getAvailableListings()
      .then((data) => {
        if (isMounted) setListings(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Live subscription — fires on INSERT and UPDATE to food_listings
    const channel = supabase
      .channel('food_listings_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_listings' },
        (payload) => {
          const newListing = payload.new as FoodListing;
          // Only show it if it's actually available (defensive check)
          if (newListing.status === 'available') {
            setListings((prev) => [newListing, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'food_listings' },
        (payload) => {
          const updated = payload.new as FoodListing;
          setListings((prev) => {
            // If it's no longer available (e.g. just got claimed), remove it
            if (updated.status !== 'available') {
              return prev.filter((listing) => listing.id !== updated.id);
            }
            // Otherwise update it in place
            return prev.map((listing) => (listing.id === updated.id ? updated : listing));
          });
        }
      )
      .subscribe();

    // 3. Cleanup on unmount
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { listings, loading, error };
}
