import {useEffect,useState} from 'react'
import {ArrowLeft,CalendarDays,Check,Clock3,Dumbbell,Edit3,LoaderCircle,Save,Trophy,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {formatWorkoutSeconds,formatWorkoutSet,optionalNumber,splitWorkoutNote} from '../lib/workoutDetail.js'
import './workout-detail.css'

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

export default function WorkoutDetail({workout,onBack,onSaved,memberId}){
 const [editing,setEditing]=useState(false)
 const [form,setForm]=useState(()=>initialForm(workout))
 const [setDrafts,setSetDrafts]=useState({})
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 useEffect(()=>{setEditing(false);setForm(initialForm(workout));setSetDrafts({});setError('');setNotice('')},[workout.id])
 useEffect(()=>{
  if(!workout.exercises)return
  setSetDrafts(Object.fromEntries(workout.exercises.flatMap(ex=>(ex.workout_sets||[]).map(set=>[set.id,initialSetValues(set)]))))
 },[workout.exercises])

 const note=splitWorkoutNote(workout.note)
 const exercises=workout.exercises||[]
 const resultStats=[
  workout.score_rounds!=null&&{label:'Rundar',value:workout.score_rounds},
  workout.score_reps!=null&&{label:'Ekstra reps',value:workout.score_reps},
  workout.score_time_seconds!=null&&{label:'Sluttid',value:formatWorkoutSeconds(workout.score_time_seconds)},
  workout.score_load_kg!=null&&{label:'Tungaste løft',value:workout.score_load_kg+' kg'},
  workout.score_calories!=null&&{label:'Kaloriar',value:workout.score_calories},
  workout.score_distance!=null&&{label:'Avstand',value:workout.score_distance+' '+(workout.score_unit||'m')}
 ].filter(Boolean)
 const splitSeconds=workout.result_data?.split_seconds||[]
 const setField=(id,field,value)=>setSetDrafts(previous=>({...previous,[id]:{...previous[id],[field]:value}}))
 function requestBack(){if(editing&&!window.confirm('Gå tilbake utan å lagra endringane?'))return;onBack()}
 function cancelEdit(){setEditing(false);setForm(initialForm(workout));setSetDrafts(Object.fromEntries(exercises.flatMap(ex=>(ex.workout_sets||[]).map(set=>[set.id,initialSetValues(set)]))));setError('')}
 async function save(event){
  event.preventDefault()
  if(saving)return
  setError('');setNotice('');setSaving(true)
  let updatedCount=0
  try{
   if(!form.title.trim())throw new Error('Økta må ha eit namn.')
   if(!/^\d{4}-\d{2}-\d{2}$/.test(form.workout_date))throw new Error('Vel ein gyldig dato.')
   const patch={
    title:form.title.trim(),workout_date:form.workout_date,
    note:[form.note.trim(),...form.system].filter(Boolean).join('\n'),
    score_rounds:optionalNumber(form.score_rounds),score_reps:optionalNumber(form.score_reps),
    score_time_seconds:optionalNumber(form.score_time_seconds),
    score_load_kg:optionalNumber(form.score_load_kg),
    score_calories:optionalNumber(form.score_calories),
    score_distance:optionalNumber(form.score_distance),
    score_unit:form.score_unit.trim()||'m'
   }
   if(patch.score_rounds!=null&&!Number.isInteger(patch.score_rounds))throw new Error('Rundar må vera eit heilt tal.')
   if(patch.score_reps!=null&&!Number.isInteger(patch.score_reps))throw new Error('Reps må vera eit heilt tal.')
   // Validate all set values before writing anything.
   const changedSets=exercises.flatMap(ex=>(ex.workout_sets||[]).flatMap(set=>{
    const draft=setDrafts[set.id]||initialSetValues(set)
    if(Object.keys(draft).every(key=>String(draft[key]??'')===String(set[key]??'')))return []
    return [{id:set.id,values:{
     reps:optionalNumber(draft.reps),load_kg:optionalNumber(draft.load_kg),
     height_cm:optionalNumber(draft.height_cm),time_seconds:optionalNumber(draft.time_seconds),
     time_text:String(draft.time_text??'').trim()||null
    }}]
   }))
   for(const set of changedSets){
    const {data,error:saveError}=await supabase.from('workout_sets').update(set.values).eq('id',set.id).select('id').maybeSingle()
    if(saveError||!data)throw saveError||new Error('Eitt sett kunne ikkje lagrast.')
    updatedCount++
   }
   const {data,error:saveError}=await supabase.from('workout_logs').update(patch).eq('id',workout.id).eq('member_id',memberId).select('id,title,workout_date,format,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,note,result_data').single()
   if(saveError||!data)throw saveError||new Error('Økta kunne ikkje lagrast.')
   setEditing(false);setNotice('Endringane er lagra i treningsloggen.')
   await onSaved?.(data)
  }catch(saveError){
   setError((saveError.message||'Kunne ikkje lagra økta.')+(updatedCount?' Nokre sett kan vera oppdaterte. Opna økta på nytt for å kontrollera.':''))
  }finally{setSaving(false)}
 }

 return <div className="modal-backdrop workout-detail-backdrop" role="presentation" onClick={requestBack}>
  <section className="workout-detail-dialog" role="dialog" aria-modal="true" aria-label="Detaljar om treningsøkt" onClick={event=>event.stopPropagation()}>
   <header className="workout-detail-header">
    <button type="button" className="workout-detail-back" onClick={requestBack}><ArrowLeft size={19}/> Tilbake</button>
    <span className="workout-detail-header-tag"><Check size={14}/> Fullført</span>
    {!editing&&<button type="button" className="workout-detail-edit" disabled={workout.detailLoading||!!workout.detailError} onClick={()=>{setForm(initialForm(workout));setError('');setNotice('');setEditing(true)}}><Edit3 size={16}/> Rediger</button>}
   </header>
   <div className="workout-detail-scroll">
    <div className="workout-detail-intro">
     <span className="section-kicker">DI TRENINGSLOGG</span>
     <h2>{editing?'Rediger økta':workout.title||'Treningsøkt'}</h2>
     <div className="workout-detail-subtitle"><CalendarDays size={15}/>{dateLabel(workout.workout_date)}<span>·</span>{workout.format||'Trening'}</div>
    </div>
    {error&&<div className="auth-error" role="alert">{error}</div>}
    {notice&&<div className="auth-message" role="status">{notice}</div>}
    {editing?<form id="workout-detail-edit-form" onSubmit={save} className="workout-detail-form">
     <div className="workout-detail-edit-card"><h3>Om økta</h3><label>Namn<input required maxLength={120} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label><label>Dato<input type="date" required value={form.workout_date} onChange={e=>setForm(v=>({...v,workout_date:e.target.value}))}/></label><label>Mine notat<textarea rows={3} value={form.note} onChange={e=>setForm(v=>({...v,note:e.target.value}))} placeholder="Korleis gjekk økta?"/></label></div>
     <details className="workout-detail-edit-card workout-detail-score-editor"><summary><Trophy size={17}/> Korriger resultat</summary><div className="workout-detail-edit-grid">{[
      ['score_rounds','Rundar'],['score_reps','Ekstra reps'],['score_time_seconds','Sluttid (sek)'],
      ['score_load_kg','Tungaste løft (kg)'],['score_calories','Kaloriar'],['score_distance','Avstand']
     ].map(([field,label])=><label key={field}>{label}<input type="number" min="0" step={['score_rounds','score_reps'].includes(field)?1:'any'} value={form[field]} onChange={e=>setForm(v=>({...v,[field]:e.target.value}))} placeholder="Ikkje registrert"/></label>)}<label>Eining for avstand<input value={form.score_unit} maxLength={12} onChange={e=>setForm(v=>({...v,score_unit:e.target.value}))}/></label></div><small>PR-senteret blir ikkje automatisk rekna om ved manuell endring av gamle resultat.</small></details>
     <div className="workout-detail-exercises-head"><h3><Dumbbell size={18}/> Øvingar og sett</h3><span>{exercises.length} øvingar</span></div>
     <div className="workout-detail-exercise-list">
      {exercises.map((exercise,index)=><article className="workout-detail-exercise" key={exercise.id}>
       <div className="workout-detail-exercise-title"><span>{String(index+1).padStart(2,'0')}</span><strong>{exercise.exercise_name}</strong></div>
       {(exercise.workout_sets||[]).sort((a,b)=>a.set_number-b.set_number).map(set=><div className="workout-detail-edit-set" key={set.id}>
        <span>Sett {set.set_number}</span>
        {[['reps','Reps'],['load_kg','Kg'],['height_cm','Cm'],['time_seconds','Sek']].map(([field,label])=><label key={field}>{label}<input aria-label={label+' for sett '+set.set_number+' i '+exercise.exercise_name} type="number" min="0" step="any" value={setDrafts[set.id]?.[field]??''} onChange={e=>setField(set.id,field,e.target.value)}/></label>)}
        <label className="workout-detail-edit-time">Tidsnotat<input aria-label={'Tidsnotat for sett '+set.set_number} value={setDrafts[set.id]?.time_text??''} onChange={e=>setField(set.id,'time_text',e.target.value)}/></label>
       </div>)}
      </article>)}
     </div>
    </form>:<>
     {resultStats.length>0&&<div className="workout-detail-stats">{resultStats.map(stat=><div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>}
     {note.personal&&<section className="workout-detail-note"><h3>Notat frå økta</h3><p>{note.personal}</p></section>}
     {(splitSeconds.length>0||note.system.length>0)&&<section className="workout-detail-timing"><h3><Clock3 size={17}/> Timer og rundetider</h3>{note.system.filter(line=>!/^Mellomtider:/i.test(line)).map((line,index)=><p key={index}>{line}</p>)}{splitSeconds.length>0?<div className="workout-detail-splits">{splitSeconds.map((seconds,index)=><span key={index}>R{index+1} <b>{formatWorkoutSeconds(seconds)}</b></span>)}</div>:note.system.filter(line=>/^Mellomtider:/i.test(line)).map((line,index)=><p key={index}>{line}</p>)}</section>}
     <div className="workout-detail-exercises-head"><h3><Dumbbell size={18}/> Øvingar og sett</h3><span>{exercises.length} øvingar</span></div>
     {workout.detailLoading&&<div className="training-state"><LoaderCircle className="spin" size={17}/> Hentar øvingsdetaljane …</div>}
     {workout.detailError&&<div className="auth-error" role="alert">{workout.detailError}</div>}
     <div className="workout-detail-exercise-list">{exercises.map((exercise,index)=><article className="workout-detail-exercise" key={exercise.id}>
      <div className="workout-detail-exercise-title"><span>{String(index+1).padStart(2,'0')}</span><strong>{exercise.exercise_name}</strong></div>
      {exercise.source_text&&<p>{exercise.source_text}</p>}
      <div className="workout-detail-set-list">{(exercise.workout_sets||[]).sort((a,b)=>a.set_number-b.set_number).map(set=><div key={set.id}><span>Sett {set.set_number}</span><strong>{formatWorkoutSet(set)}</strong></div>)}</div>
     </article>)}</div>
     {!workout.detailLoading&&!exercises.length&&<div className="empty-state">Ingen øvingsdetaljar er lagra på denne økta.</div>}
    </>}
   </div>
   {editing&&<footer className="workout-detail-footer"><button type="button" className="workout-detail-cancel" disabled={saving} onClick={cancelEdit}><X size={17}/> Avbryt</button><button type="submit" form="workout-detail-edit-form" className="workout-detail-save" disabled={saving}>{saving?<LoaderCircle className="spin" size={16}/>:<Save size={17}/>} {saving?'Lagrar …':'Lagre endringar'}</button></footer>}
  </section>
 </div>
}
