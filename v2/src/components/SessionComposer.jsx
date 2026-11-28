import {useState} from 'react'
import {ArrowLeft,ArrowUp,ArrowDown,Flame,List,Plus,Play,Search,X,Check} from 'lucide-react'
import {sessionWarmup,sessionWodSeconds,moveSessionWod,buildTrainingSession} from '../lib/sessionComposer.js'
import './session-composer.css'
const minutes=s=>s>0?Math.ceil(s/60)+' min':'Open tid'
export default function SessionComposer({wods=[],onStart,onCancel}){
 const [ids,setIds]=useState([]),[category,setCategory]=useState('all'),[query,setQuery]=useState(''),[error,setError]=useState('')
 const selected=ids.map(id=>wods.find(w=>w.id===id)).filter(Boolean)
 const rows=wods.filter(w=>!w.is_archived&&(category==='all'||(category==='warmup'?sessionWarmup(w):!sessionWarmup(w)))&&[w.name,w.format,w.movements].some(v=>String(v||'').toLowerCase().includes(query.trim().toLowerCase())))
 function toggle(w){setError('');setIds(old=>old.includes(w.id)?old.filter(id=>id!==w.id):[...old,w.id])}
 function start(){try{if(selected.length!==ids.length)throw Error('Ein vald WOD er ikkje lenger tilgjengeleg.');onStart(buildTrainingSession(selected))}catch(e){setError(e.message||'Kunne ikkje klargjera økta.')}}
 return <section className="gg-session-composer" aria-label="Set saman økt">
  <header><button type="button" aria-label="Tilbake til ØKT" onClick={onCancel}><ArrowLeft size={20}/></button><div><h3>Set saman økta</h3><small>Vel WOD-ar. Køyr dei i rekkjefølgje.</small></div></header>
  <div className="gg-session-selected" aria-label="Rekkjefølgje i økta">
   <strong>Mi økt <small>{ids.length} WOD-ar</small></strong>
   {selected.length===0?<p>Trykk + ved ein WOD for å leggja han til.</p>:selected.map((w,i)=><div className="gg-session-selected-row" key={w.id}>
    <b>{i+1}</b><div><strong>{w.name}</strong><small>{sessionWarmup(w)?'Oppvarming':w.format} · {minutes(sessionWodSeconds(w))}</small></div>
    <button type="button" disabled={i===0} onClick={()=>setIds(old=>moveSessionWod(old,i,-1))} aria-label={'Flytt '+w.name+' opp'}><ArrowUp size={18}/></button>
    <button type="button" disabled={i===selected.length-1} onClick={()=>setIds(old=>moveSessionWod(old,i,1))} aria-label={'Flytt '+w.name+' ned'}><ArrowDown size={18}/></button>
    <button type="button" onClick={()=>toggle(w)} aria-label={'Fjern '+w.name}><X size={18}/></button>
   </div>)}
  </div>
  <div className="gg-session-filters" role="group" aria-label="WOD-kategori">
   {[['all','Alle'],['warmup','Oppvarming'],['main','Hovud-WOD']].map(([key,label])=><button type="button" key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{key==='warmup'&&<Flame size={15}/>} {label}</button>)}
  </div>
  <label className="gg-session-search"><Search size={17}/><input aria-label="Søk etter WOD" placeholder="Søk etter WOD" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <div className="gg-session-wods" aria-label="Tilgjengelege WOD-ar">
   {rows.length?rows.map(w=><button type="button" className="gg-session-wod" key={w.id} aria-pressed={ids.includes(w.id)} aria-label={(ids.includes(w.id)?'Fjern ':'Legg til ')+w.name} onClick={()=>toggle(w)}>
    {sessionWarmup(w)?<Flame size={18}/>:<List size={18}/>}<span><strong>{w.name}</strong><small>{sessionWarmup(w)?'Oppvarming':w.format} · {minutes(sessionWodSeconds(w))}</small></span>{ids.includes(w.id)?<Check size={20}/>:<Plus size={20}/>}
   </button>):<p>Ingen WOD-ar i dette utvalet.</p>}
  </div>
  {error&&<p role="alert" className="auth-error">{error}</p>}
  <footer><span>{selected.length} WOD-ar{selected.some(w=>sessionWodSeconds(w)>0)?' · '+minutes(selected.reduce((n,w)=>n+sessionWodSeconds(w),0)):''}{selected.some(w=>!sessionWodSeconds(w))?' + open tid':''}</span><button type="button" className="primary-button" disabled={!ids.length} onClick={start}><Play size={19}/> Gjer klar økta</button></footer>
 </section>
}
