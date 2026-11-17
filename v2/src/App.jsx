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
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { fetchMemberProfile, isStaff } from './lib/auth.js'
import Training from './components/Training.jsx'
import Booking from './components/Booking.jsx'
import PT from './components/PT.jsx'
import Community from './components/Community.jsx'
import CoffeeBar from './components/CoffeeBar.jsx'
import Admin from './components/Admin.jsx'
import Overview from './components/Overview.jsx'
import Notifications from './components/Notifications.jsx'
import WodHub from './components/WodHub.jsx'
import ScheduleHub from './components/ScheduleHub.jsx'
import MyPage from './components/MyPage.jsx'
import CalendarAdmin from './components/CalendarAdmin.jsx'
import { Music, MusicProvider } from './components/Music.jsx'

const sections = [
  { id: 'oversikt', label: 'Oversikt', icon: LayoutDashboard, note: 'Dashboard og treningsstatus' },
  { id: 'trening', label: 'Trening', icon: Dumbbell, note: 'WOD, fri trening, logg og PR' },
  { id: 'timeplan', label: 'Timeplan og booking', icon: CalendarDays, note: 'Gruppetimar og PT-avtalar' },
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
  const [displayName, setDisplayName] = useState('')
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
      } else if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (authError) throw authError
        if (data.session) {
          setMessage('Konto oppretta. Du er logga inn.')
        } else {
          setMessage('Registreringa er motteken. Sjekk e-posten din for å stadfesta kontoen før du loggar inn.')
          setMode('login')
        }
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
        <h1>{mode === 'login' ? <>Velkomen <em>tilbake.</em></> : mode === 'reset' || mode === 'update' ? <>Nytt <em>passord.</em></> : <>Bli ein <em>del av laget.</em></>}</h1>
        <p className="auth-intro">{mode === 'reset' ? 'Skriv inn e-postadressa di, så sender me ei lenkje for å nullstilla passordet.' : mode === 'update' ? 'Vel eit nytt passord for GarasjeGym-kontoen din.' : 'Logg inn med GarasjeGym-kontoen din, eller registrer ein ny medlemskonto.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Namn
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required placeholder="Namnet ditt" />
            </label>
          )}
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
            {busy ? 'Arbeider …' : mode === 'login' ? 'Logg inn' : mode === 'reset' ? 'Send lenkje' : mode === 'update' ? 'Lagra nytt passord' : 'Opprett medlemskonto'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? 'Har du ikkje konto?' : mode === 'signup' ? 'Har du allereie konto?' : 'Tilbake til innlogging?'}
          <button type="button" onClick={() => { if (mode === 'update') onRecoveryComplete?.(); setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
            {mode === 'login' ? 'Registrer deg' : 'Logg inn'}
          </button>
          {mode === 'login' && <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Gløymt passord?</button>}
        </div>
        <p className="auth-footnote">Nye kontoar får medlemsrolla automatisk. Tilgang til adminfunksjonar blir styrt av GarasjeGym.</p>
      </div>
    </main>
  )
}

function LoadingScreen({ text }) {
  return <main className="loading-shell"><div className="brand-mark"><Wrench size={22} /></div><strong>{text}</strong></main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [active, setActive] = useState('oversikt')
  const [launchWodId, setLaunchWodId] = useState(null)
  const [launchClassSessionId, setLaunchClassSessionId] = useState(null)
  const [focusPTRequestId, setFocusPTRequestId] = useState(null)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  async function openWorkout(log) {
    if (!log?.id) { setSelectedWorkout(log); return }
    const { data: exercises, error } = await supabase.from('workout_exercises').select('id,exercise_name,source_text,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds)').eq('workout_log_id',log.id).order('sort_order',{ascending:true})
    setSelectedWorkout({ ...log, exercises: error ? [] : (exercises||[]) })
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
  if (!profile.active) {
    return (
      <main className="auth-shell"><div className="auth-card">
        <div className="eyebrow"><ShieldCheck size={14} /> MEDLEMSKAP</div>
        <h1>Kontoen er <em>inaktiv.</em></h1>
        <p className="auth-intro">Ta kontakt med ein administrator i GarasjeGym for å få tilgang.</p>
        <button className="primary-button" onClick={() => supabase.auth.signOut()}>Logg ut</button>
      </div></main>
    )
  }

  const visibleSections = isStaff(profile)
    ? [...sections, { id: 'calendar', label: 'Kalender', icon: CalendarDays, note: 'PT, gruppetimar og avtalar' }, { id: 'admin', label: 'Administrasjon', icon: Settings, note: 'Medlemmer og drift' }]
    : sections
  const current = visibleSections.find((item) => item.id === active) || visibleSections[0]
  const Icon = current.icon

  return (
    <MusicProvider memberId={session.user.id}>
    <div className="app-shell">
      <aside className="sidebar">
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
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">GARASJEGYM <span>2.0</span></div>
          <div className="top-meta">
            <span className="member-name">{profile.display_name || session.user.email}</span>
            <Notifications onNavigate={(item) => { if(item.href?.startsWith('pt-request:')) { setFocusPTRequestId(item.href.slice('pt-request:'.length)); setActive('pt') } else if(item.category==='pt') { setFocusPTRequestId(null); setActive('timeplan') } else if(item.href) setActive(({booking:'timeplan',pt:'timeplan','mi-trening':'mi-side','wod-studio':'wod','wod-library':'wod'}[item.href]||item.href)) }} />
            <button className="icon-button" onClick={() => supabase.auth.signOut()} title="Logg ut" aria-label="Logg ut"><LogOut size={16} /></button>
          </div>
        </header>
        <section className="welcome">
          <div className="eyebrow"><Activity size={14} /> GARASJEGYM · NY GENERASJON</div>
          <h1>Bygd for å <em>prestera.</em></h1>
          <p>Ein felles plattform for trening, booking og fellesskap.</p>
        </section>
        {active === 'oversikt' ? <section className="content-card training-content"><Overview profile={profile} onNavigate={setActive} onOpenWorkout={openWorkout} /></section> : active === 'trening' ? <section className="content-card training-content workout-entry"><div className="workout-mode-intro"><span className="section-kicker">WORKOUT MODE</span><h2>Trening</h2><p>Vel økt og gå rett inn i treningsverktøyet med timer, rundar og resultatregistrering.</p></div><Training launchWodId={launchWodId} launchClassSessionId={launchClassSessionId} onLaunchConsumed={() => { setLaunchWodId(null); setLaunchClassSessionId(null) }} /></section> : active === 'timeplan' ? <section className="content-card training-content"><ScheduleHub profile={profile} focusRequestId={focusPTRequestId} onFocusConsumed={()=>setFocusPTRequestId(null)} onLogResult={(wodId,sessionId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(sessionId);setActive('trening')}} onLaunchWorkout={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'wod' ? <section className="content-card training-content"><WodHub staff={isStaff(profile)} onLaunchWod={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'fellesskap' ? <section className="content-card training-content"><Community profile={profile} /></section> : active === 'kaffi' ? <section className="content-card training-content"><CoffeeBar profile={profile} /></section> : active === 'musikk' ? <section className="content-card training-content"><Music /></section> : active === 'mi-side' || active === 'pr-senter' ? <section className="content-card training-content"><MyPage profile={profile} email={session.user.email} onOpenWorkout={openWorkout} initialTab={active==='pr-senter'?'records':'profile'} /></section> : active === 'calendar' ? <section className="content-card training-content"><CalendarAdmin onNavigate={(target)=>setActive(target==='pt'||target==='booking'?'timeplan':target)} /></section> : active === 'admin' ? <section className="content-card training-content"><Admin profile={profile} /></section> : <section className="content-card">
          <div className="section-icon"><Icon size={22} /></div>
          <div className="section-kicker">MODUL · {active.toUpperCase()}</div>
          <h2>{current.label}</h2>
          <p>{current.note}</p>
          <div className="notice">
            <strong>Innlogging og medlemsroller er kopla til.</strong>
            <span>Dette er første funksjonelle steg i 2.0. Modulane blir bygde ut stegvis. Eksisterande 1.8.16 og produksjonsdata er ikkje endra.</span>
          </div>
        </section>}
        {selectedWorkout&&<div className="modal-backdrop" role="presentation" onClick={()=>setSelectedWorkout(null)}><section className="booking-create workout-detail-modal" role="dialog" aria-modal="true" aria-label="Treningsresultat" onClick={e=>e.stopPropagation()}><div className="training-heading"><div><span className="section-kicker">GJENNOMFØRT ØKT</span><h3>{selectedWorkout.title||'Treningsøkt'}</h3><p>{selectedWorkout.workout_date||''}</p></div><button className="secondary-button" onClick={()=>setSelectedWorkout(null)}>Lukk</button></div><div className="workout-detail-score"><strong>{selectedWorkout.score_rounds??'–'}</strong><span>Rundar</span><strong>{selectedWorkout.score_reps??'–'}</strong><span>Ekstra reps</span></div><p>{selectedWorkout.format||'Trening'}</p><p>{selectedWorkout.note||'Ingen notat registrert.'}</p>{selectedWorkout.exercises?.length>0&&<section className="workout-exercise-detail"><h4>Øvingar og sett</h4>{selectedWorkout.exercises.map(ex=><article className="history-card" key={ex.id}><strong>{ex.exercise_name}</strong>{ex.source_text&&<small>{ex.source_text}</small>}{(ex.workout_sets||[]).sort((x,y)=>x.set_number-y.set_number).map(set=><div className="workout-set-detail" key={set.id}><span>Sett {set.set_number}</span><b>{set.reps!=null?set.reps+' reps':''}{set.load_kg!=null?' · '+set.load_kg+' kg':''}{set.time_text?' · '+set.time_text:''}{set.time_seconds!=null?' · '+set.time_seconds+' sek':''}</b></div>)}</article>)}</section>}{selectedWorkout.exercises?.length===0&&<small>Ingen øvingsdetaljar er lagra på denne økta.</small>}</section></div>}
        <footer>GARASJEGYM 2.0 · STURMKOPF</footer>
      </main>
    </div>
    </MusicProvider>
  )
}
