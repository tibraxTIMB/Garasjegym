import {useEffect,useState} from 'react'
import {ArrowLeft,CalendarDays,Check,Clock3,Dumbbell,Edit3,LoaderCircle,MoreHorizontal,Save,Trash2,Trophy,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {formatWorkoutSeconds,formatWorkoutSet,optionalNumber,splitWorkoutNote} from '../lib/workoutDetail.js'
import {sortWodItems,getWodSchemaItems} from '../lib/wodOrdering.js'
import {isEmomFormat,emomPrescribedSetCount} from '../lib/wodEngine.js'
import {plannedFixedEmomSets} from '../lib/compositeWod.js'
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
const blankSet=()=>({reps:'',load_kg:'',height_cm:'',time_seconds:'',time_text:''})
const sameMovement=(a,b)=>String(a||'').trim().toLocaleLowerCase('nn-NO')===String(b||'').trim().toLocaleLowerCase('nn-NO')
/** Use only the original WOD prescription and completed blocks, never inferred actual performance. */
function suggestedEmomSets(workout,schema,exercise,index){
 if(!schema)return null
 const items=sortWodItems(getWodSchemaItems(schema))
 const item=sameMovement(items[index]?.exercise_name,exercise.exercise_name)?items[index]:items.find(x=>sameMovement(x.exercise_name,exercise.exercise_name))
 if(!item)return null
 const level=workout.result_data?.prescription_level||schema.prescription||'rx'
 const prescribed=Number(item.levels?.[level]?.reps??item.reps)
 if(!Number.isInteger(prescribed)||prescribed<=0||item.is_rest||item.reps_mode==='amrap')return null
 if(workout.format==='Samansett økt'){
   const part=(schema.composite_blocks||[]).find(b=>b.id===item.block_id)
   if(!part||!(workout.result_data?.block_summary||[]).some(s=>s.id===part.id&&s.completed===true))return null
   const plan=plannedFixedEmomSets(item,schema.composite_blocks,level,false)
   return plan.autoFill?{count:plan.sets.length,reps:prescribed}:null
 }
 if(!isEmomFormat(workout.format)||workout.result_data?.completed===false)return null
 const count=emomPrescribedSetCount({format:workout.format,interval:schema.interval,durationSeconds:schema.duration_seconds,minuteSlot:item.minute_slot,exerciseIndex:items.indexOf(item),exerciseCount:items.length})
 return count>0?{count,reps:prescribed}:null
}


export default function WorkoutDetail({workout,onBack,onSaved,onDeleted,memberId}){
 const [editing,setEditing]=useState(false)
 const [editMode,setEditMode]=useState(null)
 const [menuOpen,setMenuOpen]=useState(false)
 const [form,setForm]=useState(()=>initialForm(workout))
 const [setDrafts,setSetDrafts]=useState({})
 const [addedSets,setAddedSets]=useState({})
 const [sourceSchema,setSourceSchema]=useState(null)
 const [sourceStatus,setSourceStatus]=useState('')
 const [saving,setSaving]=useState(false)
 const [deleting,setDeleting]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 useEffect(()=>{setEditing(false);setEditMode(null);setMenuOpen(false);setForm(initialForm(workout));setSetDrafts({});setAddedSets({});setSourceSchema(null);setSourceStatus('');setError('');setNotice('')},[workout.id])
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
 function cancelEdit(){setEditing(false);setEditMode(null);setForm(initialForm(workout));setSetDrafts(Object.fromEntries(exercises.flatMap(ex=>(ex.workout_sets||[]).map(set=>[set.id,initialSetValues(set)]))));setAddedSets({});setError('')}
 function beginEdit(nextMode){
  setForm(initialForm(workout));setError('');setNotice('');setMenuOpen(false);setEditMode(nextMode);setEditing(true)
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
  if(deleting||!window.confirm('Vil du slette «'+(workout.title||'Treningsøkt')+'» permanent frå treningsloggen? Eldre PR-noteringar kan bli ståande i arkivet.'))return
  setError('');setDeleting(true)
  try{
   const {data,error:deleteError}=await supabase.from('workout_logs').delete().eq('id',workout.id).eq('member_id',memberId).select('id').maybeSingle()
   if(deleteError||!data)throw deleteError||new Error('Du har ikkje tilgang til å slette denne økta.')
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
   for(const set of changedSets){
    const {data,error:saveError}=await supabase.from('workout_sets').update(set.values).eq('id',set.id).select('id').maybeSingle()
    if(saveError||!data)throw saveError||new Error('Eitt sett kunne ikkje lagrast.')
    updatedCount++
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
    <span className="workout-detail-header-tag"><Check size={14}/> Fullført</span>
    {!editing&&<div className="workout-detail-options"><button type="button" className="workout-detail-more" aria-expanded={menuOpen} aria-label="Fleire val for økta" disabled={workout.detailLoading||!!workout.detailError||deleting} onClick={()=>setMenuOpen(value=>!value)}><MoreHorizontal size={22}/></button>{menuOpen&&<div className="workout-detail-menu"><button type="button" onClick={()=>beginEdit('note')}><Edit3 size={15}/> Rediger notat</button><button type="button" onClick={()=>beginEdit('correction')}><Trophy size={15}/> Korriger feil i resultat</button><button type="button" className="workout-detail-menu-delete" onClick={deleteWorkout}><Trash2 size={15}/> Slett økt</button></div>}</div>}
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
     <div className="workout-detail-edit-card"><h3>{editMode==='note'?'Mine notat':'Om økta'}</h3>{editMode==='correction'&&<><label>Namn<input required maxLength={120} value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label><label>Dato<input type="date" required value={form.workout_date} onChange={e=>setForm(v=>({...v,workout_date:e.target.value}))}/></label></>}<label>Mine notat<textarea rows={3} value={form.note} onChange={e=>setForm(v=>({...v,note:e.target.value}))} placeholder="Korleis gjekk økta?"/></label></div>
     {editMode==='correction'&&<><p className="workout-detail-correction-warning">Bruk korrigering berre når noko er feilregistrert. Historikken blir endra, men eksisterande PR-noteringar blir førebels ikkje automatisk oppdaterte.</p><details className="workout-detail-edit-card workout-detail-score-editor"><summary><Trophy size={17}/> Korriger resultat</summary><div className="workout-detail-edit-grid">{[
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
     </div></>}
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
