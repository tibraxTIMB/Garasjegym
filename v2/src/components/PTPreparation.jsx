import {preparationItems} from '../lib/equipmentPreparation.js'
import EquipmentPreparation from './EquipmentPreparation.jsx'
import React from 'react'
import {ptPreparation} from '../lib/ptFlow.js'
export default function PTPreparation({session}){
 const p=ptPreparation(session)
 const items=preparationItems(session?.workout_snapshot||{})
 if(!p.format&&!p.minutes&&!p.focus&&!p.note&&!p.preparation&&!p.materials&&!items.length)return null
 return <details className="customer-plan-details">
  <summary>Førebu økta</summary>
  <div style={{display:'grid',gap:4,padding:'8px 0'}}>
   {(p.format||p.minutes)&&<small>{[p.format,p.minutes?p.minutes+' min':null].filter(Boolean).join(' · ')}</small>}
   {p.focus&&<div><strong>Fokus:</strong> {p.focus}</div>}
   {p.preparation&&<div><strong>Førebuing:</strong> {p.preparation}</div>}
   {p.materials&&<div><strong>Utstyr og materiell:</strong> {p.materials}</div>}
   <EquipmentPreparation items={items} values={session?.workout_snapshot?.timer_settings?.workout_schema?.equipment_plan||{}}/>
   {p.note&&<div><strong>PT-notat:</strong> {p.note}</div>}
  </div>
 </details>
}
