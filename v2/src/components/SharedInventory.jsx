import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {equipmentCapacity,applyEquipmentInventory} from '../lib/equipmentPreparation.js'
import Lastmeister,{hasBarbellWork} from './Lastmeister.jsx'
import {inventoryFromRows,inventoryNotes,doubleEmomStationCapacity} from '../lib/garageInventory.js'
export {inventoryFromRows} from '../lib/garageInventory.js'

export function useSharedInventory(enabled){
 const [state,setState]=useState({status:'idle',inventory:{}})
 const request=useRef(0)
 async function refresh(){
  const token=++request.current
  setState({status:'loading',inventory:{}})
  try{
   const {data,error}=await supabase.from('garage_equipment_inventory').select('*').limit(1000)
   if(token!==request.current)return null
   if(error){setState({status:'unavailable',inventory:{}});return null}
   const inventory=inventoryFromRows(data||[])
   setState({status:'ready',inventory,rows:data||[]});return inventory
  }catch{if(token===request.current)setState({status:'unavailable',inventory:{}});return null}
 }
 useEffect(()=>{if(enabled)refresh();return()=>{request.current++}},[enabled])
 return {...state,refresh}
}
export default function SharedInventory({items=[],values={},canEdit=false,actorId,onApply,level='rx',blocks=[]}){
 const shared=useSharedInventory(!!actorId&&items.length>0)
 const rows=equipmentCapacity(items,values)
 const ironParts=blocks.filter(block=>block.samspel?.main_track==='strength').map(block=>({block,items:items.filter(item=>(item.blockId||item.block_id)===block.id&&!item.is_rest)})).filter(part=>part.items.length===1&&hasBarbellWork(part.items))
 const otherItems=items.filter(item=>!ironParts.some(part=>part.block.id===(item.blockId||item.block_id)))
 if(!rows.length)return null
 return <details className="customer-plan-details"><summary>Felles utstyrsliste · {shared.status==='ready'?'Garasjen':shared.status==='loading'?'Hentar':'Ikkje tilgjengeleg'}</summary>
  {shared.status==='ready'?<><small>{Object.keys(shared.inventory).length} registrerte utstyrstypar. Mengdene er generell kapasitet, ikkje reservasjon eller garanti for riktig vekt. Sjå avgrensingar i inventaret.</small><InventoryNotes items={items} rows={shared.rows}/>{doubleEmomStationCapacity(blocks,items,shared.inventory).map(part=><section key={part.id} className="customer-plan-details"><strong>{part.title} · samtidig minimum</strong>{!part.validTrackCount&&<p role="alert">Vel nøyaktig to arbeidsøvingar.</p>}{part.rows.map(row=><div key={row.key}><small>{row.key}: {row.required} behov / {row.available??'ukjent'} tilgjengeleg</small><small role="status"> · {row.status==='shortage'?'! For lite utstyr':row.status==='unknown'?'Ikkje avklart':'Minimum tilgjengeleg'}</small></div>)}{part.unknown.length>0&&<p>Manuell kontroll: {part.unknown.join(' · ')}</p>}<small>Minimum per del, ikkje reservasjon. Kontroller vekt, plass, deling og kompatibilitet. Bruk Lastmeister for skiver og stenger.</small></section>)}{ironParts.map(part=><Lastmeister key={'iron-'+part.block.id} rows={shared.rows} items={part.items} level={level} ironTwins title={part.block.title||'Iron Twins'}/>)}{hasBarbellWork(otherItems)&&<Lastmeister rows={shared.rows} items={otherItems} level={level}/>}<div className="gg-architect-meta"><button type="button" className="secondary-button" disabled={!onApply} onClick={()=>onApply?.(shared.inventory)}>Hent felles mengder</button>{canEdit&&<small>Endra det felles inventaret i Administrasjon → Utstyr.</small>}</div></>:<small>Felles lista er ikkje tilgjengeleg. Lokal liste og WOD-plan er separate kjelder.</small>}
  <button type="button" className="text-button" disabled={shared.status==='loading'} onClick={shared.refresh}>Oppdater status</button>
 </details>
}
export function useInventoryCapacity(items,values){
 const shared=useSharedInventory(items.length>0)
 return {status:shared.status,values:shared.status==='ready'?applyEquipmentInventory(items,values,shared.inventory):values,rows:shared.rows||[]}
}

export function InventoryNotes({items=[],rows=[]}){
 const notes=inventoryNotes(items,rows)
 if(!notes.length)return null
 return <div className="customer-plan-details"><strong>Utstyrsmerknader · kontroller før bruk</strong>{notes.map(row=><div key={row.equipment_key}><strong>{row.equipment_label}{row.weight_kg!=null?' · '+row.weight_kg+' kg':''}</strong><p>{row.notes}</p></div>)}</div>
}
