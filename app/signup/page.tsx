'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth';
import type { Role } from '@/lib/types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'charity', label: 'Charity' },
  { value: 'driver', label: 'Driver' },
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('restaurant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signUp({ email, password, name, role, phone });
      // Route to the right dashboard based on role.
      router.push(`/${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Sign up for FoodShare</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label>I am a...</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: role === r.value ? '2px solid black' : '1px solid #ccc',
                  fontWeight: role === r.value ? 700 : 400,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <label>
          Name / Organization
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={role === 'restaurant' ? 'e.g. Joe\'s Diner' : 'e.g. Hope Foundation'}
          />
        </label>

        <label>
          Phone (for pickup coordination)
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </div>
  );
}
