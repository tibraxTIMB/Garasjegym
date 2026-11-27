import {useState} from 'react'
import {plateAllocation,ironTwinsPlateAllocation,inventoryGroup,prescribedBarbellLoads} from '../lib/garageInventory.js'
import './garage-inventory.css'
export function hasBarbellWork(items=[]){return items.some(item=>!item?.is_rest&&String(item?.equipment||'').split('/').some(e=>['stong','ez-stong'].includes(inventoryGroup(e))))}
const newLoad=()=>({barKey:'',targetKg:'',compatible:false})
const kg=n=>Number(n).toLocaleString('nn-NO')+' kg'
export default function Lastmeister({rows=[],items=[],level='rx',ironTwins=false,title=''}){
 const [requests,setRequests]=useState(()=>ironTwins?[newLoad(),newLoad()]:[newLoad()])
 const [mode,setMode]=useState('')
 const suggestions=prescribedBarbellLoads(items,level)
 const bars=rows.filter(r=>r.inventory_kind==='item'&&['stong','ez-stong'].includes(r.group_key)&&r.available!==0)
 const update=(index,patch)=>setRequests(prev=>prev.map((r,i)=>i===index?{...r,...patch}:r))
 const ready=(!ironTwins||!!mode)&&requests.every(r=>r.barKey&&r.targetKg!==''&&r.compatible)
 const result=ready?(ironTwins?ironTwinsPlateAllocation(rows,requests,mode):plateAllocation(rows,requests)):null
 const plateText=load=>load.perSide.length?load.perSide.map(p=>p.count+' × '+kg(p.kg)).join(' + '):'Ingen skiver'
 return <details className="customer-plan-details">
  <summary>{ironTwins?'Lastmeister · '+title+' · to utøvarar':'Lastmeister · vektskiver og samtidige stenger'}</summary>
  {ironTwins&&<><label>Utstyrsbruk<select value={mode} onChange={e=>setMode(e.target.value)}><option value="">Vel gjennomføring</option><option value="simultaneous">To ferdig rigga stenger samstundes</option><option value="sequential">Etter tur – rigg om mellom setta</option></select></label><small>{mode==='sequential'?'Kvart oppsett blir kontrollert for seg. Skiver kan berre gjenbrukast etter omrigging.':'Ved samtidig bruk må begge stengene og alle skivepar vera tilgjengelege på same tid.'}</small></>}
  <small>Brukar registrert inventar. Vel stong og totalvekt for kvar deltakar. Kontroller fysisk passform, låsar, stongkapasitet og skiveplass. Berekninga er ikkje ei reservasjon eller tryggleiksgodkjenning.</small>
  {requests.map((req,i)=>{const bar=bars.find(b=>b.equipment_key===req.barKey);return <div key={i} style={{padding:'10px 0'}}>
   <strong>{ironTwins?'Utøvar':'Stong'} {i+1}</strong>
   {suggestions.length>0&&<label>Hent målvekt frå WOD ({level.toUpperCase()})<select aria-label={'Målvekt frå WOD for stong '+(i+1)} value="" onChange={e=>{const selected=suggestions.find(x=>x.id===e.target.value);if(selected)update(i,{targetKg:String(selected.kg),barKey:bar?.group_key===selected.group?req.barKey:'',compatible:false})}}><option value="">Vel foreskriven vekt</option>{suggestions.map(x=><option key={x.id} value={x.id}>{x.name} · {x.label} · {kg(x.kg)}</option>)}</select></label>}
   <div className="gg-inventory-fields"><label>Stong<select value={req.barKey} onChange={e=>update(i,{barKey:e.target.value,compatible:false})}><option value="">Vel stong</option>{bars.map(b=><option key={b.equipment_key} value={b.equipment_key}>{b.equipment_label} · {b.weight_kg==null?'ukjend vekt':kg(b.weight_kg)} · {b.available??'?'} stk</option>)}</select></label>
   <label>Totalvekt (kg)<input inputMode="decimal" value={req.targetKg} onChange={e=>update(i,{targetKg:e.target.value.replace(',','.'),compatible:false})} placeholder="80"/></label></div>
   {bar?.notes&&<p role="note">{bar.notes}</p>}
   <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={req.compatible} disabled={!bar||!req.targetKg} onChange={e=>update(i,{compatible:e.target.checked})}/> Eg har kontrollert kompatibilitet og bruksrestriksjonar.</label>
   {!ironTwins&&requests.length>1&&<button type="button" className="text-button" onClick={()=>setRequests(prev=>prev.filter((_,j)=>j!==i))}>Fjern stong {i+1}</button>}
  </div>})}
  {!ironTwins&&requests.length<8&&<button type="button" className="secondary-button" onClick={()=>setRequests(prev=>[...prev,newLoad()])}>+ Legg til stong</button>}
  {rows.filter(r=>r.inventory_kind==='item'&&r.group_key==='vektskiver'&&r.notes&&r.available!==0).map(r=><p key={r.equipment_key}>{r.equipment_label}: {r.notes}</p>)}
  {!ready&&<p>Fyll ut og stadfest kvar stong for å rekna ut oppsettet.</p>}
  {result&&<div role="status" style={{overflowWrap:'anywhere',paddingTop:8}}>
   {result.status==='exact'?<><strong>{result.sequential?'Eksakte oppsett kvar for seg – krev omrigging':'Eksakt samtidig fordeling'}</strong>{result.loads.map((load,i)=><div key={i}><b>{ironTwins?'Utøvar':'Stong'} {i+1} · {kg(load.totalKg)}</b><small style={{display:'block'}}>Per side: {plateText(load)}</small></div>)}</>:<><strong>{result.reason}</strong>{result.individual?.map((row,i)=><p key={i}>Utøvar {i+1}: {row.status==='exact'?'Eksakt oppsett':row.reason}</p>)}{result.alternatives?.length>0&&<><p>Individuelle alternativ – ikkje kontrollert for samtidig bruk. Målvektene blir ikkje endra.</p>{result.alternatives.map(a=><div key={a.index}>Stong {a.index+1}: {a.below?'Under '+kg(a.below.totalKg):'Ingen lågare'} · {a.above?'Over '+kg(a.above.totalKg):'Ingen høgare'}</div>)}</>}</>}
  </div>}
 </details>
}

