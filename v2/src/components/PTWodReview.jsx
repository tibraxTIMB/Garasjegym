import {useRef} from 'react'
import {useFlowConfirm,FlowConfirmDialog} from './FlowEntry.jsx'
import IndividualCalibrationReview from './IndividualCalibrationReview.jsx'
import SamspelParticipantResults from './SamspelParticipantResults.jsx'
import AnatomyEvidence from './AnatomyEvidence.jsx'
import {workoutAnatomyExercises} from '../lib/anatomicalIntelligence.js'
import {useEffect,useMemo,useState} from 'react'
import {X,Award,CheckCircle2,ChevronDown,MessageSquareText,Send} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {dosageLabel,formatDuration,pacingReview,plannedDoseForExercise,ptDosingOptions,ptIsAmrapPart,ptPartCompletion,ptPartScore,ptPrescribedWorkContext,ptReviewHighlights,ptTeamResult,ptSessionMuscleItems,ptRoundSplits,validRoundSplits} from '../lib/ptWodReview.js'

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
export default function PTWodReview({assignmentId=null,programSessionId=null,clientName='',clientRank=null,wodName='',prescriptionSchema=null,onClose=()=>{},onRecordCalibration=null,onReplayNow,onReplayPlan}){
 const [result,setResult]=useState(null)
 const [feedback,setFeedback]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const [note,setNote]=useState('')
 const [dosing,setDosing]=useState('discuss')
 const [sent,setSent]=useState(false)
 const [feedbackOpen,setFeedbackOpen]=useState(false)
 const confirm=useFlowConfirm(),sending=useRef(false)
 useEffect(()=>{
  let active=true
  setResult(null);setFeedback([]);setError('');setSent(false);setLoading(true);setNote('');setDosing('discuss');setFeedbackOpen(false)
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
 const metrics=useMemo(()=>ptReviewHighlights(result),[result])
 const isAmrap=String(result?.format||'').toLowerCase()==='amrap'||['couplet','triplet'].includes(String(result?.format||'').toLowerCase())&&result?.result_data?.combination_mode==='AMRAP'
 const teamResult=ptTeamResult(result)
 const exerciseResults=array(result?.result_data?.exercise_results)
 const sessionMuscleItems=ptSessionMuscleItems(result,prescriptionSchema)
 const individualMuscle=!teamResult&&result?.result_data?.participation_verified==='individual'
 const blockResults=array(result?.result_data?.block_summary)
 const firstAmrapPart=blockResults.findIndex(ptIsAmrapPart)
 const send=async event=>{
  event.preventDefault()
  if(saving||sending.current||!result)return
  const message=note.trim()
  if(message.length<5||message.length>2000){setError('Skriv ei konkret tilbakemelding på 5–2000 teikn.');return}
  sending.current=true
  try{
  if(!(await confirm.ask({title:'Send tilbakemelding?',message:'Kunden vil sjå meldinga i PT-dialogen.',confirmLabel:'Send',cancelLabel:'Avbryt'})))return
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
  }catch(e){setError(e?.message||'Kunne ikkje stadfesta sending. Kontroller tidlegare tilbakemeldingar før nytt forsøk.')}finally{sending.current=false;setSaving(false)}
 }
 const renderPacing=(splits)=> {
  const judgement=pacingReview({result_data:{split_seconds:splits}})
  const longest=Math.max(1,...splits)
  return <div className="ptreview-pacing">
   {splits.length?<><div className="ptreview-laps">
    {splits.map((seconds,i)=><div className="ptreview-lap" key={i}>
     <span>Runde {i+1}</span>
     <div className="ptreview-lap-rail"><div style={{width:String(Math.max(3,seconds/longest*100))+'%'}}/></div>
     <strong>{formatDuration(seconds)}</strong>
    </div>)}
   </div>{judgement.kind!=='insufficient'&&<p className={'ptreview-insight is-'+judgement.kind}>{judgement.text}</p>}</>:
   <p className="ptfollow-empty">Rundetider er ikkje registrerte. Sluttresultatet kan framleis vurderast, men disponeringa kan ikkje fastslåast.</p>}
   <small className="ptfollow-footnote">Rundetidene er eit samtalegrunnlag, ikkje ein automatisk konklusjon om årsak eller belastning.</small>
  </div>
 }
 return <section className="ptreview" aria-label={'PT-resultat for '+clientName}>
  <header className="ptreview-header">
   <div className="ptreview-heading">
    <div className="ptreview-client-line"><span className="section-kicker">PT-OPPFØLGING · {clientName}</span>
     {clientRank?.title&&<span className="ptreview-client-rank"><Award size={12}/>{clientRank.title}{Number(clientRank.stars)>0&&<span aria-label={clientRank.stars+' stjerner'}>{'★'.repeat(Math.min(5,clientRank.stars))}</span>}</span>}
    </div>
    <h3>{wodName||'Gjennomført WOD'}</h3>
    <p>{result?formattedDate(result.workout_date):'Opnar resultat'}{teamResult?' · Lagøkt':' · PT-tildelt økt'}</p>
   </div>
   <button type="button" className="ptreview-close" aria-label="Lukk resultat" title="Lukk resultat" onClick={onClose}><X size={18}/></button>
  </header>
  {loading&&<p role="status" className="ptfollow-info">Hentar resultat frå denne PT-tildelinga …</p>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  {!loading&&!result&&!error&&<p className="ptfollow-empty">Det finst ikkje ein lagra treningslogg knytt til denne PT-tildelinga. Ingen resultat er gjetta.</p>}
  {result&&!loading&&<>
   <div className="ptreview-metrics" aria-label="Resultatsamandrag">
    {metrics.filter(m=>m.label!=='Resultattype').map(m=><div className="ptreview-metric" key={m.label}><strong>{m.value}</strong><small>{m.label}</small></div>)}
   </div>
   {(onReplayNow||onReplayPlan)&&<div className="gg-fw-replay"><small>Ny gjennomføring · dagens WOD-versjon</small><div>{onReplayNow&&<button type="button" className="primary-button" onClick={onReplayNow}>Tren saman no</button>}{onReplayPlan&&<button type="button" className="secondary-button" onClick={onReplayPlan}>Planlegg på nytt</button>}</div></div>}
   <SamspelParticipantResults samspel={result.result_data?.samspel}/>
   {(Array.isArray(result.result_data?.samspel_blocks)?result.result_data.samspel_blocks:[]).map(part=><section key={part.block_id}><strong>{part.title} · Samspel</strong><small>{part.completed?'Registrert fullført':'Delvis / ikkje utført'}{part.distance!=null?' · '+part.distance+' m':''}{part.calories!=null?' · '+part.calories+' cal':''}{part.relay_rounds!=null?' · '+part.relay_rounds+' lagrundar':''}</small><SamspelParticipantResults samspel={part.samspel}/></section>)}
   {result.result_data?.time_cap_reached&&<p className="ptreview-insight is-review">Tidsgrensa vart nådd. For Time-resultat må vurderast ut frå faktisk gjennomført arbeid, ikkje som automatisk fullføring.</p>}
   {blockResults.length>0&&<section className="ptreview-blocks" aria-label="Resultat per øktdel">
    <h4>Korleis gjekk dei ulike delane?</h4>
    {blockResults.map((part,index)=>{
     const completion=ptPartCompletion(part)
     const splits=ptRoundSplits(result,part)
     const score=ptPartScore(part)
     const partTime=Number(part.elapsed)
     const isAmrapPart=ptIsAmrapPart(part)
     return <details className="ptreview-disclosure" key={part.id||index} defaultOpen={index===firstAmrapPart}>
      <summary><span className="ptreview-disclosure-main">
       <strong>{part.title||'Del '+(index+1)}</strong>
       <small>{part.format||'Format ikkje oppgjeve'}{Number.isFinite(partTime)&&partTime>0?' · '+formatDuration(partTime):''}</small>
      </span><span className="ptreview-disclosure-right"><span className={'ptreview-part-state is-'+completion.kind}>{completion.label}</span><ChevronDown size={18}/></span></summary>
      <div className="ptreview-disclosure-content">
       {score&&<div className="ptreview-part-score"><span>Resultat</span><strong>{score}</strong></div>}
       {['early','manual'].includes(completion.kind)&&<p className={'ptreview-insight '+(completion.kind==='early'?'is-review':'is-note')}>{completion.detail}</p>}
       {completion.kind==='unknown'&&<p className="ptfollow-footnote">Det finst ikkje sikker stadfesting på at denne delen er fullført.</p>}
       {isAmrapPart&&renderPacing(splits)}
       {!isAmrapPart&&<p className="ptfollow-footnote">Planlagt tid: {Number(part.duration_seconds)>0?formatDuration(part.duration_seconds):'ikkje oppgjeven'}. Registrert tid: {partTime>0?formatDuration(partTime):'ikkje registrert'}.</p>}
      </div>
     </details>
    })}
   </section>}
   {!teamResult&&!blockResults.length&&isAmrap&&<details className="ptreview-disclosure" defaultOpen>
    <summary><span className="ptreview-disclosure-main"><strong>Rundetider og disponering</strong><small>AMRAP · registrerte rundar</small></span><ChevronDown size={18}/></summary>
    <div className="ptreview-disclosure-content">{renderPacing(laps)}</div>
   </details>}
   {individualMuscle&&workoutAnatomyExercises(result).length>0?<AnatomyEvidence exercises={workoutAnatomyExercises(result)} scope="Registrert individuelt arbeid" compact/>:sessionMuscleItems.length>0&&<AnatomyEvidence exercises={sessionMuscleItems} scope={teamResult?'Lagøkta · øvingsprofil':'Økta · øvingsprofil'} planned compact/>}
   {!teamResult&&exerciseResults.length>0&&<details className="ptreview-disclosure ptreview-dose">
    <summary><span className="ptreview-disclosure-main"><strong><CheckCircle2 size={16}/> Planlagt og utført dosering</strong><small>{exerciseResults.length} øvingar · opna for sett, reps og vekt</small></span><ChevronDown size={18}/></summary>
    <div className="ptreview-disclosure-content">
     <p className="ptfollow-footnote">Når ein AMRAP- eller EMOM-del er registrert gjennomført, er WOD-oppsettet utgangspunktet dersom ingen avvik er meldt. Separate sett, repetisjonar og vekter blir berre viste som målingar når dei faktisk er registrerte.</p>
     {exerciseResults.map((ex,i)=>{
      const target=plannedDoseForExercise(prescriptionSchema,ex.exercise_name,result?.result_data?.prescription_level||'rx')
      const sets=array(ex.sets)
      const work=ptPrescribedWorkContext(result,prescriptionSchema,ex)
      return <div className="ptreview-exercise" key={String(ex.block_id||'')+':'+i}>
       <strong>{ex.exercise_name||'Øving'}</strong>
       {target&&<small className="ptreview-prescribed">WOD-oppsett: {target}</small>}
       {work&&<small className={'ptreview-work-context is-'+work.kind}>{work.text}</small>}
       {sets.some(set=>set.reps!=null||set.load_kg!=null||set.height_cm!=null||set.time_seconds!=null||set.time_text)?sets.map((set,j)=><small key={j}>Registrert · sett {j+1}: {formatExerciseSet(set)||'Ingen måling registrert'}</small>):<small className="ptreview-missing">Ingen separate settmålingar. {work?.kind==='assumed'?'WOD-oppsettet gjeld når ingen avvik er meldt.':'Dette dokumenterer ikkje at øvinga vart hoppa over.'}</small>}
       {ex.row_value!=null&&<small>Resultat: {ex.row_value} {ex.row_unit||''}</small>}
      </div>
     })}
    </div>
   </details>}
   {!teamResult&&<IndividualCalibrationReview key={assignmentId||programSessionId} result={result} assignmentId={assignmentId} programSessionId={programSessionId} onRecord={onRecordCalibration}/>}
   <div className="ptreview-next-action">
    <strong>PT-vurdering</strong>
    <button type="button" className="primary-button" aria-expanded={feedbackOpen} onClick={()=>setFeedbackOpen(x=>!x)}><MessageSquareText size={17}/>{feedbackOpen?'Lukk tilbakemelding':'Gje tilbakemelding'}</button>
   </div>
   {feedbackOpen&&<section className="ptreview-feedback-panel" aria-label="Personleg PT-tilbakemelding">
    <p className="ptfollow-footnote">Kunden får tilbakemeldinga i PT-dialogen. Private trenarnotat blir ikkje sende.</p>
    <form onSubmit={send} className="ptreview-feedback-form">
     <label>Doseringsvurdering<select value={dosing} onChange={e=>setDosing(e.target.value)}>{ptDosingOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
     <label>Personleg tilbakemelding<textarea rows="3" maxLength="2000" value={note} onChange={e=>setNote(e.target.value)} placeholder="Korleis opplevde du tempoet? Neste gong kan me prøva …" required/></label>
     {note.trim().length<5&&<small role="status">Skriv minst 5 teikn for å kunna senda.</small>}<button type="submit" className="primary-button" disabled={saving||note.trim().length<5}><Send size={16}/>{saving?'Sender …':'Send til kunden'}</button>
    </form>
   </section>}
   {sent&&<p className="auth-message" role="status">Tilbakemeldinga er sendt og knytt til denne WOD-en. Kunden ser ho i PT-dialogen.</p>}
   {feedback.length>0&&<details className="ptreview-disclosure">
    <summary><span className="ptreview-disclosure-main"><strong>Tidlegare tilbakemeldingar</strong><small>{feedback.length} meldingar på denne WOD-en</small></span><ChevronDown size={18}/></summary>
    <div className="ptreview-disclosure-content">{feedback.map(f=><article className="ptreview-feedback" key={f.id}>
      <div><strong>{dosageLabel(f.dosing)}</strong><small>{new Date(f.created_at).toLocaleDateString('nn-NO')}</small></div><p>{f.body}</p>
    </article>)}</div>
   </details>}
  </>}
  <FlowConfirmDialog dialog={confirm.dialog} onClose={confirm.finish}/>
 </section>
}
