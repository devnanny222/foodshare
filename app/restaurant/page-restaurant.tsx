'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile, signOut } from '@/lib/auth';
import { createListing } from '@/lib/listings';
import { uploadFoodPhoto } from '@/lib/uploadPhoto';
import { supabase } from '@/lib/supabase';
import type { Profile, FoodListing } from '@/lib/types';

export default function RestaurantDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [myListings, setMyListings] = useState<FoodListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  // --- Auth guard ---
  useEffect(() => {
    getCurrentProfile()
      .then((p) => {
        if (!p) {
          router.push('/login');
          return;
        }
        if (p.role !== 'restaurant') {
          router.push(`/${p.role}`);
          return;
        }
        setProfile(p);
      })
      .finally(() => setProfileLoading(false));
  }, [router]);

  // --- Load this restaurant's own listings (all statuses) ---
  useEffect(() => {
    if (!profile) return;

    async function loadMyListings() {
      const { data, error } = await supabase
        .from('food_listings')
        .select('*')
        .eq('restaurant_id', profile!.id)
        .order('created_at', { ascending: false });

      if (!error && data) setMyListings(data as FoodListing[]);
      setListingsLoading(false);
    }

    loadMyListings();

    // Keep this restaurant's own list live too (e.g. reflects claims instantly)
    const channel = supabase
      .channel('my_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_listings',
          filter: `restaurant_id=eq.${profile.id}`,
        },
        () => loadMyListings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  if (profileLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">FoodShare — Restaurant Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {profile.name}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-black underline">
          Log out
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <PostListingForm
          restaurantId={profile.id}
          onCreated={(listing) => setMyListings((prev) => [listing, ...prev])}
        />

        <section>
          <h2 className="text-lg font-semibold mb-3">Your Listings</h2>
          {listingsLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : myListings.length === 0 ? (
            <p className="text-gray-500 italic">You haven't posted any surplus food yet.</p>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => (
                <MyListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PostListingForm({
  restaurantId,
  onCreated,
}: {
  restaurantId: string;
  onCreated: (listing: FoodListing) => void;
}) {
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pickupStart, setPickupStart] = useState('');
  const [pickupEnd, setPickupEnd] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser. Enter coordinates manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setError('Could not get your location. Please allow location access, or enter it manually.')
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (lat === null || lng === null) {
      setError('Please set the pickup location first.');
      return;
    }
    if (!pickupStart || !pickupEnd) {
      setError('Please set both a pickup start and end time.');
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadFoodPhoto(photoFile, restaurantId);
      }

      const listing = await createListing({
        restaurantId,
        title,
        photoUrl,
        quantity,
        pickupStart: new Date(pickupStart).toISOString(),
        pickupEnd: new Date(pickupEnd).toISOString(),
        lat,
        lng,
      });

      onCreated(listing);
      setSuccess(true);
      // Reset form
      setTitle('');
      setQuantity('');
      setPickupStart('');
      setPickupEnd('');
      setPhotoFile(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post listing.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Post Surplus Food</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">What are you giving away?</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 20 sandwich trays"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. serves ~15 people"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pickup window starts</label>
            <input
              type="datetime-local"
              value={pickupStart}
              onChange={(e) => setPickupStart(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pickup window ends</label>
            <input
              type="datetime-local"
              value={pickupEnd}
              onChange={(e) => setPickupEnd(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pickup location</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={useMyLocation}
              className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              📍 Use my current location
            </button>
            {lat !== null && lng !== null && (
              <span className="text-sm text-gray-500">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 border border-green-200 rounded p-3 text-sm">
            Listing posted! Charities nearby will be notified instantly.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post Listing'}
        </button>
      </form>
    </section>
  );
}

function MyListingCard({ listing }: { listing: FoodListing }) {
  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    claimed: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-gray-100 text-gray-700',
    expired: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white border rounded-lg p-4 flex items-center gap-4">
      {listing.photo_url && (
        <img
          src={listing.photo_url}
          alt={listing.title}
          className="w-16 h-16 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <h3 className="font-semibold">{listing.title}</h3>
        <p className="text-sm text-gray-600">{listing.quantity}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[listing.status] ?? ''}`}>
        {listing.status}
      </span>
    </div>
  );
}
