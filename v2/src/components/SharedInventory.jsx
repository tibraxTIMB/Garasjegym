import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {equipmentCapacity,applyEquipmentInventory} from '../lib/equipmentPreparation.js'
import Lastmeister,{hasBarbellWork} from './Lastmeister.jsx'
import {inventoryFromRows,inventoryNotes} from '../lib/garageInventory.js'
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
export default function SharedInventory({items=[],values={},canEdit=false,actorId,onApply}){
 const shared=useSharedInventory(!!actorId&&items.length>0)
 const rows=equipmentCapacity(items,values)
 if(!rows.length)return null
 return <details className="customer-plan-details"><summary>Felles utstyrsliste · {shared.status==='ready'?'Garasjen':shared.status==='loading'?'Hentar':'Ikkje tilgjengeleg'}</summary>
  {shared.status==='ready'?<><small>{Object.keys(shared.inventory).length} registrerte utstyrstypar. Mengdene er generell kapasitet, ikkje reservasjon eller garanti for riktig vekt. Sjå avgrensingar i inventaret.</small><InventoryNotes items={items} rows={shared.rows}/>{hasBarbellWork(items)&&<Lastmeister rows={shared.rows}/>}<div className="gg-architect-meta"><button type="button" className="secondary-button" disabled={!onApply} onClick={()=>onApply?.(shared.inventory)}>Hent felles mengder</button>{canEdit&&<small>Endra det felles inventaret i Administrasjon → Utstyr.</small>}</div></>:<small>Felles lista er ikkje tilgjengeleg. Lokal liste og WOD-plan er separate kjelder.</small>}
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
