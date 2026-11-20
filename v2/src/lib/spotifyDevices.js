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
