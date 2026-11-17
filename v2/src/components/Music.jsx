import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Disc3, Headphones, Music2, RefreshCw, Play, Pause, SkipBack, SkipForward, LogIn, LogOut, ExternalLink } from 'lucide-react'

const MusicContext = createContext(null)
const TOKEN_KEY_PREFIX = 'garasjegym:spotify-token:'
const VERIFIER_KEY = 'garasjegym:spotify-verifier'
const STATE_KEY = 'garasjegym:spotify-state'
const SPOTIFY_API = 'https://api.spotify.com/v1'
const REDIRECT_URI = () => window.location.origin + window.location.pathname

function getClientId() { return import.meta.env.VITE_SPOTIFY_CLIENT_ID || '82eb64ec22074235a0a29ffc937d9053' }
function getTokenKey(memberId) { return TOKEN_KEY_PREFIX + (memberId || 'guest') }
function readToken(memberId) { try { return JSON.parse(localStorage.getItem(getTokenKey(memberId)) || 'null') } catch { return null } }
function saveToken(memberId, token) { try { localStorage.setItem(getTokenKey(memberId), JSON.stringify(token)) } catch { /* Lagring kan vere blokkert. */ } }
function clearToken(memberId) { try { localStorage.removeItem(getTokenKey(memberId)) } catch { /* Ignorer. */ } }
function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => chars[byte % chars.length]).join('')
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
let spotifySdkPromise = null
function ensureSpotifySdk() {
  if (window.Spotify) return Promise.resolve()
  if (spotifySdkPromise) return spotifySdkPromise
  spotifySdkPromise = new Promise((resolve, reject) => {
    let settled = false
    const finish = error => { if (settled) return; settled = true; error ? reject(error) : resolve() }
    window.onSpotifyWebPlaybackSDKReady = () => finish()
    let script = document.querySelector('script[data-garasje-spotify-sdk]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      script.dataset.garasjeSpotifySdk = '1'
      script.onerror = () => finish(new Error('Kunne ikkje lasta Spotify-spelaren.'))
      document.head.appendChild(script)
    } else script.addEventListener('error', () => finish(new Error('Kunne ikkje lasta Spotify-spelaren.')), { once:true })
    window.setTimeout(() => finish(new Error('Spotify-spelaren svara ikkje. Last sida på nytt og prøv igjen.')), 15000)
  })
  return spotifySdkPromise
}
function trackFromSdkState(state) {
  const item = state?.track_window?.current_track
  if (!item) return null
  return { id:item.id, uri:item.uri, name:item.name, artists:item.artists?.map(a=>a.name)||[], album:item.album?.name||'', imageUrl:item.album?.images?.[0]?.url||'', durationMs:state.duration||0, progressMs:state.position||0, externalUrl:item.uri ? 'https://open.spotify.com/track/'+item.id : '' }
}
function trackFromPlayback(data) {
  const item = data?.item
  if (!item) return null
  return {
    id: item.id,
    uri: item.uri,
    name: item.name,
    artists: item.artists?.map(artist => artist.name) || [],
    album: item.album?.name || '',
    imageUrl: item.album?.images?.[0]?.url || '',
    durationMs: item.duration_ms || 0,
    progressMs: data.progress_ms || 0,
    externalUrl: item.external_urls?.spotify || '',
  }
}

export function MusicProvider({ children, memberId = null }) {
  const clientId = getClientId()
  const [spotifyToken, setSpotifyToken] = useState(() => readToken(memberId))
  const [spotifyProfile, setSpotifyProfile] = useState(null)
  const [spotifyTrack, setSpotifyTrack] = useState(null)
  const [spotifyPlaying, setSpotifyPlaying] = useState(false)
  const [spotifyDevices, setSpotifyDevices] = useState([])
  const [spotifyDeviceId, setSpotifyDeviceId] = useState('')
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([])
  const [spotifyStatus, setSpotifyStatus] = useState('Kople til din private Spotify-konto.')
  const [spotifyBusy, setSpotifyBusy] = useState(false)
  const [spotifyError, setSpotifyError] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  const [spotifyPlayer, setSpotifyPlayer] = useState(null)

  const spotifyRequest = useCallback(async (path, options = {}, retry = true) => {
    let token = readToken(memberId)
    if (!token?.access_token) throw new Error('Spotify-kontoen er ikkje kopla til.')
    if (token.expires_at && Date.now() > token.expires_at - 60000) {
      if (!token.refresh_token) throw new Error('Spotify-økta er utløpt. Kople til på nytt.')
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({ grant_type:'refresh_token', refresh_token:token.refresh_token, client_id:getClientId() }),
      })
      const refreshed = await response.json()
      if (!response.ok) throw new Error(refreshed.error_description || 'Kunne ikkje fornye Spotify-tilgangen.')
      token = { ...token, ...refreshed, refresh_token:refreshed.refresh_token || token.refresh_token, expires_at:Date.now() + refreshed.expires_in * 1000 }
      saveToken(memberId, token); setSpotifyToken(token)
    }
    const response = await fetch(path.startsWith('http') ? path : SPOTIFY_API + path, {
      ...options,
      headers:{ Authorization:'Bearer ' + token.access_token, ...(options.body ? {'Content-Type':'application/json'} : {}), ...options.headers },
    })
    if (response.status === 401 && retry && token.refresh_token) {
      token.expires_at = 0; saveToken(memberId, token)
      return spotifyRequest(path, options, false)
    }
    if (response.status === 204) return null
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error?.message || data.error_description || 'Spotify-feil (' + response.status + ')')
    return data
  }, [memberId])

  const loadSpotifyData = useCallback(async () => {
    try {
      const [profile, playlists, devices, playback] = await Promise.all([
        spotifyRequest('/me'),
        spotifyRequest('/me/playlists?limit=50'),
        spotifyRequest('/me/player/devices').catch(() => ({devices:[]})),
        spotifyRequest('/me/player').catch(() => null),
      ])
      setSpotifyProfile(profile)
      setSpotifyPlaylists(playlists.items || [])
      setSpotifyDevices(devices.devices || [])
      setSpotifyDeviceId(playback?.device?.id || devices.devices?.find(device => device.is_active)?.id || '')
      setSpotifyTrack(trackFromPlayback(playback))
      setSpotifyPlaying(Boolean(playback?.is_playing))
      setSpotifyStatus('Kopla til ' + (profile.display_name || 'Spotify'))
      setSpotifyError('')
    } catch (error) {
      setSpotifyError(error.message)
      setSpotifyStatus('Kunne ikkje hente Spotify-data')
    }
  }, [spotifyRequest])

  useEffect(() => {
    setSpotifyToken(readToken(memberId))
    setSpotifyProfile(null); setSpotifyTrack(null); setSpotifyPlaylists([]); setSpotifyDevices([])
  }, [memberId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError=params.get('error')
    if(oauthError){setSpotifyError(oauthError==='access_denied'?'Du avbraut Spotify-innlogginga.':'Spotify avviste innlogginga: '+oauthError);window.history.replaceState({},document.title,REDIRECT_URI());return}
    const code = params.get('code')
    const state = params.get('state')
    if (!code) return
    const expectedState = sessionStorage.getItem(STATE_KEY)
    const verifier = sessionStorage.getItem(VERIFIER_KEY)
    const cleanUrl = REDIRECT_URI()
    window.history.replaceState({}, document.title, cleanUrl)
    if (!expectedState || state !== expectedState || !verifier) {
      setSpotifyError('Spotify-innlogginga kunne ikkje stadfestast. Prøv å kople til på nytt.')
      return
    }
    sessionStorage.removeItem(STATE_KEY); sessionStorage.removeItem(VERIFIER_KEY)
    ;(async () => {
      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({ client_id:getClientId(), grant_type:'authorization_code', code, redirect_uri:cleanUrl, code_verifier:verifier }),
        })
        const token = await response.json()
        if (!response.ok) throw new Error(token.error_description || 'Spotify kunne ikkje fullføre innlogginga.')
        const saved = { ...token, expires_at:Date.now() + token.expires_in * 1000 }
        saveToken(memberId, saved); setSpotifyToken(saved); setSpotifyStatus('Spotify er kopla til')
      } catch (error) { setSpotifyError(error.message) }
    })()
  }, [memberId])

  useEffect(() => { if (spotifyToken?.access_token) loadSpotifyData() }, [spotifyToken?.access_token, loadSpotifyData])

  // Den gamle GarasjeGym-spelaren oppretta ei eiga Spotify-eining i staden for å krevja
  // at medlemmen allereie hadde ein aktiv Spotify-app på telefonen.
  useEffect(() => {
    if (!spotifyToken?.access_token) return undefined
    const grantedScopes=(spotifyToken.scope||'').split(/\s+/).filter(Boolean)
    if (!grantedScopes.includes('streaming')) { setSpotifyError('Spotify-tilgangen manglar streaming-løyvet. Kople frå og til Spotify på nytt, og godkjenn alle tilgangane.'); return undefined }
    if (spotifyProfile && spotifyProfile.product !== 'premium') { setSpotifyError('Spotify Web Player krev Spotify Premium. Du kan framleis bruke Spotify-appen som avspelings-eining.'); setSpotifyStatus('Premium krevst for innebygd avspeling.'); return undefined }
    if (!spotifyProfile) return undefined
    let cancelled = false
    let player = null
    ;(async () => {
      try {
        await ensureSpotifySdk()
        if (cancelled || !window.Spotify) return
        player = new window.Spotify.Player({
          name:'GarasjeGym',
          getOAuthToken: callback => {
            const current = readToken(memberId)
            if (current?.access_token) callback(current.access_token)
          },
          volume:0.65,
        })
        player.addListener('ready', ({device_id}) => {
          if (cancelled) return
          setSpotifyDeviceId(device_id)
          setSpotifyStatus('GarasjeGym-spelaren er klar.')
          setSpotifyPlayer(player)
        })
        player.addListener('not_ready', () => { if (!cancelled) setSpotifyStatus('Spotify-spelaren er mellombels fråkopla.') })
        player.addListener('player_state_changed', state => {
          if (!state || cancelled) return
          setSpotifyTrack(trackFromSdkState(state))
          setSpotifyPlaying(!state.paused)
        })
        player.addListener('initialization_error', ({message}) => { if (!cancelled) setSpotifyError('Spotify: '+message) })
        player.addListener('authentication_error', ({message}) => { if (!cancelled) setSpotifyError('Spotify-innlogging: '+message) })
        player.addListener('account_error', ({message}) => { if (!cancelled) setSpotifyError('Spotify-konto: '+message) })
        await player.connect()
      } catch (error) { if (!cancelled) setSpotifyError(error.message || 'Kunne ikkje starta Spotify-spelaren.') }
    })()
    return () => { cancelled = true; if (player) player.disconnect(); setSpotifyPlayer(null); setSpotifyDeviceId('') }
  }, [spotifyToken?.access_token, spotifyToken?.scope, spotifyProfile?.product, memberId])
  useEffect(() => {
    if (!spotifyToken?.access_token) return undefined
    const id = window.setInterval(async () => {
      try {
        const [playback, devices] = await Promise.all([
          spotifyRequest('/me/player').catch(() => null),
          spotifyRequest('/me/player/devices').catch(() => ({devices:[]})),
        ])
        setSpotifyTrack(trackFromPlayback(playback))
        setSpotifyPlaying(Boolean(playback?.is_playing))
        setSpotifyDevices(devices.devices || [])
        if (playback?.device?.id) setSpotifyDeviceId(playback.device.id)
      } catch { /* Status blir oppdatert ved neste handling. */ }
    }, 8000)
    return () => window.clearInterval(id)
  }, [spotifyToken?.access_token, spotifyRequest])

  const connectSpotify = useCallback(async () => {
    const id = getClientId()
    if (!id) { setSpotifyError('Spotify er mellombels utilgjengeleg. Prøv igjen seinare.'); return }
    try {
      const verifier = randomString(64)
      const state = randomString(32)
      sessionStorage.setItem(VERIFIER_KEY, verifier); sessionStorage.setItem(STATE_KEY, state)
      const challenge = await sha256(verifier)
      const params = new URLSearchParams({
        client_id:id, response_type:'code', redirect_uri:REDIRECT_URI(), code_challenge_method:'S256', code_challenge:challenge,
        state, scope:'streaming user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state user-read-currently-playing',
      })
      window.location.assign('https://accounts.spotify.com/authorize?' + params.toString())
    } catch (error) { setSpotifyError(error.message || 'Kunne ikkje starte Spotify-innlogginga.') }
  }, [])

  const disconnectSpotify = useCallback(() => {
    clearToken(memberId); setSpotifyToken(null); setSpotifyProfile(null); setSpotifyTrack(null); setSpotifyPlaying(false)
    setSpotifyPlaylists([]); setSpotifyDevices([]); setSpotifyDeviceId(''); setSpotifyStatus('Spotify fråkopla'); setSpotifyError('')
  }, [memberId])

  const spotifyAction = useCallback(async (action) => {
    setSpotifyBusy(true); setSpotifyError('')
    try {
      const device = spotifyDeviceId ? '?device_id=' + encodeURIComponent(spotifyDeviceId) : ''
      if (action === 'play') { if (spotifyPlayer) await spotifyPlayer.resume(); else await spotifyRequest('/me/player/play' + device, {method:'PUT'}) }
      if (action === 'pause') { if (spotifyPlayer) await spotifyPlayer.pause(); else await spotifyRequest('/me/player/pause' + device, {method:'PUT'}) }
      if (action === 'next') { if (spotifyPlayer) await spotifyPlayer.nextTrack(); else await spotifyRequest('/me/player/next' + device, {method:'POST'}) }
      if (action === 'previous') { if (spotifyPlayer) await spotifyPlayer.previousTrack(); else await spotifyRequest('/me/player/previous' + device, {method:'POST'}) }
      if (action === 'refresh') await loadSpotifyData()
      await new Promise(resolve => window.setTimeout(resolve, 500))
      const playback = await spotifyRequest('/me/player').catch(() => null)
      setSpotifyTrack(trackFromPlayback(playback)); setSpotifyPlaying(Boolean(playback?.is_playing))
      setSpotifyDevices((await spotifyRequest('/me/player/devices').catch(() => ({devices:[]}))).devices || [])
    } catch (error) { setSpotifyError(error.message || 'Spotify-handlinga feila.') }
    finally { setSpotifyBusy(false) }
  }, [spotifyDeviceId, spotifyRequest, loadSpotifyData, spotifyPlayer])

  const playPlaylist = useCallback(async (playlistUri) => {
    if (!playlistUri) return
    setSpotifyBusy(true); setSpotifyError('')
    try {
      await spotifyRequest('/me/player/play' + (spotifyDeviceId ? '?device_id=' + encodeURIComponent(spotifyDeviceId) : ''), {
        method:'PUT', body:JSON.stringify({context_uri:playlistUri}),
      })
      setSelectedPlaylist(playlistUri)
      await new Promise(resolve => window.setTimeout(resolve, 700))
      const playback = await spotifyRequest('/me/player').catch(() => null)
      setSpotifyTrack(trackFromPlayback(playback)); setSpotifyPlaying(Boolean(playback?.is_playing))
    } catch (error) { setSpotifyError(error.message || 'Klarte ikkje starte spelelista.') }
    finally { setSpotifyBusy(false) }
  }, [spotifyDeviceId, spotifyRequest])

  const value = useMemo(() => ({
    clientId, spotifyConfigured:Boolean(clientId), spotifyConnected:Boolean(spotifyToken?.access_token), spotifyProfile,
    spotifyTrack, spotifyPlaying, spotifyDevices, spotifyDeviceId, setSpotifyDeviceId,
    spotifyPlaylists, spotifyStatus, spotifyBusy, spotifyError, setSpotifyError,
    connectSpotify, disconnectSpotify, spotifyAction, playPlaylist, selectedPlaylist, spotifyPlayer,
  }), [clientId, spotifyToken, spotifyProfile, spotifyTrack, spotifyPlaying, spotifyDevices, spotifyDeviceId, spotifyPlaylists, spotifyStatus, spotifyBusy, spotifyError, connectSpotify, disconnectSpotify, spotifyAction, playPlaylist, selectedPlaylist, spotifyPlayer])
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

export function useMusic() { return useContext(MusicContext) }

function PersonalSpotifyPlayer({ compact = false }) {
  const music = useMusic()
  if (!music) return null
  const track = music.spotifyTrack
  return <section className={compact ? 'personal-spotify-player compact' : 'personal-spotify-player'}>
    <div className="personal-spotify-player-head">
      <div className="personal-spotify-mark"><Music2 size={18}/></div>
      <div className="personal-spotify-account"><span className="section-kicker">PRIVAT SPOTIFY</span><strong>{music.spotifyProfile?.display_name || 'Din Spotify'}</strong><small>{music.spotifyConnected ? music.spotifyStatus : 'Berre synleg for deg'}</small></div>
      {music.spotifyConnected && <button className="spotify-disconnect" onClick={music.disconnectSpotify} title="Kople frå Spotify" aria-label="Kople frå Spotify"><LogOut size={15}/></button>}
    </div>
    {music.spotifyConnected ? <>
      <div className="personal-spotify-now">
        <div className="personal-spotify-art">{track?.imageUrl ? <img src={track.imageUrl} alt=""/> : <Disc3 size={25}/>}</div>
        <div className="personal-spotify-meta"><strong>{track?.name || 'Ingen aktiv låt'}</strong><span>{track?.artists?.join(', ') || 'Start musikk i Spotify eller vel ei speleliste nedanfor'}</span>{track?.album && <small>{track.album}</small>}</div>
        {track?.externalUrl && <a className="spotify-open-track" href={track.externalUrl} target="_blank" rel="noreferrer" aria-label="Opna låt i Spotify"><ExternalLink size={14}/></a>}
      </div>
      <div className="personal-spotify-controls">
        <button onClick={() => music.spotifyAction('previous')} disabled={music.spotifyBusy} aria-label="Førre låt"><SkipBack size={17}/></button>
        <button className="spotify-play-button" onClick={() => music.spotifyAction(music.spotifyPlaying ? 'pause' : 'play')} disabled={music.spotifyBusy} aria-label={music.spotifyPlaying ? 'Pause' : 'Spel av'}>{music.spotifyPlaying ? <Pause size={18}/> : <Play size={18}/>}</button>
        <button onClick={() => music.spotifyAction('next')} disabled={music.spotifyBusy} aria-label="Neste låt"><SkipForward size={17}/></button>
        <button onClick={() => music.spotifyAction('refresh')} disabled={music.spotifyBusy} aria-label="Oppdater"><RefreshCw size={15}/></button>
      </div>
      <div className="personal-spotify-selects">
        <label>Speleliste<select value={music.selectedPlaylist} onChange={event => music.playPlaylist(event.target.value)} disabled={music.spotifyBusy}><option value="">Vel ei av dine spelelister …</option>{music.spotifyPlaylists.map(playlist => <option key={playlist.id} value={playlist.uri}>{playlist.name}</option>)}</select></label>
        <label>Avspelings-eining<select value={music.spotifyDeviceId} onChange={event => music.setSpotifyDeviceId(event.target.value)}><option value="">Aktiv eining</option>{music.spotifyDevices.map(device => <option key={device.id} value={device.id}>{device.name}{device.is_active ? ' · aktiv' : ''}</option>)}</select></label>
      </div>
      {music.spotifyDevices.length === 0 && <p className="spotify-hint">Opna Spotify på mobilen, PC-en eller ei anna eining først. Oppdater deretter einingar.</p>}
    </> : <div className="personal-spotify-connect">
      <p>Kople til din eigen konto. GarasjeGym får berre tilgang til spelelister og avspelingskontrollane du godkjenner.</p>
      <button className="spotify-connect-button" onClick={music.connectSpotify}><LogIn size={16}/> Kople til Spotify</button>
    </div>}
    {music.spotifyError && <div className="spotify-error" role="alert">{music.spotifyError}</div>}
  </section>
}

export function Music() {
  const music = useMusic()
  return <div className="music-page">
    <div className="music-heading">
      <div className="music-heading-icon"><Headphones size={22}/></div>
      <div><span className="section-kicker">GARASJEGYM · DIN MUSIKK</span><h2>Musikk</h2><p>Din personlege Spotify-konto – privat og separat.</p></div>
    </div>
    <PersonalSpotifyPlayer/>
    <p className="music-footnote">Kvar medlem koplar til sin eigen Spotify-konto. GarasjeGym deler ikkje spelelister eller avspelingsstatus mellom medlemmene.</p>
    <p className="music-footnote">Privat Spotify-status, spelelister og kontrollar blir ikkje delte med andre medlemmer.</p>
  </div>
}

export function MusicMiniPlayer() {
  return <div className="timer-music-stack"><PersonalSpotifyPlayer compact/></div>
}
