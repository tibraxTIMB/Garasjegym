export function hasApprovedActiveMembership(profile) {
  return profile?.active === true && profile?.membership_status === 'approved'
}

export function isStaff(profile) {
  return hasApprovedActiveMembership(profile) &&
    (profile.role === 'admin' || profile.role === 'manager')
}

export function getMembershipGate(profile) {
  if (profile?.membership_status === 'rejected') return 'denied'
  if (profile?.membership_status === 'approved') {
    return profile.active === true ? 'approved' : 'denied'
  }
  return 'pending'
}

export function canManageMemberAccess(profile, member) {
  if (profile?.role === 'admin' && hasApprovedActiveMembership(profile)) return true
  return profile?.role === 'manager' &&
    hasApprovedActiveMembership(profile) &&
    member?.id !== profile.id &&
    member?.role === 'member' &&
    member?.active === true &&
    member?.membership_status === 'approved'
}
