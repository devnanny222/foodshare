'use client';

import dynamic from 'next/dynamic';

// Leaflet touches `window`/`document` directly, which breaks during
// Next.js server-side rendering. Loading it with ssr: false ensures
// it only ever renders in the browser.
const FoodMap = dynamic(() => import('./FoodMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f0f0',
        borderRadius: 8,
      }}
    >
      Loading map...
    </div>
  ),
});

export default FoodMap;
