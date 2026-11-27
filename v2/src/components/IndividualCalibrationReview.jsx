import React,{useRef,useState} from 'react'
import {isIndividualPerformance} from '../lib/performanceEvidence.js'
import {individualCalibrationRequestIssue} from '../lib/individualCalibration.js'
export default function IndividualCalibrationReview({result,assignmentId,programSessionId,onRecord}){
 const [index,setIndex]=useState(''),[variant,setVariant]=useState(''),[mode,setMode]=useState(''),[kg,setKg]=useState(''),[unit,setUnit]=useState('reps'),[amount,setAmount]=useState(''),[seconds,setSeconds]=useState(''),[attested,setAttested]=useState(false),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[message,setMessage]=useState(''),[accepted,setAccepted]=useState(false)
 const pending=useRef(false),request=useRef(null)
 const rows=result?.result_data?.exercise_results
 if(typeof onRecord!=='function'||result?.result_data?.participation_verified!=='individual'||!isIndividualPerformance(result)||!Array.isArray(rows))return null
 const selected=index===''?null:rows[Number(index)]
 const draft={assignmentId:assignmentId||null,programSessionId:programSessionId||null,exerciseIndex:Number(index),exerciseName:selected?.exercise_name,variant:variant.trim(),loadKg:mode==='none'?null:Number(kg),unit,amount:Number(amount),seconds:Number(seconds),attested}
 const ready=!!selected&&!selected.is_complex&&(!selected.side_mode||selected.side_mode==='none')&&!!mode&&(mode!=='kg'||kg.trim()!=='')&&amount.trim()!==''&&seconds.trim()!==''&&!individualCalibrationRequestIssue({...draft,requestId:'12345678-1234-4234-8234-123456789012'})
 async function submit(){
  if(pending.current||accepted||!ready)return
  pending.current=true;setBusy(true);setLocked(true);setMessage('')
  try{
   if(!request.current)request.current={...draft,requestId:crypto.randomUUID()}
   const r=await onRecord(request.current)
   if(r?.accepted===true){setAccepted(true);setMessage('Observasjonen er stadfesta lagra.')}
   else setMessage(r?.issue||'Lagring ikkje stadfesta. Prøv same førespurnad att.')
  }catch{setMessage('Lagring ikkje stadfesta. Prøv same førespurnad att.')}
  finally{pending.current=false;setBusy(false)}
 }
 return <details className="ptreview-disclosure"><summary>Leistungsprofil · frivillig observasjon</summary>
  <p>Berre første arbeidsbolk på denne øvinga, dersom du sjølv observerte heile bolken. Ikkje bruk planlagde tal eller rekna rundetotalar.</p>
  <fieldset disabled={locked||busy}>
   <label>Øving<select value={index} onChange={e=>{setIndex(e.target.value);setAttested(false)}}><option value="">Vel øving</option>{rows.map((r,i)=>r.exercise_name&&!r.is_complex&&(!r.side_mode||r.side_mode==='none')?<option key={i} value={i}>{r.exercise_name}</option>:null)}</select></label>
   <label>Faktisk variant<input value={variant} onChange={e=>{setVariant(e.target.value);setAttested(false)}} placeholder="Standard, 40 cm …"/></label>
   <label>Belastning<select value={mode} onChange={e=>{setMode(e.target.value);setAttested(false)}}><option value="">Vel</option><option value="none">Ingen ekstra vekt</option><option value="kg">Vekt i kg</option></select></label>
   {mode==='kg'&&<label>kg<input type="number" min="0" step="any" value={kg} onChange={e=>{setKg(e.target.value);setAttested(false)}}/></label>}
   <label>Måleeining<select value={unit} onChange={e=>{setUnit(e.target.value);setAttested(false)}}><option value="reps">Reps</option><option value="meters">Meter</option><option value="calories">Kaloriar (maskin)</option></select></label>
   <label>Faktisk mengd<input type="number" min="0" max="100000" step="1" inputMode="numeric" value={amount} onChange={e=>{setAmount(e.target.value);setAttested(false)}}/></label>
   <label>Målt arbeidsbolk i sekund<input type="number" min="5" max="3600" step="any" inputMode="decimal" value={seconds} onChange={e=>{setSeconds(e.target.value);setAttested(false)}}/></label>
   <label><input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)}/> Eg observerte sjølv mengd, tid, variant og belastning for heile den første bolken. {unit!=='reps'?'Mengda er faktisk maskindifferanse.':''}</label>
  </fieldset>
  <button type="button" className="secondary-button" disabled={!ready||busy||accepted} onClick={submit}>{accepted?'Stadfesta':busy?'Kontrollerer …':locked?'Prøv same førespurnad':'Stadfest observasjon'}</button>
  {message&&<p role="status">{message}</p>}
  <small>Observasjonen endrar ikkje treningsloggen eller personlege rekordar.</small>
 </details>
}
