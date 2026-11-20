import { supabase } from './supabase.js'

/**
 * Fetches the signed-in member's public profile.
 * The database trigger creates this row when an auth user is registered.
 */
export async function fetchMemberProfile(userId) {
  if (!supabase || !userId) {
    return { profile: null, error: new Error('Supabase er ikkje konfigurert.') }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, active, avatar_url, email, membership_status')
    .eq('id', userId)
    .single()

  return { profile: data ?? null, error }
}

export function isStaff(profile) {
  return profile?.active === true &&
    profile?.membership_status === 'approved' &&
    (profile.role === 'admin' || profile.role === 'manager')
}
