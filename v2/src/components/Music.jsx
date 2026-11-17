import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Disc3, Headphones, Music2, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const MusicContext = createContext(null)
const presets = [
  { id:'hard-rock', label:'Hard rock', emoji:'🎸', description:'Klassisk hard rock og tung energi' },
  { id:'balkan', label:'Balkan turbo', emoji:'🪗', description:'Balkan pop-folk og brass' },
  { id:'indie-90s', label:'90s indie', emoji:'🎧', description:'Britpop og alternativ rock' },
  { id:'dance-90s', label:'90s dance & trance', emoji:'🪩', description:'Eurodance, rave og trance' },
  { id:'relax', label:'Relax', emoji:'🌙', description:'Ambient, chillout og akustisk' },
]

const PERSONAL_SPOTIFY_KEY = 'garasjegym:personal-spotify-link'
const DEFAULT_SPOTIFY_URL = 'https://open.spotify.com/'
function readSpotifyUrl() {
  try { return localStorage.getItem(PERSONAL_SPOTIFY_KEY) || DEFAULT_SPOTIFY_URL } catch { return DEFAULT_SPOTIFY_URL }
}
function isSpotifyUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'open.spotify.com' || url.hostname === 'spotify.com') } catch { return false }
}

export function MusicProvider({ children }) {
  const [nowPlaying, setNowPlaying] = useState(null)
  const [configured, setConfigured] = useState(false)
  const [staff, setStaff] = useState(false)
  const [status, setStatus] = useState('Koplar til felles musikk …')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('garasjegym-music', { body: { action: 'now-playing' } })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setConfigured(Boolean(data?.configured))
      setStaff(Boolean(data?.staff))
      setNowPlaying(data?.track || null)
      setStatus(data?.configured ? (data.track ? 'Spelar no' : 'Ingen låt rapportert frå lydsona') : (data?.message || 'Soundtrack er ikkje konfigurert'))
    } catch (error) {
      setStatus(error.message || 'Kunne ikkje hente musikkstatus')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(true)
    const id = window.setInterval(() => refresh(true), 30000)
    return () => window.clearInterval(id)
  }, [refresh])

  const value = { nowPlaying, configured, staff, status, loading, refresh }
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
}

export function useMusic() {
  return useContext(MusicContext)
}

export function Music({ isStaff = false }) {
  const music = useMusic()
  const canControl = isStaff && music?.staff
  const [spotifyUrl, setSpotifyUrl] = useState(readSpotifyUrl)
  const [spotifySaved, setSpotifySaved] = useState(false)
  function saveSpotifyUrl() {
    if (!isSpotifyUrl(spotifyUrl)) return
    try { localStorage.setItem(PERSONAL_SPOTIFY_KEY, spotifyUrl.trim()) } catch { /* Lokal lagring kan vere blokkert. */ }
    setSpotifySaved(true)
    window.setTimeout(() => setSpotifySaved(false), 2200)
  }
  function openSpotify() {
    const target = isSpotifyUrl(spotifyUrl) ? spotifyUrl.trim() : DEFAULT_SPOTIFY_URL
    window.open(target, '_blank', 'noopener,noreferrer')
  }
  return <div className="music-page">
    <div className="music-heading">
      <div className="music-heading-icon"><Headphones size={22}/></div>
      <div><span className="section-kicker">GARASJEGYM · FELLES MUSIKK</span><h2>Musikk</h2><p>Éi felles lydsone for treningssenteret. Musikken held fram når du går til timeren.</p></div>
    </div>
    <section className="music-connect-card">
      <div><strong>{music?.configured ? 'Soundtrack er kopla til' : 'Soundtrack ventar på oppsett'}</strong><p>{music?.status || 'Hentar status …'}</p></div>
      <button className="secondary-button" onClick={() => music?.refresh()} disabled={music?.loading}><RefreshCw size={15}/> Oppdater</button>
    </section>
    <section className="personal-spotify-card">
      <div className="personal-spotify-top"><div className="personal-spotify-mark"><Music2 size={19}/></div><div><span className="section-kicker">DIN PRIVATE MUSIKK</span><h3>Spotify</h3><p>Opnar Spotify-appen med din eigen konto. GarasjeGym les eller deler ikkje kva du spelar.</p></div></div>
      <label className="personal-spotify-label">Lenkje til speleliste eller album
        <input value={spotifyUrl} onChange={event => setSpotifyUrl(event.target.value)} placeholder="https://open.spotify.com/playlist/…" inputMode="url"/>
      </label>
      <div className="personal-spotify-actions">
        <button className="primary-button" type="button" onClick={openSpotify}><Music2 size={15}/> Opna Spotify</button>
        <button className="secondary-button" type="button" onClick={saveSpotifyUrl} disabled={!isSpotifyUrl(spotifyUrl)}>Lagra lenkje</button>
        {spotifySaved && <span className="personal-spotify-saved">Lagra på denne eininga</span>}
      </div>
      <small className="personal-spotify-note">Dette er ein snarveg til Spotify – ikkje ei kontotilknyting eller ein innebygd spelar. Du styrer avspelinga i Spotify-appen.</small>
    </section>
    <section className="music-player-card">
      <div className="music-cover">{music?.nowPlaying?.imageUrl ? <img src={music.nowPlaying.imageUrl} alt="Albumomslag"/> : <Disc3 size={32}/>}</div>
      <div className="music-track-meta">
        <strong>{music?.nowPlaying?.name || 'Ingen låt vald'}</strong>
        <span>{music?.nowPlaying?.artists?.join(', ') || (music?.configured ? 'Lydsona rapporterer ingen aktiv låt' : 'Låt, artist og album kjem fram her når Soundtrack er kopla til')}</span>
        {music?.nowPlaying?.album && <small>{music.nowPlaying.album}</small>}
      </div>
      <div className="music-live-tag"><span/> FELLES LYD</div>
    </section>
    {canControl ? <section className="music-admin-panel">
      <div className="music-section-title"><div><span className="section-kicker">BERRE ADMIN / MANAGER</span><h3>Musikkstyring</h3></div><ShieldCheck size={18}/></div>
      <p>Hurtigvala blir kopla til spelelister i Soundtrack-kontoen. Når konto og speleliste-ID-ar er lagde inn, kan tilsette byte musikk herfrå.</p>
      <div className="music-presets">{presets.map(item => <div className="music-preset unavailable" key={item.id}><span>{item.emoji}</span><strong>{item.label}</strong><small>{item.description}</small><em>Vent på speleliste-ID</em></div>)}</div>
      <div className="music-notice">Administratorstyring blir aktivert etter at Soundtrack API-tilgangen og dei fem spelelistene er verifiserte.</div>
    </section> : <div className="music-notice">Musikken blir styrt av GarasjeGym. Medlemmer kan sjå kva som spelar, men kan ikkje endre fellesavspelinga.</div>}
    {!music?.configured && <div className="music-notice warning">Neste steg: legg Soundtrack API-token og lydsone-ID inn som Supabase Edge Function Secrets. Ikkje lim API-token inn i GitHub eller appen.</div>}
    <p className="music-footnote">Avspelaren er felles for alle medlemmene. Timeren viser same låt utan å starte musikken på nytt.</p>
  </div>
}

export function MusicMiniPlayer() {
  const music = useMusic()
  const [spotifyUrl] = useState(readSpotifyUrl)
  if (!music) return null
  return <div className="timer-music-stack">
    <div className="music-mini-player">
      <div className="music-mini-cover">{music.nowPlaying?.imageUrl ? <img src={music.nowPlaying.imageUrl} alt=""/> : <Disc3 size={18}/>}</div>
      <div className="music-mini-info"><strong>{music.nowPlaying?.name || 'Felles musikk'}</strong><span>{music.nowPlaying?.artists?.join(', ') || music.status}</span></div>
      <button className="music-mini-refresh" aria-label="Oppdater fellesmusikk" onClick={() => music.refresh()} disabled={music.loading}><RefreshCw size={14}/></button>
    </div>
    <button className="timer-spotify-shortcut" type="button" onClick={() => window.open(isSpotifyUrl(spotifyUrl) ? spotifyUrl : DEFAULT_SPOTIFY_URL, '_blank', 'noopener,noreferrer')}><Music2 size={14}/> Opna mi Spotify-speleliste</button>
  </div>
}
