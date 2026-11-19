import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Activity,
  Users,
  UserRound,
  Coffee,
  Music2,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Settings,
  Wrench,
  Maximize,
  Minimize,
  Users as UsersIcon,
  UserRound as UserRoundIcon,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { fetchMemberProfile, isStaff } from './lib/auth.js'
import Training from './components/Training.jsx'
import Booking from './components/Booking.jsx'
import PT from './components/PT.jsx'
import PTStudio from './components/PTStudio.jsx'
import Community from './components/Community.jsx'
import CoffeeBar from './components/CoffeeBar.jsx'
import Admin from './components/Admin.jsx'
import Overview from './components/Overview.jsx'
import Notifications from './components/Notifications.jsx'
import WodHub from './components/WodHub.jsx'
import ScheduleHub from './components/ScheduleHub.jsx'
import MyPage from './components/MyPage.jsx'
import MyTraining from './components/MyTraining.jsx'
import PTInfo from './components/PTInfo.jsx'
import { Music, MusicProvider } from './components/Music.jsx'
import { useDeviceProfile } from './lib/deviceLayout.js'

const sections = [
  { id: 'oversikt', label: 'Oversikt', icon: LayoutDashboard, note: 'Dashboard og treningsstatus' },
  { id: 'trening', label: 'Trening', icon: Dumbbell, note: 'WOD, fri trening, logg og PR' },
  { id: 'timeplan', label: 'Timeplan og booking', icon: CalendarDays, note: 'Gruppetimar og PT-avtalar' },
  { id: 'pt-studio', label: 'PT-oppfølging', icon: UserRound, note: 'Personleg treningsplan og mål' },
  { id: 'wod', label: 'WOD', icon: Dumbbell, note: 'WOD-bibliotek og programmering' },
  { id: 'fellesskap', label: 'Fellesskap', icon: Users, note: 'Garasjeprat' },
  { id: 'kaffi', label: 'Kaffebar', icon: Coffee, note: 'Meny og bestillingar' },
  { id: 'musikk', label: 'Musikk', icon: Music2, note: 'Personleg Spotify' },
  { id: 'mi-side', label: 'Mi side', icon: UserRound, note: 'Profil, treningshistorikk og PR' },
]

function AuthScreen({ recovery = false, onRecoveryComplete }) {
  const [mode, setMode] = useState(recovery ? 'update' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'update') {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setMessage('Passordet er oppdatert. Du kan no logga inn med det nye passordet.')
        setMode('login')
        setPassword('')
        onRecoveryComplete?.()
        await supabase.auth.signOut()
      } else if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (resetError) throw resetError
        setMessage('Dersom e-postadressa er registrert, får du ei lenkje for å velja nytt passord.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (authError) throw authError
      }
    } catch (err) {
      setError(err.message || 'Noko gjekk gale. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark"><Wrench size={22} /></div>
          <div><strong>GARASJEGYM</strong><span>STURMKOPF · 2.0</span></div>
        </div>
        <div className="eyebrow"><ShieldCheck size={14} /> MEDLEMSOMRÅDE</div>
        <h1>{mode === 'login' ? <>Velkomen <em>tilbake.</em></> : <>Nytt <em>passord.</em></>}</h1>
        <p className="auth-intro">{mode === 'reset' ? 'Skriv inn e-postadressa di, så sender me ei lenkje for å nullstilla passordet.' : 'Vel eit nytt passord for GarasjeGym-kontoen din.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode !== 'update' && <label>
            E-post
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="namn@epost.no" />
          </label>}
          {mode !== 'reset' && <label>
            Passord
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} placeholder="Passord" />
          </label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message" role="status">{message}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Arbeider …' : mode === 'login' ? 'Logg inn' : mode === 'reset' ? 'Send lenkje' : 'Lagra nytt passord'}
          </button>
        </form>
        <div className="auth-switch">
          {mode !== 'login' && <button type="button" onClick={() => { if (mode === 'update') onRecoveryComplete?.(); setMode('login'); setError(''); setMessage('') }}>Tilbake til innlogging</button>}
          {mode === 'login' && <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Gløymt passord?</button>}
        </div>
        <p className="auth-footnote">Medlemskontoar blir oppretta av administrator.</p>
      </div>
    </main>
  )
}

function LoadingScreen({ text }) {
  return <main className="loading-shell"><div className="brand-mark"><Wrench size={22} /></div><strong>{text}</strong></main>
}

export default function App() {
  useDeviceProfile()
  const [session, setSession] = useState(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [active, setActive] = useState('oversikt')
  const [launchWodId, setLaunchWodId] = useState(null)
  const [launchAssignmentId,setLaunchAssignmentId]=useState(null)
  const [launchProgramSessionId,setLaunchProgramSessionId]=useState(null)
  const [launchProgramSessionTitle,setLaunchProgramSessionTitle]=useState('')
  const [focusWodId,setFocusWodId]=useState(null)
  const [dailyWod,setDailyWod]=useState(null)
  const [launchClassSessionId, setLaunchClassSessionId] = useState(null)
  const [focusPTRequestId, setFocusPTRequestId] = useState(null)
  const [focusPTClientId,setFocusPTClientId]=useState(null)
  const [focusGroupClassId,setFocusGroupClassId]=useState(null)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [quickStart,setQuickStart]=useState(false)
  const [simpleMode,setSimpleMode]=useState(false)
  const [simpleModeReady,setSimpleModeReady]=useState(false)
  const [simpleModeError,setSimpleModeError]=useState('')
  const [simpleModeSaving,setSimpleModeSaving]=useState(false)
  const [newPtWodCount,setNewPtWodCount]=useState(0)
  const [appFullscreen,setAppFullscreen]=useState(Boolean(document.fullscreenElement))
  const [scheduleTab,setScheduleTab]=useState('booking')
  useEffect(()=>{const sync=()=>setAppFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[])
  useEffect(()=>{
    let live=true
    setSimpleModeReady(false)
    setSimpleMode(false)
    setSimpleModeError('')
    if(!session?.user?.id||!profile?.role)return()=>{live=false}
    if(profile.role==='admin'){setSimpleModeReady(true);return()=>{live=false}}
    supabase.from('member_preferences').select('super_simple_mode').eq('user_id',session.user.id).maybeSingle().then(({data,error})=>{
      if(!live)return
      if(error){setSimpleMode(false);setSimpleModeError('Kunne ikkje lesa innstillinga for superenkel modus: '+error.message)}
      else setSimpleMode(Boolean(data?.super_simple_mode))
      setSimpleModeReady(true)
    })
    return()=>{live=false}
  },[session?.user?.id,profile?.role])
  useEffect(()=>{
    if(simpleMode&&!['oversikt','trening','timeplan','mi-trening','wod','pt-info'].includes(active))setActive('oversikt')
  },[simpleMode,active])
  useEffect(()=>{let live=true;async function loadDaily(){const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;const {data,error}=await supabase.from('wod_daily_schedules').select('wod_id,wods(id,name,format,duration_minutes,movements,notes,timer_settings)').eq('scheduled_date',today).is('target_class_id',null).eq('is_published',true).maybeSingle();if(live&&!error)setDailyWod(data?.wods||null);else if(live&&error)setDailyWod(null)}if(session?.user?.id){loadDaily();const timer=setInterval(loadDaily,60000);return()=>{live=false;clearInterval(timer)}}return()=>{live=false}},[session?.user?.id])
  useEffect(()=>{
    const memberId=session?.user?.id
    if(!memberId)return
    let live=true
    const refresh=async()=>{
      const {data:pref}=await supabase.from('member_preferences').select('last_seen_pt_wod_at').eq('user_id',memberId).maybeSingle()
      let query=supabase.from('pt_wod_assignments').select('id',{count:'exact',head:true}).eq('member_id',memberId).in('status',['assigned','in_progress'])
      if(pref?.last_seen_pt_wod_at)query=query.gt('created_at',pref.last_seen_pt_wod_at)
      const {count,error}=await query
      if(live&&!error)setNewPtWodCount(count||0)
    }
    refresh()
    const channel=supabase.channel('member-pt-wod-indicator-'+memberId).on('postgres_changes',{event:'*',schema:'public',table:'pt_wod_assignments',filter:'member_id=eq.'+memberId},refresh).subscribe()
    const timer=setInterval(refresh,60000)
    return()=>{live=false;clearInterval(timer);supabase.removeChannel(channel)}
  },[session?.user?.id])
  async function openMyTraining(){
    const now=new Date().toISOString()
    const {data,error}=await supabase.from('member_preferences').update({last_seen_pt_wod_at:now}).eq('user_id',session.user.id).select('user_id')
    if(!error&&!data?.length)await supabase.from('member_preferences').upsert({user_id:session.user.id,super_simple_mode:false,last_seen_pt_wod_at:now},{onConflict:'user_id'})
    setNewPtWodCount(0)
    setActive('mi-trening')
  }
  async function changeSimpleMode(value){if(profile?.role==='admin')return;const previous=simpleMode;setSimpleMode(value);setSimpleModeError('');setSimpleModeSaving(true);try{const {error}=await supabase.from('member_preferences').upsert({user_id:session.user.id,super_simple_mode:value,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;setSimpleModeError('Valet er lagra.')}catch(error){setSimpleMode(previous);setSimpleModeError('Kunne ikkje lagra valet: '+(error.message||'Ukjend feil'))}finally{setSimpleModeSaving(false)}}
  async function toggleAppFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setProfileError('Fullskjerm er ikkje tilgjengeleg i denne nettlesaren.')}}
  async function openWorkout(log) {
    if (!log?.id) { setSelectedWorkout(log); return }
    setSelectedWorkout({...log,exercises:null,detailLoading:true,detailError:''})
    try {
      const { data: exercises, error } = await supabase.from('workout_exercises').select('id,exercise_name,source_text,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds)').eq('workout_log_id',log.id).order('sort_order',{ascending:true})
      if(error)throw error
      setSelectedWorkout(current=>current?.id===log.id?{...current,exercises:exercises||[],detailLoading:false}:current)
    } catch(error) {
      setSelectedWorkout(current=>current?.id===log.id?{...current,exercises:[],detailLoading:false,detailError:error.message||'Kunne ikkje henta øvingsdetaljane.'}:current)
    }
  }

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(nextSession)
      setAuthReady(true)
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setProfileError(error.message)
      setSession(data?.session || null)
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      if (!session?.user?.id) {
        setProfile(null)
        setProfileError('')
        setProfileReady(true)
        return
      }
      setProfileReady(false)
      const result = await fetchMemberProfile(session.user.id)
      if (cancelled) return
      setProfile(result.profile)
      setProfileError(result.error?.message || '')
      setProfileReady(true)
    }
    loadProfile()
    return () => { cancelled = true }
  }, [session?.user?.id])

  if (!isSupabaseConfigured) {
    return <LoadingScreen text="Supabase er ikkje konfigurert. Legg inn VITE_SUPABASE_URL og VITE_SUPABASE_PUBLISHABLE_KEY i v2/.env.local." />
  }
  if (!authReady) return <LoadingScreen text="Koplar til GarasjeGym …" />
  if (passwordRecovery) return <AuthScreen recovery onRecoveryComplete={() => setPasswordRecovery(false)} />
  if (!session) return <AuthScreen />
  if (!profileReady) return <LoadingScreen text="Hentar medlemsprofil …" />

  if (profileError || !profile) {
    return (
      <main className="auth-shell"><div className="auth-card">
        <div className="eyebrow"><ShieldCheck size={14} /> MEDLEMSPROFIL</div>
        <h1>Profilen <em>manglar.</em></h1>
        <p className="auth-intro">Innlogginga fungerer, men medlemsprofilen kunne ikkje hentast. {profileError}</p>
        <button className="primary-button" onClick={() => supabase.auth.signOut()}>Logg ut</button>
      </div></main>
    )
  }
  if (profile.membership_status === 'pending') {
    return (
      <main className="auth-shell"><div className="auth-card">
        <div className="eyebrow"><ShieldCheck size={14} /> MEDLEMSKAP · VENTAR</div>
        <h1>Søknaden er <em>motteken.</em></h1>
        <p className="auth-intro">Medlemskapet ditt ventar på godkjenning frå ein administrator. Du får tilgang til GarasjeGym når søknaden er godkjend.</p>
        <p className="auth-footnote">Du kan logga ut no og logga inn igjen seinare for å sjå om tilgangen er opna.</p>
        <button className="primary-button" onClick={() => supabase.auth.signOut()}>Logg ut</button>
      </div></main>
    )
  }
  if (profile.membership_status === 'rejected' || !profile.active) {
    return (
      <main className="auth-shell"><div className="auth-card">
        <div className="eyebrow"><ShieldCheck size={14} /> MEDLEMSKAP</div>
        <h1>Kontoen har <em>ikkje tilgang.</em></h1>
        <p className="auth-intro">Ta kontakt med ein administrator i GarasjeGym dersom du meiner dette er feil.</p>
        <button className="primary-button" onClick={() => supabase.auth.signOut()}>Logg ut</button>
      </div></main>
    )
  }

  if (!simpleModeReady) return <LoadingScreen text="Hentar medlemsinnstillingar …" />

  const visibleSections = (simpleMode ? [] : sections).concat(isStaff(profile)?[{id:'admin',label:'Administrasjon',icon:Settings,note:'Medlemmer og drift'}]:[])
  const current = visibleSections.find((item) => item.id === active) || sections[0]
  const Icon = current.icon

  return (
    <MusicProvider memberId={session.user.id}>
    <div className={simpleMode?"app-shell simple-app-shell":"app-shell"}>
      {!simpleMode&&<aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Wrench size={22} /></div>
          <div><strong>GARASJEGYM</strong><span>STURMKOPF · 2.0</span></div>
        </div>
        <div className="side-label">HOVUDMENY</div>
        <nav aria-label="Hovudmeny">
          {visibleSections.map(({ id, label, icon: ItemIcon }) => (
            <button key={id} className={active === id ? 'nav-item selected' : 'nav-item'} onClick={() => setActive(id)}>
              <ItemIcon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><span className="status-dot" /> MEDLEM · {profile.role.toUpperCase()}</div>
      </aside>}
      <main className={simpleMode?'main simple-app-main':'main'}>
        <header className="topbar">
          <div className="mobile-brand">GARASJEGYM <span>2.0</span></div>
          {simpleMode&&active!=='oversikt'&&<button type="button" className="simple-back-button" onClick={()=>setActive('oversikt')}>← Til start</button>}
          <div className="top-meta">
            <span className="member-name">{profile.display_name || session.user.email}</span>
            <Notifications onNavigate={(item) => {
              const href=item.href||''
              if(href.startsWith('pt-request:')){setFocusPTRequestId(href.slice(11));setScheduleTab('pt');setActive('timeplan')}
              else if(href.startsWith('pt-client:')){setFocusPTClientId(href.slice(10));setActive('pt-studio')}
              else if(href.startsWith('group-class:')){setFocusGroupClassId(href.slice(12));setScheduleTab('booking');setActive('timeplan')}
              else if(href.startsWith('booking:')){setScheduleTab('booking');setActive('timeplan')}
              else if(href==='pt-studio'){setActive('pt-studio')}
              else if(item.category==='pt'){setFocusPTRequestId(null);setScheduleTab('pt');setActive('timeplan')}
              else if(href)setActive(({booking:'timeplan',pt:'timeplan','mi-trening':'mi-side','wod-studio':'wod','wod-library':'wod'}[href]||href))
            }} />
            <button className="icon-button" onClick={toggleAppFullscreen} title={appFullscreen?"Avslutt fullskjerm":"Fullskjerm"} aria-label={appFullscreen?"Avslutt fullskjerm":"Fullskjerm"}>{appFullscreen?<Minimize size={16}/>:<Maximize size={16}/>}</button><button className="icon-button" onClick={() => supabase.auth.signOut()} title="Logg ut" aria-label="Logg ut"><LogOut size={16} /></button>
          </div>
        </header>
        {simpleMode ? <section className="welcome simple-welcome">
          <div className="eyebrow"><Activity size={14} /> GARASJEGYM · SUPERENKEL</div>
          <h1>Hei, <em>{profile.display_name?.split(' ')[0]||'der'}.</em></h1>
          
        </section> : <section className="welcome">
          <div className="eyebrow"><Activity size={14} /> GARASJEGYM · NY GENERASJON</div>
          <h1>Bygd for å <em>prestera.</em></h1>
          <p>Ein felles plattform for trening, booking og fellesskap.</p>
        </section>}{active==='oversikt'&&dailyWod&&<button type="button" className="app-daily-wod-strip" onClick={()=>{setFocusWodId(dailyWod.id);setActive('wod')}}><span>DAGENS WOD</span><strong>{dailyWod.name}</strong><small>{dailyWod.format} · {dailyWod.duration_minutes||'–'} min · Opne WOD-kortet →</small></button>}
        {active === 'oversikt' ? <section className="content-card training-content">{simpleMode?<div className="simple-home"><h2>Kva vil du gjera?</h2><div className="simple-home-grid"><button className="simple-home-action" onClick={openMyTraining}><CalendarDays/><span><strong>Mi trening i dag</strong><small>Økta PT har tildelt deg</small></span>{newPtWodCount>0&&<span className="simple-home-new-badge" aria-label={newPtWodCount+" nye tildelte økter"}><b>NY</b><strong>{newPtWodCount}</strong></span>}</button><button className="simple-home-action" onClick={()=>{setScheduleTab("booking");setActive("timeplan")}}><UsersIcon/><span><strong>Gruppetimar</strong><small>Sjå og meld deg på</small></span></button><button className="simple-home-action" onClick={()=>{setFocusWodId(null);setActive("wod")}}><Dumbbell/><span><strong>Eigentrening</strong><small>Finn ei økt</small></span></button><button className="simple-home-action" onClick={()=>setActive("pt-info")}><UserRoundIcon/><span><strong>Frå PT</strong><small>Meldingar og informasjon</small></span></button></div></div>:<Overview profile={profile} onNavigate={setActive} onOpenWorkout={openWorkout} onOpenWod={(id)=>{setFocusWodId(id);setActive('wod')}} />}</section> : active === 'trening' ? <section className="content-card training-content workout-entry"><div className="workout-mode-intro"><span className="section-kicker">WORKOUT MODE</span><h2>Trening</h2><p>Vel økt og gå rett inn i treningsverktøyet med timer, rundar og resultatregistrering.</p></div><Training onSaved={()=>setActive(simpleMode?"oversikt":"mi-historikk")} onDiscard={()=>setActive("oversikt")} launchWodId={launchWodId} launchClassSessionId={launchClassSessionId} launchAssignmentId={launchAssignmentId} launchProgramSessionId={launchProgramSessionId} launchProgramSessionTitle={launchProgramSessionTitle} onLaunchConsumed={() => { setLaunchWodId(null); setLaunchClassSessionId(null); setLaunchAssignmentId(null); setLaunchProgramSessionId(null); setLaunchProgramSessionTitle('') }} simpleMode={simpleMode} quickStart={quickStart} onQuickStartConsumed={()=>setQuickStart(false)} /></section> : active === 'timeplan' ? <section className="content-card training-content"><ScheduleHub profile={profile} initialClassId={focusGroupClassId} initialTab={scheduleTab} onTabChange={setScheduleTab} focusRequestId={focusPTRequestId} onFocusConsumed={()=>setFocusPTRequestId(null)} onLogResult={(wodId,sessionId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(sessionId);setActive('trening')}} onLaunchWorkout={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'pt-studio' ? <section className="content-card training-content"><PTStudio profile={profile} initialClientId={focusPTClientId} onLaunchWorkout={(wodId,programSessionId,sessionTitle)=>{setLaunchWodId(wodId||null);setLaunchClassSessionId(null);setLaunchAssignmentId(null);setLaunchProgramSessionId(programSessionId||null);setLaunchProgramSessionTitle(sessionTitle||'');setActive('trening')}} /></section> : active === 'mi-trening' ? <section className="content-card training-content"><MyTraining simpleMode={simpleMode} onOpenWod={(wodId,assignmentId)=>{setLaunchWodId(null);setLaunchAssignmentId(assignmentId||null);setFocusWodId(wodId);setActive('wod')}} /></section> : active === 'wod' ? <section className="content-card training-content"><WodHub staff={isStaff(profile)} isAdmin={profile?.role==='admin'} simpleMode={simpleMode} launchAssignmentId={launchAssignmentId} focusWodId={focusWodId} onFocusConsumed={()=>setFocusWodId(null)} onLaunchWod={(wodId,assignmentId)=>{setLaunchWodId(wodId);setLaunchAssignmentId(assignmentId||null);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'pt-info' ? <section className="content-card training-content"><PTInfo /></section> : active === 'fellesskap' ? <section className="content-card training-content"><Community profile={profile} /></section> : active === 'kaffi' ? <section className="content-card training-content"><CoffeeBar profile={profile} /></section> : active === 'musikk' ? <section className="content-card training-content"><Music /></section> : active === 'mi-side' || active === 'pr-senter' || active === 'mi-historikk' ? <section className="content-card training-content"><MyPage profile={profile} email={session.user.email} onOpenWorkout={openWorkout} onLaunchWod={(wodId,assignmentId,sessionId)=>{setLaunchWodId(wodId);setLaunchAssignmentId(assignmentId||null);setLaunchClassSessionId(sessionId||null);setActive('trening')}} simpleMode={simpleMode} onSimpleModeChange={changeSimpleMode} simpleModeError={simpleModeError} simpleModeSaving={simpleModeSaving} initialTab={active==='pr-senter'?'records':active==='mi-historikk'?'history':'profile'} /></section> : active === 'admin' ? <section className="content-card training-content"><Admin profile={profile} /></section> : <section className="content-card">
          <div className="section-icon"><Icon size={22} /></div>
          <div className="section-kicker">MODUL · {active.toUpperCase()}</div>
          <h2>{current.label}</h2>
          <p>{current.note}</p>
          <div className="notice">
            <strong>Innlogging og medlemsroller er kopla til.</strong>
            <span>Dette er første funksjonelle steg i 2.0. Modulane blir bygde ut stegvis. Eksisterande 1.8.16 og produksjonsdata er ikkje endra.</span>
          </div>
        </section>}
        {selectedWorkout&&<div className="modal-backdrop" role="presentation" onClick={()=>setSelectedWorkout(null)}><section className="booking-create workout-detail-modal" role="dialog" aria-modal="true" aria-label="Treningsresultat" onClick={e=>e.stopPropagation()}><div className="training-heading"><div><span className="section-kicker">GJENNOMFØRT ØKT</span><h3>{selectedWorkout.title||'Treningsøkt'}</h3><p>{selectedWorkout.workout_date||''}</p></div><button className="secondary-button" onClick={()=>setSelectedWorkout(null)}>Lukk</button></div><div className="workout-detail-score"><strong>{selectedWorkout.score_rounds??'–'}</strong><span>Rundar</span><strong>{selectedWorkout.score_reps??'–'}</strong><span>Ekstra reps</span>{selectedWorkout.score_time_seconds!=null&&<><strong>{Math.floor(selectedWorkout.score_time_seconds/60)}:{String(Math.floor(selectedWorkout.score_time_seconds%60)).padStart(2,'0')}</strong><span>Sluttid</span></>}{selectedWorkout.score_load_kg!=null&&<><strong>{selectedWorkout.score_load_kg} kg</strong><span>Tungaste løft</span></>}{selectedWorkout.score_calories!=null&&<><strong>{selectedWorkout.score_calories}</strong><span>Kaloriar</span></>}{selectedWorkout.score_distance!=null&&<><strong>{selectedWorkout.score_distance} {selectedWorkout.score_unit||'m'}</strong><span>Avstand</span></>}</div><p>{selectedWorkout.format||'Trening'}</p>{selectedWorkout.result_data?.split_seconds?.length>0&&<p>Rundetider: {selectedWorkout.result_data.split_seconds.map((seconds,index)=>`${index+1}: ${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`).join(' · ')}</p>}<p>{selectedWorkout.note||'Ingen notat registrert.'}</p>{selectedWorkout.detailLoading&&<div className="training-state">Hentar resultat og øvingsanalyse …</div>}{selectedWorkout.detailError&&<div className="auth-error" role="alert">{selectedWorkout.detailError}</div>}{selectedWorkout.exercises?.length>0&&<section className="workout-exercise-detail"><h4>Øvingar og sett</h4>{selectedWorkout.exercises.map(ex=><article className="history-card" key={ex.id}><strong>{ex.exercise_name}</strong>{ex.source_text&&<small>{ex.source_text}</small>}{(ex.workout_sets||[]).sort((x,y)=>x.set_number-y.set_number).map(set=><div className="workout-set-detail" key={set.id}><span>Sett {set.set_number}</span><b>{set.reps!=null?set.reps+' reps':''}{set.load_kg!=null?' · '+set.load_kg+' kg':''}{set.time_text?' · '+set.time_text:''}{set.time_seconds!=null?' · '+set.time_seconds+' sek':''}</b></div>)}</article>)}</section>}{selectedWorkout.exercises?.length===0&&!selectedWorkout.detailLoading&&<small>Ingen øvingsdetaljar er lagra på denne økta.</small>}</section></div>}
        <footer>GARASJEGYM 2.0 · STURMKOPF</footer>
      </main>
    </div>
    </MusicProvider>
  )
}
