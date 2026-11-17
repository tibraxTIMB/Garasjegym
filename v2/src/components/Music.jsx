import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Disc3, Headphones, Music2, Pause, Play, SkipBack, SkipForward, Shuffle, Unplug } from 'lucide-react'

const SpotifyContext = createContext(null)
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin + window.location.pathname
const COMMERCIAL_APPROVED = import.meta.env.VITE_SPOTIFY_COMMERCIAL_APPROVED === 'true'
const SCOPES = ['streaming','user-read-email','user-read-private','user-read-playback-state','user-modify-playback-state','playlist-read-private','playlist-read-collaborative']
const categories = [
  { id:'hard-rock', label:'Hard rock', emoji:'🎸', description:'Klassisk hard rock og heavy rock', artists:['AC/DC','Led Zeppelin','Deep Purple','Black Sabbath','Motörhead','Judas Priest','Iron Maiden','Guns N’ Roses','Van Halen','ZZ Top','Whitesnake','Thin Lizzy','Rainbow','Scorpions','The Cult','Alice Cooper','UFO','Bad Company','Aerosmith','Kiss'] },
  { id:'balkan-turbo', label:'Balkan turbo', emoji:'🪗', description:'Turbo-folk, Balkan pop-folk og brass', artists:['Ceca','Lepa Brena','Seka Aleksic','Jelena Karleusa','Mile Kitic','Aca Lukas','Dragana Mirkovic','Indira Radic','Dara Bubamara','Boban Markovic Orkestar','Fanfare Ciocarlia','Shantel','Goran Bregovic','Dubioza Kolektiv'] },
  { id:'indie-90s', label:'90s indie', emoji:'🎧', description:'Britpop og alternativ indie frå 90-talet', artists:['Oasis','Blur','Pulp','Suede','The Verve','Radiohead','The Cranberries','Pixies','The Smashing Pumpkins','Pavement','Belle and Sebastian','The Breeders','Elastica','Placebo','Supergrass','Manic Street Preachers','The Cardigans','The Sundays'] },
  { id:'dance-trance-90s', label:'90s dance & trance', emoji:'🪩', description:'Eurodance, rave og klassisk trance', artists:['2 Unlimited','Snap!','Culture Beat','Haddaway','Corona','La Bouche','Robert Miles','Faithless','ATB','Alice Deejay','E-Type','Dr. Alban','Sash!','Vengaboys','The Prodigy','Darude','Paul van Dyk','Chicane','DJ Quicksilver','N-Trance'] },
  { id:'relax', label:'Relax', emoji:'🌙', description:'Ambient, chillout, downtempo og akustisk', artists:['Brian Eno','Marconi Union','Tycho','Bonobo','Zero 7','Air','Boards of Canada','The Cinematic Orchestra','Ólafur Arnalds','Nils Frahm','Max Richter','Ludovico Einaudi','Enya','Cafe del Mar','Thievery Corporation','José González','Iron & Wine','Nick Drake'] },
]

function base64url(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
async function pkcePair() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64url(digest) }
}
const storageKey = (memberId) => 'gg_spotify_' + memberId

export function SpotifyProvider({ memberId, children }) {
  const [token,setToken] = useState('')
  const [expiresAt,setExpiresAt] = useState(0)
  const [player,setPlayer] = useState(null)
  const [deviceId,setDeviceId] = useState('')
  const [track,setTrack] = useState(null)
  const [playing,setPlaying] = useState(false)
  const [position,setPosition] = useState(0)
  const [duration,setDuration] = useState(0)
  const [status,setStatus] = useState('Ikkje tilkopla')
  const [busy,setBusy] = useState(false)
  const playerRef = useRef(null)
  const tokenRef = useRef(token)
  tokenRef.current = token
  const stateKey = storageKey(memberId)

  const api = useCallback(async (path, method='GET', body) => {
    if (!token) throw new Error('Kopla til Spotify først.')
    const response = await fetch('https://api.spotify.com/v1/' + path, { method, headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {}) })
    if (response.status === 204) return null
    const data = await response.json().catch(()=>({}))
    if (!response.ok) throw new Error(data.error?.message || 'Spotify-feil ('+response.status+').')
    return data
  },[token])

  const connect = useCallback(async () => {
    if (!CLIENT_ID) { setStatus('Mangler VITE_SPOTIFY_CLIENT_ID i byggemiljøet.'); return }
    if (!COMMERCIAL_APPROVED) { setStatus('Avspeling er sperra til kommersiell Spotify-godkjenning er stadfesta.'); return }
    const {verifier,challenge}=await pkcePair()
    sessionStorage.setItem(stateKey+'_verifier',verifier)
    const state=base64url(crypto.getRandomValues(new Uint8Array(16)))
    sessionStorage.setItem(stateKey+'_oauth_state',state)
    const params=new URLSearchParams({client_id:CLIENT_ID,response_type:'code',redirect_uri:REDIRECT_URI,code_challenge_method:'S256',code_challenge:challenge,state,scope:SCOPES.join(' ')})
    window.location.assign('https://accounts.spotify.com/authorize?'+params.toString())
  },[stateKey])

  useEffect(() => {
    if (!memberId) return
    const params=new URLSearchParams(window.location.search)
    const code=params.get('code'), returnedState=params.get('state'), error=params.get('error')
    if (error) { setStatus('Spotify-innlogging avbroten.'); window.history.replaceState({},'',window.location.pathname); return }
    if (code) {
      const verifier=sessionStorage.getItem(stateKey+'_verifier')
      const expected=sessionStorage.getItem(stateKey+'_oauth_state')
      if (!verifier || !expected || returnedState!==expected) { setStatus('Spotify-innlogginga kunne ikkje stadfestast. Prøv på nytt.'); window.history.replaceState({},'',window.location.pathname); return }
      window.history.replaceState({},'',window.location.pathname)
      fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,grant_type:'authorization_code',code,redirect_uri:REDIRECT_URI,code_verifier:verifier})})
        .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error_description||'Tokenutveksling feila.');return d})
        .then(d=>{setToken(d.access_token);setExpiresAt(Date.now()+d.expires_in*1000);sessionStorage.setItem(stateKey,JSON.stringify({access_token:d.access_token,expires_at:Date.now()+d.expires_in*1000,refresh_token:d.refresh_token||null}));setStatus('Spotify tilkopla')})
        .catch(e=>setStatus(e.message))
      sessionStorage.removeItem(stateKey+'_verifier');sessionStorage.removeItem(stateKey+'_oauth_state')
      return
    }
    try { const saved=JSON.parse(sessionStorage.getItem(stateKey)||'null'); if(saved?.access_token && saved.expires_at>Date.now()+30000){setToken(saved.access_token);setExpiresAt(saved.expires_at);setStatus('Spotify tilkopla')} } catch {}
  },[memberId,stateKey])

  useEffect(() => {
    if (!token || !COMMERCIAL_APPROVED || !CLIENT_ID) return
    let cancelled=false
    const load=()=>new Promise((resolve,reject)=>{
      if(window.Spotify){resolve();return}
      const existing=document.querySelector('script[data-spotify-sdk]')
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
      const script=document.createElement('script');script.src='https://sdk.scdn.co/spotify-player.js';script.async=true;script.dataset.spotifySdk='1';script.onload=resolve;script.onerror=reject;document.body.appendChild(script)
    })
    window.onSpotifyWebPlaybackSDKReady=()=>{}
    load().then(()=>new Promise((resolve,reject)=>{
      const sdk=new window.Spotify.Player({name:'GarasjeGym',getOAuthToken:cb=>cb(tokenRef.current),volume:0.65})
      sdk.addListener('ready',({device_id})=>{if(!cancelled){setDeviceId(device_id);setStatus('Spotify-spelar klar')}resolve(sdk)})
      sdk.addListener('not_ready',()=>{if(!cancelled){setDeviceId('');setStatus('Spotify-spelar fråkopla')}})
      sdk.addListener('player_state_changed',s=>{if(!s)return;setTrack(s.track_window.current_track);setPlaying(!s.paused);setPosition(s.position);setDuration(s.duration)})
      sdk.addListener('initialization_error',e=>reject(new Error(e.message)))
      sdk.addListener('authentication_error',()=>setStatus('Spotify-økta er utløpt. Kople til på nytt.'))
      sdk.addListener('account_error',()=>setStatus('Spotify Premium er nødvendig for avspeling i appen.'))
      sdk.connect().then(ok=>{if(!ok)reject(new Error('Kunne ikkje starta Spotify-spelaren.'))})
    })).then(sdk=>{if(cancelled){sdk.disconnect();return}playerRef.current=sdk;setPlayer(sdk)}).catch(e=>setStatus(e.message||'Spotify-spelaren kunne ikkje startast.'))
    return ()=>{cancelled=true}
  },[Boolean(token)])

  useEffect(()=>{
    if(!token||!expiresAt)return
    const id=window.setInterval(async()=>{
      if(Date.now()<expiresAt-90000)return
      try{
        const saved=JSON.parse(sessionStorage.getItem(stateKey)||'null')
        if(!saved?.refresh_token){setStatus('Spotify-økta er utløpt. Kople til på nytt.');return}
        const response=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,grant_type:'refresh_token',refresh_token:saved.refresh_token})})
        const data=await response.json()
        if(!response.ok)throw new Error(data.error_description||'Kunne ikkje fornya Spotify-økta.')
        const next={access_token:data.access_token,expires_at:Date.now()+data.expires_in*1000,refresh_token:data.refresh_token||saved.refresh_token}
        sessionStorage.setItem(stateKey,JSON.stringify(next));setToken(next.access_token);setExpiresAt(next.expires_at);setStatus('Spotify-økta er fornya')
      }catch(e){setStatus(e.message||'Spotify-økta er utløpt. Kople til på nytt.')}
    },15000)
    return()=>clearInterval(id)
  },[token,expiresAt,stateKey])
  useEffect(()=>()=>{playerRef.current?.disconnect()},[])

  const playRandom = useCallback(async (categoryId) => {
    const category=categories.find(c=>c.id===categoryId)
    if(!category) return
    setBusy(true)
    try {
      if(!deviceId) throw new Error('Spotify-spelaren er ikkje klar.')
      setStatus('Finn låt i '+category.label+' …')
      const artists=[...category.artists].sort(()=>Math.random()-.5).slice(0,8)
      const found=[]
      for(const artist of artists){
        const data=await api('search?type=track&limit=10&q='+encodeURIComponent('artist:"'+artist+'"'))
        found.push(...(data.tracks?.items||[]).filter(t=>t.uri&&t.is_playable!==false&&t.artists?.some(a=>a.name.toLocaleLowerCase()===artist.toLocaleLowerCase())))
        if(found.length>=20)break
      }
      const unique=[...new Map(found.map(t=>[t.uri,t])).values()]
      if(!unique.length)throw new Error('Fann ingen spelbare låtar i '+category.label+'.')
      const picked=unique[Math.floor(Math.random()*unique.length)]
      await playerRef.current?.activateElement?.()
      await api('me/player/play?device_id='+encodeURIComponent(deviceId),'PUT',{uris:[picked.uri]})
      setStatus(category.emoji+' '+category.label+' · '+picked.name+' – '+picked.artists.map(a=>a.name).join(', '))
    } catch(e){setStatus(e.message||'Kunne ikkje starta låt.')} finally{setBusy(false)}
  },[api,deviceId])

  const togglePlay=useCallback(async()=>{try{if(!playerRef.current)throw new Error('Spotify-spelaren er ikkje klar.');await playerRef.current.togglePlay()}catch(e){setStatus(e.message)}},[])
  const next=useCallback(async()=>{try{await playerRef.current?.nextTrack()}catch(e){setStatus(e.message)}},[])
  const previous=useCallback(async()=>{try{await playerRef.current?.previousTrack()}catch(e){setStatus(e.message)}},[])
  const disconnect=useCallback(()=>{playerRef.current?.disconnect();playerRef.current=null;setPlayer(null);setDeviceId('');setToken('');setTrack(null);setPlaying(false);sessionStorage.removeItem(stateKey);setStatus('Spotify fråkopla')},[stateKey])
  const value=useMemo(()=>({categories,token,player,deviceId,track,playing,position,duration,status,busy,connect,disconnect,playRandom,togglePlay,next,previous}),[token,player,deviceId,track,playing,position,duration,status,busy,connect,disconnect,playRandom,togglePlay,next,previous])
  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>
}
export function useSpotify(){return useContext(SpotifyContext)}

export function Music({memberId}) {
  const music=useSpotify()
  const connected=Boolean(music?.token)
  return <div className="music-page">
    <div className="music-heading"><div className="music-heading-icon"><Headphones size={22}/></div><div><span className="section-kicker">GARASJEGYM · PERSONLEG MUSIKK</span><h2>Musikk</h2><p>Din Spotify-konto, dine val og din musikk.</p></div></div>
    <section className="music-connect-card">
      <div><strong>{connected?'Spotify er tilkopla':'Kople til Spotify'}</strong><p>{music?.status||'Kvar medlem koplar til sin eigen Spotify-konto.'}</p></div>
      {connected?<button className="secondary-button" onClick={music.disconnect}><Unplug size={15}/> Kople frå</button>:<button className="primary-button" onClick={music.connect}><Music2 size={16}/> Kople til Spotify</button>}
    </section>
    {!CLIENT_ID&&<div className="music-notice">Spotify Client ID manglar. Legg inn <code>VITE_SPOTIFY_CLIENT_ID</code> og redirect-adressa i GitHub Actions / byggemiljøet.</div>}
    {!COMMERCIAL_APPROVED&&<div className="music-notice warning">Spotify-avspeling er deaktivert fram til GarasjeGym har nødvendig skriftleg godkjenning for kommersiell bruk av Spotify Web Playback SDK.</div>}
    <div className="music-section-title"><div><span className="section-kicker">EITT TRYKK · TILFELDIG LÅT</span><h3>Hurtigval</h3></div><Shuffle size={18}/></div>
    <div className="music-presets">{categories.map(c=><button key={c.id} className="music-preset" disabled={!connected||!COMMERCIAL_APPROVED||music.busy} onClick={()=>music.playRandom(c.id)}><span>{c.emoji}</span><strong>{c.label}</strong><small>{c.description}</small><em>{music.busy?'Søkjer …':'Spel tilfeldig låt'}</em></button>)}</div>
    <section className="music-player-card"><div className="music-cover">{music?.track?.album?.images?.[0]?.url?<img src={music.track.album.images[0].url} alt="Albumomslag"/>:<Disc3 size={32}/>}</div><div className="music-track-meta"><strong>{music?.track?.name||'Ingen låt vald'}</strong><span>{music?.track?.artists?.map(a=>a.name).join(', ')||'Albumart og låtinformasjon kjem her'}</span><div className="music-progress"><span style={{width:music?.duration?Math.min(100,music.position/music.duration*100)+'%':'0%'}}/></div></div><div className="music-controls"><button aria-label="Førre låt" disabled={!connected} onClick={music?.previous}><SkipBack size={17}/></button><button aria-label={music?.playing?'Pause':'Spel'} disabled={!connected} onClick={music?.togglePlay}>{music?.playing?<Pause size={18}/>:<Play size={18}/>}</button><button aria-label="Neste låt" disabled={!connected} onClick={music?.next}><SkipForward size={17}/></button></div></section>
    <p className="music-footnote">Avspelaren blir verande aktiv når du går frå Musikk til Trening. Timeren brukar same avspelar – låta startar ikkje på nytt.</p>
  </div>
}

export function MusicMiniPlayer() {
  const m=useSpotify()
  if(!m) return null
  return <div className="music-mini-player"><div className="music-mini-cover">{m.track?.album?.images?.[0]?.url?<img src={m.track.album.images[0].url} alt=""/>:<Disc3 size={18}/>}</div><div className="music-mini-info"><strong>{m.track?.name||'Spotify'}</strong><span>{m.track?.artists?.map(a=>a.name).join(', ')||m.status}</span></div><div className="music-mini-controls"><button aria-label="Pause eller spel" disabled={!m.token} onClick={m.togglePlay}>{m.playing?<Pause size={15}/>:<Play size={15}/>}</button><button aria-label="Neste låt" disabled={!m.token} onClick={m.next}><SkipForward size={15}/></button></div></div>
}
