'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { FoodListing } from '@/lib/types';

// --- Fix Leaflet's broken default marker icons in bundlers like Next.js ---
// Without this, markers render as broken image icons instead of pins.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface FoodMapProps {
  listings: FoodListing[];
  /** Called when the user clicks "Claim" inside a marker popup. */
  onClaim?: (listingId: string) => void;
  /** Map center — defaults to a reasonable fallback if not provided. */
  center?: [number, number];
  zoom?: number;
}

export default function FoodMap({
  listings,
  onClaim,
  center = [3.139, 101.6869], // fallback center (Kuala Lumpur) — swap for your city
  zoom = 12,
}: FoodMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '500px', width: '100%', borderRadius: 8 }}
    >
      {/* Free OpenStreetMap tiles — no API key required */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {listings.map((listing) => (
        <Marker key={listing.id} position={[listing.lat, listing.lng]}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong>{listing.title}</strong>
              <p style={{ margin: '4px 0' }}>{listing.quantity}</p>
              {listing.photo_url && (
                <img
                  src={listing.photo_url}
                  alt={listing.title}
                  style={{ width: '100%', borderRadius: 4, marginBottom: 4 }}
                />
              )}
              <p style={{ fontSize: 12, color: '#666' }}>
                Pickup by {new Date(listing.pickup_end).toLocaleTimeString()}
              </p>
              {onClaim && (
                <button onClick={() => onClaim(listing.id)} style={{ width: '100%' }}>
                  Claim this food
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
