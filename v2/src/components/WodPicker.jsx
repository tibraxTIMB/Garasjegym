import {useEffect,useMemo,useState} from 'react'
import {Check,Search,Layers} from 'lucide-react'
import './wod-picker-repair.css'

const categoryLabel=value=>({warmup:'Oppvarming',daily:'Dagens WOD',standard:'Standard-WOD',benchmark:'Benchmark',assessment:'Test og evaluering',rehab:'Rehabilitering',recovery:'Restitusjon',other:'Anna / spesialøkt'}[value]||value||'Standard-WOD')

export default function WodPicker({wods=[],selectedIds=[],onChange,onCancel,multiple=true,title='Vel WOD frå biblioteket',hint='Søk, filtrer og vel øktene som skal brukast.',compact=false,usage=null}){
 const [query,setQuery]=useState('')
 const [format,setFormat]=useState('all')
 const [visibility,setVisibility]=useState('all')
 const [category,setCategory]=useState('all')
 const [filtersOpen,setFiltersOpen]=useState(false)
 const [draftIds,setDraftIds]=useState(selectedIds)
 const selectedKey=selectedIds.join('|')
 useEffect(()=>setDraftIds(selectedIds),[selectedKey])
 const rows=useMemo(()=>wods.filter(w=>{
  const text=[w.name,w.format,w.movements,w.notes,w.category].filter(Boolean).join(' ').toLowerCase()
  const kind=w.timer_settings?.workout_schema?.library_category||(w.category==='warmup'?'warmup':'standard')
  return !w.is_archived&&text.includes(query.trim().toLowerCase())&&(format==='all'||w.format===format)&&(visibility==='all'||(visibility==='published'?w.is_published:!w.is_published))&&(category==='all'||kind===category)
 }),[wods,query,format,visibility,category])
 const formats=useMemo(()=>[...new Set(wods.filter(w=>!w.is_archived).map(w=>w.format).filter(Boolean))].sort(),[wods])
 const categories=useMemo(()=>{const base=['warmup','daily','standard','benchmark','assessment','rehab','recovery','other'];return [...base,...new Set(wods.filter(w=>!w.is_archived).map(w=>w.timer_settings?.workout_schema?.library_category||(w.category==='warmup'?'warmup':'standard')).filter(v=>!base.includes(v)))]},[wods])
 function toggle(id){
  if(multiple)setDraftIds(draftIds.includes(id)?draftIds.filter(x=>x!==id):[...draftIds,id])
  else setDraftIds(draftIds[0]===id?[]:[id])
 }
 function cancelSelection(){setDraftIds(selectedIds);onCancel?.()}
 async function confirmSelection(){await onChange?.(draftIds)}
 return <section className={compact?'wod-picker compact':'wod-picker'}>
  <div className="wod-picker-heading"><div><strong>{title}</strong><small>{hint}</small></div><span className="count-pill">{draftIds.length} valde</span></div>
  <div className="wod-picker-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Søk på namn, øving, format eller innhald …"/></div>
  <button type="button" className="gg-picker-filter-toggle" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)}>Filter{format!=='all'||visibility!=='all'||category!=='all'?' · aktivt':''} {filtersOpen?'−':'+'}</button>{filtersOpen&&<div className="wod-picker-filters">
   <select value={format} onChange={e=>setFormat(e.target.value)} aria-label="Filtrer på WOD-format"><option value="all">Alle format</option>{formats.map(x=><option key={x} value={x}>{x}</option>)}</select>
   <select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filtrer på WOD-type"><option value="all">Alle kategoriar</option>{categories.map(value=><option key={value} value={value}>{categoryLabel(value)}</option>)}</select>
   <select value={visibility} onChange={e=>setVisibility(e.target.value)} aria-label="Filtrer publisering"><option value="all">Publiserte og private</option><option value="published">Publiserte</option><option value="private">Private PT-WOD-ar</option></select>
  </div>}
  <div className="wod-picker-results">
   {rows.length?rows.map(w=>{
    const active=draftIds.includes(w.id)
    const count=(w.timer_settings?.workout_schema?.items||[]).length||w.movements?.split('\\n').filter(Boolean).length||0
    return <button type="button" key={w.id} className={active?'wod-picker-option selected':'wod-picker-option'} onClick={()=>toggle(w.id)} aria-pressed={active}>
     <span className="wod-picker-check">{active?<Check size={15}/>:null}</span>
     <span className="wod-picker-option-main"><b>{w.name}</b><small>{w.format||'Eigen økt'} · {w.duration_minutes||'–'} min · {count} øvingar</small>{usage?.[w.id]&&<small>{usage[w.id].planned} i plan · {usage[w.id].assigned} tildelte · {usage[w.id].completed} utførte</small>}{!compact&&w.timer_settings?.workout_schema?.stimulus&&<small>{w.timer_settings.workout_schema.stimulus}</small>}</span>
     <span className={w.is_published?'wod-picker-status published':'wod-picker-status'}>{w.is_published?'Publisert':'Privat'}</span>
    </button>
   }):<div className="wod-picker-empty">Ingen WOD-ar treff søket. Prøv eit anna søk eller opprett ein ny WOD i WOD-biblioteket.</div>}
  </div>
  {draftIds.length>0&&<div className="wod-picker-selected"><Layers size={14}/>{draftIds.map(id=>wods.find(w=>w.id===id)?.name).filter(Boolean).join(' → ')}<button type="button" onClick={()=>setDraftIds([])}>Tøm val</button></div>}<div className="wod-picker-actions"><button type="button" className="secondary-button" onClick={cancelSelection}>Avbryt</button><button type="button" className="primary-button" onClick={confirmSelection}>Bruk val ({draftIds.length})</button></div>
 </section>
}
