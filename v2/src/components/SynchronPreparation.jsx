import React,{useMemo,useRef,useState} from 'react'
import {synchronTransportFormatSupported} from '../lib/synchronSchedule.js'
import {synchronWodTargets} from '../lib/synchronPreparation.js'
import './synchron-preview.css'
const units={reps:'reps',seconds:'sek',meters:'m',calories:'cal'}
// Optional host callback must authorize coach, roster and WOD server-side,
// and atomically create session and invitations. Do not wire to ordinary assignment writes.
export default function SynchronPreparation({wods=[],members=[],leaderId,initialMemberId='',onPrepare}){
 const choices=useMemo(()=>wods.filter(w=>w.is_published===true&&!w.is_archived&&synchronTransportFormatSupported(w.format)),[wods])
 const [wodId,setWodId]=useState(''),[level,setLevel]=useState('rx'),[selected,setSelected]=useState(()=>initialMemberId?[initialMemberId]:[]),[participates,setParticipates]=useState(true),[doses,setDoses]=useState({}),[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(false),[issue,setIssue]=useState('')
 const pending=useRef(false),request=useRef(null)
 const wod=choices.find(w=>w.id===wodId),parsed=wod?synchronWodTargets(wod,level):{rows:[],issue:'Vel WOD først.'}
 const roster=members.filter(m=>m.id!==leaderId),ids=selected.filter(id=>roster.some(m=>m.id===id)),participants=participates?[leaderId,...ids]:ids
 const update=(id,member,patch)=>{request.current=null;setDoses(old=>({...old,[id]:{...old[id],[member]:{...old[id]?.[member],...patch}}}))}
 const ready=!parsed.issue&&participants.length>=2&&participants.length<=8&&parsed.rows.every(r=>participants.every(id=>{const d=doses[r.id]?.[id];return d?.variant?.trim()&&(d.mode==='none'||d.mode==='kg'&&d.kg?.trim()!==''&&Number.isFinite(Number(d.kg))&&Number(d.kg)>=0)}))
 async function prepare(){
  if(!ready||pending.current||typeof onPrepare!=='function')return
  pending.current=true;setBusy(true);setSubmitted(true);setIssue('')
  try{
   if(!request.current)request.current={wodId,level,memberIds:ids,leaderParticipates:participates,sessionId:crypto.randomUUID(),doses:Object.fromEntries(parsed.rows.map(r=>[r.id,Object.fromEntries(participants.map(id=>{const d=doses[r.id][id];return [id,{variant:d.variant.trim(),loadKg:d.mode==='none'?null:Number(d.kg)}]}))]))}
   const result=await onPrepare(request.current)
   if(result?.issue)setIssue(result.issue)
   else if(!result?.sessionId)setIssue('Oppretting ikkje stadfesta. Prøv same førespurnad att.')
   else setIssue('Økta er klargjord.')
  }catch{setIssue('Oppretting ikkje stadfesta. Prøv same førespurnad att.')}finally{pending.current=false;setBusy(false)}
 }
 function change(fn){request.current=null;fn()}
 return <section className="pt2-panel gg-sync-review" aria-label="Gjer klar Samspel">
  <h3>Gjer klar Samspel</h3><small>Vel ein Chipper med felles mål. Individuell variant og vekt må stadfestast.</small>
  <label>WOD<select disabled={busy||submitted} value={wodId} onChange={e=>change(()=>{setWodId(e.target.value);setDoses({})})}><option value="">Vel WOD</option>{choices.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
  <label>Felles målnivå<select disabled={busy||submitted} value={level} onChange={e=>change(()=>{setLevel(e.target.value);setDoses({})})}><option value="rx">RX</option><option value="scaled">Scaled</option><option value="foundation">Foundation</option></select></label>
  <fieldset disabled={busy||submitted}><legend>Deltakarar</legend><label><input type="checkbox" checked={participates} onChange={e=>change(()=>setParticipates(e.target.checked))}/> Eg trenar òg</label>{roster.map(m=><label key={m.id}><input type="checkbox" checked={ids.includes(m.id)} onChange={e=>change(()=>setSelected(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id)))}/>{m.display_name||'Kunde'}</label>)}</fieldset>
  {parsed.issue?<small>{parsed.issue}</small>:parsed.rows.map(r=><details key={r.id} open><summary>{r.name} · {r.target} {units[r.unit]}</summary>{participants.map(id=>{const d=doses[r.id]?.[id]||{};return <fieldset key={id} disabled={busy||submitted}><legend>{id===leaderId?'Mi dosering':roster.find(m=>m.id===id)?.display_name||'Kunde'}</legend><label>Variant<input value={d.variant||''} placeholder="Standard, 40 cm …" onChange={e=>update(r.id,id,{variant:e.target.value})}/></label><label>Belastning<select value={d.mode||''} onChange={e=>update(r.id,id,{mode:e.target.value})}><option value="">Vel</option><option value="none">Ingen ekstra vekt</option><option value="kg">Vekt i kg</option></select></label>{d.mode==='kg'&&<label>kg<input type="number" min="0" step="any" inputMode="decimal" value={d.kg||''} onChange={e=>update(r.id,id,{kg:e.target.value})}/></label>}</fieldset>})}</details>)}
  <button type="button" className="primary-button" disabled={!ready||busy||issue==='Økta er klargjord.'||typeof onPrepare!=='function'} onClick={prepare}>{busy?'Gjer klar …':submitted?'Kontroller same førespurnad':'Gjer klar'}</button>
  {issue&&<p role="status">{issue}</p>}
 </section>
}
