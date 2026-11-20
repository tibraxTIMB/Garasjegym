export function isUsableSpotifyDevice(device) {
  return Boolean(device?.id) && !device?.is_restricted
}
