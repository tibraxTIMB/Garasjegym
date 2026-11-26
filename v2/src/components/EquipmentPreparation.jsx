import React from 'react'
import {equipmentPreparation} from '../lib/equipmentPreparation.js'
export default function EquipmentPreparation({items=[]}){
 const plan=equipmentPreparation(items)
 if(!plan.groups.length&&!plan.unknown.length)return null
 return <details className="customer-plan-details"><summary>Utstyr · {plan.groups.length} oppføringar{plan.unknown.length?' · ! '+plan.unknown.length+' uavklarte':''}</summary><small>Frå øvingsoppsettet. Mengd og deling må kontrollerast før start.</small>{plan.groups.map(row=><div key={row.equipment} style={{padding:'4px 0',overflowWrap:'anywhere'}}><strong>{row.equipment}</strong><small style={{display:'block'}}>{row.exercises.join(' · ')}</small></div>)}{plan.unknown.length>0&&<p>! Utstyr ikkje oppgitt: {plan.unknown.join(' · ')}</p>}</details>
}
