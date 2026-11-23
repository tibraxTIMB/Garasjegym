import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  Activity,
  Users,
  UserRound,
  Coffee,
  Music2,
  Dumbbell,
  Trophy,
  PlayCircle,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Settings,
  Wrench,
  Maximize,
  Minimize,
  MonitorPlay,
  Users as UsersIcon,
  UserRound as UserRoundIcon,
  MessageSquareText,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { fetchMemberProfile, isStaff } from './lib/auth.js'
import { getAppBaseUrl } from './lib/appBaseUrl.js'
import { getMembershipGate } from './lib/membershipAccess.js'
import { restoreWorkoutDraft } from './lib/workoutDraft.js'
import { resolveSimpleMode, displayModePreference } from './lib/memberViewMode.js'
const Training = lazy(() => import('./components/Training.jsx'))


const PTStudio = lazy(() => import('./components/PTStudio.jsx'))
const Community = lazy(() => import('./components/Community.jsx'))
const CoffeeBar = lazy(() => import('./components/CoffeeBar.jsx'))
const Admin = lazy(() => import('./components/Admin.jsx'))
const Overview = lazy(() => import('./components/Overview.jsx'))
import Notifications from './components/Notifications.jsx'
const WodHub = lazy(() => import('./components/WodHub.jsx'))
const ScheduleHub = lazy(() => import('./components/ScheduleHub.jsx'))
const MyPage = lazy(() => import('./components/MyPage.jsx'))
const MyTraining = lazy(() => import('./components/MyTraining.jsx'))
const SimpleCustomerHome = lazy(() => import('./components/SimpleCustomerHome.jsx'))
const Infotainment = lazy(() => import('./components/Infotainment.jsx'))
import AppMobileNavigation from './components/AppMobileNavigation.jsx'
import WorkoutDetail from './components/WorkoutDetail.jsx'
import { Music, MusicProvider } from './components/Music.jsx'
import { useDeviceProfile } from './lib/deviceLayout.js'
import { RELEASE_NAME, RELEASE_SHORT } from './lib/release.js'
import {clearInviteLanding,isInviteLanding} from './lib/invitationFlow.js'
import './components/invitation.css'

const sections = [
  { id: 'oversikt', label: 'Oversikt', icon: LayoutDashboard, note: 'Dashboard og treningsstatus' },
  { id: 'trening', label: 'Økt', icon: PlayCircle, note: 'Start ei økt med timer, logging og resultat' },
  { id: 'timeplan', label: 'Timeplan og booking', icon: CalendarDays, note: 'Gruppetimar og påmelding' },
  { id: 'pt-studio', label: 'PT Studio', icon: UserRound, note: 'PT-kundar, progresjon og gruppetimeadministrasjon' },
  { id: 'wod', label: 'WOD', icon: Dumbbell, note: 'WOD-bibliotek og programmering' },
  { id: 'fellesskap', label: 'Fellesskap', icon: Users, note: 'Garasjeprat' },
  { id: 'kaffi', label: 'Kaffebar', icon: Coffee, note: 'Meny og bestillingar' },
  { id: 'musikk', label: 'Musikk', icon: Music2, note: 'Personleg Spotify' },
  { id: 'mi-side', label: 'Mi side', icon: UserRound, note: 'Profil, treningshistorikk og PR' },
]

function AuthScreen({ recovery = false, invitation = false, onRecoveryComplete, onInvitationComplete }) {
  // Explicit release-only switch. Public signups are not part of normal use;
  // server-side Auth/DB rules must enforce the verified owner bootstrap.
  const ownerRegistrationEnabled = import.meta.env.VITE_OWNER_BOOTSTRAP_SIGNUP === 'true'
  const [mode, setMode] = useState(invitation ? 'invite' : recovery ? 'update' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'update' || mode === 'invite') {
        if(password!==confirmPassword)throw new Error('Passorda er ikkje like. Prøv igjen.')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setPassword('')
        setConfirmPassword('')
        if(mode==='invite'){
          onInvitationComplete?.()
        }else{
          setMessage('Passordet er oppdatert. Du kan no logga inn med det nye passordet.')
          setMode('login')
          onRecoveryComplete?.()
          await supabase.auth.signOut()
        }
      } else if (mode === 'reset') {
        const redirectTo = getAppBaseUrl(window.location.origin, import.meta.env.BASE_URL)
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (resetError) throw resetError
        setMessage('Dersom e-postadressa er registrert, får du ei lenkje for å velja nytt passord.')
      } else if (mode === 'register') {
        if (!ownerRegistrationEnabled) throw new Error('Eigarregistrering er ikkje open.')
        const redirectTo = getAppBaseUrl(window.location.origin, import.meta.env.BASE_URL)
        const { error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        })
        if (signupError) throw signupError
        setMessage('Kontroller e-posten din og stadfest kontoen. Administratortilgang blir aktivert først etter eigarkontroll.')
        setMode('login')
        setPassword('')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (authError) throw authError
      }
    } catch (err) {
      const raw = err?.message || ''
      setError(/invalid login credentials/i.test(raw)
        ? 'Feil e-post eller passord, eller kontoen er ikkje oppretta her enno. Nye medlemmar får invitasjon frå administrator.'
        : raw || 'Noko gjekk gale. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark"><Wrench size={22} /></div>
          <div><strong>GARASJEGYM</strong><span>{RELEASE_NAME}</span></div>
        </div>
        <div className="eyebrow"><ShieldCheck size={14} /> MEDLEMSOMRÅDE</div>
        <h1>{mode === 'login' ? <>Velkomen <em>tilbake.</em></> : mode === 'register' ? <>Aktiver <em>eigar.</em></> : mode === 'invite' ? <>Velkomen til <em>GarasjeGym!</em></> : <>Nytt <em>passord.</em></>}</h1>
        <p className="auth-intro">{mode === 'invite' ? 'Du er invitert inn i treningsfellesskapet! Opprett ditt eige passord, så er du klar til å trene.' : mode === 'reset' ? 'Skriv inn e-postadressa di, så sender me ei lenkje for å nullstilla passordet.' : mode === 'update' ? 'Vel eit unikt passord på minst 12 teikn for GarasjeGym-kontoen din.' : mode === 'register' ? 'Eingongsregistrering for eigaren. Bruk tibrakestad@gmail.com og eit unikt passord på minst 12 teikn.' : 'Logg inn med den personlege GarasjeGym-kontoen din.'}</p>
        {mode === 'invite' && <div className="invite-welcome-features" aria-label="Dette får du i GarasjeGym"><div><Dumbbell size={18}/><span><strong>WOD og økter</strong><small>Finn øvingar, bygg økter og bruk den store klokka.</small></span></div><div><Trophy size={18}/><span><strong>PR og framgang</strong><small>Samla treningslogg, rekordar og personleg utvikling.</small></span></div><div><CalendarDays size={18}/><span><strong>Timar og PT</strong><small>Timeplan, gruppetrening og tildelte økter.</small></span></div><div><Coffee size={18}/><span><strong>Garasjefellesskapet</strong><small>Meldingar, aktivitet og ein liten kaffibar.</small></span></div></div>}
        <form className="auth-form" onSubmit={submit}>
          {mode !== 'update' && mode !== 'invite' && <label>
            E-post
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="namn@epost.no" />
          </label>}
          {mode !== 'reset' && <label>
            Passord
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={['invite','update','register'].includes(mode) ? 12 : undefined} placeholder={mode==='invite'?'Minst 12 teikn':'Passord'} />
          </label>}
          {(mode === 'invite' || mode === 'update') && <label>Gjenta passordet<input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={12} required placeholder="Skriv passordet ein gong til"/></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message" role="status">{message}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Arbeider …' : mode === 'invite' ? 'Opprett passord og bli med' : mode === 'login' ? 'Logg inn' : mode === 'reset' ? 'Send lenkje' : mode === 'register' ? 'Registrer eigarkonto' : 'Lagra nytt passord'}
          </button>
        </form>
        <div className="auth-switch">
          {mode !== 'login' && mode !== 'invite' && <button type="button" onClick={() => { if (mode === 'update') onRecoveryComplete?.(); setMode('login'); setError(''); setMessage('') }}>Tilbake til innlogging</button>}
          {mode === 'login' && <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Gløymt passord?</button>}
          {mode === 'login' && ownerRegistrationEnabled && <button type="button" onClick={() => { setMode('register'); setError(''); setMessage(''); setEmail('tibrakestad@gmail.com') }}>Aktiver eigarkonto</button>}
        </div>
        <p className="auth-footnote">Ny brukar? Administrator sender ei personleg invitasjon på e-post. Opne lenkja før du loggar inn.</p>
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
  const [invitationPending,setInvitationPending]=useState(()=>isInviteLanding(window.location))
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isPTCoach, setIsPTCoach] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [active, setActive] = useState('oversikt')
  const [trainingVisited, setTrainingVisited] = useState(false)
  const [pendingWodImport, setPendingWodImport] = useState(null)
  const [navigationStack, setNavigationStack] = useState([])
  const [launchWodId, setLaunchWodId] = useState(null)
  const [launchAssignmentId,setLaunchAssignmentId]=useState(null)
  const [launchProgramSessionId,setLaunchProgramSessionId]=useState(null)
  const [launchProgramSessionTitle,setLaunchProgramSessionTitle]=useState('')
  const [focusWodId,setFocusWodId]=useState(null)
  const [dailyWod,setDailyWod]=useState(null)
  const [launchClassSessionId, setLaunchClassSessionId] = useState(null)
   const [launchClassResult,setLaunchClassResult]=useState(false)
  const [focusPTRequestId, setFocusPTRequestId] = useState(null)
  const [focusPTServiceRequest,setFocusPTServiceRequest]=useState(null)
  const [focusPTClientId,setFocusPTClientId]=useState(null)
 const [focusPTPanel,setFocusPTPanel]=useState(null)
  const [focusGroupClassId,setFocusGroupClassId]=useState(null)
  const [focusCoffeeReviewId,setFocusCoffeeReviewId]=useState(null)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [workoutRevision,setWorkoutRevision]=useState(0)
  const [quickStart,setQuickStart]=useState(false)
  const [quickManualEntry,setQuickManualEntry]=useState(false)
  const [simpleMode,setSimpleMode]=useState(false)
  const [simpleModeReady,setSimpleModeReady]=useState(false)
  const [simpleModeError,setSimpleModeError]=useState('')
  const [simpleModeSaving,setSimpleModeSaving]=useState(false)
  const [newPtWodCount,setNewPtWodCount]=useState(0)
  const [appFullscreen,setAppFullscreen]=useState(Boolean(document.fullscreenElement))
  const [scheduleTab,setScheduleTab]=useState('mine')
  const [helpTopic,setHelpTopic]=useState(null)
  const [ptStudioWorkspace,setPTStudioWorkspace]=useState('studio')
  const [ptStudioInitialTab,setPTStudioInitialTab]=useState('oversikt')
  const [adminInitialTab,setAdminInitialTab]=useState('oversikt')
  const [adminFocusToken,setAdminFocusToken]=useState(0)
  const [infotainmentActive,setInfotainmentActive]=useState(()=>{try{return sessionStorage.getItem('garasjegym:infotainment-active')==='1'}catch{return false}})
  const [timerSnapshot,setTimerSnapshot]=useState({elapsed:0,remaining:0,phase:'Klar',running:false})
  const handleTimerSnapshot=useCallback(snapshot=>setTimerSnapshot(snapshot),[])
  useEffect(()=>{if(active==='trening')setTrainingVisited(true)},[active])
  useEffect(()=>{if(session?.user?.id&&restoreWorkoutDraft(session.user.id))setTrainingVisited(true)},[session?.user?.id])
  function navigateTo(next){if(!next||next===active)return;setNavigationStack(stack=>[...stack,active].slice(-12));setActive(next)}
  function handleNotificationNavigate(item){
    const href=item.href||''
    if(href==='admin-maintenance'&&profile.role==='admin'){setAdminInitialTab('drift');setAdminFocusToken(value=>value+1);navigateTo('admin')}
    else if(href.startsWith('pt-service-request:')&&isStaff(profile)){
      setFocusPTServiceRequest({id:href.slice('pt-service-request:'.length),openedAt:Date.now()})
      setFocusPTRequestId(null);setFocusPTPanel(null);setPTStudioWorkspace('studio');setPTStudioInitialTab('administrasjon');navigateTo('pt-studio')
    }
    else if(href.startsWith('pt-request:')){setFocusPTRequestId(href.slice(11));setFocusPTPanel('forespurnader');setPTStudioWorkspace('studio');setPTStudioInitialTab('pt-timar');navigateTo('pt-studio')}
    else if(href.startsWith('pt-checkin:')){setFocusPTRequestId(null);setFocusPTClientId(href.slice(11));setFocusPTPanel(null);setPTStudioWorkspace('studio');setPTStudioInitialTab('status');navigateTo('pt-studio')}
    else if(href==='pt-intake-start'){setFocusPTRequestId(null);setPTStudioWorkspace('studio');setPTStudioInitialTab('ny-kartlegging');navigateTo('pt-studio')}
     else if(href.startsWith('pt-intake:')){setFocusPTRequestId(null);setFocusPTClientId(href.slice(10));setFocusPTPanel(null);setPTStudioWorkspace('studio');setPTStudioInitialTab('kartlegging');navigateTo('pt-studio')}
    else if(href.startsWith('pt-client:')){const targetTab=item.title==='PT-status mottatt'?'status':item.title==='Ny PT-innmelding'?'kartlegging':'pt-timar';setFocusPTClientId(href.slice(10));setFocusPTPanel(targetTab==='pt-timar'?'dialog':null);setPTStudioWorkspace('studio');setPTStudioInitialTab(targetTab);navigateTo('pt-studio')}
    else if(href.startsWith('group-class:')){setFocusGroupClassId(href.slice(12));if(isStaff(profile)){setPTStudioWorkspace('groups');setPTStudioInitialTab('oversikt');navigateTo('pt-studio')}else{setScheduleTab('booking');navigateTo('timeplan')}}
    else if(href.startsWith('coffee-review:')){setFocusCoffeeReviewId(href.slice(14));navigateTo('kaffi')}
    else if(href.startsWith('booking:')){if(isStaff(profile)){setPTStudioWorkspace('groups');navigateTo('pt-studio')}else{setScheduleTab('booking');navigateTo('timeplan')}}
    else if(href==='pt-studio'){setPTStudioWorkspace('studio');setPTStudioInitialTab(isStaff(profile)||isPTCoach?'pt-timar':item.title==='Svar på PT-førespurnaden'?'forespurnader':'meldingar');setFocusPTPanel(null);navigateTo('pt-studio')}
    else if(href==='pt-info'){setPTStudioWorkspace('studio');setPTStudioInitialTab('meldingar');setFocusPTPanel(null);navigateTo('pt-studio')}
    else if(item.category==='pt'){setFocusPTRequestId(null);setFocusPTPanel(null);setPTStudioWorkspace('studio');setPTStudioInitialTab(isPTCoach?'oversikt':isStaff(profile)?'pt-timar':'meldingar');navigateTo('pt-studio')}
    else if(href)navigateTo(({booking:'timeplan','/timeplan':'timeplan',pt:'timeplan','mi-trening':'mi-trening','wod-studio':'wod','wod-library':'wod'}[href]||href))
  }
  function navigateRoot(next){setNavigationStack([]);setActive(next)}
  function handleSectionNavigate(id){setHelpTopic(null);if(id===active){if(id==='admin'&&profile.role==='admin'){setAdminInitialTab('drift');setAdminFocusToken(value=>value+1)}return}if(id==='pt-studio'){setPTStudioWorkspace('studio');setPTStudioInitialTab(isStaff(profile)||isPTCoach?'oversikt':'tenester')}if(id==='timeplan')setScheduleTab('mine');if(id==='admin'){setAdminInitialTab(profile.role==='admin'?'drift':'oversikt');setAdminFocusToken(value=>value+1)}navigateRoot(id)}
  function openPTClientWorkspace(){setPTStudioWorkspace('studio');setPTStudioInitialTab('oversikt');navigateTo('pt-studio')}
  function navigateBack(fallback='oversikt'){const previous=navigationStack[navigationStack.length-1]||fallback;setNavigationStack(stack=>stack.slice(0,-1));setActive(previous)}
  function openHelp(topic='navigation'){setHelpTopic(topic);navigateTo('mi-side')}
  function openFromHelp(target){
    setHelpTopic(null)
    if(target==='free'){setQuickStart(true);navigateTo('trening')}
    else if(target==='manual'){setQuickManualEntry(true);navigateTo('trening')}
    else if(target==='workout')navigateTo('trening')
    else if(target==='wod')navigateTo('wod')
    else if(target==='plan')openMyTraining()
    else if(target==='group'){setScheduleTab('booking');navigateTo('timeplan')}
    else if(target==='pt'){setPTStudioInitialTab(isPTCoach?'oversikt':'tenester');navigateTo('pt-studio')}
    else if(target==='pt-admin'){setPTStudioInitialTab('administrasjon');navigateTo('pt-studio')}
    else if(target==='maintenance'&&profile.role==='admin'){setAdminInitialTab('drift');setAdminFocusToken(value=>value+1);navigateTo('admin')}
    else if(target==='coffee')navigateTo('kaffi')
    else if(target==='community')navigateTo('fellesskap')
    else if(target==='history')navigateTo('mi-historikk')
    else if(target==='pr')navigateTo('pr-senter')
    else if(target==='music')navigateTo('musikk')
    else if(target==='admin'&&isStaff(profile))navigateTo('admin')
    else if(target==='profile')setActive('mi-side')
    else navigateTo('oversikt')
  }
  useEffect(()=>{const sync=()=>setAppFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[])
  useEffect(()=>{
    let live=true
    setSimpleModeReady(false)
    setSimpleMode(false)
    setSimpleModeError('')
    if(!session?.user?.id||!profile?.role)return()=>{live=false}
    if(profile.role==='admin'){setSimpleModeReady(true);return()=>{live=false}}
    supabase.from('member_preferences').select('super_simple_mode,preferred_display_mode').eq('user_id',session.user.id).maybeSingle().then(({data,error})=>{
      if(!live)return
      if(error){setSimpleMode(profile.role==='member');setSimpleModeError('Kunne ikkje lesa visningsvalet: '+error.message)}
      else setSimpleMode(resolveSimpleMode(profile.role,data))
      setSimpleModeReady(true)
    })
    return()=>{live=false}
  },[session?.user?.id,profile?.role])
  useEffect(()=>{
    if(simpleMode&&!['oversikt','trening','timeplan','mi-trening','mi-side','mi-historikk','pr-senter','wod','pt-studio','kaffi'].includes(active)){setNavigationStack([]);setActive('oversikt')}
  },[simpleMode,active])
  useEffect(()=>{
    let live=true
    setIsPTCoach(false)
    if(!session?.user?.id||profile?.id!==session.user.id||!profile.active||profile.membership_status!=='approved'||isStaff(profile))return()=>{live=false}
    supabase.from('pt_coaches').select('id').eq('user_id',session.user.id).eq('is_active',true).maybeSingle().then(({data,error})=>{
      if(live&&!error)setIsPTCoach(Boolean(data?.id))
    })
    return()=>{live=false}
  },[session?.user?.id,profile?.id,profile?.active,profile?.membership_status,profile?.role])
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
    if(!error&&!data?.length)await supabase.from('member_preferences').upsert({...displayModePreference(session.user.id,simpleMode),last_seen_pt_wod_at:now},{onConflict:'user_id'})
    setNewPtWodCount(0)
    navigateTo('mi-trening')
  }
  async function changeSimpleMode(value){if(profile?.role==='admin')return;const previous=simpleMode;setSimpleMode(value);setSimpleModeError('');setSimpleModeSaving(true);try{const {error}=await supabase.from('member_preferences').upsert(displayModePreference(session.user.id,value),{onConflict:'user_id'});if(error)throw error;setSimpleModeError('Valet er lagra.')}catch(error){setSimpleMode(previous);setSimpleModeError('Kunne ikkje lagra valet: '+(error.message||'Ukjend feil'))}finally{setSimpleModeSaving(false)}}
  async function toggleAppFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setProfileError('Fullskjerm er ikkje tilgjengeleg i denne nettlesaren.')}}
  async function openWorkout(log) {
    if (!log?.id) { setSelectedWorkout(log); return }
    setSelectedWorkout({...log,exercises:null,detailLoading:true,detailError:''})
    try {
      const [logResult,exerciseResult]=await Promise.all([
        supabase.from('workout_logs').select('id,title,workout_date,format,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,note,result_data').eq('id',log.id).eq('member_id',session.user.id).single(),
        supabase.from('workout_exercises').select('id,exercise_name,source_text,sort_order,workout_sets(id,set_number,reps,load_kg,height_cm,time_text,time_seconds)').eq('workout_log_id',log.id).order('sort_order',{ascending:true})
      ])
      if(logResult.error||exerciseResult.error)throw logResult.error||exerciseResult.error
      setSelectedWorkout(current=>current?.id===log.id?{...current,...logResult.data,exercises:exerciseResult.data||[],detailLoading:false}:current)
    } catch(error) {
      setSelectedWorkout(current=>current?.id===log.id?{...current,exercises:[],detailLoading:false,detailError:error.message||'Kunne ikkje henta øvingsdetaljane.'}:current)
    }
  }
  async function handleWorkoutSaved(updated){
    setWorkoutRevision(value=>value+1)
    await openWorkout({...selectedWorkout,...updated})
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
  if (passwordRecovery) return <AuthScreen key="recovery" recovery onRecoveryComplete={() => setPasswordRecovery(false)} />
  if (invitationPending && session) return <AuthScreen key="invitation" invitation onInvitationComplete={()=>{clearInviteLanding(window);setInvitationPending(false)}} />
  if (invitationPending && !session) return <main className="auth-shell"><div className="auth-card"><div className="eyebrow"><ShieldCheck size={14}/> INVITASJON</div><h1>Lenkja er <em>ikkje gyldig.</em></h1><p className="auth-intro">Opne invitasjonslenkja direkte frå e-posten. Dersom ho er brukt eller utgått, må du be administrator om ei ny invitasjon.</p><button type="button" className="primary-button" onClick={()=>{clearInviteLanding(window);setInvitationPending(false)}}>Til innlogging</button></div></main>
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
  if (getMembershipGate(profile) === 'pending') {
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
  if (getMembershipGate(profile) === 'denied') {
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

  const staffNavigation=sections.filter(item=>item.id!=='pt-info')
  const memberNavigation=[sections[0],sections[1],sections[4],sections[2],{...sections[3],label:'PT-oppfølging',note:'Dine program, mål og kontakt med PT'},sections[8],sections[5],sections[6],sections[7]]
  const coachNavigation=memberNavigation.map(item=>item.id==='pt-studio'?{...item,label:'PT Studio',note:'Dine tildelte kundar, program og PT-oppfølging'}:item)
  const visibleSections = simpleMode ? [] : (isStaff(profile) ? staffNavigation.concat([{id:'admin',label:'Administrasjon',icon:Settings,note:'Medlemmer og drift'}]) : isPTCoach ? coachNavigation : memberNavigation)
  const mobileNavItems = simpleMode ? [...sections.filter(item=>['oversikt','trening','wod','timeplan','mi-side'].includes(item.id)),{...sections[3],label:isPTCoach?'PT Studio':'PT'}] : visibleSections
  const current = visibleSections.find((item) => item.id === active) || sections[0]
  const Icon = current.icon

  return (
    <MusicProvider memberId={session.user.id}>
    <div className={simpleMode?"app-shell simple-app-shell":"app-shell"}>
      {!simpleMode&&<aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Wrench size={22} /></div>
          <div><strong>GARASJEGYM</strong><span>{RELEASE_NAME}</span></div>
        </div>
        <div className="side-label">HOVUDMENY</div>
        <nav aria-label="Hovudmeny">
          {visibleSections.map(({ id, label, icon: ItemIcon }) => (
            <button
              key={id}
              type="button"
              className={active === id ? 'nav-item selected' : 'nav-item'}
              aria-label={label}
              aria-current={active === id ? 'page' : undefined}
              title={label}
              onClick={() => handleSectionNavigate(id)}
            >
              <ItemIcon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><span className="status-dot" /> {isPTCoach?'PT':isStaff(profile)?'ADMIN':'MEDLEM'} · {profile.role.toUpperCase()}</div>
      </aside>}
      <main className={simpleMode?'main simple-app-main':'main'}>
        <header className={'topbar'+(active!=='oversikt'&&navigationStack.length>0?' has-route-back':'')}>
          <div className="mobile-brand">GARASJEGYM <span>{RELEASE_SHORT}</span></div>
          {active!=='oversikt'&&navigationStack.length>0&&<button type="button" className={simpleMode?'simple-back-button':'route-back-button'} onClick={()=>navigateBack('oversikt')}>← Tilbake</button>}
          <div className="top-meta">
            <span className="member-name">{profile.display_name || session.user.email}</span>
            <Notifications isAdmin={profile.role==='admin'} staff={isStaff(profile)} onNavigate={handleNotificationNavigate} />
            {isStaff(profile)&&<button className="icon-button" onClick={()=>setInfotainmentActive(true)} title="Opna infotainment" aria-label="Opna infotainment"><MonitorPlay size={16}/></button>}<button className="icon-button" onClick={toggleAppFullscreen} title={appFullscreen?"Avslutt fullskjerm":"Fullskjerm"} aria-label={appFullscreen?"Avslutt fullskjerm":"Fullskjerm"}>{appFullscreen?<Minimize size={16}/>:<Maximize size={16}/>}</button><button className="icon-button" onClick={() => supabase.auth.signOut()} title="Logg ut" aria-label="Logg ut"><LogOut size={16} /></button>
          </div>
        </header>
        {active!=='trening'&&timerSnapshot.sessionOpen&&<button type="button" className="ongoing-workout-return" onClick={()=>navigateRoot('trening')} aria-label="Tilbake til den pågåande økta">
          <span className="ongoing-workout-status"><span aria-hidden="true" className={timerSnapshot.running?'ongoing-live-dot is-running':'ongoing-live-dot'}/>{timerSnapshot.running?'ØKT PÅGÅR':timerSnapshot.sessionPrepared?'ØKT PAUSA':'ØKT KLAR'}</span>
          <strong>{timerSnapshot.title||'Økta di'}</strong>
          <span className="ongoing-workout-action">{String(Math.floor((timerSnapshot.elapsed||0)/60)).padStart(2,'0')}:{String((timerSnapshot.elapsed||0)%60).padStart(2,'0')} · Tilbake til økta →</span>
        </button>}
        {simpleMode && active==='oversikt' ? <section className="welcome simple-welcome">
          <div className="eyebrow"><Activity size={14} /> GARASJEGYM · SUPERENKEL</div>
          <h1>Hei, <em>{profile.display_name?.split(' ')[0]||'der'}.</em></h1>
          
        </section> : null}{simpleMode&&active==='oversikt'&&dailyWod&&<button type="button" className="app-daily-wod-strip" onClick={()=>{setFocusWodId(dailyWod.id);navigateTo('wod')}}><span>DAGENS WOD</span><strong>{dailyWod.name}</strong><small>{dailyWod.format} · {dailyWod.duration_minutes||'–'} min · Opne WOD-kortet →</small></button>}
        <Suspense fallback={<section className="content-card training-content" role="status" aria-live="polite"><div className="training-state">Lastar modul …</div></section>}>
        {(trainingVisited||active==='trening')&&<section className="content-card training-content workout-entry" style={{display:active==='trening'?undefined:'none'}} aria-hidden={active!=='trening'}>
          <Training memberId={session.user.id} visible={active==='trening'} onBackground={()=>navigateRoot('oversikt')} onOpenWodLibrary={()=>{setFocusWodId(null);navigateTo('wod')}} onOpenTrainingPlan={openMyTraining} onOpenSchedule={()=>{setScheduleTab('mine');navigateTo('timeplan')}} onSaved={()=>navigateBack('oversikt')} onDiscard={()=>navigateBack('oversikt')} onTimerSnapshot={handleTimerSnapshot} quickManualEntry={quickManualEntry} onQuickManualEntryConsumed={()=>setQuickManualEntry(false)} launchWodId={launchWodId} launchClassSessionId={launchClassSessionId} launchClassResult={launchClassResult} launchAssignmentId={launchAssignmentId} launchProgramSessionId={launchProgramSessionId} launchProgramSessionTitle={launchProgramSessionTitle} onLaunchConsumed={() => { setLaunchWodId(null); setLaunchClassSessionId(null); setLaunchClassResult(false); setLaunchAssignmentId(null); setLaunchProgramSessionId(null); setLaunchProgramSessionTitle('') }} simpleMode={simpleMode} quickStart={quickStart} onQuickStartConsumed={()=>setQuickStart(false)} />
        </section>}
        {active === 'oversikt' ? <section className="content-card training-content">{simpleMode?<SimpleCustomerHome newPtWodCount={newPtWodCount} coach={isPTCoach} onHelp={()=>openHelp("navigation")} onPlan={openMyTraining} onFree={()=>{setQuickStart(true);navigateTo('trening')}} onWod={()=>{setFocusWodId(null);navigateTo('wod')}} onManual={()=>{setQuickManualEntry(true);navigateTo('trening')}} onSchedule={()=>{setScheduleTab('booking');navigateTo('timeplan')}} onHistory={()=>navigateTo('mi-historikk')} onCoffee={()=>navigateTo('kaffi')} onContactPT={()=>{setPTStudioInitialTab(isPTCoach?'oversikt':'tenester');navigateTo('pt-studio')}} />:<Overview refreshToken={workoutRevision} profile={profile} dailyWod={dailyWod} onNavigate={navigateTo} onOpenWorkout={openWorkout} onOpenWod={(id)=>{setFocusWodId(id);navigateTo('wod')}} />}</section> : active === 'trening' ? null : active === 'timeplan' ? <section className="content-card training-content"><ScheduleHub simpleMode={simpleMode} profile={profile} onContactPT={()=>{setPTStudioInitialTab("tenester");navigateTo("pt-studio")}} onOpenWod={(wodId,sessionId)=>{setFocusWodId(wodId);setLaunchClassSessionId(sessionId||null);setLaunchAssignmentId(null);navigateTo('wod')}} initialClassId={focusGroupClassId} initialTab={scheduleTab} onTabChange={setScheduleTab} focusRequestId={focusPTRequestId} onFocusConsumed={()=>setFocusPTRequestId(null)} onLogResult={(wodId,sessionId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(sessionId);setLaunchClassResult(true);navigateTo('trening')}} onLaunchWorkout={(wodId)=>{setLaunchWodId(wodId);setLaunchClassSessionId(null);setLaunchClassResult(false);navigateTo('trening')}} /></section> : active === 'pt-studio' ? <section className="content-card training-content"><PTStudio onOpenNotification={handleNotificationNavigate} focusServiceRequest={focusPTServiceRequest} profile={profile} simpleMode={simpleMode} coachMode={isPTCoach} onGroupSchedule={()=>{setScheduleTab("booking");navigateTo("timeplan")}} initialClientId={focusPTClientId} initialWorkspace={ptStudioWorkspace} initialTab={ptStudioInitialTab} focusRequestId={focusPTRequestId} focusGroupClassId={focusGroupClassId} focusPanel={focusPTPanel} onFocusPanelConsumed={()=>setFocusPTPanel(null)} onFocusRequestConsumed={()=>setFocusPTRequestId(null)} onFocusGroupClassConsumed={()=>setFocusGroupClassId(null)} onLaunchWorkout={(wodId,programSessionId,sessionTitle)=>{setLaunchWodId(wodId||null);setLaunchClassSessionId(null);setLaunchAssignmentId(null);setLaunchProgramSessionId(programSessionId||null);setLaunchProgramSessionTitle(sessionTitle||'');navigateTo('trening')}} /></section> : active === 'mi-trening' ? <section className="content-card training-content"><MyTraining simpleMode={simpleMode} onOpenWod={(wodId,assignmentId)=>{setLaunchWodId(wodId);setLaunchAssignmentId(assignmentId||null);setLaunchProgramSessionId(null);setLaunchClassSessionId(null);navigateTo('trening')}} onLaunchProgramSession={(session,assignmentId)=>{setLaunchWodId(session.wod_id||null);setLaunchAssignmentId(assignmentId||null);setLaunchProgramSessionId(session.id);setLaunchProgramSessionTitle(session.title||'');setLaunchClassSessionId(null);navigateTo('trening')}} onContactPT={()=>{setPTStudioInitialTab(isPTCoach?'oversikt':'tenester');navigateTo('pt-studio')}} /></section> : active === 'wod' ? <section className="content-card training-content"><WodHub staff={isStaff(profile)} isAdmin={profile?.role==='admin'} initialImportedWod={pendingWodImport} onImportConsumed={()=>setPendingWodImport(null)} simpleMode={simpleMode} launchAssignmentId={launchAssignmentId} launchClassSessionId={launchClassSessionId} focusWodId={focusWodId} onFocusConsumed={()=>setFocusWodId(null)} onLaunchWod={(wodId,assignmentId,sessionId)=>{setLaunchWodId(wodId);setLaunchAssignmentId(assignmentId||null);setLaunchClassSessionId(sessionId||null);navigateTo('trening')}} /></section> : active === 'fellesskap' ? <section className="content-card training-content"><Community profile={profile} /></section> : active === 'kaffi' ? <section className="content-card training-content"><CoffeeBar profile={profile} onHelp={openHelp} focusReviewId={focusCoffeeReviewId} onFocusReviewConsumed={()=>setFocusCoffeeReviewId(null)} /></section> : active === 'musikk' ? <section className="content-card training-content"><Music /></section> : active === 'mi-side' || active === 'pr-senter' || active === 'mi-historikk' ? <section className="content-card training-content"><MyPage onHelpNavigate={openFromHelp} initialHelpTopic={helpTopic} isPTCoach={isPTCoach} onProfileUpdated={display_name=>setProfile(p=>({...p,display_name}))} onMusic={()=>navigateTo('musikk')} refreshToken={workoutRevision} profile={profile} email={session.user.email} onOpenWorkout={openWorkout} onLaunchWod={(wodId,assignmentId,sessionId)=>{setLaunchWodId(wodId);setLaunchAssignmentId(assignmentId||null);setLaunchClassSessionId(sessionId||null);navigateTo('trening')}} simpleMode={simpleMode} onSimpleModeChange={changeSimpleMode} simpleModeError={simpleModeError} simpleModeSaving={simpleModeSaving} initialTab={active==='mi-side'&&helpTopic?'help':active==='pr-senter'?'records':active==='mi-historikk'?'history':'profile'} /></section> : active === 'admin' ? <section className="content-card training-content"><Admin profile={profile} onOpenWodLibrary={()=>{setFocusWodId(null);navigateTo('wod')}} onOpenPTClients={openPTClientWorkspace} onOpenPTAdmin={()=>{setPTStudioWorkspace('studio');setPTStudioInitialTab('administrasjon');navigateTo('pt-studio')}} initialTab={adminInitialTab} focusToken={adminFocusToken} onOpenWodImport={parsed=>{setPendingWodImport(parsed);navigateTo('wod')}} /></section> : <section className="content-card">
          <div className="section-icon"><Icon size={22} /></div>
          <div className="section-kicker">MODUL · {active.toUpperCase()}</div>
          <h2>{current.label}</h2>
          <p>{current.note}</p>
          <div className="notice">
            <strong>Innlogging og medlemsroller er kopla til.</strong>
            <span>Dette er GarasjeGym 2.0 – STURMKOPF FEUER 1.1. Eksisterande 1.8.16 og produksjonsdata er ikkje endra.</span>
          </div>
        </section>}
        </Suspense>
        {selectedWorkout&&<WorkoutDetail workout={selectedWorkout} memberId={session.user.id} onBack={()=>setSelectedWorkout(null)} onSaved={handleWorkoutSaved} onDeleted={()=>{setSelectedWorkout(null);setWorkoutRevision(value=>value+1)}}/>}
        <footer>GARASJEGYM · {RELEASE_NAME}</footer>
      </main>
      <AppMobileNavigation items={mobileNavItems} active={active} staff={!simpleMode&&isStaff(profile)} admin={profile.role==='admin'} coach={isPTCoach} onNavigate={handleSectionNavigate}/>
      {infotainmentActive&&isStaff(profile)&&<Suspense fallback={<div className="training-state" role="status">Lastar infotainment …</div>}><Infotainment onExit={()=>{try{sessionStorage.removeItem('garasjegym:infotainment-active');sessionStorage.removeItem('garasjegym:infotainment-tab')}catch{}setInfotainmentActive(false)}} timerSnapshot={timerSnapshot}/></Suspense>}
    </div>
    </MusicProvider>
  )
}
