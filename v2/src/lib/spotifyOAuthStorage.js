export function readSpotifyOAuthSession(storage, stateKey, verifierKey) {
  try {
    return {
      state: storage.getItem(stateKey) || '',
      verifier: storage.getItem(verifierKey) || '',
    }
  } catch {
    return { state: '', verifier: '' }
  }
}

export function writeSpotifyOAuthSession(storage, stateKey, verifierKey, state, verifier) {
  try {
    storage.setItem(stateKey, state)
    storage.setItem(verifierKey, verifier)
    return true
  } catch {
    return false
  }
}

export function clearSpotifyOAuthSession(storage, stateKey, verifierKey) {
  try {
    storage.removeItem(stateKey)
    storage.removeItem(verifierKey)
    return true
  } catch {
    return false
  }
}
