import {samspelConfig,samspelRoles,samspelRoundInstruction,samspelStationLabels} from '../lib/samspel.js'
import {preparationItems,equipmentItemsForSamspel} from '../lib/equipmentPreparation.js'
import Lastmeister,{hasBarbellWork} from './Lastmeister.jsx'
import EquipmentPreparation from './EquipmentPreparation.jsx'
import {useInventoryCapacity,InventoryNotes} from './SharedInventory.jsx'
import React,{useEffect,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {priorPtSummary} from '../lib/ptPreparationHistory.js'
import {ptPreparation} from '../lib/ptFlow.js'
export default function PTPreparation({session,references=[],onReview,expanded=false}){
 const [history,setHistory]=useState({key:'',status:'idle',summary:null,ref:null})
 const referenceKey=references.map(r=>r.kind+':'+r.id+':'+r.log).join('|')
 useEffect(()=>{let live=true;setHistory({key:referenceKey,status:referenceKey?'loading':'idle',summary:null,ref:null});if(!referenceKey)return()=>{live=false};(async()=>{for(const ref of references){const {data,error}=await supabase.rpc('get_pt_wod_result',{p_assignment_id:ref.kind==='assignment'?ref.id:null,p_program_session_id:ref.kind==='program'?ref.id:null});if(!live)return;if(!error&&data?.id===ref.log){setHistory({key:referenceKey,status:'ready',summary:priorPtSummary(data),ref});return}}if(live)setHistory({key:referenceKey,status:'unavailable',summary:null,ref:null})})().catch(()=>{if(live)setHistory({key:referenceKey,status:'unavailable',summary:null,ref:null})});return()=>{live=false}},[referenceKey])
 const prior=history.key===referenceKey?history:null
 const p=ptPreparation(session)
 const samspel=samspelConfig(session?.workout_snapshot?.timer_settings?.workout_schema)
 const items=equipmentItemsForSamspel(preparationItems(session?.workout_snapshot||{}),session?.workout_snapshot?.timer_settings?.workout_schema?.samspel)
 const {status:inventoryStatus,values:capacityValues,rows:inventoryRows}=useInventoryCapacity(items,session?.workout_snapshot?.timer_settings?.workout_schema?.equipment_plan||{})
 if(!p.format&&!p.minutes&&!p.focus&&!p.note&&!p.preparation&&!p.materials&&!items.length&&!referenceKey)return null
 return <details className="customer-plan-details" open={expanded||undefined}>
  <summary>Førebu økta {referenceKey?'· tidlegare resultat':''}</summary>
  <div style={{display:'grid',gap:4,padding:'8px 0'}}>
   {(p.format||p.minutes)&&<small>{[p.format,p.minutes?p.minutes+' min':null].filter(Boolean).join(' · ')}</small>}
   {samspel&&<section aria-label="Samspel-førebuing"><strong>Samspel · {samspel.participant_count||2} utøvarar</strong><div className="gg-samspel-roles">{samspelStationLabels(samspel,samspelRoles(samspel,0)).map((role,i)=><small key={i}>P{i+1} · {role}</small>)}</div><small>{samspelRoundInstruction(samspel)}</small></section>}
   {p.focus&&<div><strong>Fokus:</strong> {p.focus}</div>}
   {p.preparation&&<div><strong>Førebuing:</strong> {p.preparation}</div>}
   {p.materials&&<div><strong>Utstyr og materiell:</strong> {p.materials}</div>}
   {items.length>0&&<small>{inventoryStatus==='ready'?'Tilgjengeleg utstyr: felles inventar der registrert, elles opphavleg plan.':'Tilgjengeleg utstyr: opphavleg plan; felles inventar ikkje stadfesta.'}</small>}
   <InventoryNotes items={items} rows={inventoryRows}/><EquipmentPreparation items={items} values={capacityValues}/>{inventoryStatus==='ready'&&hasBarbellWork(items)&&<Lastmeister rows={inventoryRows}/>}
   {referenceKey&&<section className="gg-prep-history"><strong>Sist gjennomførte tilsvarande WOD</strong>{prior?.status==='ready'&&prior.summary?<><small>{prior.summary.date||'Dato ikkje registrert'}</small>{prior.summary.unverified?<small>Individuell dosering kan ikkje stadfestast frå dette resultatet.</small>:prior.summary.rows.length?prior.summary.rows.map((row,i)=><div key={i}><b>{row.name}</b><small>{row.entries.join(' · ')}{row.more?' · +'+row.more+' sett':''}</small></div>):<small>Ingen individuelle sett registrerte.</small>}{onReview&&<button type="button" className="secondary-button" onClick={()=>onReview(prior.ref.kind+':'+prior.ref.id)}>Opna førre resultat</button>}</>:<small>{prior?.status==='unavailable'?'Kunne ikkje henta eit godkjent PT-resultat.':'Hentar PT-resultat …'}</small>}</section>}
   {p.note&&<div><strong>PT-notat:</strong> {p.note}</div>}
  </div>
 </details>
}
