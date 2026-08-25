import { supabase } from './supabase';
import type { Role, Profile } from './types';

interface SignUpParams {
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
}

/**
 * Signs a new user up with Supabase Auth AND creates their matching
 * row in the `profiles` table. These two steps must both succeed —
 * if the profile insert fails, the auth user still exists but is
 * "roleless", so we surface the error clearly.
 */
export async function signUp({ email, password, name, role, phone }: SignUpParams) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign up succeeded but no user was returned.');

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    role,
    name,
    phone: phone ?? null,
  });

  if (profileError) {
    throw new Error(
      `Account created, but profile setup failed: ${profileError.message}. ` +
        `You may need to complete your profile after logging in.`
    );
  }

  return authData.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Fetches the profile row (role, name, etc.) for the currently
 * logged-in user. Returns null if nobody is logged in.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Failed to fetch profile:', error.message);
    return null;
  }

  return data as Profile;
}
