import {useState,useRef} from 'react'
import {flowKeyValue} from '../lib/flowKeypad.js'
import {doseKeyAllowed} from '../lib/compactDoseRows.js'
const levels=[['rx','RX'],['scaled','Scaled'],['foundation','Foundation']]
export default function CompactDoseGrid({rows,level,onLevel,onEdit,onItemEdit,onDetails,activeDetails}){
 const [active,setActive]=useState(null),[fresh,setFresh]=useState(true)
 const buttons=useRef(new Map())
 const fields=rows.flatMap(row=>row.cells.map(cell=>({...cell,key:row.key+'::'+cell.id,row})))
 const field=fields.find(cell=>cell.key===active)
 function select(cell){setActive(cell.key);setFresh(true)}
 function move(delta){
  if(!field)return
  const next=fields[fields.indexOf(field)+delta]
  if(next){select(next);buttons.current.get(next.key)?.scrollIntoView({block:'nearest',behavior:'auto'})}
  else{setActive(null);setFresh(true)}
 }
 function write(key){
  if(!field)return
  const value=flowKeyValue(field.value,key,{decimal:field.decimal,fresh})
  if(!doseKeyAllowed(value,field))return
  if(field.kind==='item')onItemEdit(field.row.key,field.patch(value))
  else if(field.kind==='row'){onItemEdit(field.row.key,{rowValue:value});onEdit(field.row.key,field.patch(value))}
  else onEdit(field.row.key,field.patch(value))
  setFresh(false)
 }
 function hardware(e){if(!field)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}else if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}else if(e.key==='Escape'){e.preventDefault();setActive(null)}else if(/^[0-9.,]$/.test(e.key)||e.key==='Backspace'||e.key==='Delete'){e.preventDefault();write(e.key==='Backspace'?'backspace':e.key==='Delete'?'clear':e.key)}}
 return <section className="gg-compact-dose-grid" aria-label="Snøggdosering" onKeyDown={hardware}>
  <div className="gg-compact-dose-tabs" role="group" aria-label="Doseringsnivå">{levels.map(([id,label])=><button type="button" key={id} aria-pressed={level===id} onClick={()=>{setActive(null);onLevel(id)}}>{label}</button>)}</div>
  {rows.map(row=><div className="gg-compact-dose-row" key={row.key}><div className="gg-compact-dose-name"><strong>{row.name}</strong>{row.equipment&&<span className="gg-compact-equipment" title={row.equipment}>{row.equipment}</span>}{row.amrap&&<small>Maks reps i intervallet</small>}{row.special&&<small>{row.special}</small>}<button type="button" aria-label={'Detaljar for '+row.name} aria-expanded={activeDetails===row.key} onClick={()=>{setActive(null);onDetails(row.key)}}>···</button></div><div className="gg-compact-dose-values">{row.cells.map(cell=>{const key=row.key+'::'+cell.id;return <div className="gg-compact-cell" key={key}><span>{cell.label}</span><button type="button" ref={el=>{if(el)buttons.current.set(key,el);else buttons.current.delete(key)}} className={active===key?'active':''} aria-pressed={active===key} aria-label={row.name+' · '+cell.label+' · '+(cell.value||'tomt')} onClick={()=>select({...cell,key})}>{cell.value||'–'}</button></div>})}</div></div>)}
  {!rows.length&&<small>Legg til øvingar først.</small>}
  {field&&<div className="gg-compact-keypad" role="group" aria-label="Numerisk tastatur"><header><strong>{field.row.name} · {field.label}</strong><button type="button" onClick={()=>setActive(null)} aria-label="Lukk tastatur">×</button></header><div className="gg-compact-keypad-keys">{['7','8','9','4','5','6','1','2','3',field.decimal?',':'clear','0','backspace'].map(key=><button type="button" key={key} aria-label={key==='backspace'?'Slett siste siffer':key==='clear'?'Tøm felt':key} onClick={()=>write(key)}>{key==='backspace'?'⌫':key==='clear'?'C':key}</button>)}<button type="button" aria-label="Førre felt" onClick={()=>move(-1)}>←</button><button type="button" className="gg-compact-next-field" aria-label="Neste felt" onClick={()=>move(1)}>→</button></div></div>}
 </section>
}
