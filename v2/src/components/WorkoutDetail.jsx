import AnatomyEvidence from './AnatomyEvidence.jsx'
import {workoutAnatomyExercises} from '../lib/anatomicalIntelligence.js'
import SamspelParticipantResults from './SamspelParticipantResults.jsx'
import {synchronHistoryRows} from '../lib/synchronLog.js'
import {useEffect,useState} from 'react'
import {ArrowLeft,CalendarDays,Check,Clock3,Dumbbell,Edit3,LoaderCircle,MoreHorizontal,Save,Trash2,Trophy,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {deleteWorkoutAndLinkedRecords} from '../lib/deleteWorkout.js'
import {workoutPRVictories} from '../lib/prVictory.js'
import {formatWorkoutSeconds,formatWorkoutSet,optionalNumber,splitWorkoutNote,buildWorkoutReport,reportRepTotals} from '../lib/workoutDetail.js'
import {suggestedEmomSets,samspelCorrectionFields,samspelCorrectionDraft,samspelCorrectionPatch} from '../lib/workoutCorrections.js'
import {cardParts,cardDose,cardTone,formatCardTime} from '../lib/wodCard.js'
import './workout-detail.css'
import './wod-card.css'

const initialSetValues=set=>({
 reps:set.reps??'',load_kg:set.load_kg??'',height_cm:set.height_cm??'',
 time_seconds:set.time_seconds??'',time_text:set.time_text??''
})
const initialForm=workout=>{
 const {personal,system}=splitWorkoutNote(workout.note)
 return {
  title:workout.title||'',workout_date:workout.workout_date||'',
  note:personal,system,
  score_rounds:workout.score_rounds??'',score_reps:workout.score_reps??'',
  score_time_seconds:workout.score_time_seconds??'',score_load_kg:workout.score_load_kg??'',
  score_calories:workout.score_calories??'',score_distance:workout.score_distance??'',
  score_unit:workout.score_unit||'m'
 }
}
const dateLabel=date=>date?new Date(date+'T12:00:00').toLocaleDateString('nn-NO',{day:'numeric',month:'long',year:'numeric'}):'Dato manglar'
const isAmrap=p=>/amrap/i.test(p.format||'')||p.score?.combination_mode==='AMRAP'
const hasNumber=v=>v!=null&&String(v).trim()!==''&&Number.isFinite(Number(v))
function ReportRows({rows}){return rows.map((exercise,index)=><article key={exercise.id||index} className="acta-exercise"><strong>{exercise.exercise_name}</strong>{exercise.source_text&&<small>{exercise.source_text}</small>}{(exercise.workout_sets||[]).length?<div className="workout-detail-set-list">{[...exercise.workout_sets].sort((a,b)=>a.set_number-b.set_number).map((set,i)=><div key={set.id||i}><span>Sett {set.set_number||i+1}</span><strong>{formatWorkoutSet(set)}</strong></div>)}</div>:<small>Ingen individuelle måleverdiar</small>}</article>)}
function ComplexLines({results}){return results.map((r,i)=><div className="acta-complex" key={i}><strong>{r.name}</strong><span>{r.best_load_kg==null?'Tyngste ikkje registrert':r.best_load_kg+' kg · tyngste godkjende'}</span><small>{r.completed??'–'} fullførte · {r.partial??'–'} delvise · {r.failed??'–'} mislukka</small></div>)}
function ActaReport({report,historical}){return <section className="acta-report" aria-label="Treningsrapport per del">
 {report.sections.map((p,i)=>{const s=p.score,m=p.main,f=p.status,amrap=isAmrap(p),scored=amrap&&hasNumber(s?.roundsCompleted)&&hasNumber(s?.extra_reps),totals=historical&&scored?reportRepTotals(p,s,report.level):null;const status=f?({done:'Utført',partial:'Delvis utført',failed:'Ikkje utført',skipped:'Ikkje utført'}[f.status]||f.status):null;const duration=Number(p.seconds)||Number(s?.duration_seconds)||0;return <article key={p.id||i} className={'gg-wod-part acta-part'+(scored?' acta-has-score':'')+' gg-wod-tone-'+cardTone(p)}>
 <header><span>DEL {String.fromCharCode(65+i)} · {p.formatLabel||p.format||'Øktdel'}</span>{duration>0&&<small>{formatCardTime(duration)}</small>}</header>
 <h3>{p.title?.replace(/^Del\s+[A-H]\s*[–—:-]\s*/i,'')||'Øktdel'}</h3>
 {p.items.length>0&&(!p.warm||!status)&&<div className="acta-prescription"><small>{historical?'PLANLAGD':'WOD-OPPSETT · NO'}</small>{p.items.filter(x=>!x.is_rest).map((item,j)=><div key={j}><span>{item.exercise_name||item.name}</span><b>{report.level?cardDose(item,report.level,true):'Nivå ikkje lagra'}</b></div>)}</div>}
 {status&&<div className={'acta-status'+(f?.status==='done'?'':' acta-status-neutral')}>{f?.status==='done'&&<Check size={15}/>} {status}</div>}
 {scored&&<div className="acta-score"><small>DITT RESULTAT</small><strong>{s.roundsCompleted} + {s.extra_reps}</strong><span>Rundar + ekstra reps</span>{totals&&<div className="acta-totals">{totals.map((t,j)=><div key={j}><b>{t.reps}</b><span>{t.name}</span></div>)}<small>Utrekna frå lagra dosering og score, føreset øvingsrekkjefølgja.</small></div>}</div>}
 {!scored&&s&&hasNumber(s.elapsed)&&Number(s.elapsed)>0&&<div className="acta-score"><small>{s.completed?'REGISTRERT TID':'REGISTRERT TID · IKKJE STADFESTA FULLFØRT'}</small><strong>{formatWorkoutSeconds(s.elapsed)}</strong>{s.time_cap_reached&&<span>Tidsgrense nådd</span>}</div>}
 {!scored&&s&&/death by|ladder/i.test(p.format||'')&&hasNumber(s.roundsCompleted)&&<div className="acta-score"><small>FULLFØRTE RUNDAR</small><strong>{s.roundsCompleted}</strong></div>}
 {m&&m.type!=='none'&&<div className="acta-score"><small>{m.label||'HOVUDRESULTAT'}</small><strong>{m.value==null?'Ikkje registrert':m.type==='completion'?({complete:'Gjennomført',partial:'Delvis',failed:'Ikkje gjennomført'}[m.value]||'Ikkje registrert'):m.value+' '+(m.unit||'')}</strong></div>}
 <ComplexLines results={p.complexes}/>
 {p.rows.length>0&&<details className="acta-sets"><summary>Øvingar og registrerte sett ({p.rows.length})</summary><ReportRows rows={p.rows}/></details>}
 {!status&&!scored&&!s&&(!m||m.type==='none')&&!p.complexes.length&&!p.rows.length&&<small>Ingen delresultat registrerte.</small>}
 </article>})}
 {(report.unassigned.length>0||report.unassignedComplex.length>0)&&<details className="acta-sets acta-unassigned"><summary>Andre registrerte resultat – del ikkje sikkert identifisert</summary><ComplexLines results={report.unassignedComplex}/><ReportRows rows={report.unassigned}/></details>}
 </section>}
const blankSet=()=>({reps:'',load_kg:'',height_cm:'',time_seconds:'',time_text:''})
export default function WorkoutDetail({workout,onBack,onSaved,onDeleted,memberId}){
 const [editing,setEditing]=useState(false)
 const [editMode,setEditMode]=useState(null)
 const [menuOpen,setMenuOpen]=useState(false)
 const [form,setForm]=useState(()=>initialForm(workout))
 const [setDrafts,setSetDrafts]=useState({})
 const [teamDraft,setTeamDraft]=useState({})
 const [addedSets,setAddedSets]=useState({})
 const [sourceSchema,setSourceSchema]=useState(null)
 const [sourceStatus,setSourceStatus]=useState('')
 const [reportSource,setReportSource]=useState(null)
 const [saving,setSaving]=useState(false)
 const [deleting,setDeleting]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 useEffect(()=>{setEditing(false);setEditMode(null);setMenuOpen(false);setForm(initialForm(workout));setSetDrafts({});setAddedSets({});setSourceSchema(null);setReportSource(null);setSourceStatus('');setError('');setNotice('')},[workout.id])
 useEffect(()=>{
  if(!workout.exercises)return
  setSetDrafts(Object.fromEntries(workout.exercises.flatMap(ex=>(ex.workout_sets||[]).map(set=>[set.id,initialSetValues(set)]))))
 },[workout.exercises])

 const data=workout.result_data||{}
 const compositeSamspel=Array.isArray(data.samspel_blocks)&&data.samspel_blocks.length>0
 const isSynchron=data.synchron_result!=null
 const synchronRows=synchronHistoryRows(workout)
 const isSamspel=!!data.samspel||compositeSamspel||isSynchron
 const savedParts=Array.isArray(data.report_parts)&&data.report_parts.length?data.report_parts:data.wod_engine?.blocks?.length?cardParts({format:workout.format,timer_settings:{workout_schema:{wod_engine:data.wod_engine,items:data.wod_engine.blocks.flatMap(b=>b.items||[])}}}):[]
 useEffect(()=>{let alive=true;if(savedParts.length||!workout.source_wod_id||data.wod_ids?.length>1)return;supabase.from('wods').select('id,name,format,duration_minutes,movements,timer_settings').eq('id',workout.source_wod_id).maybeSingle().then(({data:row,error})=>{if(alive&&!error&&row)setReportSource(row)}).catch(()=>{});return()=>{alive=false}},[workout.id,workout.source_wod_id,savedParts.length])
 const historical=Boolean(savedParts.length)
 const report=isSamspel?null:buildWorkoutReport(workout,historical?savedParts:reportSource?cardParts(reportSource):[])
 const note=splitWorkoutNote(workout.note)
 const exercises=workout.exercises||[]
 const resultStats=[
  workout.score_rounds!=null&&{label:'Rundar',value:workout.score_rounds},
  workout.score_reps!=null&&{label:'Ekstra reps',value:workout.score_reps},
  workout.score_time_seconds!=null&&{label:'Sluttid',value:formatWorkoutSeconds(workout.score_time_seconds)},
  workout.score_load_kg!=null&&{label:'Tungaste løft',value:workout.score_load_kg+' kg'},
  workout.score_calories!=null&&{label:'Kaloriar',value:workout.score_calories},
  workout.score_distance!=null&&{label:'Avstand',value:workout.score_distance+' '+(workout.score_unit||'m')}
 ].filter(Boolean).filter(stat=>!isSamspel||stat.label==='Sluttid')
 const splitSeconds=workout.result_data?.split_seconds||[]
 const complexResults=workout.result_data?.complex_results||[]
 const primaryResults=workout.result_data?.block_primary_results||[]
 const setField=(id,field,value)=>setSetDrafts(previous=>({...previous,[id]:{...previous[id],[field]:value}}))
 useEffect(()=>{const handle=e=>{e.preventDefault();if(menuOpen){setMenuOpen(false);return}requestBack()};window.addEventListener('gg:workout-back',handle);return()=>window.removeEventListener('gg:workout-back',handle)},[editing,menuOpen,onBack,saving,deleting])
 function requestBack(){if(saving||deleting)return;if(editing&&!window.confirm('Gå tilbake utan å lagra endringane?'))return;onBack()}
 function cancelEdit(){setEditing(false);setEditMode(null);setForm(initialForm(workout));setSetDrafts(Object.fromEntries(exercises.flatMap(ex=>(ex.workout_sets||[]).map(set=>[set.id,initialSetValues(set)]))));setAddedSets({});setError('')}
 function beginEdit(nextMode){
  setError('');setNotice('');setMenuOpen(false)
  if(nextMode==='correction'&&isSynchron){setError('SYNCHRON-resultat krev samordna korrigering av lagfordelinga. Notat kan redigerast.');return}
  if(nextMode==='correction'&&isSamspel){if(!samspelCorrectionFields(workout).length){setError('Dette eldre lagoppsettet kan ikkje korrigerast her. Notat kan redigerast.');return}setTeamDraft(samspelCorrectionDraft(workout));setForm(initialForm(workout));setEditMode('team');setEditing(true);return}
  if(nextMode==='correction'&&(complexResults.length||primaryResults.length)){setError('Programmerte delresultat krev eiga resultatkorrigering. Notat kan framleis redigerast.');return}
  setForm(initialForm(workout));setEditMode(nextMode);setEditing(true)
  if(nextMode==='correction'&&workout.source_wod_id){
   setSourceStatus('Hentar oppsett frå WOD-biblioteket …')
   supabase.from('wods').select('timer_settings').eq('id',workout.source_wod_id).maybeSingle().then(({data,error:loadError})=>{
    if(loadError||!data?.timer_settings?.workout_schema){setSourceStatus('WOD-oppsettet er ikkje tilgjengeleg. Du kan leggja inn sett manuelt.');return}
    setSourceSchema(data.timer_settings.workout_schema);setSourceStatus('')
   })
  }
 }
 const updateAdded=(exerciseId,localId,field,value)=>setAddedSets(prev=>({...prev,[exerciseId]:(prev[exerciseId]||[]).map(row=>row.localId===localId?{...row,[field]:value}:row)}))
 const addSet=(exercise,values=blankSet())=>setAddedSets(prev=>{
  const existing=exercise.workout_sets||[],added=prev[exercise.id]||[]
  const set_number=Math.max(0,...existing.map(x=>Number(x.set_number)||0),...added.map(x=>x.set_number))+1
  return {...prev,[exercise.id]:[...added,{...blankSet(),...values,localId:crypto.randomUUID(),set_number}]}
 })
 function fillPlannedEmom(){
  if(!sourceSchema||!window.confirm('Leggja inn planlagde sett og repetisjonar frå WOD-en? Stadfest berre dersom du faktisk fullførte desse setta. Eksisterande vekter blir ikkje endra.'))return
  const drafts={...setDrafts},newRows={...addedSets};let changed=0
  exercises.forEach((exercise,index)=>{
   const suggestion=suggestedEmomSets(workout,sourceSchema,exercise,index)
   if(!suggestion)return
   const existing=[...(exercise.workout_sets||[])].sort((a,b)=>a.set_number-b.set_number)
   existing.forEach(set=>{
    if(Number(set.set_number)>suggestion.count)return
    const value=drafts[set.id]||initialSetValues(set)
    if(String(value.reps??'').trim()===''){drafts[set.id]={...value,reps:String(suggestion.reps)};changed++}
   })
   const fresh=[...(newRows[exercise.id]||[])];const taken=new Set([...existing.map(s=>Number(s.set_number)),...fresh.map(s=>Number(s.set_number))])
   for(let n=1;n<=suggestion.count;n++){
    if(taken.has(n))continue
    fresh.push({...blankSet(),localId:crypto.randomUUID(),set_number:n,reps:String(suggestion.reps)})
    taken.add(n);changed++
   }
   newRows[exercise.id]=fresh.sort((a,b)=>a.set_number-b.set_number)
  })
  setSetDrafts(drafts);setAddedSets(newRows)
  setNotice(changed?changed+' felt/sett vart lagde inn som forslag. Kontroller alle før lagring.':'Ingen manglande planlagde EMOM-sett vart funne.')
 }

 async function deleteWorkout(){
  setMenuOpen(false)
  if(deleting||!window.confirm('Sletta «'+(workout.title||'Treningsøkt')+'» og PR-resultata frå denne økta? Andre økter og sjølvstendige PR-noteringar blir behaldne.'))return
  setError('');setDeleting(true)
  try{
   const result=await deleteWorkoutAndLinkedRecords(supabase,workout.id,memberId)
   if(result.cleanupError)window.alert('Økta er sletta, men eldre tilknytte PR-noteringar må kontrollerast i PR-senteret: '+result.cleanupError)
   onDeleted?.()
  }catch(deleteError){setError('Økta blei ikkje sletta: '+(deleteError.message||'Ukjend feil'))}
  finally{setDeleting(false)}
 }
 async function save(event){
  event.preventDefault()
  if(saving)return
  setError('');setNotice('');setSaving(true)
  let updatedCount=0
  try{
   if(isSynchron&&editMode!=='note')throw new Error('SYNCHRON-resultat kan ikkje korrigerast i den vanlege treningsloggen.')
   if(editMode==='team'){
    const correction=samspelCorrectionPatch(workout,teamDraft)
    if(correction.issue)throw new Error(correction.issue)
    // One guarded update of the existing log row; no insert, set write or plan-status mutation.
    const {data,error:saveError}=await supabase.from('workout_logs').update(correction.patch).eq('id',workout.id).eq('member_id',memberId).eq('result_data',JSON.stringify(workout.result_data)).select('id,title,workout_date,format,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,note,result_data').maybeSingle()
    if(saveError||!data)throw saveError||new Error('Resultatet kan ha blitt endra. Opna økta på nytt før du prøver igjen.')
    setEditing(false);setEditMode(null);setNotice('Utøvarbidraga er korrigerte.');await onSaved?.(data);return
   }
   if(editMode==='correction'&&isSamspel)throw new Error('Lagresultat krev eiga korrigering av utøvarbidrag.')
   if(editMode==='correction'&&!form.title.trim())throw new Error('Økta må ha eit namn.')
   if(editMode==='correction'&&!/^\d{4}-\d{2}-\d{2}$/.test(form.workout_date))throw new Error('Vel ein gyldig dato.')
   const patch=editMode==='note'?{note:[form.note.trim(),...form.system].filter(Boolean).join('\n')}:{
    title:form.title.trim(),workout_date:form.workout_date,
    note:[form.note.trim(),...form.system].filter(Boolean).join('\n'),
    score_rounds:optionalNumber(form.score_rounds),score_reps:optionalNumber(form.score_reps),
    score_time_seconds:optionalNumber(form.score_time_seconds),
    score_load_kg:optionalNumber(form.score_load_kg),
    score_calories:optionalNumber(form.score_calories),
    score_distance:optionalNumber(form.score_distance),
    score_unit:form.score_unit.trim()||'m'
   }
   if(editMode==='correction'&&patch.score_rounds!=null&&!Number.isInteger(patch.score_rounds))throw new Error('Rundar må vera eit heilt tal.')
   if(editMode==='correction'&&patch.score_reps!=null&&!Number.isInteger(patch.score_reps))throw new Error('Reps må vera eit heilt tal.')
   // Validate all set values before writing anything.
   const changedSets=editMode==='note'?[]:exercises.flatMap(ex=>(ex.workout_sets||[]).flatMap(set=>{
    const draft=setDrafts[set.id]||initialSetValues(set)
    if(Object.keys(draft).every(key=>String(draft[key]??'')===String(set[key]??'')))return []
    return [{id:set.id,values:{
     reps:optionalNumber(draft.reps),load_kg:optionalNumber(draft.load_kg),
     height_cm:optionalNumber(draft.height_cm),time_seconds:optionalNumber(draft.time_seconds),
     time_text:String(draft.time_text??'').trim()||null
    }}]
   }))
   const newValues=editMode==='note'?[]:exercises.flatMap(ex=>(addedSets[ex.id]||[]).filter(row=>['reps','load_kg','height_cm','time_seconds','time_text'].some(key=>String(row[key]??'').trim()!=='')).map(row=>({
     workout_exercise_id:ex.id,set_number:row.set_number,reps:optionalNumber(row.reps),
     load_kg:optionalNumber(row.load_kg),height_cm:optionalNumber(row.height_cm),
     time_seconds:optionalNumber(row.time_seconds),time_text:String(row.time_text||'').trim()||null
   })))
   for(const row of [...changedSets.map(s=>s.values),...newValues]){
     if(row.reps!=null&&!Number.isInteger(row.reps))throw new Error('Repetisjonar må vera heile tal.')
     if(row.height_cm!=null&&row.height_cm<=0)throw new Error('Bokshøgd må vera større enn null.')
   }
   if(editMode==='correction'&&workout.result_data&&(changedSets.length||newValues.length)){
     const snapshots=workout.result_data.exercise_results||[]
     patch.result_data={...workout.result_data,exercise_results:exercises.map((ex,index)=>{
       const sets=[...(ex.workout_sets||[]).map(set=>{
         const row=setDrafts[set.id]||initialSetValues(set)
         return {reps:optionalNumber(row.reps),load_kg:optionalNumber(row.load_kg),height_cm:optionalNumber(row.height_cm),time_seconds:optionalNumber(row.time_seconds),time_text:String(row.time_text||'').trim()||null}
       }),...(addedSets[ex.id]||[]).filter(row=>['reps','load_kg','height_cm','time_seconds','time_text'].some(key=>String(row[key]??'').trim()!=='')).map(row=>({
         reps:optionalNumber(row.reps),load_kg:optionalNumber(row.load_kg),height_cm:optionalNumber(row.height_cm),time_seconds:optionalNumber(row.time_seconds),time_text:String(row.time_text||'').trim()||null
       }))]
       return {...(snapshots[index]||{}),exercise_name:ex.exercise_name,sets}
     })}
   }
   for(const set of changedSets){
    const {data,error:saveError}=await supabase.from('workout_sets').update(set.values).eq('id',set.id).select('id').maybeSingle()
    if(saveError||!data)throw saveError||new Error('Eitt sett kunne ikkje lagrast.')
    updatedCount++
   }
   if(newValues.length){
     const {data:created,error:insertError}=await supabase.from('workout_sets').insert(newValues).select('id')
     if(insertError||created?.length!==newValues.length)throw insertError||new Error('Nye sett kunne ikkje stadfestast. Opna økta på nytt før du prøver igjen.')
     updatedCount+=newValues.length
   }
   const {data,error:saveError}=await supabase.from('workout_logs').update(patch).eq('id',workout.id).eq('member_id',memberId).select('id,title,workout_date,format,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,note,result_data').single()
   if(saveError||!data)throw saveError||new Error('Økta kunne ikkje lagrast.')
   setEditing(false);setEditMode(null);setNotice(editMode==='note'?'Notatet er lagra i treningsloggen.':'Korrigeringane er lagra i treningsloggen.')
   await onSaved?.(data)
  }catch(saveError){
   setError((saveError.message||'Kunne ikkje lagra økta.')+(updatedCount?' Nokre sett kan vera oppdaterte. Opna økta på nytt for å kontrollera.':''))
  }finally{setSaving(false)}
 }

 return <div className="modal-backdrop workout-detail-backdrop" role="presentation" onClick={requestBack}>
  <section className="workout-detail-dialog" role="dialog" aria-modal="true" aria-label="Detaljar om treningsøkt" onClick={event=>event.stopPropagation()}>
   <header className="workout-detail-header">
    <button type="button" className="workout-detail-back" onClick={requestBack}><ArrowLeft size={19}/> Tilbake</button>
    <span className="workout-detail-header-tag"><Check size={14}/> {data.time_cap_reached?'Tidsgrense':data.completed===false||data.completion_status==='incomplete'?'Delvis fullført':'Fullført'}</span>{workoutPRVictories(workout).length>0&&<span className="gg-pr-marker" title={workoutPRVictories(workout).map(p=>p.label+' '+p.load_kg+' kg').join(' · ')}><Trophy size={14}/> PR</span>}
    {!editing&&<div className="workout-detail-options"><button type="button" className="workout-detail-more" aria-expanded={menuOpen} aria-label="Fleire val for økta" disabled={workout.detailLoading||!!workout.detailError||deleting} onClick={()=>setMenuOpen(value=>!value)}><MoreHorizontal size={22}/></button>{menuOpen&&<div className="workout-detail-menu"><button type="button" onClick={()=>beginEdit('note')}><Edit3 size={15}/> Rediger notat</button><button type="button" onClick={()=>beginEdit('correction')}><Trophy size={15}/> Korriger feil i resultat</button><button type="button" className="workout-detail-menu-delete" onClick={deleteWorkout}><Trash2 size={15}/> Slett økt og tilknytte PR</button></div>}</div>}
   </header>
   <div className="workout-detail-scroll">
    <div className="workout-detail-intro">
     <span className="section-kicker">DI TRENINGSLOGG</span>
     <h2>{editing?(editMode==='note'?'Rediger notat':'Korriger feil i økta'):workout.title||'Treningsøkt'}</h2>
     <div className="workout-detail-subtitle"><CalendarDays size={15}/>{dateLabel(workout.workout_date)}<span>·</span>{workout.format||'Trening'}</div>
    </div>
    {error&&<div className="auth-error" role="alert">{error}</div>}
    {notice&&<div className="auth-message" role="status">{notice}</div>}
    {editing?<form id="workout-detail-edit-form" onSubmit={save} className="workout-detail-form">
     {editMode==='team'?<section className="workout-detail-edit-card"><h3>Korriger utøvarbidrag</h3><small>Berre faktiske bidrag. Gjennomføringsstatus, felles klokke og planlenkjer blir ikkje endra. Utøvarnummer er ikkje medlemsidentitet.</small>{Array.from(new Set(samspelCorrectionFields(workout).map(f=>f.slot))).map(slot=><details key={slot} open={slot===1||slot===samspelCorrectionFields(workout)[0]?.slot||undefined}><summary>{samspelCorrectionFields(workout).find(f=>f.slot===slot)?.groupLabel||'Utøvar '+slot}</summary><div className="workout-detail-edit-grid">{samspelCorrectionFields(workout).filter(f=>f.slot===slot).map(f=><label key={f.key}>{f.label}{f.kind==='status'?<select value={teamDraft[slot]?.[f.key]??''} onChange={e=>setTeamDraft(prev=>({...prev,[slot]:{...prev[slot],[f.key]:e.target.value}}))}><option value="">Vel status</option><option value="done">Utført</option><option value="partial">Delvis</option><option value="skipped">Ikkje utført</option></select>:<input type="number" inputMode={f.kind==='decimal'?'decimal':'numeric'} min={f.min} max={f.max} step={f.kind==='decimal'?'any':1} value={teamDraft[slot]?.[f.key]??''} onChange={e=>setTeamDraft(prev=>({...prev,[slot]:{...prev[slot],[f.key]:e.target.value}}))} placeholder="–"/>}</label>)}</div></details>)}</section>:<div className="workout-detail-edit-card"><h3>{editMode==='note'?'Mine notat':'Om økta'}</h3>{editMode==='correction'&&<><label>Namn<input required maxLength={120} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label><label>Dato<input type="date" required value={form.workout_date} onChange={e=>setForm(v=>({...v,workout_date:e.target.value}))}/></label></>}<label>Mine notat<textarea rows={3} value={form.note} onChange={e=>setForm(v=>({...v,note:e.target.value}))} placeholder="Korleis gjekk økta?"/></label></div>}
     {editMode==='correction'&&<><p className="workout-detail-correction-warning">Rett berre resultat du faktisk gjennomførte. Målbare PR-ar blir rekna om frå den oppdaterte treningsloggen når PR-senteret blir lasta på nytt. Manuellt lagra PR-notat blir ikkje endra.</p><details className="workout-detail-edit-card workout-detail-score-editor"><summary><Trophy size={17}/> Korriger resultat</summary><div className="workout-detail-edit-grid">{[
      ['score_rounds','Rundar'],['score_reps','Ekstra reps'],['score_time_seconds','Sluttid (sek)'],
      ['score_load_kg','Tungaste løft (kg)'],['score_calories','Kaloriar'],['score_distance','Avstand']
     ].map(([field,label])=><label key={field}>{label}<input type="number" min="0" step={['score_rounds','score_reps'].includes(field)?1:'any'} value={form[field]} onChange={e=>setForm(v=>({...v,[field]:e.target.value}))} placeholder="Ikkje registrert"/></label>)}<label>Eining for avstand<input value={form.score_unit} maxLength={12} onChange={e=>setForm(v=>({...v,score_unit:e.target.value}))}/></label></div><small>Rett oppføringar blir viste i Benchmark-PR dersom WOD-en er merkt Benchmark-WOD.</small></details>
     <div className="workout-detail-exercises-head"><h3><Dumbbell size={18}/> Øvingar og sett</h3><span>{exercises.length} øvingar</span></div>
     {sourceStatus&&<p className="workout-finish-help">{sourceStatus}</p>}
     {sourceSchema&&<button type="button" className="secondary-button" onClick={fillPlannedEmom}><Dumbbell size={16}/> Hent planlagde EMOM-sett og reps</button>}
     <p className="workout-finish-help">Kontroller kvar øving. Legg til sett der resultat manglar; inga vekt blir gjetta.</p>
     <div className="workout-detail-exercise-list">
      {exercises.map((exercise,index)=><article className="workout-detail-exercise" key={exercise.id}>
       <div className="workout-detail-exercise-title"><span>{String(index+1).padStart(2,'0')}</span><strong>{exercise.exercise_name}</strong></div>
       {(exercise.workout_sets||[]).sort((a,b)=>a.set_number-b.set_number).map(set=><div className="workout-detail-edit-set" key={set.id}>
        <span>Sett {set.set_number}</span>
        {[['reps','Reps'],['load_kg','Kg'],['height_cm','Cm'],['time_seconds','Sek']].map(([field,label])=><label key={field}>{label}<input aria-label={label+' for sett '+set.set_number+' i '+exercise.exercise_name} type="number" min="0" step="any" value={setDrafts[set.id]?.[field]??''} onChange={e=>setField(set.id,field,e.target.value)}/></label>)}
        <label className="workout-detail-edit-time">Tidsnotat<input aria-label={'Tidsnotat for sett '+set.set_number} value={setDrafts[set.id]?.time_text??''} onChange={e=>setField(set.id,'time_text',e.target.value)}/></label>
       </div>)}
       {(addedSets[exercise.id]||[]).map(row=><div className="workout-detail-edit-set" key={row.localId}>
        <span>Sett {row.set_number} · nytt</span>
        {[['reps','Reps'],['load_kg','Kg'],['height_cm','Cm'],['time_seconds','Sek']].map(([field,label])=><label key={field}>{label}<input aria-label={label+' for nytt sett '+row.set_number+' i '+exercise.exercise_name} type="number" min="0" step="any" value={row[field]??''} onChange={e=>updateAdded(exercise.id,row.localId,field,e.target.value)}/></label>)}
        <label className="workout-detail-edit-time">Tidsnotat<input value={row.time_text??''} onChange={e=>updateAdded(exercise.id,row.localId,'time_text',e.target.value)}/></label>
        <button type="button" className="secondary-button" onClick={()=>setAddedSets(prev=>({...prev,[exercise.id]:(prev[exercise.id]||[]).filter(x=>x.localId!==row.localId)}))}>Fjern nytt sett</button>
       </div>)}
       <button type="button" className="secondary-button" onClick={()=>addSet(exercise)}><Dumbbell size={15}/> Legg til sett</button>
      </article>)}
     </div></>}
    </form>:<>
     {resultStats.filter(stat=>!report||report.showOverall||!['Rundar','Ekstra reps'].includes(stat.label)).length>0&&<div className="workout-detail-stats">{resultStats.filter(stat=>!report||report.showOverall||!['Rundar','Ekstra reps'].includes(stat.label)).map(stat=><div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>}
     {!workout.detailLoading&&!workout.detailError&&<section className="workout-detail-timing"><h3>Muskelkart · utført økt</h3>{isSamspel||data.wod_engine?.participation&&data.wod_engine.participation!=='individual'?<small>Felles lagresultat gir ikkje individuelt muskelkart.</small>:<AnatomyEvidence exercises={workoutAnatomyExercises(workout)} scope="Denne økta" expanded/>}</section>}{note.personal&&<section className="workout-detail-note"><h3>Notat frå økta</h3><p>{note.personal}</p></section>}
     {isSynchron&&<section className="workout-detail-timing" aria-label="Samspel · mitt resultat"><h3>Samspel · mitt resultat</h3><p>{data.completed===true?'Lagets mål nådd':'Delvis / ikkje stadfesta fullført'}{Number.isFinite(data.elapsed_seconds)?' · Felles økttid '+formatWorkoutSeconds(data.elapsed_seconds):''}</p><small>Individuelt kontrollert bidrag. Estimat og sjølvrapporterte lagbidrag gir ikkje personleg rekord.</small>{synchronRows.length===0?<p>Individuelle resultatdata manglar eller har ukjent versjon.</p>:synchronRows.map((row,i)=><article key={i} className="workout-detail-edit-card"><strong>{row.exercise_name}</strong><p>{row.amount===null?'Ukjend mengd':row.amount+' '+({reps:'reps',seconds:'sek',meters:'m',calories:'cal'}[row.unit])} · {row.quality==='confirmed'?'Sjølvrapportert faktisk mengd':row.quality==='estimated'?'Estimert':'Ukjend'}</p><small>Arbeidsbolk {formatWorkoutSeconds(Math.round(row.assigned_seconds))}{row.team_actual!==null?' · Lagresultat '+row.team_actual+' '+({reps:'reps',seconds:'sek',meters:'m',calories:'cal'}[row.unit]):''}</small>{row.segments.length>0&&<details><summary>Belastning og arbeidsbolkar</summary>{row.segments.map((seg,j)=><p key={j}>{formatWorkoutSeconds(Math.round(seg.seconds))} · {seg.variant}{seg.loadKg!==null?' · '+seg.loadKg+' kg':''}</p>)}</details>}</article>)}</section>}
     {data.samspel&&<section className="workout-detail-timing"><h3>Samspel · lagresultat</h3><p>{data.completed===false||data.completion_status==='incomplete'?'Delvis / ikkje stadfesta':data.completed===true?'Registrert fullført':'Gjennomføringsstatus ikkje registrert'}</p>{data.samspel.main_track==='relay'&&workout.score_rounds!=null&&<p>{workout.score_rounds} fullførte lagrundar</p>}{!data.samspel.main_track&&workout.score_rounds!=null&&<p>{workout.score_rounds} rundar{workout.score_reps!=null?' + '+workout.score_reps+' reps':''}</p>}{['quality','emom',undefined].includes(data.samspel.main_track)&&!Array.isArray(data.samspel.station_tasks)&&<p>{data.samspel.metric==='distance'?workout.score_distance!=null?workout.score_distance+' m':'Distanse ikkje registrert':workout.score_calories!=null?workout.score_calories+' cal':'Kaloriar ikkje registrerte'}</p>}<small>Lagresultat, ikkje individuell prestasjon. Sjå registrerte utøvarbidrag nedanfor.</small></section>}<SamspelParticipantResults samspel={workout.result_data?.samspel}/>{compositeSamspel&&data.samspel_blocks.map(part=><section className="workout-detail-timing" key={part.block_id}><h3>{part.title} · Samspel</h3><p>{part.completed?'Registrert fullført':'Delvis / ikkje utført'}{part.distance!=null?' · '+part.distance+' m':''}{part.calories!=null?' · '+part.calories+' cal':''}{part.relay_rounds!=null?' · '+part.relay_rounds+' lagrundar':''}</p><SamspelParticipantResults samspel={part.samspel}/></section>)}{report&&<ActaReport report={report} historical={historical}/>} {!isSamspel&&!report&&(workout.result_data?.flow_session_status==='done'||workout.result_data?.flow_completion?.length>0)&&<section className="workout-detail-timing"><h3>Gjennomføring</h3>{workout.result_data.flow_session_status==='done'&&<p>Økta er stadfesta utført.</p>}{(workout.result_data.flow_completion||[]).map(part=><div key={part.id}><strong>{part.title}</strong><p>{part.status==='done'?'Utført':part.status==='partial'?'Delvis utført':'Ikkje utført'}</p></div>)}</section>}{!isSamspel&&!report&&primaryResults.length>0&&<section className="workout-detail-timing"><h3>Hovudresultat per del</h3>{primaryResults.map((result,index)=><div key={result.block_id||index}><strong>{result.title}</strong><p>{result.label}: {result.type==='none'?'Ingen score':result.value==null?'Ikkje registrert':result.type==='completion'?({complete:'Gjennomført',partial:'Delvis',failed:'Ikkje gjennomført'}[result.value]||'Ikkje registrert'):result.value+' '+(result.unit||'')}</p></div>)}</section>}
     {!isSamspel&&!report&&complexResults.length>0&&<section className="workout-detail-timing"><h3>Kompleksresultat</h3>{complexResults.map((result,i)=><div key={i}><strong>{result.name}</strong><p>Tyngste godkjende: {result.best_load_kg==null?'Ikkje registrert':result.best_load_kg+' kg'} · {result.completed} fullførte · {result.partial} delvise · {result.failed} mislukka</p></div>)}</section>}
     {(splitSeconds.length>0||note.system.length>0)&&<section className="workout-detail-timing"><h3><Clock3 size={17}/> Timer og rundetider</h3>{note.system.filter(line=>!/^Mellomtider:/i.test(line)).map((line,index)=><p key={index}>{line}</p>)}{splitSeconds.length>0?<div className="workout-detail-splits">{splitSeconds.map((seconds,index)=><span key={index}>R{index+1} <b>{formatWorkoutSeconds(seconds)}</b></span>)}</div>:note.system.filter(line=>/^Mellomtider:/i.test(line)).map((line,index)=><p key={index}>{line}</p>)}</section>}
     {!isSamspel&&!report&&<div className="workout-detail-exercises-head"><h3><Dumbbell size={18}/> Øvingar og sett</h3><span>{exercises.length} øvingar</span></div>}
     {workout.detailLoading&&<div className="training-state"><LoaderCircle className="spin" size={17}/> Hentar øvingsdetaljane …</div>}
     {workout.detailError&&<div className="auth-error" role="alert">{workout.detailError}</div>}
     {!isSamspel&&!report&&<div className="workout-detail-exercise-list">{exercises.map((exercise,index)=><article className="workout-detail-exercise" key={exercise.id}>
      <div className="workout-detail-exercise-title"><span>{String(index+1).padStart(2,'0')}</span><strong>{exercise.exercise_name}</strong></div>
      {exercise.source_text&&<p>{exercise.source_text}</p>}
      <div className="workout-detail-set-list">{(exercise.workout_sets||[]).sort((a,b)=>a.set_number-b.set_number).map(set=><div key={set.id}><span>Sett {set.set_number}</span><strong>{formatWorkoutSet(set)}</strong></div>)}</div>
     </article>)}</div>}
     {!isSamspel&&!report&&!workout.detailLoading&&!exercises.length&&<div className="empty-state">Ingen øvingsdetaljar er lagra på denne økta.</div>}
    </>}
   </div>
   {!editing&&!workout.detailLoading&&!workout.detailError&&<footer className="workout-detail-delete-footer"><button type="button" disabled={deleting} onClick={deleteWorkout}><Trash2 size={17}/> {deleting?'Slettar …':'Slett feilregistrert økt'}</button><small>Fjern økta og PR-resultata frå denne gjennomføringa.</small></footer>}
   {editing&&<footer className="workout-detail-footer"><button type="button" className="workout-detail-cancel" disabled={saving} onClick={cancelEdit}><X size={17}/> Avbryt</button><button type="submit" form="workout-detail-edit-form" className="workout-detail-save" disabled={saving}>{saving?<LoaderCircle className="spin" size={16}/>:<Save size={17}/>} {saving?'Lagrar …':'Lagre endringar'}</button></footer>}
  </section>
 </div>
}
