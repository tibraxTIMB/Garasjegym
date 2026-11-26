import {lazy,Suspense,useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {ArrowRight,CheckCircle2,ClipboardList,Dumbbell,Plus,RefreshCw,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import PTWodReview from './PTWodReview.jsx'
import './pt-client-followup.css'

const WodBuilder=lazy(()=>import('./WodBuilder.jsx'))
const completedStatus=status=>['completed','done','finished'].includes(String(status||'').toLowerCase())
const statusLabel=status=>completedStatus(status)?'Gjennomført':status==='in_progress'?'Pågår':status==='assigned'?'Tildelt':status==='planned'?'Planlagd':status==='cancelled'?'Avslutta':'Ikkje rapportert'
const shortDate=value=>value?new Date(value).toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}):null

/** PTs can see only explicit PT WOD assignments and their own PT program sessions.
 * No workout_logs query: a customer's unrelated private training remains private.
 */
export default function PTClientWods({clientId,clientName='',clientRank=null,mode='full',planSessions=[],wods=[],initialReview=null,assignRequest=null,onAssignClosed=()=>{},onOpenFull=()=>{},onOpenReview=()=>{},onReviewClosed=()=>{}}){
 const [assignments,setAssignments]=useState([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [revision,setRevision]=useState(0)
 const [showAssign,setShowAssign]=useState(false)
 const [openedReview,setOpenedReview]=useState(null)
 useEffect(()=>{
  let active=true
  setAssignments([])
  setError('')
  setShowAssign(false)
  setOpenedReview(null)
  if(!clientId){setLoading(false);return()=>{active=false}}
  setLoading(true)
  supabase.from('pt_wod_assignments')
   .select('id,member_id,wod_id,assigned_by,status,created_at,due_date,completed_at,workout_log_id,wods(id,name,format,duration_minutes,timer_settings)')
   .eq('member_id',clientId).order('created_at',{ascending:false}).limit(150)
   .then(({data,error:readError})=>{
    if(!active)return
    if(readError)setError('Kunne ikkje henta tildelte WOD-ar: '+readError.message)
    else setAssignments((data||[]).filter(row=>row.member_id===clientId))
    setLoading(false)
   })
  return()=>{active=false}
 },[clientId,revision])
 useEffect(()=>{if(initialReview&&clientId)setOpenedReview(initialReview)},[initialReview,clientId])
 useEffect(()=>{if(assignRequest?.clientId===clientId&&assignRequest?.id){setOpenedReview(null);setShowAssign(true)}},[assignRequest,clientId])
 const activeAssignments=useMemo(()=>assignments.filter(row=>!completedStatus(row.status)&&row.status!=='cancelled'),[assignments])
 const doneAssignments=useMemo(()=>assignments.filter(row=>completedStatus(row.status)),[assignments])
 const programWods=useMemo(()=>planSessions.filter(row=>row.wod_id&&!row.archived_at).map(session=>({
   ...session,wodName:wods.find(w=>w.id===session.wod_id)?.name||session.title||'Program-WOD'
 })),[planSessions,wods])
 const preview=mode==='overview'
 const shownActive=preview?activeAssignments.slice(0,3):activeAssignments
 const shownDone=preview?doneAssignments.slice(0,3):doneAssignments
 const shownProgram=preview?programWods.slice(0,2):programWods
 const renderAssignment=row=><article className="ptfollow-wod-row" key={row.id}>
   <div className="ptfollow-wod-icon"><Dumbbell size={17}/></div>
   <div className="ptfollow-wod-main">
    <strong>{row.wods?.name||'WOD frå tidlegare tildeling'}</strong>
    <small>{[row.wods?.format,row.due_date?'Frist '+shortDate(row.due_date):null,row.completed_at?'Fullført '+shortDate(row.completed_at):null].filter(Boolean).join(' · ')}</small>
   </div>
   <div className="ptfollow-wod-actions">
    <span className={'ptfollow-status '+(completedStatus(row.status)?'is-done':'')}>{statusLabel(row.status)}</span>
    {completedStatus(row.status)&&row.workout_log_id&&<button type="button" className="secondary-button" aria-expanded={openedReview==='assignment:'+row.id} onClick={()=>{const key='assignment:'+row.id;if(preview)onOpenReview(key);else setOpenedReview(openedReview===key?null:key)}}>{openedReview==='assignment:'+row.id?'Lukk resultat':'Sjå resultat'}</button>}
   </div>
  </article>
 const renderProgram=session=><article className="ptfollow-wod-row" key={session.id}>
   <div className="ptfollow-wod-icon"><ClipboardList size={17}/></div>
   <div className="ptfollow-wod-main"><strong>{session.wodName}</strong>
    <small>{[session.title&&session.title!==session.wodName?session.title:null,session.scheduled_date?'Planlagt '+shortDate(session.scheduled_date):null].filter(Boolean).join(' · ')||'WOD i PT-treningsplan'}</small>
   </div>
   <div className="ptfollow-wod-actions">
    <span className={'ptfollow-status '+(completedStatus(session.status)?'is-done':'')}>{completedStatus(session.status)?'Gjennomført':'I treningsplan'}</span>
    {completedStatus(session.status)&&session.workout_log_id&&<button type="button" className="secondary-button" aria-expanded={openedReview==='program:'+session.id} onClick={()=>{const key='program:'+session.id;if(preview)onOpenReview(key);else setOpenedReview(openedReview===key?null:key)}}>{openedReview==='program:'+session.id?'Lukk resultat':'Sjå resultat'}</button>}
   </div>
  </article>
 const [reviewKind,reviewId]=openedReview?openedReview.split(':'):[null,null]
 const selectedAssignment=reviewKind==='assignment'?assignments.find(row=>row.id===reviewId&&row.member_id===clientId&&completedStatus(row.status)&&row.workout_log_id):null
 const selectedProgram=reviewKind==='program'?programWods.find(row=>row.id===reviewId&&completedStatus(row.status)&&row.workout_log_id):null
 if(mode==='full'&&openedReview&&!loading&&(selectedAssignment||selectedProgram)){
  const a=selectedAssignment,p=selectedProgram
  return <section className="ptfollow ptfollow-fullreview" aria-label={'PT-resultat for '+clientName}>
   <PTWodReview key={openedReview} assignmentId={a?.id||null} programSessionId={p?.id||null}
    clientName={clientName} clientRank={clientRank}
    wodName={a?.wods?.name||p?.wodName||'Tildelt WOD'}
    prescriptionSchema={a?.wods?.timer_settings?.workout_schema||wods.find(w=>w.id===p?.wod_id)?.timer_settings?.workout_schema||null}
    onClose={()=>{setOpenedReview(null);onReviewClosed()}}/>
  </section>
 }
 return <section className={'ptfollow ptfollow-'+mode} aria-label={'PT-tildelte WOD-ar for '+clientName}>
   <div className="ptfollow-heading">
    <div><span className="section-kicker">WOD-TILDELINGAR</span><h3>{preview?'Tildelte WOD-ar':'WOD-ar · '+clientName}</h3>
      {!preview&&<p>Berre WOD-ar knytte til PT-tildelingar og treningsplanar. Privat treningshistorikk blir ikkje vist.</p>}
    </div>
    <div className="ptfollow-heading-actions">
     {!preview&&<button type="button" className="secondary-button" onClick={()=>setRevision(x=>x+1)} disabled={loading}><RefreshCw size={15}/> Oppdater</button>}
     {preview?<button type="button" className="secondary-button" onClick={onOpenFull}>Sjå tildelingar og resultat <ArrowRight size={15}/></button>:
      <button type="button" className="primary-button" onClick={()=>setShowAssign(value=>!value)}><Plus size={16}/>{showAssign?'Lukk tildeling':'Tildel WOD'}</button>}
    </div>
   </div>
   {loading&&<p role="status" className="ptfollow-info">Hentar WOD-tildelingane …</p>}
   {error&&<p role="alert" className="auth-error">{error}</p>}
   {!loading&&!error&&<>
    <div className="ptfollow-counts" aria-label="WOD-status">
     <span><b>{activeAssignments.length}</b> tildelte / pågår</span>
     <span><b>{doneAssignments.length}</b> gjennomførte</span>
     {programWods.length>0&&<span><b>{programWods.length}</b> i PT-planar</span>}
    </div>
    <div className="ptfollow-section">
     <h4>Klare / pågåande WOD-ar</h4>
     {shownActive.length?shownActive.map(renderAssignment):<p className="ptfollow-empty">Ingen aktive WOD-tildelingar.</p>}
    </div>
    <div className="ptfollow-section">
     <h4><CheckCircle2 size={16}/> Gjennomførte tildelingar</h4>
     {shownDone.length?shownDone.map(renderAssignment):<p className="ptfollow-empty">Ingen tildelte WOD-ar er registrerte som gjennomførte.</p>}
    </div>
    {!preview&&programWods.length>0&&<div className="ptfollow-section">
     <h4>WOD-ar i PT-planar</h4>
     {shownProgram.map(renderProgram)}
     <small className="ptfollow-footnote">Programstatus er separat frå direkte WOD-tildeling og privat treningslogg.</small>
    </div>}
    {preview&&<p className="ptfollow-footnote">Du ser berre PT-tilknytte WOD-ar, ikkje andre treningsøkter.</p>}
   </>}
   {showAssign&&createPortal(<div className="gg-pt-assign-backdrop"><section className="gg-pt-assign-sheet" role="dialog" aria-modal="true" aria-label={'Tildel WOD til '+clientName}>
    <header className="gg-pt-assign-head"><div><h4>Tildel WOD</h4><small>Mottakar: {clientName}</small></div><button type="button" aria-label="Lukk tildeling" onClick={()=>{setShowAssign(false);onAssignClosed()}}><X size={20}/></button></header>
    <Suspense fallback={<p className="ptfollow-info">Opnar WOD-biblioteket …</p>}>
      <WodBuilder key={clientId} assignedClientId={clientId} onAssigned={()=>{setShowAssign(false);onAssignClosed();setRevision(x=>x+1)}}/>
    </Suspense>
   </section></div>,document.body)}
  </section>
}
