import {useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {INVENTORY_GROUPS,INITIAL_INVENTORY,inventoryDraft,missingInitialInventory,plateAllocation} from '../lib/garageInventory.js'
import './garage-inventory.css'
const blank=()=>({equipment_label:'',group_key:'anna',available:'1',weight_kg:'',notes:''})

const newLoad=()=>({barKey:'',targetKg:'',compatible:false})
const kg=n=>Number(n).toLocaleString('nn-NO')+' kg'
function Lastmeister({rows}){
 const [requests,setRequests]=useState([newLoad()])
 const bars=rows.filter(r=>['stong','ez-stong'].includes(r.group_key)&&r.available!==0)
 const update=(index,patch)=>setRequests(prev=>prev.map((r,i)=>i===index?{...r,...patch}:r))
 const ready=requests.every(r=>r.barKey&&r.targetKg!==''&&r.compatible)
 const result=ready?plateAllocation(rows,requests):null
 const plateText=load=>load.perSide.length?load.perSide.map(p=>p.count+' × '+kg(p.kg)).join(' + '):'Ingen skiver'
 return <details className="customer-plan-details">
  <summary>Lastmeister · vektskiver og samtidige stenger</summary>
  <small>Brukar registrert inventar. Vel stong og totalvekt for kvar deltakar. Kontroller fysisk passform, låsar, stongkapasitet og skiveplass. Berekninga er ikkje ei reservasjon eller tryggleiksgodkjenning.</small>
  {requests.map((req,i)=>{const bar=bars.find(b=>b.equipment_key===req.barKey);return <div key={i} style={{padding:'10px 0'}}>
   <strong>Stong {i+1}</strong>
   <div className="gg-inventory-fields"><label>Stong<select value={req.barKey} onChange={e=>update(i,{barKey:e.target.value,compatible:false})}><option value="">Vel stong</option>{bars.map(b=><option key={b.equipment_key} value={b.equipment_key}>{b.equipment_label} · {b.weight_kg==null?'ukjend vekt':kg(b.weight_kg)} · {b.available??'?'} stk</option>)}</select></label>
   <label>Totalvekt (kg)<input inputMode="decimal" value={req.targetKg} onChange={e=>update(i,{targetKg:e.target.value.replace(',','.'),compatible:false})} placeholder="80"/></label></div>
   {bar?.notes&&<p role="note">{bar.notes}</p>}
   <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={req.compatible} disabled={!bar||!req.targetKg} onChange={e=>update(i,{compatible:e.target.checked})}/> Eg har kontrollert kompatibilitet og bruksrestriksjonar.</label>
   {requests.length>1&&<button type="button" className="text-button" onClick={()=>setRequests(prev=>prev.filter((_,j)=>j!==i))}>Fjern stong {i+1}</button>}
  </div>})}
  {requests.length<8&&<button type="button" className="secondary-button" onClick={()=>setRequests(prev=>[...prev,newLoad()])}>+ Legg til stong</button>}
  {rows.filter(r=>r.group_key==='vektskiver'&&r.notes&&r.available!==0).map(r=><p key={r.equipment_key}>{r.equipment_label}: {r.notes}</p>)}
  {!ready&&<p>Fyll ut og stadfest kvar stong for å rekna ut oppsettet.</p>}
  {result&&<div role="status" style={{overflowWrap:'anywhere',paddingTop:8}}>
   {result.status==='exact'?<><strong>Eksakt samtidig fordeling</strong>{result.loads.map((load,i)=><div key={i}><b>Stong {i+1} · {kg(load.totalKg)}</b><small style={{display:'block'}}>Per side: {plateText(load)}</small></div>)}</>:<><strong>{result.reason}</strong>{result.alternatives?.length>0&&<><p>Individuelle alternativ – ikkje kontrollert for samtidig bruk. Målvektene blir ikkje endra.</p>{result.alternatives.map(a=><div key={a.index}>Stong {a.index+1}: {a.below?'Under '+kg(a.below.totalKg):'Ingen lågare'} · {a.above?'Over '+kg(a.above.totalKg):'Ingen høgare'}</div>)}</>}</>}
  </div>}
 </details>
}

export default function GarageInventory({profile}){
 const [rows,setRows]=useState([]),[status,setStatus]=useState('loading'),[message,setMessage]=useState(''),[error,setError]=useState(''),[search,setSearch]=useState(''),[group,setGroup]=useState(''),[draft,setDraft]=useState(null),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[importing,setImporting]=useState(false)
 const lock=useRef(false),request=useRef(0)
 const canEdit=profile?.active&&['admin','manager'].includes(profile.role)
 async function load(){
  const token=++request.current;setStatus('loading')
  try{
   const {data,error:e}=await supabase.from('garage_equipment_inventory').select('equipment_key,equipment_label,available,inventory_kind,group_key,weight_kg,notes,updated_at').order('equipment_label').limit(1000)
   if(e)throw e
   if(token===request.current){setRows(data||[]);setStatus('ready')}
  }catch{if(token===request.current)setStatus('unavailable')}
 }
 useEffect(()=>{load();return()=>{request.current++}},[])
 const detailed=rows.filter(r=>r.inventory_kind==='item')
 const missing=missingInitialInventory(rows)
 const visible=detailed.filter(r=>(!group||r.group_key===group)&&(!search.trim()||[r.equipment_label,r.group_key,r.notes,r.weight_kg].some(v=>String(v??'').toLowerCase().includes(search.trim().toLowerCase()))))
 async function write(action){
  if(lock.current||!canEdit||status!=='ready')return
  lock.current=true;setBusy(true);setError('');setMessage('')
  try{
   const {data:{user},error:e}=await supabase.auth.getUser()
   if(e||user?.id!==profile.id)throw Error('Logg inn på nytt.')
   await action(user.id);await load()
  }catch(e){setError(e.message||'Kunne ikkje lagra utstyret.')}
  finally{lock.current=false;setBusy(false)}
 }
 const start=row=>{setEditing(row||null);setDraft(row?{equipment_label:row.equipment_label,group_key:row.group_key,available:row.available??'',weight_kg:row.weight_kg??'',notes:row.notes||''}:blank());setError('');setImporting(false)}
 const save=e=>{e.preventDefault();write(async actor=>{
  const payload={...inventoryDraft(draft),updated_by:actor,updated_at:new Date().toISOString()}
  let query
  if(editing){query=supabase.from('garage_equipment_inventory').update(payload).eq('equipment_key',editing.equipment_key).eq('updated_at',editing.updated_at).select('equipment_key').maybeSingle()}
  else{query=supabase.from('garage_equipment_inventory').insert({...payload,equipment_key:'item:'+crypto.randomUUID()}).select('equipment_key').single()}
  const {data,error:e}=await query;if(e||!data?.equipment_key)throw e||Error('Lagringa vart ikkje stadfesta. Oppdater lista.')
  setDraft(null);setEditing(null);setMessage('Utstyr lagra.')
 })}
 const importInitial=()=>write(async actor=>{
  const payload=missing.map(row=>({...row,updated_by:actor}))
  if(!payload.length){setImporting(false);return}
  const {error:e}=await supabase.from('garage_equipment_inventory').upsert(payload,{onConflict:'equipment_key',ignoreDuplicates:true})
  if(e)throw e
  setImporting(false);setMessage('Startlista er importert. Eksisterande oppføringar er ikkje overskrivne.')
 })
 return <section className="engine-section gg-inventory" aria-label="Utstyrsinventar">
  <header className="gg-inventory-head"><div><span className="section-kicker">GARASJEN · INVENTAR</span><h3>Utstyr</h3><small>{status==='ready'?detailed.length+' utstyrslinjer':'Felles utstyrsliste'} · mengd per variant</small></div>{canEdit&&status==='ready'&&<button type="button" className="primary-button" disabled={busy} onClick={()=>start(null)}>+ Legg til utstyr</button>}</header>
  {status==='loading'&&<p>Hentar inventar …</p>}
  {status==='unavailable'&&<div role="alert"><p>Felles inventar er ikkje tilgjengeleg enno. Ingen data er endra.</p><button type="button" onClick={load}>Prøv igjen</button></div>}
  {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {status==='ready'&&<>
   <Lastmeister rows={detailed}/>
   {canEdit&&missing.length>0&&!draft&&<div className="gg-inventory-import"><strong>Startinventar GG49</strong><small>{missing.length} av {INITIAL_INVENTORY.length} oppføringar manglar. Eksisterande utstyr blir ikkje overskrive.</small>{importing?<><p>Legg inn dei manglande oppføringane?</p><button type="button" disabled={busy} onClick={importInitial}>Stadfest import</button><button type="button" disabled={busy} onClick={()=>setImporting(false)}>Avbryt</button></>:<button type="button" className="secondary-button" onClick={()=>setImporting(true)}>Importer startlista</button>}</div>}
   {draft&&<form className="gg-inventory-form" onSubmit={save}><h4>{editing?'Endra utstyr':'Nytt utstyr'}</h4><label>Namn<input required maxLength={160} value={draft.equipment_label} onChange={e=>setDraft({...draft,equipment_label:e.target.value})}/></label><label>Utstyrstype<select value={draft.group_key} onChange={e=>setDraft({...draft,group_key:e.target.value})}>{INVENTORY_GROUPS.map(g=><option key={g}>{g}</option>)}</select></label><div className="gg-inventory-fields"><label>Tal (blank = ukjend)<input type="number" min="0" max="999" step="1" inputMode="numeric" value={draft.available} onChange={e=>setDraft({...draft,available:e.target.value})}/></label><label>Vekt per eining, kg<input inputMode="decimal" value={draft.weight_kg} onChange={e=>setDraft({...draft,weight_kg:e.target.value})}/></label></div><label>Merknad / avgrensing<textarea maxLength={1000} rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><small>Set tal til 0 når utstyret ikkje er tilgjengeleg. Historiske WOD-ar blir ikkje endra.</small><div className="gg-inventory-fields"><button type="submit" className="primary-button" disabled={busy}>Lagre utstyr</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>{setDraft(null);setEditing(null)}}>Avbryt</button></div></form>}
   <div className="gg-inventory-fields"><label>Søk<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Namn, vekt eller merknad"/></label><label>Utstyrstype<select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Alle typar</option>{INVENTORY_GROUPS.map(g=><option key={g}>{g}</option>)}</select></label></div>
   <div className="gg-inventory-list">{visible.map(row=><article key={row.equipment_key}><div><strong>{row.equipment_label}{row.weight_kg!=null?' · '+Number(row.weight_kg).toLocaleString('nn-NO')+' kg':''}</strong><small>{row.group_key}</small>{row.notes&&<p>{row.notes}</p>}</div><div><b>{row.available==null?'?':row.available+' stk'}</b>{canEdit&&<button type="button" className="text-button" disabled={busy} onClick={()=>start(row)}>Endra</button>}</div></article>)}</div>
   {!visible.length&&<p>Ingen utstyrslinjer i dette utvalet.</p>}
   <small>Generell kapasitet er ikkje ei utstyrsreservasjon. Kontroller vekter, variantar, deling og avgrensingar før bruk.</small>
  </>}
 </section>
}
