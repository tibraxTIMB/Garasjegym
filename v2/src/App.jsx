import { useEffect, useState } from 'react'
import {
  Activity,
  CalendarDays,
  Coffee,
  Music2,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  UserRound,
  Settings,
  Wrench,
  WandSparkles,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { fetchMemberProfile, isStaff } from './lib/auth.js'
import Training from './components/Training.jsx'
import Booking from './components/Booking.jsx'
import PT from './components/PT.jsx'
import Community from './components/Community.jsx'
import Challenges from './components/Challenges.jsx'
import CoffeeBar from './components/CoffeeBar.jsx'
import Admin from './components/Admin.jsx'
import Overview from './components/Overview.jsx'
import Notifications from './components/Notifications.jsx'
import WodBuilder from './components/WodBuilder.jsx'
import WodLibrary from './components/WodLibrary.jsx'
import CalendarAdmin from './components/CalendarAdmin.jsx'
import MyTraining from './components/MyTraining.jsx'
import { Music, MusicProvider } from './components/Music.jsx'

const sections = [
  { id: 'oversikt', label: 'Oversikt', icon: LayoutDashboard, note: 'Dashboard og treningsstatus' },
  { id: 'trening', label: 'Trening', icon: Dumbbell, note: 'WOD, fri trening, logg og PR' },
  { id: 'mi-trening', label: 'Mi trening', icon: CalendarDays, note: 'PT, tildelte WOD-ar og gruppetimar' },
  { id: 'booking', label: 'Booking', icon: CalendarDays, note: 'Gruppetimar' },
  { id: 'pt', label: 'PT-studio', icon: UserRound, note: 'Personleg trening og PT-førespurnader' },
  { id: 'fellesskap', label: 'Fellesskap', icon: Users, note: 'Garasjeprat' },
  { id: 'utfordringar', label: 'Utfordringar', icon: Activity, note: 'Felles mål og framgang' },
  { id: 'kaffi', label: 'Kaffebar', icon: Coffee, note: 'Meny og bestillingar' },
  { id: 'musikk', label: 'Musikk', icon: Music2, note: 'Personleg Spotify og hurtigval' },
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
    ? [...sections, { id: 'wod-studio', label: 'WOD-generator', icon: WandSparkles, note: 'Bygg og publiser WOD-ar' }, { id: 'wod-library', label: 'WOD-bibliotek', icon: Dumbbell, note: 'Alle oppretta WOD-ar' }, { id: 'calendar', label: 'Kalender', icon: CalendarDays, note: 'PT, gruppetimar og avtalar' }, { id: 'admin', label: 'Admin', icon: Settings, note: 'Medlemmer og drift' }]
    : sections
  const current = visibleSections.find((item) => item.id === active) || visibleSections[0]
  const Icon = current.icon

  return (
    <MusicProvider>
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
            <Notifications onNavigate={(item) => { if(item.href?.startsWith('pt-request:')) { setFocusPTRequestId(item.href.slice('pt-request:'.length)); setActive('pt') } else if(item.category==='pt') { setFocusPTRequestId(null); setActive('pt') } else if(item.href) setActive(item.href) }} />
            <button className="icon-button" onClick={() => supabase.auth.signOut()} title="Logg ut" aria-label="Logg ut"><LogOut size={16} /></button>
          </div>
        </header>
        <section className="welcome">
          <div className="eyebrow"><Activity size={14} /> GARASJEGYM · NY GENERASJON</div>
          <h1>Bygd for å <em>prestera.</em></h1>
          <p>Ein felles plattform for trening, booking og fellesskap.</p>
        </section>
        {active === 'oversikt' ? <section className="content-card training-content"><Overview profile={profile} onNavigate={setActive} /></section> : active === 'trening' ? <section className="content-card training-content"><Training launchWodId={launchWodId} launchClassSessionId={launchClassSessionId} onLaunchConsumed={() => { setLaunchWodId(null); setLaunchClassSessionId(null) }} /></section> : active === 'mi-trening' ? <section className="content-card training-content"><MyTraining onLaunchWod={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'booking' ? <section className="content-card training-content"><Booking profile={profile} onLogResult={(wodId, sessionId) => { setLaunchWodId(wodId); setLaunchClassSessionId(sessionId); setActive('trening') }} /></section> : active === 'pt' ? <section className="content-card training-content"><PT profile={profile} focusRequestId={focusPTRequestId} onFocusConsumed={()=>setFocusPTRequestId(null)} onLaunchWorkout={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'fellesskap' ? <section className="content-card training-content"><Community profile={profile} /></section> : active === 'utfordringar' ? <section className="content-card training-content"><Challenges profile={profile} /></section> : active === 'kaffi' ? <section className="content-card training-content"><CoffeeBar profile={profile} /></section> : active === 'musikk' ? <section className="content-card training-content"><Music isStaff={isStaff(profile)} /></section> : active === 'wod-studio' ? <section className="content-card training-content"><WodBuilder /></section> : active === 'wod-library' ? <section className="content-card training-content"><WodLibrary onLaunchWod={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setActive('trening')}} /></section> : active === 'calendar' ? <section className="content-card training-content"><CalendarAdmin /></section> : active === 'admin' ? <section className="content-card training-content"><Admin profile={profile} /></section> : <section className="content-card">
          <div className="section-icon"><Icon size={22} /></div>
          <div className="section-kicker">MODUL · {active.toUpperCase()}</div>
          <h2>{current.label}</h2>
          <p>{current.note}</p>
          <div className="notice">
            <strong>Innlogging og medlemsroller er kopla til.</strong>
            <span>Dette er første funksjonelle steg i 2.0. Modulane blir bygde ut stegvis. Eksisterande 1.8.16 og produksjonsdata er ikkje endra.</span>
          </div>
        </section>}
        <footer>GARASJEGYM 2.0 · STURMKOPF <span>UTVIKLINGSVERSJON</span></footer>
      </main>
    </div>
    </MusicProvider>
  )
}
