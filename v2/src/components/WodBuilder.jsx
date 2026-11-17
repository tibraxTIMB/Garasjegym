import {useEffect,useMemo,useState} from 'react'
import {Plus,Search,Video,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function WodBuilder(){
 const [exercises,setExercises]=useState([])
 const [search,setSearch]=useState('')
 const [category,setCategory]=useState('Alle')
 const [selected,setSelected]=useState([])
 const [name,setName]=useState('')
 const [format,setFormat]=useState('AMRAP')
 const [minutes,setMinutes]=useState('20')
 const [notes,setNotes]=useState('')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const categories=['Alle',...new Set(exercises.map(x=>x.category).filter(Boolean))]
 const filtered=useMemo(()=>exercises.filter(x=>(category==='Alle'||x.category===category)&&(!search||[x.name,x.category,x.equipment].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()))),[exercises,category,search])
 useEffect(()=>{load()},[])
 async function load(){
  setLoading(true)
  const {data,error:e}=await supabase.from('exercises').select('id,name,category,equipment,video_url').eq('is_active',true).order('name')
  if(e)setError(e.message);else setExercises(data||[])
  setLoading(false)
 }
 function add(ex){setSelected(rows=>[...rows,{...ex,key:crypto.randomUUID()}])}
 function move(i,dir){setSelected(rows=>{const next=[...rows],j=i+dir;if(j<0||j>=next.length)return rows;[next[i],next[j]]=[next[j],next[i]];return next})}
 async function save(event){
  event.preventDefault();setError('');setNotice('')
  if(!selected.length){setError('Legg minst ei øving til WOD-en.');return}
  setBusy(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const {error:e}=await supabase.from('wods').insert({name:name.trim(),format,duration_minutes:Number(minutes)||null,movements:selected.map(x=>x.name).join('\\n'),notes:notes.trim(),is_published:true,created_by:user.id})
   if(e)throw e
   setNotice('WOD publisert og tilgjengeleg i treningsmodulen.')
   setName('');setSelected([]);setNotes('')
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
 return <div className="wod-builder">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · VERKSTAD</div><h3>WOD-generator</h3><p>Finn øvingar, bygg økta og publiser.</p></div><span className="count-pill"><WandSparkles size={14}/> WOD-STUDIO</span></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  <div className="wod-builder-layout">
   <section className="engine-section wod-library"><div className="engine-section-title"><h4>Øvingsbibliotek</h4><span>{filtered.length} øvingar</span></div>
    <div className="wod-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk øving, kategori eller utstyr …"/></div>
    <div className="wod-category-filter">{categories.map(x=><button type="button" key={x} className={category===x?'selected':''} onClick={()=>setCategory(x)}>{x}</button>)}</div>
    {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar øvingar …</div>:<div className="wod-exercise-grid">{filtered.map(ex=><article className="wod-exercise-card" key={ex.id}><div><strong>{ex.name}</strong><small>{ex.category||'Øving'}{ex.equipment?' · '+ex.equipment:''}</small></div><div className="wod-exercise-actions">{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer" title="Sjå øvingsvideo"><Video size={16}/></a>}<button type="button" onClick={()=>add(ex)}><Plus size={16}/> Legg til</button></div></article>)}</div>}
   </section>
   <aside className="engine-section wod-composer"><div className="engine-section-title"><h4>Bygg WOD</h4><span>{selected.length} øvingar</span></div>
    <form className="admin-create-form" onSubmit={save}>
     <label>Namn på WOD<input value={name} onChange={e=>setName(e.target.value)} required placeholder="t.d. Engine Builder"/></label>
     <div className="engine-fields"><label>Format<select value={format} onChange={e=>setFormat(e.target.value)}>{['AMRAP','EMOM','For Time','Tabata','Intervall','Styrke','Eigen økt'].map(x=><option key={x}>{x}</option>)}</select></label><label>Varigheit (min)<input type="number" min="1" max="300" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></div>
     <div className="wod-selected-list">{selected.length?selected.map((ex,i)=><article key={ex.key}><span className="wod-order">{i+1}</span><div><strong>{ex.name}</strong><small>{ex.category}</small>{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer"><Video size={12}/> Video</a>}</div><div className="wod-selected-actions"><button type="button" title="Flytt opp" disabled={!i} onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" title="Flytt ned" disabled={i===selected.length-1} onClick={()=>move(i,1)}><ArrowDown size={14}/></button><button type="button" title="Fjern" onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={14}/></button></div></article>):<div className="empty-state">Søk i biblioteket og trykk «Legg til» på øvingane du vil ha med.</div>}</div>
     <label>Instruksjon / notat<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Rundar, reps, pausar og annan informasjon …"/></label>
     <button className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':'Publiser WOD'}</button>
    </form>
   </aside>
  </div>
 </div>
}
