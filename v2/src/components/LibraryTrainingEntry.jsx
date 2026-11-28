import {useRef,useState} from 'react'
import {X,Play,Users,CalendarDays} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {osloDay} from '../lib/ptSchedule.js'
import {libraryAppointmentRow,sameLibraryAppointment} from '../lib/libraryTrainingEntry.js'
import {synchronWodTargets} from '../lib/synchronPreparation.js'
import SynchronPreparation from './SynchronPreparation.jsx'
import {DnaDateTimeInput} from './DesignDNA.jsx'
import {useFlowConfirm,FlowConfirmDialog} from './FlowEntry.jsx'
import './library-training-entry.css'
export default function LibraryTrainingEntry({wod,mode,members=[],actorId,onPrepareSynchron,onClose,onLaunch,onSaved,initialMemberId='',initialShared=false,replay=false}){
 const [choice,setChoice]=useState(initialShared?'shared':''),[memberId,setMemberId]=useState(initialMemberId),[date,setDate]=useState(osloDay()),[time,setTime]=useState(''),[duration,setDuration]=useState(String(Math.max(5,Math.min(240,Math.ceil(Number(wod.duration_minutes)||30))))),[busy,setBusy]=useState(false),[issue,setIssue]=useState(''),[attempted,setAttempted]=useState(false)
 const pending=useRef(false),request=useRef(null),confirm=useFlowConfirm()
 async function closeEntry(){if(pending.current)return;if((attempted||choice==='shared')&&!(await confirm.ask({title:'Lukk trening?',message:'Kontroller eventuelt oppretta avtale eller fellesøkt før du prøver på nytt.',confirmLabel:'Lukk',cancelLabel:'Hald fram'})))return;onClose()}
 const roster=members.filter(m=>m.id!==actorId)
 const supported=wod.is_published===true&&!wod.is_archived&&['rx','scaled','foundation'].some(level=>!synchronWodTargets(wod,level).issue)
 const canSync=supported&&typeof onPrepareSynchron==='function'
 async function plan(event){
  event.preventDefault();if(pending.current)return
  pending.current=true;setBusy(true);setIssue('')
  try{
   const {data:{user},error}=await supabase.auth.getUser()
   if(error||!user||user.id!==actorId||!roster.some(m=>m.id===memberId))throw Error('Kunde eller innlogging er ikkje stadfesta.')
   if(!request.current){request.current=libraryAppointmentRow({id:crypto.randomUUID(),wod,memberId,actorId,date,time,duration});setAttempted(true)}
   const row=request.current
   const read=()=>supabase.from('pt_sessions').select('id,client_id,created_by,starts_at,duration_minutes,status,wod_ids').eq('id',row.id).maybeSingle()
   let current=await read()
   if(current.error)throw current.error
   if(!current.data){
    const insert=await supabase.from('pt_sessions').insert(row)
    current=await read()
    if(current.error||!current.data)throw insert.error||current.error||Error('Lagring ikkje stadfesta. Prøv same førespurnad att.')
   }
   if(!sameLibraryAppointment(current.data,row))throw Error('Avtalen samsvarar ikkje. Kontroller kalenderen før ny oppretting.')
   onSaved(wod.name+' er planlagd med '+(roster.find(m=>m.id===memberId)?.display_name||'kunden')+' · '+date+' kl. '+time+'.')
  }catch(e){setIssue(e.message||'Kunne ikkje oppretta PT-avtale.')}finally{pending.current=false;setBusy(false)}
 }
 return <div className="modal-backdrop" onClick={()=>{if(!busy&&!attempted&&choice!=='shared')onClose()}}><section className="gg-library-training" role="dialog" aria-modal="true" aria-label={mode==='now'?'Tren no':'Planlegg trening'} onClick={e=>e.stopPropagation()}>
  <header><div><small>{replay?'REPLAY · NY GJENNOMFØRING':mode==='now'?'TREN NO':'PLANLEGG TRENING'}</small><h3>{wod.name}</h3><small>{wod.format}</small></div><button type="button" className="icon-button" aria-label="Lukk" disabled={busy} onClick={closeEntry}><X size={20}/></button></header>
  {replay&&<small>Brukar dagens versjon av WOD-en. Tidlegare resultat og tildelingar blir ikkje endra.</small>}
  {mode==='now'?<>{choice!=='shared'?<>{typeof onLaunch==='function'&&<button type="button" className="primary-button" onClick={onLaunch}><Play size={18}/> På denne eininga</button>}<button type="button" className="secondary-button" disabled={!canSync} onClick={()=>setChoice('shared')}><Users size={18}/> Tren saman · synkronisert</button>{!canSync&&<small>{supported?'Felles styring er ikkje tilgjengeleg no. Kontroller aktiv økt og tilkopling.':'Synkronisering krev ein publisert, støtta Chipper med éin del.'}</small>}</>:canSync?<SynchronPreparation wods={[wod]} members={roster} leaderId={actorId} initialWodId={wod.id} initialMemberId={initialMemberId} onPrepare={onPrepareSynchron}/>:<p role="status">Felles styring er ikkje tilgjengeleg for denne WOD-en no.</p>}</>:<form onSubmit={plan}>
   <label>Kven trenar du med?<select required disabled={busy||attempted} value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">Vel kunde</option>{roster.map(m=><option key={m.id} value={m.id}>{m.display_name||'Medlem'}</option>)}</select></label>
   <div className="gg-library-training-datetime"><label>Dato<DnaDateTimeInput type="date" required min={osloDay()} disabled={busy||attempted} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Klokkeslett<DnaDateTimeInput type="time" required disabled={busy||attempted} value={time} onChange={e=>setTime(e.target.value)}/></label></div>
   <label>Varigheit (min)<input type="number" min="5" max="240" required inputMode="numeric" disabled={busy||attempted} value={duration} onChange={e=>setDuration(e.target.value)}/></label>
   <small>PT-avtale · same WOD, ny gjennomføring. Felles timer blir klargjord på treningsdagen.</small>
   {issue&&<p role="alert">{issue}</p>}
   <button className="primary-button" type="submit" disabled={busy||!memberId||!time||!date}><CalendarDays size={17}/>{busy?'Lagrar …':attempted?'Kontroller same avtale':'Opprett PT-avtale'}</button>
  </form>}
 <FlowConfirmDialog dialog={confirm.dialog} onClose={confirm.finish}/>
 </section></div>
}
