import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  Music2, Headphones, Disc3, Play, Pause, SkipBack, SkipForward, LogIn, LogOut,
  ExternalLink, RefreshCw, Search, ListMusic, Zap, Radio, Waves, Leaf, X,
  Smartphone, LoaderCircle, ChevronRight, Check, Settings2
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const MusicContext = createContext(null)
const TOKEN_KEY_PREFIX = 'garasjegym:spotify-token:'
const VERIFIER_KEY = 'garasjegym:spotify-verifier'
const STATE_KEY = 'garasjegym:spotify-state'
const SPOTIFY_API = 'https://api.spotify.com/v1'
const REDIRECT_URI = () => window.location.origin + window.location.pathname

export const SPOTIFY_GENRES = [
  { id:'hard-rock', label:'Hard Rock', Icon:Music2 },
  { id:'turbo-balkan', label:'Turbo Balkan', Icon:Zap },
  { id:'90s-indie', label:'90s Indie', Icon:Disc3 },
  { id:'90s-dance', label:'90s Dance', Icon:Radio },
  { id:'trance', label:'Trance', Icon:Waves },
  { id:'relax', label:'Relax', Icon:Leaf },
]

function getClientId() {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID || '82eb64ec22074235a0a29ffc937d9053'
}
function getTokenKey(memberId) { return TOKEN_KEY_PREFIX + (memberId || 'guest') }
function readToken(memberId) {
  try { return JSON.parse(localStorage.getItem(getTokenKey(memberId)) || 'null') }
  catch { return null }
}
function saveToken(memberId, token) {
  try { localStorage.setItem(getTokenKey(memberId), JSON.stringify(token)) }
  catch { /* Nettlesaren kan blokkera lokal lagring. */ }
}
function clearToken(memberId) {
  try { localStorage.removeItem(getTokenKey(memberId)) }
  catch { /* Ignorer manglande tilgang til lokal lagring. */ }
}
function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => chars[byte % chars.length]).join('')
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function trackFromPlayback(data) {
  const item = data?.item
  if (!item) return null
  return {
    id:item.id,
    uri:item.uri,
    name:item.name,
    artists:item.artists?.map(artist => artist.name) || [],
    album:item.album?.name || '',
    imageUrl:item.album?.images?.[0]?.url || '',
    durationMs:item.duration_ms || 0,
    progressMs:data.progress_ms || 0,
    externalUrl:item.external_urls?.spotify || '',
  }
}
function isPersonalPhone(device) {
  return String(device?.type || '').toLowerCase() === 'smartphone' && !device?.is_restricted
}
function shortSpotifyError(data, status, response) {
  if (status === 429) {
    const wait = response?.headers?.get('Retry-After')
    return 'Spotify har sett ei mellombels grense. Prøv igjen' + (wait ? ' om ' + wait + ' sekund.' : ' om litt.')
  }
  return data?.error?.message || data?.error_description || 'Spotify-feil (' + status + ').'
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
  const [genrePlaylists, setGenrePlaylists] = useState({})
  const [activeGenre, setActiveGenre] = useState('')

  const refreshAccessToken = useCallback(async token => {
    if (!token?.refresh_token) throw new Error('Spotify-økta er utløpt. Kople til på nytt.')
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        grant_type:'refresh_token',
        refresh_token:token.refresh_token,
        client_id:getClientId(),
      }),
    })
    const refreshed = await response.json().catch(() => ({}))
    if (!response.ok) {
      clearToken(memberId)
      setSpotifyToken(null)
      throw new Error(refreshed.error_description || 'Spotify-økta kunne ikkje fornyast. Kople til på nytt.')
    }
    const next = {
      ...token,
      ...refreshed,
      refresh_token:refreshed.refresh_token || token.refresh_token,
      expires_at:Date.now() + Number(refreshed.expires_in || 3600) * 1000,
    }
    saveToken(memberId,next)
    setSpotifyToken(next)
    return next
  },[memberId])

  const spotifyRequest = useCallback(async (path, options = {}, retry = true) => {
    let token = readToken(memberId)
    if (!token?.access_token) throw new Error('Spotify-kontoen er ikkje kopla til.')
    if (!token.expires_at || Date.now() > token.expires_at - 60000) {
      token = await refreshAccessToken(token)
    }
    const response = await fetch(path.startsWith('http') ? path : SPOTIFY_API + path, {
      ...options,
      headers:{
        Authorization:'Bearer ' + token.access_token,
        ...(options.body ? {'Content-Type':'application/json'} : {}),
        ...options.headers,
      },
    })
    if (response.status === 401 && retry && token.refresh_token) {
      const expired = {...token,expires_at:0}
      saveToken(memberId,expired)
      await refreshAccessToken(expired)
      return spotifyRequest(path,options,false)
    }
    if (response.status === 204) return null
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(shortSpotifyError(data,response.status,response))
    return data
  },[memberId,refreshAccessToken])

  const loadSpotifyData = useCallback(async () => {
    try {
      const [profile,devices,playback] = await Promise.all([
        spotifyRequest('/me'),
        spotifyRequest('/me/player/devices').catch(() => ({devices:[]})),
        spotifyRequest('/me/player').catch(() => null),
      ])
      const phones = (devices?.devices || []).filter(isPersonalPhone)
      const pages = []
      let offset = 0
      for (let pageNumber=0; pageNumber<20; pageNumber+=1) {
        const page = await spotifyRequest('/me/playlists?limit=50&offset='+offset)
        const items = page?.items || []
        pages.push(...items)
        if (!page?.next || !items.length) break
        offset += items.length
      }
      setSpotifyProfile(profile)
      setSpotifyPlaylists(pages)
      setSpotifyDevices(phones)
      const currentPhoneId = phones.some(device=>device.id===spotifyDeviceId) ? spotifyDeviceId : ''
      const activePhone = phones.find(device=>device.is_active)
      const nextDevice = currentPhoneId || activePhone?.id || phones[0]?.id || ''
      setSpotifyDeviceId(nextDevice)
      const playbackIsPersonal = isPersonalPhone(playback?.device)
      setSpotifyTrack(playbackIsPersonal ? trackFromPlayback(playback) : null)
      setSpotifyPlaying(Boolean(playbackIsPersonal && playback?.is_playing))
      setSpotifyStatus('Tilkopla ' + (profile.display_name || 'Spotify'))
      setSpotifyError('')
    } catch (error) {
      setSpotifyError(error.message || 'Kunne ikkje henta Spotify-data.')
      setSpotifyStatus('Spotify-data er mellombels utilgjengeleg.')
    }
  },[spotifyRequest,spotifyDeviceId])

  useEffect(() => {
    setSpotifyToken(readToken(memberId))
    setSpotifyProfile(null)
    setSpotifyTrack(null)
    setSpotifyPlaying(false)
    setSpotifyDevices([])
    setSpotifyDeviceId('')
    setSpotifyPlaylists([])
    setSelectedPlaylist('')
    setGenrePlaylists({})
    setActiveGenre('')
    setSpotifyError('')
    setSpotifyStatus('Kople til din private Spotify-konto.')
  },[memberId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (oauthError) {
      setSpotifyError(oauthError==='access_denied' ? 'Du avbraut Spotify-innlogginga.' : 'Spotify avviste innlogginga: '+oauthError)
      window.history.replaceState({},document.title,REDIRECT_URI())
      return
    }
    const code = params.get('code')
    const state = params.get('state')
    if (!code) return
    const expectedState = sessionStorage.getItem(STATE_KEY)
    const verifier = sessionStorage.getItem(VERIFIER_KEY)
    const cleanUrl = REDIRECT_URI()
    window.history.replaceState({},document.title,cleanUrl)
    if (!expectedState || state!==expectedState || !verifier) {
      setSpotifyError('Spotify-innlogginga kunne ikkje stadfestast. Prøv å kople til på nytt.')
      return
    }
    sessionStorage.removeItem(STATE_KEY)
    sessionStorage.removeItem(VERIFIER_KEY)
    ;(async()=>{
      try {
        const response = await fetch('https://accounts.spotify.com/api/token',{
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({
            client_id:getClientId(),
            grant_type:'authorization_code',
            code,
            redirect_uri:cleanUrl,
            code_verifier:verifier,
          }),
        })
        const token = await response.json().catch(()=>({}))
        if (!response.ok) throw new Error(token.error_description || 'Spotify kunne ikkje fullføre innlogginga.')
        const saved = {...token,expires_at:Date.now()+Number(token.expires_in||3600)*1000}
        saveToken(memberId,saved)
        setSpotifyToken(saved)
        setSpotifyStatus('Spotify er kopla til.')
        setSpotifyError('')
      } catch(error) {
        setSpotifyError(error.message || 'Spotify-innlogginga feila.')
      }
    })()
  },[memberId])

  useEffect(() => {
    if (spotifyToken?.access_token) loadSpotifyData()
  },[spotifyToken?.access_token,loadSpotifyData])

  useEffect(() => {
    if (!memberId) return
    let live = true
    supabase.from('member_preferences')
      .select('spotify_genre_playlists')
      .eq('user_id',memberId)
      .maybeSingle()
      .then(({data,error})=>{
        if (!live) return
        if (!error) setGenrePlaylists(data?.spotify_genre_playlists || {})
      })
    return ()=>{live=false}
  },[memberId])

  useEffect(() => {
    if (!spotifyToken?.access_token) return undefined
    let live = true
    const timer = window.setInterval(async()=>{
      try {
        const [playback,devices] = await Promise.all([
          spotifyRequest('/me/player').catch(()=>null),
          spotifyRequest('/me/player/devices').catch(()=>({devices:[]})),
        ])
        if (!live) return
        const phones = (devices?.devices || []).filter(isPersonalPhone)
        setSpotifyDevices(phones)
        if (!phones.some(device=>device.id===spotifyDeviceId)) {
          setSpotifyDeviceId(phones.find(device=>device.is_active)?.id || phones[0]?.id || '')
        }
        const personal = isPersonalPhone(playback?.device)
        setSpotifyTrack(personal ? trackFromPlayback(playback) : null)
        setSpotifyPlaying(Boolean(personal && playback?.is_playing))
      } catch { /* Neste oppdatering eller brukarhandling prøver igjen. */ }
    },20000)
    return ()=>{live=false;window.clearInterval(timer)}
  },[spotifyToken?.access_token,spotifyRequest,spotifyDeviceId])

  const connectSpotify = useCallback(async () => {
    try {
      const verifier = randomString(64)
      const state = randomString(32)
      sessionStorage.setItem(VERIFIER_KEY,verifier)
      sessionStorage.setItem(STATE_KEY,state)
      const challenge = await sha256(verifier)
      const params = new URLSearchParams({
        client_id:getClientId(),
        response_type:'code',
        redirect_uri:REDIRECT_URI(),
        code_challenge_method:'S256',
        code_challenge:challenge,
        state,
        scope:'user-read-private playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state user-read-currently-playing',
      })
      window.location.assign('https://accounts.spotify.com/authorize?'+params.toString())
    } catch(error) {
      setSpotifyError(error.message || 'Kunne ikkje starta Spotify-innlogginga.')
    }
  },[])

  const disconnectSpotify = useCallback(() => {
    clearToken(memberId)
    setSpotifyToken(null)
    setSpotifyProfile(null)
    setSpotifyTrack(null)
    setSpotifyPlaying(false)
    setSpotifyPlaylists([])
    setSpotifyDevices([])
    setSpotifyDeviceId('')
    setSelectedPlaylist('')
    setActiveGenre('')
    setSpotifyStatus('Spotify fråkopla.')
    setSpotifyError('')
  },[memberId])

  const requirePersonalPhone = useCallback(() => {
    if (!spotifyDeviceId || !spotifyDevices.some(device=>device.id===spotifyDeviceId)) {
      throw new Error('Opna Spotify på din eigen mobil, start appen og trykk Oppdater einingar.')
    }
  },[spotifyDeviceId,spotifyDevices])

  const refreshPlayback = useCallback(async()=>{
    const [playback,devices] = await Promise.all([
      spotifyRequest('/me/player').catch(()=>null),
      spotifyRequest('/me/player/devices').catch(()=>({devices:[]})),
    ])
    const phones=(devices?.devices||[]).filter(isPersonalPhone)
    setSpotifyDevices(phones)
    const personal=isPersonalPhone(playback?.device)
    setSpotifyTrack(personal?trackFromPlayback(playback):null)
    setSpotifyPlaying(Boolean(personal&&playback?.is_playing))
  },[spotifyRequest])

  const spotifyAction = useCallback(async action => {
    setSpotifyBusy(true)
    setSpotifyError('')
    try {
      if (action==='refresh') {
        await loadSpotifyData()
        return
      }
      requirePersonalPhone()
      const device = '?device_id='+encodeURIComponent(spotifyDeviceId)
      if (action==='play') await spotifyRequest('/me/player/play'+device,{method:'PUT'})
      if (action==='pause') await spotifyRequest('/me/player/pause'+device,{method:'PUT'})
      if (action==='next') await spotifyRequest('/me/player/next'+device,{method:'POST'})
      if (action==='previous') await spotifyRequest('/me/player/previous'+device,{method:'POST'})
      await new Promise(resolve=>window.setTimeout(resolve,450))
      await refreshPlayback()
    } catch(error) {
      setSpotifyError(error.message || 'Spotify-handlinga feila.')
    } finally {
      setSpotifyBusy(false)
    }
  },[spotifyDeviceId,spotifyRequest,loadSpotifyData,refreshPlayback,requirePersonalPhone])

  const playPlaylist = useCallback(async(playlistUri,genreId='')=>{
    if (!playlistUri) return
    setSpotifyBusy(true)
    setSpotifyError('')
    try {
      requirePersonalPhone()
      const device='?device_id='+encodeURIComponent(spotifyDeviceId)
      await spotifyRequest('/me/player/play'+device,{
        method:'PUT',
        body:JSON.stringify({context_uri:playlistUri}),
      })
      setSelectedPlaylist(playlistUri)
      setActiveGenre(genreId)
      await new Promise(resolve=>window.setTimeout(resolve,500))
      await refreshPlayback()
    } catch(error) {
      setSpotifyError(error.message || 'Klarte ikkje starta spelelista.')
    } finally {
      setSpotifyBusy(false)
    }
  },[spotifyDeviceId,spotifyRequest,refreshPlayback,requirePersonalPhone])

  const playTrack = useCallback(async track=>{
    if (!track?.uri) return
    setSpotifyBusy(true)
    setSpotifyError('')
    try {
      requirePersonalPhone()
      const device='?device_id='+encodeURIComponent(spotifyDeviceId)
      await spotifyRequest('/me/player/play'+device,{
        method:'PUT',
        body:JSON.stringify({uris:[track.uri],position_ms:0}),
      })
      setActiveGenre('')
      await new Promise(resolve=>window.setTimeout(resolve,450))
      await refreshPlayback()
    } catch(error) {
      setSpotifyError(error.message || 'Klarte ikkje spela songen.')
    } finally {
      setSpotifyBusy(false)
    }
  },[spotifyDeviceId,spotifyRequest,refreshPlayback,requirePersonalPhone])

  const searchSpotify = useCallback(async query=>{
    const value=String(query||'').trim()
    if (value.length<2) return {tracks:[],artists:[]}
    const result=await spotifyRequest('/search?q='+encodeURIComponent(value)+'&type=track,artist&limit=10')
    return {
      tracks:result?.tracks?.items||[],
      artists:result?.artists?.items||[],
    }
  },[spotifyRequest])

  const getPlaylistItems = useCallback(async playlistId=>{
    if (!playlistId) return []
    const result=await spotifyRequest('/playlists/'+encodeURIComponent(playlistId)+'/items?limit=50')
    return (result?.items||[]).map(row=>row?.item||row?.track).filter(item=>item&&item.type==='track')
  },[spotifyRequest])

  const saveGenrePlaylist = useCallback(async(genreId,playlistUri)=>{
    if (!memberId) throw new Error('Logg inn på nytt for å lagra sjangerknappane.')
    const updated={...genrePlaylists}
    if (playlistUri) updated[genreId]=playlistUri
    else delete updated[genreId]
    const {error}=await supabase.from('member_preferences').upsert({
      user_id:memberId,
      spotify_genre_playlists:updated,
      updated_at:new Date().toISOString(),
    },{onConflict:'user_id'})
    if (error) throw error
    setGenrePlaylists(updated)
    if (activeGenre===genreId) setActiveGenre('')
  },[memberId,genrePlaylists,activeGenre])

  const playGenre = useCallback(async genreId=>{
    const uri=genrePlaylists[genreId]
    if (!uri) {
      setSpotifyError('Vel ei speleliste for '+(SPOTIFY_GENRES.find(item=>item.id===genreId)?.label||'denne sjangeren')+' først.')
      return
    }
    await playPlaylist(uri,genreId)
  },[genrePlaylists,playPlaylist])

  const value = useMemo(()=>({
    clientId,
    spotifyConfigured:Boolean(clientId),
    spotifyConnected:Boolean(spotifyToken?.access_token),
    spotifyProfile,
    spotifyTrack,
    spotifyPlaying,
    spotifyDevices,
    spotifyDeviceId,
    setSpotifyDeviceId,
    spotifyPlaylists,
    spotifyStatus,
    spotifyBusy,
    spotifyError,
    setSpotifyError,
    spotifyCanControl:Boolean(spotifyDeviceId && spotifyDevices.some(device=>device.id===spotifyDeviceId)),
    connectSpotify,
    disconnectSpotify,
    spotifyAction,
    playPlaylist,
    playTrack,
    searchSpotify,
    getPlaylistItems,
    selectedPlaylist,
    genrePlaylists,
    saveGenrePlaylist,
    playGenre,
    activeGenre,
  }),[
    clientId,spotifyToken,spotifyProfile,spotifyTrack,spotifyPlaying,spotifyDevices,spotifyDeviceId,
    spotifyPlaylists,spotifyStatus,spotifyBusy,spotifyError,connectSpotify,disconnectSpotify,
    spotifyAction,playPlaylist,playTrack,searchSpotify,getPlaylistItems,selectedPlaylist,
    genrePlaylists,saveGenrePlaylist,playGenre,activeGenre
  ])
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

export function useMusic() { return useContext(MusicContext) }

function SpotifyConnectCard({compact=false}) {
  const music=useMusic()
  if (!music) return null
  return <section className={'personal-spotify-player'+(compact?' compact':'')}>
    <div className="personal-spotify-player-head">
      <div className="personal-spotify-mark"><Music2 size={compact?15:18}/></div>
      <div className="personal-spotify-account">
        <span className="section-kicker">PRIVAT SPOTIFY</span>
        <strong>{music.spotifyProfile?.display_name||'Din Spotify-profil'}</strong>
        <small>{music.spotifyConnected?music.spotifyStatus:'Ikkje tilkopla'}</small>
      </div>
      {music.spotifyConnected&&<button type="button" className="spotify-disconnect" onClick={music.disconnectSpotify} title="Kople frå Spotify" aria-label="Kople frå Spotify"><LogOut size={14}/></button>}
    </div>
    {music.spotifyConnected ? <>
      <div className="personal-spotify-now">
        <div className="personal-spotify-art">{music.spotifyTrack?.imageUrl&&!compact?<img src={music.spotifyTrack.imageUrl} alt=""/>:<Disc3 size={compact?19:25}/>}</div>
        <div className="personal-spotify-meta">
          <strong>{music.spotifyTrack?.name||'Ingen song spelar på mobilen'}</strong>
          <span>{music.spotifyTrack?.artists?.join(', ')||'Vel ei speleliste eller søk etter ein song'}</span>
        </div>
        {music.spotifyTrack?.externalUrl&&<a className="spotify-open-track" href={music.spotifyTrack.externalUrl} target="_blank" rel="noreferrer" aria-label="Opna song i Spotify"><ExternalLink size={13}/></a>}
      </div>
      <div className="personal-spotify-controls">
        <button type="button" onClick={()=>music.spotifyAction('previous')} disabled={music.spotifyBusy||!music.spotifyCanControl||!music.spotifyDeviceId} aria-label="Førre song"><SkipBack size={compact?14:17}/></button>
        <button type="button" className="spotify-play-button" onClick={()=>music.spotifyAction(music.spotifyPlaying?'pause':'play')} disabled={music.spotifyBusy||!music.spotifyCanControl||!music.spotifyDeviceId} aria-label={music.spotifyPlaying?'Pause':'Spel av'}>{music.spotifyPlaying?<Pause size={compact?15:18}/>:<Play size={compact?15:18}/>}</button>
        <button type="button" onClick={()=>music.spotifyAction('next')} disabled={music.spotifyBusy||!music.spotifyCanControl||!music.spotifyDeviceId} aria-label="Neste song"><SkipForward size={compact?14:17}/></button>
        <button type="button" onClick={()=>music.spotifyAction('refresh')} disabled={music.spotifyBusy} aria-label="Oppdater Spotify"><RefreshCw size={compact?13:15}/></button>
      </div>
      {!compact&&<div className="personal-spotify-selects">
        <label><span><Smartphone size={12}/> Personleg mobil</span><select value={music.spotifyDeviceId} onChange={event=>music.setSpotifyDeviceId(event.target.value)}><option value="">Vel mobil …</option>{music.spotifyDevices.map(device=><option key={device.id} value={device.id}>{device.name}{device.is_active?' · aktiv':''}</option>)}</select></label>
      </div>}
      {!music.spotifyDeviceId&&<p className="spotify-hint">Opna Spotify på din eigen mobil og trykk Oppdater einingar. Berre personlege mobil-einingar blir viste.</p>}
    </> : <div className="personal-spotify-connect">
      {!compact&&<p>Kople til din eigen Spotify-profil. GarasjeGym lagrar ikkje Spotify-passord eller deler kontoen med andre.</p>}
      <button type="button" className="spotify-connect-button" onClick={music.connectSpotify}><LogIn size={15}/> Kople til Spotify</button>
    </div>}
    {music.spotifyError&&<div className="spotify-error" role="alert">{music.spotifyError}{music.spotifyConnected&&<button type="button" className="secondary-button" onClick={()=>{music.disconnectSpotify();music.connectSpotify()}}>Kople til på nytt</button>}</div>}
  </section>
}

function TrackRow({track,onPlay,busy=false,compact=false}) {
  return <article className={'spotify-track-row'+(compact?' compact':'')}>
    <div className="spotify-track-art">{track.album?.images?.[0]?.url?<img src={track.album.images[0].url} alt=""/>:<Disc3 size={16}/>}</div>
    <div className="spotify-track-copy"><strong>{track.name}</strong><small>{(track.artists||[]).map(artist=>artist.name||artist).join(', ')}{track.album?.name?' · '+track.album.name:''}</small></div>
    <button type="button" className="spotify-row-play" onClick={()=>onPlay(track)} disabled={busy} aria-label={'Spel '+track.name}><Play size={14}/></button>
    {track.external_urls?.spotify&&<a href={track.external_urls.spotify} target="_blank" rel="noreferrer" className="spotify-row-link" aria-label="Opna i Spotify"><ExternalLink size={12}/></a>}
  </article>
}

function useDebouncedSpotifySearch(searchSpotify,connected,query,active=true) {
  const [results,setResults]=useState({tracks:[],artists:[]})
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{
    let live=true
    const value=query.trim()
    if (!active||!connected||value.length<2) {
      setResults({tracks:[],artists:[]})
      setBusy(false)
      setError('')
      return ()=>{live=false}
    }
    setBusy(true)
    setError('')
    const timer=window.setTimeout(async()=>{
      try {
        const next=await searchSpotify(value)
        if (live) setResults(next)
      } catch(err) {
        if (live) setError(err.message||'Søket feila.')
      } finally {
        if (live) setBusy(false)
      }
    },350)
    return ()=>{live=false;window.clearTimeout(timer)}
  },[searchSpotify,connected,query,active])
  return {results,busy,error}
}

function GenreButtons({music,compact=false}) {
  return <div className={'spotify-genre-buttons'+(compact?' compact':'')}>
    {SPOTIFY_GENRES.map(genre=>{
      const Icon=genre.Icon
      const configured=Boolean(music.genrePlaylists[genre.id])
      const active=music.activeGenre===genre.id
      return <button type="button" key={genre.id} className={active?'selected':''} title={configured?genre.label:genre.label+' – vel speleliste først'} aria-label={genre.label} aria-pressed={active} disabled={!music.spotifyConnected||music.spotifyBusy||!configured} onClick={()=>music.playGenre(genre.id)}>
        <Icon size={compact?13:16}/><span>{genre.label}</span>
      </button>
    })}
  </div>
}

export function Music() {
  const music=useMusic()
  const [tab,setTab]=useState('search')
  const [query,setQuery]=useState('')
  const [playlistQuery,setPlaylistQuery]=useState('')
  const [selectedPlaylistId,setSelectedPlaylistId]=useState('')
  const [playlistItems,setPlaylistItems]=useState([])
  const [playlistItemsBusy,setPlaylistItemsBusy]=useState(false)
  const [playlistItemsError,setPlaylistItemsError]=useState('')
  const [savingGenre,setSavingGenre]=useState('')
  const search=useDebouncedSpotifySearch(music.searchSpotify,music.spotifyConnected,query,tab==='search')
  const visiblePlaylists=useMemo(()=>music.spotifyPlaylists.filter(playlist=>(playlist.name||'').toLowerCase().includes(playlistQuery.toLowerCase())),[music.spotifyPlaylists,playlistQuery])
  const selectedPlaylist=music.spotifyPlaylists.find(playlist=>playlist.id===selectedPlaylistId)

  async function openPlaylist(playlist) {
    setSelectedPlaylistId(playlist.id)
    setPlaylistItems([])
    setPlaylistItemsError('')
    setPlaylistItemsBusy(true)
    try {
      const items=await music.getPlaylistItems(playlist.id)
      setPlaylistItems(items)
    } catch(error) {
      setPlaylistItemsError(error.message||'Klarte ikkje henta songane i spelelista.')
    } finally {
      setPlaylistItemsBusy(false)
    }
  }

  async function changeGenre(genreId,uri) {
    setSavingGenre(genreId)
    music.setSpotifyError('')
    try {
      await music.saveGenrePlaylist(genreId,uri)
    } catch(error) {
      music.setSpotifyError(error.message||'Kunne ikkje lagra sjangerkoplinga.')
    } finally {
      setSavingGenre('')
    }
  }

  return <div className="music-page">
    <div className="music-heading">
      <div className="music-heading-icon"><Headphones size={22}/></div>
      <div><span className="section-kicker">GARASJEGYM · DIN MUSIKK</span><h2>Spotify</h2><p>Enkel musikkstyring – direkte frå treningsmodus.</p></div>
    </div>
    <SpotifyConnectCard/>
    <div className="music-personal-use-note"><Headphones size={14}/> For personleg lytting på di eiga eining og med eigne hovudtelefonar. Ikkje bruk integrasjonen til felles/offentleg avspeling.</div>
    {music.spotifyConnected&&<>
      <GenreButtons music={music}/>
      <nav className="music-tabs" aria-label="Spotify-funksjonar">
        <button type="button" className={tab==='search'?'selected':''} onClick={()=>setTab('search')}><Search size={14}/> Søk</button>
        <button type="button" className={tab==='playlists'?'selected':''} onClick={()=>setTab('playlists')}><ListMusic size={14}/> Spelelister</button>
        <button type="button" className={tab==='genres'?'selected':''} onClick={()=>setTab('genres')}><Settings2 size={14}/> Sjangerknappar</button>
      </nav>
      {tab==='search'&&<section className="spotify-content-panel">
        <label className="spotify-search-field"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Søk etter song eller artist …"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Tøm søk"><X size={14}/></button>}</label>
        {query.trim().length<2?<p className="spotify-panel-hint">Skriv minst to teikn for å søka i Spotify-katalogen.</p>:search.busy?<div className="spotify-panel-loading"><LoaderCircle size={16} className="spin"/> Søkjer …</div>:search.error?<div className="spotify-error">{search.error}</div>:<>
          {search.results.tracks.length>0&&<div className="spotify-results-group"><h4>Songar</h4>{search.results.tracks.map(track=><TrackRow key={track.id} track={track} onPlay={music.playTrack} busy={music.spotifyBusy}/>)}</div>}
          {search.results.artists.length>0&&<div className="spotify-results-group"><h4>Artistar</h4>{search.results.artists.map(artist=><article className="spotify-artist-row" key={artist.id}><div className="spotify-artist-art">{artist.images?.[0]?.url?<img src={artist.images[0].url} alt=""/>:<Music2 size={16}/>}</div><strong>{artist.name}</strong>{artist.external_urls?.spotify&&<a href={artist.external_urls.spotify} target="_blank" rel="noreferrer">Opna i Spotify <ExternalLink size={12}/></a>}</article>)}</div>}
          {!search.results.tracks.length&&!search.results.artists.length&&<div className="empty-state">Ingen songar eller artistar fannst.</div>}
        </>}
      </section>}
      {tab==='playlists'&&<section className="spotify-content-panel">
        <label className="spotify-search-field"><Search size={16}/><input value={playlistQuery} onChange={event=>setPlaylistQuery(event.target.value)} placeholder="Filtrer speelistene dine …"/>{playlistQuery&&<button type="button" onClick={()=>setPlaylistQuery('')} aria-label="Tøm filter"><X size={14}/></button>}</label>
        <div className="spotify-playlist-browser">
          <div className="spotify-playlist-list">{visiblePlaylists.length?visiblePlaylists.map(playlist=><article className={'spotify-playlist-row '+(selectedPlaylistId===playlist.id?'selected':'')} key={playlist.id}>
            <button type="button" className="spotify-playlist-open" onClick={()=>openPlaylist(playlist)}>
              <span className="spotify-playlist-art">{playlist.images?.[0]?.url?<img src={playlist.images[0].url} alt=""/>:<ListMusic size={17}/>}</span>
              <span><strong>{playlist.name}</strong><small>{playlist.tracks?.total??playlist.items?.total??'–'} songar</small></span>
            </button>
            <button type="button" className="spotify-row-play" title="Spel speleliste på eigen mobil" onClick={()=>music.playPlaylist(playlist.uri)} disabled={music.spotifyBusy}><Play size={14}/></button>
          </article>):<div className="empty-state">Ingen spelelister passar søket.</div>}</div>
          {selectedPlaylist&&<aside className="spotify-playlist-detail">
            <div className="spotify-playlist-detail-head"><strong>{selectedPlaylist.name}</strong><button type="button" onClick={()=>setSelectedPlaylistId('')} aria-label="Lukk speleliste"><X size={14}/></button></div>
            {playlistItemsBusy?<div className="spotify-panel-loading"><LoaderCircle size={15} className="spin"/> Hentar songar …</div>:playlistItemsError?<div className="spotify-error">{playlistItemsError}</div>:playlistItems.length?playlistItems.slice(0,50).map((track,index)=><TrackRow key={track.id||track.uri||index} track={track} onPlay={music.playTrack} busy={music.spotifyBusy} compact/>):<div className="empty-state">Ingen songar å visa.</div>}
          </aside>}
        </div>
      </section>}
      {tab==='genres'&&<section className="spotify-content-panel">
        <div className="spotify-section-intro"><strong>Kopla hurtigknappane til spelelister</strong><span>Vel kva av speelistene dine kvar sjanger skal starta. Valet blir lagra på GarasjeGym-profilen din.</span></div>
        <div className="spotify-genre-settings">{SPOTIFY_GENRES.map(genre=>{
          const Icon=genre.Icon
          return <label className="spotify-genre-setting" key={genre.id}><span className="spotify-genre-setting-name"><Icon size={17}/><strong>{genre.label}</strong></span><select value={music.genrePlaylists[genre.id]||''} disabled={savingGenre===genre.id} onChange={event=>changeGenre(genre.id,event.target.value)}><option value="">Ikkje kopla</option>{music.spotifyPlaylists.map(playlist=><option key={playlist.id} value={playlist.uri}>{playlist.name}</option>)}</select>{savingGenre===genre.id&&<small>Lagrar …</small>}</label>
        })}</div>
      </section>}
    </>}
    <p className="music-footnote">Kvar medlem koplar til sin eigen Spotify-konto. Tilgangsdata og sjangerkoplingar blir haldne separate per GarasjeGym-brukar. Spotify-passord blir aldri lagra i GarasjeGym.</p>
  </div>
}

export function MusicMiniPlayer() {
  const music=useMusic()
  const [toolsOpen,setToolsOpen]=useState(false)
  const [toolsTab,setToolsTab]=useState('search')
  const [query,setQuery]=useState('')
  const [playlistQuery,setPlaylistQuery]=useState('')
  const search=useDebouncedSpotifySearch(music.searchSpotify,music.spotifyConnected,query,toolsOpen&&toolsTab==='search')
  const visiblePlaylists=music.spotifyPlaylists.filter(playlist=>(playlist.name||'').toLowerCase().includes(playlistQuery.toLowerCase()))

  return <div className="timer-music-stack">
    <div className="timer-spotify-mini-line">
      <div className="timer-spotify-mini-track"><Music2 size={15}/><span><strong>{music?.spotifyTrack?.name||'Spotify'}</strong><small>{music?.spotifyTrack?.artists?.join(', ')|| (music?.spotifyConnected?'Klar på din mobil':'Kople til profilen din')}</small></span></div>
      {music?.spotifyConnected?<div className="timer-spotify-mini-controls">
        <button type="button" onClick={()=>music.spotifyAction('previous')} disabled={music.spotifyBusy||!music.spotifyCanControl||!music.spotifyDeviceId} aria-label="Førre song"><SkipBack size={13}/></button>
        <button type="button" className="main" onClick={()=>music.spotifyAction(music.spotifyPlaying?'pause':'play')} disabled={music.spotifyBusy||!music.spotifyCanControl||!music.spotifyDeviceId} aria-label={music.spotifyPlaying?'Pause':'Spel av'}>{music.spotifyPlaying?<Pause size={14}/>:<Play size={14}/>}</button>
        <button type="button" onClick={()=>music.spotifyAction('next')} disabled={music.spotifyBusy||!music.spotifyCanControl||!music.spotifyDeviceId} aria-label="Neste song"><SkipForward size={13}/></button>
      </div>:<button type="button" className="spotify-mini-connect" onClick={music.connectSpotify}><LogIn size={13}/> Kople til</button>}
      <button type="button" className={'timer-spotify-tools-toggle'+(toolsOpen?' selected':'')} onClick={()=>setToolsOpen(value=>!value)} aria-expanded={toolsOpen} aria-label={toolsOpen?'Lukk musikkverktøy':'Opna søk og spelelister'}>{toolsOpen?<X size={14}/>:<Search size={14}/>}</button>
    </div>
    <GenreButtons music={music} compact/>
    {toolsOpen&&<div className="spotify-mini-tools" role="dialog" aria-label="Spotify-søk og spelelister">
      <div className="spotify-mini-tools-head"><strong>Spotify</strong><button type="button" onClick={()=>setToolsOpen(false)} aria-label="Lukk"><X size={14}/></button></div>
      {!music.spotifyConnected?<div className="empty-state">Kople til Spotify-profilen for å søka og sjå spelelister.</div>:<>
        <nav className="spotify-mini-tabs"><button type="button" className={toolsTab==='search'?'selected':''} onClick={()=>setToolsTab('search')}><Search size={12}/> Søk</button><button type="button" className={toolsTab==='playlists'?'selected':''} onClick={()=>setToolsTab('playlists')}><ListMusic size={12}/> Spelelister</button></nav>
        {toolsTab==='search'?<>
          <label className="spotify-search-field"><Search size={13}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Song eller artist …"/></label>
          {query.trim().length>=2&&search.busy&&<div className="spotify-panel-loading"><LoaderCircle size={13} className="spin"/> Søkjer …</div>}
          {search.error&&<div className="spotify-error">{search.error}</div>}
          {search.results.tracks.slice(0,5).map(track=><TrackRow key={track.id} track={track} onPlay={music.playTrack} busy={music.spotifyBusy} compact/>)}
          {search.results.artists.slice(0,3).map(artist=><article className="spotify-artist-row compact" key={artist.id}><strong>{artist.name}</strong>{artist.external_urls?.spotify&&<a href={artist.external_urls.spotify} target="_blank" rel="noreferrer">Opna <ExternalLink size={11}/></a>}</article>)}
          {query.trim().length>=2&&!search.busy&&!search.error&&!search.results.tracks.length&&!search.results.artists.length&&<small className="spotify-panel-hint">Ingen treff.</small>}
        </>:<>
          <label className="spotify-search-field"><Search size={13}/><input value={playlistQuery} onChange={event=>setPlaylistQuery(event.target.value)} placeholder="Filtrer spelelister …"/></label>
          <div className="spotify-mini-playlists">{visiblePlaylists.slice(0,10).map(playlist=><div className="spotify-mini-playlist" key={playlist.id}><span><strong>{playlist.name}</strong><small>{playlist.tracks?.total??playlist.items?.total??'–'} songar</small></span><button type="button" onClick={()=>music.playPlaylist(playlist.uri)} disabled={music.spotifyBusy} aria-label={'Spel '+playlist.name}><Play size={13}/></button></div>)}</div>
        </>}
      </>}
    </div>}
    {music?.spotifyError&&!toolsOpen&&<small className="spotify-mini-error">{music.spotifyError}</small>}
  </div>
}
