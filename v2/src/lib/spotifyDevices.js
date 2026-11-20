export function isUsableSpotifyDevice(device) {
  return Boolean(device?.id) && !device?.is_restricted
}

export function chooseSpotifyDevice(devices, currentId = '') {
  const available = (Array.isArray(devices) ? devices : []).filter(isUsableSpotifyDevice)
  return available.find(device => device.id === currentId)?.id
    || available.find(device => device.is_active)?.id
    || available[0]?.id
    || ''
}

export function spotifyErrorMessage(status, data = {}, retryAfter = '') {
  if (status === 401) {
    return 'Spotify-tilgangen er utløpt eller avvist. Kople frå og til Spotify på nytt.'
  }
  if (status === 403) {
    const detail = data?.error?.message || data?.error_description || ''
    if (/premium|subscription/i.test(detail)) {
      return 'Denne Spotify-funksjonen krev eit Premium-abonnement.'
    }
    return 'Spotify avviste handlinga. Kontroller at kontoen har Premium for avspeling, og at GarasjeGym har fått nødvendige tilgangar.'
  }
  if (status === 404) {
    return 'Spotify fann ikkje avspelingseininga. Opna Spotify på eininga, start avspeling og oppdater einingslista.'
  }
  if (status === 429) {
    return 'Spotify har sett ei mellombels grense. Prøv igjen' + (retryAfter ? ' om ' + retryAfter + ' sekund.' : ' om litt.')
  }
  return data?.error?.message || data?.error_description || 'Spotify-feil (' + status + ').'
}
