import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarCheck2, CalendarDays, CheckCircle2, ClipboardList, LoaderCircle, MessageSquareText, Play, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import {ptFlowRows,ptNextAction,FLOW_MODES} from '../lib/ptFlow.js'
import PTPreparation from './PTPreparation.jsx'
import {PTWeekCalendar} from './PTSchedule.jsx'
import {planDate,planTime} from '../lib/ptSchedule.js'
import './customer-journey.css'

const SESSION_KIND_LABELS = { training: 'Treningsøkt', assessment: 'Test', recovery: 'Restitusjon', rest: 'Kviledag', information: 'Infotime', progression_step: 'Progresjonssteg' }

const formatDate = date => date ? new Date(date + (date.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('nn-NO', { day: 'numeric', month: 'short' }) : ''
const sessionOrder = (a, b) => (Number(a.week_no) || 1) - (Number(b.week_no) || 1) || (Number(a.day_no) || 1) - (Number(b.day_no) || 1) || (Number(a.sequence_no) || 0) - (Number(b.sequence_no) || 0)

export default function MyTraining({ onOpenWod, onLaunchProgramSession, onContactPT, simpleMode = false }) {
  const [assignments, setAssignments] = useState([])
  const [dailyWods, setDailyWods] = useState([])
  const [programs, setPrograms] = useState([])
  const [programSessions, setProgramSessions] = useState([])
  const [sessions, setSessions] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const launchLock=useRef(false)
  const [launching,setLaunching]=useState(false)

  async function load(showLoader = false) {
    if (showLoader) setLoading(true)
    setError('')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { setError('Logg inn på nytt for å sjå treningsplanen.'); setLoading(false); return }

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const [a, p, b, d, plans] = await Promise.all([
      supabase.from('pt_wod_assignments').select('id,wod_id,due_date,linked_session_id,location,coach_note,status,created_at,wods(id,name,format,duration_minutes,movements,notes)').eq('member_id', user.id).in('status', ['assigned', 'in_progress']).order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('pt_sessions').select('id,client_id,title,starts_at,duration_minutes,status,session_type,message').eq('client_id', user.id).in('status', ['published', 'planned', 'completed']).order('starts_at', { ascending: true }).limit(50),
      supabase.from('class_bookings').select('id,status,classes(id,title,type,starts_at,duration_minutes,description)').eq('member_id', user.id).eq('status', 'confirmed').limit(50),
      supabase.from('wod_daily_schedules').select('wod_id,scheduled_date,target_class_id,wods(id,name,format,duration_minutes,movements,notes,timer_settings)').eq('scheduled_date', today).eq('is_published', true),
      supabase.from('pt_programs').select('id,client_id,title,description,status,weeks,start_date,created_at,archived_at,flow_unlock_mode').eq('client_id', user.id).is('archived_at', null).order('created_at', { ascending: false }),
    ])
    const issues = [a, p, b, d, plans].filter(result => result.error).map(result => result.error.message)
    if (!a.error) setAssignments(a.data || [])
    if (!p.error) setSessions(p.data || [])
    if (!b.error) setClasses((b.data || []).filter(row => row.classes).map(row => ({ ...row.classes, booking_id: row.id })))
    if (!d.error) setDailyWods((d.data || []).filter(row => row.wods))
    if (!plans.error) {
      setPrograms(plans.data || [])
      const ids = (plans.data || []).map(row => row.id)
      if (ids.length) {
        const result = await supabase.from('pt_program_sessions').select('id,program_id,sequence_no,week_no,day_no,title,status,session_kind,estimated_minutes,scheduled_date,focus_area,coach_note,wod_id,workout_snapshot,archived_at,flow_requires_approval,flow_approved,flow_override').in('program_id', ids).is('archived_at', null)
        if (result.error) issues.push(result.error.message)
        else setProgramSessions(result.data || [])
      } else setProgramSessions([])
    }
    if (issues.length) setError('Noko av PT-informasjonen kunne ikkje hentast: ' + issues.join(' · '))
    setLoading(false)
  }

  useEffect(() => { load(true); const refresh = setInterval(() => load(), 60000); return () => clearInterval(refresh) }, [])

  const activeProgram = useMemo(() => programs.find(program => program.status === 'active'), [programs])
  const orderedSessions = ptFlowRows(activeProgram,programSessions)
  const {next:nextSession,review:waitingSession,blocked:blockedSession,completed:completedCount,total:totalSessions,percent:progress}=ptNextAction(orderedSessions)
  // A reusable WOD id is not the identity of a plan session.
  const uniqueDailyWods = [...new Map(dailyWods.map(row => [row.wod_id, row])).values()]
  const remainingAssignments = assignments // Assignment identity is distinct from a public daily WOD.
  const programWeeks = [...new Set(orderedSessions.map(session => Number(session.week_no) || 1))].sort((a, b) => a - b)

  async function launchSession(session) {
    if(launchLock.current||session.flowState!=='ready'||!onLaunchProgramSession)return
    launchLock.current=true;setLaunching(true)
    try{
      const {data,error:launchError}=await supabase.rpc('pt_flow_can_start',{p_session_id:session.id})
      if(launchError||data!==true){await load();setError('Økta er ikkje tilgjengeleg no. Oppdater planen eller spør PT.');return}
      await onLaunchProgramSession(session,null)
    }catch(e){setError(e.message||'Kunne ikkje starta økta.')}
    finally{launchLock.current=false;setLaunching(false)}
  }

  if (loading) return <div className="training-state"><LoaderCircle className="spin" /> Hentar treningsplanen din …</div>

  return <div className={simpleMode ? 'my-training simple-assigned customer-training-plan' : 'my-training customer-training-plan'}>
    <header className="training-heading customer-plan-heading">
      <div><span className="section-kicker">DIN PT-PLAN OG TRENING</span><h3>Min treningsplan</h3><p>Program, tildelte økter og neste steg samla på éin stad.</p></div>
      <button type="button" className="secondary-button customer-plan-refresh" onClick={() => load(true)}><RefreshCw size={16} /> Oppdater</button>
    </header>
    {error && <div className="auth-error" role="alert">{error}</div>}

    <PTWeekCalendar program={activeProgram} plan={orderedSessions} assignments={assignments} appointments={sessions} classes={classes} canOpen={entry=>entry.kind==='plan'?entry.row.flowState==='ready':entry.kind==='assignment'&&['assigned','in_progress'].includes(entry.row.status)} onOpen={entry=>{if(entry.kind==='plan'&&entry.row.flowState==='ready')launchSession(entry.row);else if(entry.kind==='assignment'&&['assigned','in_progress'].includes(entry.row.status))onOpenWod?.(entry.row.wod_id,entry.row.id);else setError(entry.kind==='plan'?(entry.row.flowReason||'Denne økta er ikkje klar til start.'):'Sjå avtaledetaljane nedanfor.')}}/>
    <section className="customer-plan-program" aria-label="Aktiv treningsplan frå PT">
      <div className="customer-plan-program-head"><div><span className="section-kicker">AKTIV TRENINGSPLAN</span><h4>{activeProgram?.title || 'Ingen plan tildelt enno'}</h4></div>{activeProgram && <span className="customer-plan-state"><CheckCircle2 size={15} /> Aktiv</span>}</div>
      {activeProgram ? <>
        <small>{FLOW_MODES[activeProgram.flow_unlock_mode]||FLOW_MODES.open}</small>{activeProgram.description && <details className="customer-plan-details"><summary>Om planen</summary><p className="customer-plan-description">{activeProgram.description}</p></details>}
        <div className="customer-plan-progress-label"><span>{completedCount} av {totalSessions} økter gjennomførte</span><strong>{progress} %</strong></div>
        <div className="customer-plan-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Framdrift i treningsplan"><span style={{ width: `${progress}%` }} /></div>
        {nextSession ? <article className="customer-next-session"><span className="section-kicker">NESTE ØKT · VEKE {nextSession.week_no || 1}</span><h4>{nextSession.title}</h4><p>{SESSION_KIND_LABELS[nextSession.session_kind] || 'Treningsøkt'}{nextSession.estimated_minutes ? ` · ${nextSession.estimated_minutes} min` : ''}{planDate(activeProgram,nextSession) ? ` · ${formatDate(planDate(activeProgram,nextSession))}${planTime(nextSession)?' kl. '+planTime(nextSession):''}` : ''}</p><PTPreparation session={nextSession}/><button type="button" className="primary-button" disabled={launching} onClick={() => launchSession(nextSession)}><Play size={17} /> {launching?'Opnar …':nextSession.status==='in_progress'?'Hald fram':'Gjennomfør økta'}</button></article> : <div className="customer-plan-complete"><CheckCircle2 size={18} /> {waitingSession ? 'Resultat lagra. Ventar på PT-godkjenning.' : blockedSession ? blockedSession.flowReason : totalSessions ? 'Alle øktene i denne planen er gjennomførte!' : 'PT-en har ikkje lagt inn økter i planen enno.'}</div>}
        <details className="customer-plan-details" open={!simpleMode || undefined}><summary>Sjå heile treningsplanen <span>{orderedSessions.length} punkt</span></summary><div className="customer-plan-weeks">
          {programWeeks.map(week => <section key={week}><h5>Veke {week}</h5>{orderedSessions.filter(session => (Number(session.week_no) || 1) === week).map(session => <article key={session.id} className="customer-plan-session"><div className="customer-plan-session-copy"><strong>{session.sequence_no}. {session.title}</strong><small>{SESSION_KIND_LABELS[session.session_kind] || 'Trening'}{planDate(activeProgram,session) ? ` · ${formatDate(planDate(activeProgram,session))}${planTime(session)?' kl. '+planTime(session):''}` : ''}{session.estimated_minutes ? ` · ${session.estimated_minutes} min` : ''}</small>{session.coach_note && <p>{session.coach_note}</p>}{session.session_kind === 'progression_step' && session.workout_snapshot?.description && <p>{session.workout_snapshot.description}</p>}{session.session_kind === 'information' && session.workout_snapshot?.preparation && <p>Førebuing: {session.workout_snapshot.preparation}</p>}</div>{session.flowState==='review'?<span className="customer-session-note">Til PT-vurdering</span>:session.flowState==='done'?<span className="customer-session-done"><CheckCircle2 size={16}/> Ferdig</span>:session.flowState==='ready'&&session.id!==nextSession?.id?<button type="button" className="secondary-button" disabled={launching} onClick={()=>launchSession(session)}><Play size={14}/> Start</button>:<span className="customer-session-note">{session.id===nextSession?.id?'Neste økt':session.flowReason}</span>}</article>)}</section>)}
        </div></details>
      </> : <p className="customer-plan-description">Når PT-en lagar eit program til deg, kjem det automatisk opp her. Tildelte enkeltøkter finn du nedanfor.</p>}
    </section>

    {uniqueDailyWods.length > 0 && <section className="engine-section"><div className="engine-section-title"><h4><CalendarDays size={17} /> Dagens WOD – felles for alle</h4></div>{uniqueDailyWods.map(day => { return <article className="history-card my-training-card" key={day.wod_id}><strong>{day.wods.name}</strong><p>{day.wods.format} · {day.wods.duration_minutes || '–'} min</p><button type="button" className="primary-button" onClick={() => onOpenWod?.(day.wod_id, null)}><Play size={15} /> Gjennomfør WOD</button></article> })}</section>}

    {remainingAssignments.length > 0 && <section className="engine-section"><div className="engine-section-title"><h4><ClipboardList size={17} /> Personleg tildelte økter frå PT</h4><span>{remainingAssignments.length}</span></div>{remainingAssignments.map(assignment => <article className="history-card my-training-card" key={assignment.id}><div className="history-card-top"><strong>{assignment.wods?.name || 'Treningsoppgåve'}</strong><span>{assignment.status === 'in_progress' ? 'Påbegynt' : 'Tildelt'}</span></div>{assignment.due_date && <small>Frist: {formatDate(assignment.due_date)}</small>}{assignment.coach_note && <p>{assignment.coach_note}</p>}<div className="my-training-actions"><button type="button" className="primary-button" onClick={() => onOpenWod?.(assignment.wod_id, assignment.id)}><Play size={15} /> Gjennomfør økta</button></div></article>)}</section>}

    {!simpleMode && <><section className="engine-section"><div className="engine-section-title"><h4><CalendarCheck2 size={17} /> PT-avtalar</h4><span>{sessions.length}</span></div>{sessions.length ? sessions.map(appointment => <article className="history-card my-training-card" key={appointment.id}><strong>{appointment.title}</strong><p>{new Date(appointment.starts_at).toLocaleString('nn-NO')} · {appointment.duration_minutes} min</p></article>) : <p className="customer-plan-muted">Ingen planlagde PT-avtalar.</p>}</section><section className="engine-section"><div className="engine-section-title"><h4><CalendarDays size={17} /> Gruppetimar eg er påmeld</h4><span>{classes.length}</span></div>{classes.length ? classes.map(item => <article className="history-card my-training-card" key={item.booking_id}><strong>{item.title}</strong><p>{new Date(item.starts_at).toLocaleString('nn-NO')}</p></article>) : <p className="customer-plan-muted">Ingen påmeldte gruppetimar.</p>}</section></>}

    <button type="button" className="customer-plan-contact" onClick={onContactPT}><MessageSquareText size={19} /><span><strong>Spør PT-en din</strong><small>Meldingar, mål og oppfølging</small></span><ArrowRight size={17} /></button>
  </div>
}
