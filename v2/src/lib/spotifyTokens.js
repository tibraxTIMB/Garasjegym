/**
 * Spotify refresh tokens should only be discarded when Spotify explicitly
 * reports that the grant is invalid (expired or revoked).
 */
export function shouldDiscardSpotifyRefreshToken(status, data = {}) {
  return Number(status) === 400 && data?.error === 'invalid_grant';
}

export function spotifyRefreshErrorMessage(status, data = {}) {
  if (shouldDiscardSpotifyRefreshToken(status, data)) {
    return 'Spotify-økta er utløpt eller tilbakekalla. Kople til på nytt.';
  }
  const detail = data?.error_description || data?.error?.message || data?.error;
  return typeof detail === 'string' && detail.trim()
    ? 'Spotify kunne ikkje fornya tilgangen: ' + detail
    : 'Spotify kunne ikkje fornya tilgangen akkurat no. Prøv igjen om litt.';
}
