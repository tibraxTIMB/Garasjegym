import { useEffect, useState } from 'react'
import {
  Activity,
  CalendarDays,
  Coffee,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  Settings,
  Wrench,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { fetchMemberProfile, isStaff } from './lib/auth.js'

const sections = [
  { id: 'oversikt', label: 'Oversikt', icon: LayoutDashboard, note: 'Dashboard og treningsstatus' },
  { id: 'trening', label: 'Trening', icon: Dumbbell, note: 'WOD, fri trening, logg og PR' },
  { id: 'booking', label: 'Booking', icon: CalendarDays, note: 'Gruppetimar og PT' },
  { id: 'fellesskap', label: 'Fellesskap', icon: Users, note: 'Garasjeprat og utfordringar' },
  { id: 'kaffi', label: 'Barista', icon: Coffee, note: 'Meny og bestillingar' },
]

function AuthScreen() {
  const [mode, setMode] = useState('login')
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
      if (mode === 'signup') {
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
        <h1>{mode === 'login' ? <>Velkomen <em>tilbake.</em></> : <>Bli ein <em>del av laget.</em></>}</h1>
        <p className="auth-intro">Logg inn med GarasjeGym-kontoen din, eller registrer ein ny medlemskonto.</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Namn
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" required placeholder="Namnet ditt" />
            </label>
          )}
          <label>
            E-post
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="namn@epost.no" />
          </label>
          <label>
            Passord
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} placeholder="Passord" />
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message" role="status">{message}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Arbeider …' : mode === 'login' ? 'Logg inn' : 'Opprett medlemskonto'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? 'Har du ikkje konto?' : 'Har du allereie konto?'}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
            {mode === 'login' ? 'Registrer deg' : 'Logg inn'}
          </button>
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
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [active, setActive] = useState('oversikt')

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
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
    return <LoadingScreen text="Supabase er ikkje konfigurert. Legg inn VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i v2/.env.local." />
  }
  if (!authReady) return <LoadingScreen text="Koplar til GarasjeGym …" />
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
    ? [...sections, { id: 'admin', label: 'Admin', icon: Settings, note: 'Medlemmer og drift' }]
    : sections
  const current = visibleSections.find((item) => item.id === active) || visibleSections[0]
  const Icon = current.icon

  return (
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
            <button className="icon-button" onClick={() => supabase.auth.signOut()} title="Logg ut" aria-label="Logg ut"><LogOut size={16} /></button>
          </div>
        </header>
        <section className="welcome">
          <div className="eyebrow"><Activity size={14} /> GARASJEGYM · NY GENERASJON</div>
          <h1>Bygd for å <em>prestera.</em></h1>
          <p>Ein felles plattform for trening, booking og fellesskap.</p>
        </section>
        <section className="content-card">
          <div className="section-icon"><Icon size={22} /></div>
          <div className="section-kicker">MODUL · {active.toUpperCase()}</div>
          <h2>{current.label}</h2>
          <p>{current.note}</p>
          <div className="notice">
            <strong>Innlogging og medlemsroller er kopla til.</strong>
            <span>Dette er første funksjonelle steg i 2.0. Modulane blir bygde ut stegvis. Eksisterande 1.8.16 og produksjonsdata er ikkje endra.</span>
          </div>
        </section>
        <footer>GARASJEGYM 2.0 · STURMKOPF <span>UTVIKLINGSVERSJON</span></footer>
      </main>
    </div>
  )
}
