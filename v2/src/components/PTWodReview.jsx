import {useEffect,useMemo,useState} from 'react'
import {Activity,ArrowLeft,CheckCircle2,Clock3,MessageSquareText,Send,ShieldCheck} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {dosageLabel,formatDuration,pacingReview,ptDosingOptions,ptResultSummary,validRoundSplits} from '../lib/ptWodReview.js'

const formattedDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString('nn-NO',{day:'numeric',month:'long',year:'numeric'}):'Dato ikkje registrert'
const array=value=>Array.isArray(value)?value:[]
const formatExerciseSet=set=>[
 set.reps==null?null:`${set.reps} reps`,
 set.load_kg==null?null:`${set.load_kg} kg`,
 set.height_cm==null?null:`${set.height_cm} cm`,
 set.rir==null?null:`RIR ${set.rir}`,
 set.time_seconds==null?null:`${set.time_seconds} sek`
].filter(Boolean).join(' · ')

/** Only data returned by the assignment-scoped RPC is shown. Never query workout_logs directly. */
export default function PTWodReview({assignmentId=null,programSessionId=null,clientName='',wodName='',onClose=()=>{}}){
 const [result,setResult]=useState(null)
 const [feedback,setFeedback]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const [note,setNote]=useState('')
 const [dosing,setDosing]=useState('discuss')
 const [sent,setSent]=useState(false)
 useEffect(()=>{
  let active=true
  setResult(null);setFeedback([]);setError('');setSent(false);setLoading(true);setNote('');setDosing('discuss')
  const reference={p_assignment_id:assignmentId||null,p_program_session_id:programSessionId||null}
  const column=assignmentId?'assignment_id':'program_session_id'
  const id=assignmentId||programSessionId
  Promise.all([
   supabase.rpc('get_pt_wod_result',reference),
   supabase.from('pt_wod_feedback').select('id,body,dosing,created_at').eq(column,id).order('created_at',{ascending:false}).limit(30)
  ]).then(([r,f])=>{
   if(!active)return
   if(r.error||f.error)setError('Resultatet kunne ikkje hentast: '+(r.error?.message||f.error?.message))
   else {setResult(r.data||null);setFeedback(f.data||[])}
   setLoading(false)
  }).catch(e=>{if(active){setError(e.message||'Kunne ikkje henta PT-resultatet.');setLoading(false)}})
  return()=>{active=false}
 },[assignmentId,programSessionId])
 const laps=useMemo(()=>validRoundSplits(result),[result])
 const pace=useMemo(()=>pacingReview(result),[result])
 const metrics=useMemo(()=>ptResultSummary(result),[result])
 const maxLap=Math.max(1,...laps)
 const isAmrap=String(result?.format||'').toLowerCase()==='amrap'||['couplet','triplet'].includes(String(result?.format||'').toLowerCase())&&result?.result_data?.combination_mode==='AMRAP'
 const exerciseResults=array(result?.result_data?.exercise_results)
 const blockResults=array(result?.result_data?.block_summary)
 const send=async event=>{
  event.preventDefault()
  if(saving||!result)return
  const message=note.trim()
  if(message.length<5||message.length>2000){setError('Skriv ei konkret tilbakemelding på 5–2000 teikn.');return}
  if(!window.confirm('Send denne tilbakemeldinga til '+clientName+'? Kunden vil sjå ho i PT-dialogen.'))return
  setSaving(true);setError('');setSent(false)
  const {error:saveError}=await supabase.rpc('send_pt_wod_feedback',{
   p_feedback_text:message,p_dosing:dosing,p_assignment_id:assignmentId||null,p_program_session_id:programSessionId||null
  })
  if(saveError){setError('Kunne ikkje senda tilbakemeldinga: '+saveError.message);setSaving(false);return}
  const column=assignmentId?'assignment_id':'program_session_id'
  const {data:latest,error:refreshError}=await supabase.from('pt_wod_feedback')
   .select('id,body,dosing,created_at').eq(column,assignmentId||programSessionId)
   .order('created_at',{ascending:false}).limit(30)
  if(!refreshError)setFeedback(latest||[])
  setNote('');setSaving(false);setSent(true)
 }
 return <section className="ptreview" aria-label={'PT-resultat for '+clientName}>
  <div className="ptreview-header"><div><span className="section-kicker">PT-TILDELT WOD · RESULTAT</span><h3>{wodName||'Gjennomført WOD'}</h3><p>{clientName} · {result?formattedDate(result.workout_date):'Opnar resultat'}</p></div>
   <button type="button" className="secondary-button" onClick={onClose}><ArrowLeft size={15}/> Til WOD-lista</button>
  </div>
  {loading?<p role="status" className="ptfollow-info">Hentar resultat frå denne PT-tildelinga …</p>:null}
  {error&&<div className="auth-error" role="alert">{error}</div>}
  {!loading&&!result&&!error&&<p className="ptfollow-empty">Det finst ikkje ein lagra treningslogg knytt til denne PT-tildelinga. Ingen resultat er gjetta.</p>}
  {result&&!loading&&<>
   <div className="ptreview-metrics">{metrics.map(m=><div key={m.label} className="ptreview-metric"><strong>{m.value}</strong><small>{m.label}</small></div>)}</div>
   {isAmrap&&<div className="ptreview-panel">
    <div className="ptreview-panel-title"><Activity size={17}/><h4>Rundetider og disponering</h4></div>
    {laps.length?<><div className="ptreview-laps">
     {laps.map((seconds,i)=><div className="ptreview-lap" key={i}><span>Runde {i+1}</span><div className="ptreview-lap-rail"><div style={{width:`${Math.max(3,seconds/maxLap*100)}%`}}/></div><strong>{formatDuration(seconds)}</strong></div>)}
    </div><p className={'ptreview-insight is-'+pace.kind}>{pace.text}</p></>:
    <p className="ptfollow-empty">Rundetider er ikkje registrerte for denne økta. Sluttresultatet kan framleis vurderast.</p>}
    <small className="ptfollow-footnote">Endringar i rundetid kan ha fleire årsaker. Bruk dette som samtalegrunnlag, ikkje som ei automatisk vurdering av kunden.</small>
   </div>}
   {blockResults.length>0&&<div className="ptreview-panel">
    <div className="ptreview-panel-title"><Clock3 size={16}/><h4>Resultat per øktdel</h4></div>
    {blockResults.map((part,i)=><div className="ptreview-part" key={part.id||i}>
     <div><strong>{part.title||'Del '+(i+1)}</strong><small>{part.format||'Format ikkje oppgjeve'}</small></div>
     <span>{part.completed?'Gjennomført':part.time_cap_reached?'Tidsgrense':'Delvis / ikkje rapportert'}</span>
     <small>{[
       part.roundsCompleted!=null&&['AMRAP','Death By','Ladder'].includes(part.format)?part.roundsCompleted+' rundar':null,
       Number(part.elapsed)>0?formatDuration(part.elapsed):null,
       part.extra_reps>0?'+'+part.extra_reps+' reps':null
     ].filter(Boolean).join(' · ')}</small>
    </div>)}
   </div>}
   {exerciseResults.length>0&&<div className="ptreview-panel">
    <div className="ptreview-panel-title"><CheckCircle2 size={16}/><h4>Utført dosering</h4></div>
    {exerciseResults.map((ex,i)=><div className="ptreview-exercise" key={i}>
     <strong>{ex.exercise_name||'Øving'}</strong>
     {array(ex.sets).length?array(ex.sets).map((set,j)=><small key={j}>Sett {j+1}: {formatExerciseSet(set)||'Ikkje registrert'}</small>):<small>Ingen sett registrerte</small>}
     {ex.row_value!=null&&<small>Resultat: {ex.row_value} {ex.row_unit||''}</small>}
    </div>)}
   </div>}
   <div className="ptreview-panel">
    <div className="ptreview-panel-title"><MessageSquareText size={17}/><h4>Tilbakemelding til {clientName}</h4></div>
    <p className="ptfollow-footnote">Kunden får tilbakemeldinga i PT-dialogen. Private trenarnotat blir ikkje sende.</p>
    <form onSubmit={send} className="ptreview-feedback-form">
     <label>Doseringsvurdering<select value={dosing} onChange={e=>setDosing(e.target.value)}>{ptDosingOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
     <label>Personleg tilbakemelding<textarea rows="3" maxLength="2000" value={note} onChange={e=>setNote(e.target.value)} placeholder="T.d. Første runde gjekk raskt. Korleis opplevde du tempoet? Neste gong prøver me …" required/></label>
     <button className="primary-button" type="submit" disabled={saving||!note.trim()||note.trim().length<5}><Send size={16}/>{saving?'Sender …':'Send til kunden'}</button>
    </form>
    {sent&&<p className="auth-message" role="status">Tilbakemeldinga er sendt og lagra på den aktuelle WOD-tildelinga.</p>}
   </div>
   {feedback.length>0&&<div className="ptreview-panel">
    <h4>Tidlegare tilbakemeldingar</h4>
    {feedback.map(f=><article className="ptreview-feedback" key={f.id}>
      <div><strong>{dosageLabel(f.dosing)}</strong><small>{new Date(f.created_at).toLocaleDateString('nn-NO')}</small></div><p>{f.body}</p>
     </article>)}
   </div>}
   <p className="ptreview-privacy"><ShieldCheck size={16}/> Dette er berre resultatet som er knytt til den valde PT-tildelinga. Andre private treningsøkter er ikkje henta.</p>
  </>}
 </section>
}
