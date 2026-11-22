// A missing explicit choice must never silently opt a customer into the complex UI.
// Older preference rows often contain `super_simple_mode=false` as a database default,
// not as a decision made by the customer.
export function resolveSimpleMode(role, preference) {
  if (role === 'admin') return false
  if (preference?.preferred_display_mode === 'simple') return true
  if (preference?.preferred_display_mode === 'advanced') return false
  if (role === 'member') return true
  return Boolean(preference?.super_simple_mode)
}

export function displayModePreference(userId, simpleMode) {
  return {
    user_id: userId,
    super_simple_mode: Boolean(simpleMode),
    preferred_display_mode: simpleMode ? 'simple' : 'advanced',
    updated_at: new Date().toISOString(),
  }
}
