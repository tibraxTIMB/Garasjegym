import {useState,useRef,useEffect} from 'react'
import {MoreHorizontal,Check} from 'lucide-react'
import {DnaKeyMatrix} from './DesignDNA.jsx'
import {flowKeyValue,flowHaptic} from '../lib/flowKeypad.js'
import ExerciseMark from './ExerciseMark.jsx'
import {doseKeyAllowed} from '../lib/compactDoseRows.js'
const levels=[['rx','RX'],['scaled','Scaled'],['foundation','Foundation']]
export default function CompactDoseGrid({rows,level,onLevel,onEdit,onItemEdit,onDetails,activeDetails,rowIssue,unified=false}){
 const [active,setActive]=useState(null),[feedback,setFeedback]=useState(null),[draft,setDraft]=useState(null)
 const input=useRef(null),flash=useRef(null)
 useEffect(()=>()=>clearTimeout(flash.current),[])
 function respond(key,kind='tap'){flowHaptic(kind);clearTimeout(flash.current);setFeedback({key,kind});flash.current=setTimeout(()=>setFeedback(null),170)}
 function close(){respond('done','done');setActive(null);setDraft(null);input.current=null}
 const buttons=useRef(new Map())
 const fields=rows.flatMap(row=>row.cells.map(cell=>({...cell,key:row.key+'::'+cell.id,row})))
 const field=fields.find(cell=>cell.key===active)
 function select(cell){input.current={key:cell.key,value:cell.value,fresh:true};setDraft(cell.value);setActive(cell.key);respond(cell.key,'next')}
 function move(delta){
  if(!field)return
  const next=fields[fields.indexOf(field)+delta]
  if(next){select(next);buttons.current.get(next.key)?.scrollIntoView({block:'nearest',behavior:'auto'})}
  else if(delta>0)close();else respond('previous','reject')
 }
 function write(key){
  if(!field)return
  const current=input.current?.key===field.key?input.current:{key:field.key,value:field.value,fresh:true}
  const value=flowKeyValue(current.value,key,{decimal:field.decimal,fresh:current.fresh})
  if(!doseKeyAllowed(value,field)||(key===','||key==='.')&&value===current.value){respond(key,'reject');return}
  input.current={key:field.key,value,fresh:false};setDraft(value);respond(key)
  if(field.kind==='item')onItemEdit(field.row.key,field.patch(value))
  else if(field.kind==='row'){onItemEdit(field.row.key,{rowValue:value});onEdit(field.row.key,field.patch(value))}
  else onEdit(field.row.key,field.patch(value))
 }
 function hardware(e){if(!field)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}else if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}else if(e.key==='Escape'){e.preventDefault();close()}else if(/^[0-9.,]$/.test(e.key)||e.key==='Backspace'||e.key==='Delete'){e.preventDefault();write(e.key==='Backspace'?'backspace':e.key==='Delete'?'clear':e.key)}}
 return <section className="gg-compact-dose-grid" aria-label="Snøggdosering" onKeyDown={hardware}>
  <div className="gg-compact-dose-tabs" role="group" aria-label="Doseringsnivå">{levels.map(([id,label])=><button type="button" key={id} aria-pressed={level===id} onClick={()=>{setActive(null);setDraft(null);input.current=null;respond(id,'next');onLevel(id)}}>{label}</button>)}</div>
  {rows.map((row,index)=><div className={'gg-compact-dose-row'+(field?.row.key===row.key?' gg-dose-row-active':'')} key={row.key}><div className="gg-compact-dose-name"><strong className="gg-exercise-identity">{unified&&<ExerciseMark exercise={row}/>}<span className="gg-exercise-title">{unified&&<span className="gg-dose-order">{index+1} · </span>}{row.name}</span></strong>{row.equipment&&<span className="gg-compact-equipment" title={row.equipment}>{row.equipment}</span>}{row.amrap&&<small>Maks reps i intervallet</small>}{row.special&&<small>{row.special}</small>}{unified&&rowIssue?.(row.key)&&<small className="gg-dose-inline-error" role="status">! {rowIssue(row.key)}</small>}<button type="button" aria-label={'Detaljar for '+row.name} aria-expanded={activeDetails===row.key} onClick={()=>{setActive(null);setDraft(null);input.current=null;onDetails(row.key);if(unified&&activeDetails!==row.key)requestAnimationFrame(()=>document.querySelector('.gg-three-stage .gg-compact-advanced-exercises .wizard-dose-card')?.scrollIntoView({block:'nearest'}))}}><MoreHorizontal size={20} strokeWidth={2} aria-hidden="true"/></button></div><div className="gg-compact-dose-values">{row.cells.map(cell=>{const key=row.key+'::'+cell.id;return <div className="gg-compact-cell" key={key}><span>{cell.label}</span><button type="button" ref={el=>{if(el)buttons.current.set(key,el);else buttons.current.delete(key)}} className={(active===key?'active':'')+(active===key&&feedback?.kind==='reject'?' gg-key-reject':'')} aria-pressed={active===key} aria-label={row.name+' · '+cell.label+' · '+(cell.value||'tomt')} onClick={()=>select({...cell,key})}>{(active===key&&draft!==null?draft:cell.value).replace('.',',')||'–'}</button></div>})}</div></div>)}
  {!rows.length&&<small>Legg til øvingar først.</small>}
  {field&&<div className="gg-compact-keypad" role="group" aria-label="Numerisk tastatur"><header><div className="gg-keypad-context"><strong>{field.row.name} · {field.label}</strong><small>{fields.indexOf(field)+1}/{fields.length} · {level.toUpperCase()}</small></div><output className="gg-keypad-value" aria-live="off">{(draft??field.value).replace('.',',')||'–'}</output><button type="button" onClick={close} aria-label="Lukk tastatur"><Check size={20} aria-hidden="true"/></button></header><DnaKeyMatrix onKey={write} onPrevious={()=>move(-1)} onNext={()=>move(1)} previousDisabled={fields.indexOf(field)===0} last={fields.indexOf(field)===fields.length-1} decimal={field.decimal} feedback={feedback}/></div>}
 </section>
}
