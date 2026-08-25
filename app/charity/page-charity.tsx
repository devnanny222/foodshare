'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FoodMap from '@/components/FoodMapLoader';
import { useFoodListings } from '@/hooks/useFoodListings';
import { claimListing } from '@/lib/listings';
import { getCurrentProfile, signOut } from '@/lib/auth';
import type { Profile, FoodListing } from '@/lib/types';

export default function CharityDashboard() {
  const router = useRouter();
  const { listings, loading, error } = useFoodListings();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  // --- Auth guard: make sure a logged-in charity is viewing this page ---
  useEffect(() => {
    getCurrentProfile()
      .then((p) => {
        if (!p) {
          router.push('/login');
          return;
        }
        if (p.role !== 'charity') {
          // Wrong role — send them to their own dashboard instead.
          router.push(`/${p.role}`);
          return;
        }
        setProfile(p);
      })
      .finally(() => setProfileLoading(false));
  }, [router]);

  async function handleClaim(listingId: string) {
    if (!profile) return;
    setClaimingId(listingId);
    setClaimError(null);

    try {
      await claimListing(listingId, profile.id);
      setJustClaimedId(listingId);
      setTimeout(() => setJustClaimedId(null), 3000);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to claim this listing.');
    } finally {
      setClaimingId(null);
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  if (profileLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!profile) {
    // Redirect is already in flight via the effect above.
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">FoodShare — Charity Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {profile.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-black underline"
        >
          Log out
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {loading ? 'Loading available food...' : `${listings.length} listing(s) available now`}
          </h2>
          {!loading && (
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live updates on
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4">
            Failed to load listings: {error}
          </div>
        )}
        {claimError && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4">
            {claimError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Listings feed */}
          <div className="space-y-3">
            {!loading && listings.length === 0 && (
              <p className="text-gray-500 italic">
                No food available right now — new listings will appear here instantly.
              </p>
            )}

            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isClaiming={claimingId === listing.id}
                justClaimed={justClaimedId === listing.id}
                onClaim={() => handleClaim(listing.id)}
              />
            ))}
          </div>

          {/* Map */}
          <div className="sticky top-6 self-start">
            <FoodMap listings={listings} onClaim={handleClaim} />
          </div>
        </div>
      </main>
    </div>
  );
}

function ListingCard({
  listing,
  isClaiming,
  justClaimed,
  onClaim,
}: {
  listing: FoodListing;
  isClaiming: boolean;
  justClaimed: boolean;
  onClaim: () => void;
}) {
  const minutesLeft = Math.max(
    0,
    Math.round((new Date(listing.pickup_end).getTime() - Date.now()) / 60000)
  );

  return (
    <div className="bg-white border rounded-lg p-4 flex gap-4">
      {listing.photo_url && (
        <img
          src={listing.photo_url}
          alt={listing.title}
          className="w-24 h-24 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <h3 className="font-semibold">{listing.title}</h3>
        <p className="text-sm text-gray-600">{listing.quantity}</p>
        <p className="text-xs text-gray-400 mt-1">
          {minutesLeft > 0 ? `${minutesLeft} min left to pick up` : 'Pickup window closing soon'}
        </p>
        <button
          onClick={onClaim}
          disabled={isClaiming || justClaimed}
          className="mt-2 px-3 py-1.5 text-sm rounded bg-black text-white disabled:opacity-50"
        >
          {justClaimed ? 'Claimed ✓' : isClaiming ? 'Claiming...' : 'Claim this food'}
        </button>
      </div>
    </div>
  );
}
