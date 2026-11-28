import {useMemo,useRef,useState} from 'react'
import {ArrowLeft,ArrowUp,ArrowDown,Flame,List,Plus,Play,Search,X,Check,Info} from 'lucide-react'
import {sessionWarmup,sessionWodSeconds,moveSessionWod,buildTrainingSession} from '../lib/sessionComposer.js'
import {cardParts} from '../lib/wodCard.js'
import {sessionQueueCheck} from '../lib/sessionQueueCheck.js'
import './session-composer.css'
const minutes=s=>s>0?Math.ceil(s/60)+' min':'Open tid'
export default function SessionComposer({wods=[],onStart,onCancel}){
 const [ids,setIds]=useState([]),[category,setCategory]=useState('all'),[query,setQuery]=useState(''),[error,setError]=useState('')
 const [infoId,setInfoId]=useState(null),[starting,setStarting]=useState(false)
 const startLock=useRef(false)
 const selected=useMemo(()=>ids.map(id=>wods.find(w=>w.id===id)).filter(Boolean),[ids,wods])
 const checked=useMemo(()=>sessionQueueCheck(ids,selected,buildTrainingSession),[ids,selected])
 const infoWod=selected.find(w=>w.id===infoId)
 const total=selected.reduce((n,w)=>n+sessionWodSeconds(w),0)
 const hasOpen=selected.some(w=>!sessionWodSeconds(w))
 const rows=wods.filter(w=>!w.is_archived&&(category==='all'||(category==='warmup'?sessionWarmup(w):!sessionWarmup(w)))&&[w.name,w.format,w.movements].some(v=>String(v||'').toLowerCase().includes(query.trim().toLowerCase())))
 function toggle(w){setError('');setIds(old=>old.includes(w.id)?old.filter(id=>id!==w.id):[...old,w.id])}
 async function start(){if(startLock.current||!checked.ok)return;startLock.current=true;setStarting(true);setError('');try{await onStart(checked.session)}catch(e){setError(e.message||'Kunne ikkje klargjera økta.')}finally{startLock.current=false;setStarting(false)}}
 return <section className="gg-session-composer" aria-label="Set saman økt">
  <header><button type="button" aria-label="Tilbake til ØKT" onClick={onCancel}><ArrowLeft size={20}/></button><div><small>ØKT</small><h3>Set saman økta</h3></div></header>
  <div className="gg-session-workspace"><div className="gg-session-selected" aria-label="Rekkjefølgje i økta">
   <strong>Mi økt <small>{ids.length} WOD-ar{total>0?' · '+minutes(total):''}{hasOpen?' + open tid':''}</small></strong>
   {selected.length===0?<p>Trykk + ved ein WOD for å leggja han til.</p>:selected.map((w,i)=><div className="gg-session-selected-row" key={w.id}>
    <b>{i+1}</b><div><strong>{w.name}</strong><small>{sessionWarmup(w)?'Oppvarming':w.format} · {minutes(sessionWodSeconds(w))}</small></div>
    <button type="button" aria-label={'Øvingar i '+w.name} aria-expanded={infoId===w.id} aria-controls={infoId===w.id?'gg-session-wod-info':undefined} onClick={()=>setInfoId(old=>old===w.id?null:w.id)}><Info size={17}/></button>
    <button type="button" disabled={i===0} onClick={()=>setIds(old=>moveSessionWod(old,i,-1))} aria-label={'Flytt '+w.name+' opp'}><ArrowUp size={18}/></button>
    <button type="button" disabled={i===selected.length-1} onClick={()=>setIds(old=>moveSessionWod(old,i,1))} aria-label={'Flytt '+w.name+' ned'}><ArrowDown size={18}/></button>
    <button type="button" onClick={()=>toggle(w)} aria-label={'Fjern '+w.name}><X size={18}/></button>
   </div>)}
   {infoWod&&<section id="gg-session-wod-info" className="gg-session-wod-info" aria-label={'Øvingar i '+infoWod.name}><header><strong>{infoWod.name}</strong><button type="button" aria-label="Lukk øvingsinfo" onClick={()=>setInfoId(null)}><X size={18}/></button></header>{cardParts(infoWod).map((part,i)=><div key={part.id||i}><small>{part.title||part.formatLabel}</small>{(part.items||[]).map((item,j)=><span key={j}>{item.is_rest?'Pause':item.exercise_name||item.name||'Øving'}</span>)}</div>)}<small>Øvingsinnhald frå original WOD.</small></section>}
   {ids.length>0&&!checked.ok&&<p className="gg-session-compatibility" role="alert">{checked.issue}</p>}
  </div>
  <div className="gg-session-catalogue">
  <div className="gg-session-filters" role="group" aria-label="WOD-kategori">
   {[['all','Alle'],['warmup','Oppvarming'],['main','Hovud-WOD']].map(([key,label])=><button type="button" key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{key==='warmup'&&<Flame size={15}/>} {label}</button>)}
  </div>
  <label className="gg-session-search"><Search size={17}/><input aria-label="Søk etter WOD" placeholder="Søk etter WOD" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <div className="gg-session-wods" aria-label="Tilgjengelege WOD-ar">
   {rows.length?rows.map(w=><button type="button" className="gg-session-wod" key={w.id} aria-pressed={ids.includes(w.id)} aria-label={(ids.includes(w.id)?'Fjern ':'Legg til ')+w.name} onClick={()=>toggle(w)}>
    {sessionWarmup(w)?<Flame size={18}/>:<List size={18}/>}<span><strong>{w.name}</strong><small>{sessionWarmup(w)?'Oppvarming':w.format} · {minutes(sessionWodSeconds(w))}</small></span>{ids.includes(w.id)?<Check size={20}/>:<Plus size={20}/>}
   </button>):<p>Ingen WOD-ar i dette utvalet.</p>}
  </div>
  </div></div>
  {error&&<p role="alert" className="auth-error">{error}</p>}
  <footer><span>{selected.length} WOD-ar{total>0?' · '+minutes(total):''}{hasOpen?' + open tid':''}</span><button type="button" className="primary-button" disabled={!checked.ok||starting} onClick={start}><Play size={19}/> {starting?'Klargjer …':'Gjer klar økta'}</button></footer>
 </section>
}
