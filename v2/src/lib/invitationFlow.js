/** The invite hint survives Supabase consuming the one-time token fragment. */
export function isInviteLanding(location) {
  const search = new URLSearchParams(location?.search || '')
  const hash = new URLSearchParams(String(location?.hash || '').replace(/^#/, ''))
  return search.get('welcome') === 'invite' || hash.get('type') === 'invite'
}

export function clearInviteLanding(win) {
  if (!win?.location || !win?.history?.replaceState) return
  const url = new URL(win.location.href)
  url.searchParams.delete('welcome')
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  if (hashParams.get('type') === 'invite') {
    hashParams.delete('type')
    url.hash = hashParams.toString()
  }
  win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
