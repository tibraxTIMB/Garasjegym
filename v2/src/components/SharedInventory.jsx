import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {equipmentCapacity,applyEquipmentInventory} from '../lib/equipmentPreparation.js'

export function inventoryFromRows(rows=[]){
 return Object.fromEntries(rows.filter(r=>r.equipment_key&&Number.isSafeInteger(r.available)&&r.available>=0&&r.available<=999).map(r=>[r.equipment_key,r.available]))
}
export function useSharedInventory(enabled){
 const [state,setState]=useState({status:'idle',inventory:{}})
 const request=useRef(0)
 async function refresh(){
  const token=++request.current
  setState({status:'loading',inventory:{}})
  try{
   const {data,error}=await supabase.from('garage_equipment_inventory').select('equipment_key,available,updated_at').limit(1000)
   if(token!==request.current)return null
   if(error){setState({status:'unavailable',inventory:{}});return null}
   const inventory=inventoryFromRows(data||[])
   setState({status:'ready',inventory});return inventory
  }catch{if(token===request.current)setState({status:'unavailable',inventory:{}});return null}
 }
 useEffect(()=>{if(enabled)refresh();return()=>{request.current++}},[enabled])
 return {...state,refresh}
}
export default function SharedInventory({items=[],values={},canEdit=false,actorId,onApply}){
 const shared=useSharedInventory(!!actorId&&items.length>0)
 const [message,setMessage]=useState(''),[saving,setSaving]=useState(false)
 const lock=useRef(false)
 const rows=equipmentCapacity(items,values)
 async function save(){
  if(lock.current||!canEdit||!actorId||shared.status!=='ready')return
  const known=rows.filter(r=>r.available!==null&&r.status!=='invalid')
  if(!known.length||rows.some(r=>r.status==='invalid')){setMessage('Oppgi gyldige mengder først.');return}
  if(!window.confirm('Oppdater felles utstyrsliste for heile garasjen? Berre oppgitte mengder blir endra.'))return
  lock.current=true;setSaving(true);setMessage('')
  try{
   const {data:{user},error:auth}=await supabase.auth.getUser()
   if(auth||user?.id!==actorId)throw Error('Logg inn på nytt.')
   const payload=known.map(r=>({equipment_key:r.key,equipment_label:r.equipment,available:r.available,updated_by:user.id,updated_at:new Date().toISOString()}))
   const {data,error}=await supabase.from('garage_equipment_inventory').upsert(payload,{onConflict:'equipment_key'}).select('equipment_key')
   if(error||data?.length!==payload.length)throw error||Error('Lagring ikkje stadfesta.')
   await shared.refresh();setMessage('Felles utstyrsliste er oppdatert.')
  }catch(e){setMessage(e.message||'Kunne ikkje lagra felles utstyr.')}finally{lock.current=false;setSaving(false)}
 }
 if(!rows.length)return null
 return <details className="customer-plan-details"><summary>Felles utstyrsliste · {shared.status==='ready'?'Garasjen':shared.status==='loading'?'Hentar':'Ikkje tilgjengeleg'}</summary>
  {shared.status==='ready'?<><small>{Object.keys(shared.inventory).length} registrerte utstyrstypar. Mengdene er inventar, ikkje reservasjon.</small><div className="gg-architect-meta"><button type="button" className="secondary-button" disabled={saving} onClick={()=>onApply?.(shared.inventory)}>Hent felles mengder</button>{canEdit&&<button type="button" className="text-button" disabled={saving} onClick={save}>{saving?'Lagrar …':'Oppdater felles mengder'}</button>}</div></>:<small>Felles lista er ikkje tilgjengeleg. Lokal liste og WOD-plan er separate kjelder.</small>}
  <button type="button" className="text-button" disabled={saving||shared.status==='loading'} onClick={shared.refresh}>Oppdater status</button>{message&&<p role="status">{message}</p>}
 </details>
}
export function useInventoryCapacity(items,values){
 const shared=useSharedInventory(items.length>0)
 return {status:shared.status,values:shared.status==='ready'?applyEquipmentInventory(items,values,shared.inventory):values}
}
