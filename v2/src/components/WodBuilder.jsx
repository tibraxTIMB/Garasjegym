import {useEffect,useMemo,useState} from 'react'
import {Plus,Search,Video,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles,Dices,Footprints,Clock3,Info} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const categories=['Alle','Styrke','Mobilitet','Kondisjon','Kjerne','Rehab / fysio']
const areas=['Alle område','Fullkropp','Bein','Mage','Rygg','Overkropp','Hofte','Skulder','Kne']
const shuffle=items=>[...items].sort(()=>Math.random()-.5)

export default function WodBuilder(){
 const [exercises,setExercises]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('Alle'),[area,setArea]=useState('Alle område')
 const [selected,setSelected]=useState([]),[name,setName]=useState(''),[format,setFormat]=useState('AMRAP'),[minutes,setMinutes]=useState('20'),[notes,setNotes]=useState('')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [rowMeters,setRowMeters]=useState('500'),[rowMinutes,setRowMinutes]=useState(''),[rowSeconds,setRowSeconds]=useState(''),[rowRounds,setRowRounds]=useState('5'),[rowRest,setRowRest]=useState('90')

 useEffect(()=>{load()},[])
 async function load(){
  setLoading(true)
  const {data,error:e}=await supabase.from('exercises').select('id,name,category,equipment,video_url,body_area,description,is_rehab').eq('is_active',true).order('name')
  if(e)setError(e.message);else setExercises(data||[])
  setLoading(false)
 }
 const filtered=useMemo(()=>exercises.filter(x=>{
  const matchesCategory=category==='Alle'||x.category===category
  const searchable=[x.name,x.category,x.equipment,x.body_area,x.description].filter(Boolean).join(' ').toLowerCase()
  const matchesSearch=!search||searchable.includes(search.toLowerCase())
  const tags=(x.body_area||'').toLowerCase()
  const areaNeedle=area==='Mage'?'kjerne':area.toLowerCase()
  const matchesArea=area==='Alle område'||tags.includes(areaNeedle)
  return matchesCategory&&matchesSearch&&matchesArea
 }),[exercises,category,area,search])

 function add(ex){
  setSelected(rows=>[...rows,{...ex,key:crypto.randomUUID(),sets:'3',reps:ex.equipment==='Romaskin'?'500 m':'10',meters:ex.equipment==='Romaskin'?'500':'',minutes:'',seconds:'',restSeconds:'90'}])
 }
 function addRow(){const row=exercises.find(x=>x.equipment==='Romaskin');if(row)add(row);else setError('Romaskinøvinga manglar i biblioteket.')}
 function updateItem(key,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,...patch}:x))}
 function move(i,dir){setSelected(rows=>{const next=[...rows],j=i+dir;if(j<0||j>=next.length)return rows;[next[i],next[j]]=[next[j],next[i]];return next})}
 function generateRowWod(){\n  const row=exercises.find(x=>x.equipment==='Romaskin');if(!row){setError('Romaskinøvinga manglar i biblioteket.');return}\n  const rounds=Math.max(1,Number(rowRounds)||1),distance=Math.max(1,Number(rowMeters)||500)\n  setSelected([{...row,key:crypto.randomUUID(),sets:String(rounds),reps:distance+' m · '+rowRest+' sek pause',meters:String(distance),minutes:'',seconds:''}]);setName('Ro-intervall');setFormat('Intervall');setMinutes(String(rounds*3));setNotice('Ro-intervall er lagt i WOD-byggjaren. Du kan leggja til andre øvingar frå biblioteket.');setError('')\n }\n function randomWod(){
  const pool=exercises.filter(x=>x.category!=='Rehab / fysio')
  if(!pool.length)return
  const chosen=shuffle(pool).slice(0,4+Math.floor(Math.random()*3))
  const result=chosen.map(ex=>({...ex,key:crypto.randomUUID(),sets:'3',reps:ex.equipment==='Romaskin'?'500 m':String([8,10,12,15][Math.floor(Math.random()*4)]),meters:ex.equipment==='Romaskin'?'500':'',minutes:'',seconds:''}))
  setSelected(result);setName('Tilfeldig WOD');setFormat(['AMRAP','For Time','EMOM'][Math.floor(Math.random()*3)]);setMinutes(String([12,15,20,25][Math.floor(Math.random()*4)]));setNotice('Tilfeldig WOD er generert. Du kan endra øvingar og dosering før publisering.');setError('')
 }
 async function save(event){
  event.preventDefault();setError('');setNotice('')
  if(!selected.length){setError('Legg minst ei øving til WOD-en.');return}
  if(!name.trim()){setError('Gi WOD-en eit namn.');return}
  setBusy(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const movements=selected.map(x=>{
    if(x.equipment==='Romaskin'){
     const target=x.meters?x.meters+' m':x.minutes?x.minutes+' min '+(x.seconds||0)+' sek':'valfri distanse'
     return x.name+' – '+(x.sets?x.sets+' × ':'')+target+(x.restSeconds?' · pause '+x.restSeconds+' sek':'')
    }
    return x.name+' – '+(x.sets?x.sets+' × ':'')+(x.reps||'valfritt')
   }).join('\n')
   const {error:e}=await supabase.from('wods').insert({name:name.trim(),format,duration_minutes:Number(minutes)||null,movements,notes:notes.trim(),is_published:true,created_by:user.id})
   if(e)throw e
   setNotice('WOD publisert og tilgjengeleg i treningsmodulen.')
   setName('');setSelected([]);setNotes('')
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
 return <div className="wod-builder">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · VERKSTAD</div><h3>WOD-studio</h3><p>Søk, filtrer og bygg økta med klikk.</p></div><span className="count-pill"><WandSparkles size={14}/> WOD-STUDIO</span></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  <div className="wod-studio-tools"><button type="button" className="primary-button" onClick={randomWod}><Dices size={17}/> Lag tilfeldig WOD</button><button type="button" className="secondary-button" onClick={addRow}><Footprints size={16}/> Legg til roing</button></div>
  <div className="wod-builder-layout">
   <section className="engine-section wod-library">
    <div className="engine-section-title"><h4>Øvingsbibliotek</h4><span>{filtered.length} av {exercises.length} øvingar</span></div>
    <div className="wod-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk øving, kroppsdel eller utstyr …"/></div>
    <div className="wod-category-filter">{categories.map(x=><button type="button" key={x} className={category===x?'selected':''} onClick={()=>setCategory(x)}>{x}</button>)}</div>
    <div className="wod-area-filter"><span>KROPPSOMRÅDE</span>{areas.map(x=><button type="button" key={x} className={area===x?'selected':''} onClick={()=>setArea(x)}>{x}</button>)}</div>
    {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar øvingar …</div>:filtered.length?<div className="wod-exercise-grid">{filtered.map(ex=><article className="wod-exercise-card" key={ex.id}><div className="wod-exercise-info"><strong>{ex.name}</strong>{ex.video_url?<a href={ex.video_url} target="_blank" rel="noreferrer"><Video size={12}/> Sjå video</a>:<small className="no-video">Video kjem</small>}<small>{ex.category} · {ex.body_area||'Fullkropp'}{ex.equipment?' · '+ex.equipment:''}</small>{ex.description&&<p>{ex.description}</p>}{ex.is_rehab&&<em><Info size={12}/> Bruk etter råd frå fysioterapeut</em>}</div><button className="wod-add-button" type="button" onClick={()=>add(ex)}><Plus size={16}/> Legg til</button></article>)}</div>:<div className="empty-state">Ingen øvingar treff søket. Prøv eit anna søk eller filter.</div>}
   </section>
   <aside className="engine-section wod-composer">
    <div className="engine-section-title"><h4>Bygg WOD</h4><span>{selected.length} øvingar</span></div>
    <form className="admin-create-form" onSubmit={save}>
     <label>Namn på WOD<input value={name} onChange={e=>setName(e.target.value)} required placeholder="t.d. Engine Builder"/></label>
     <div className="engine-fields wod-meta-fields"><label>Format<select value={format} onChange={e=>setFormat(e.target.value)}>{['AMRAP','EMOM','For Time','Tabata','Intervall','Styrke','Roing + styrke','Eigen økt'].map(x=><option key={x}>{x}</option>)}</select></label><label>Varigheit (min)<input type="number" min="1" max="300" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></div>
     <div className="wod-selected-list">{selected.length?selected.map((ex,i)=><article key={ex.key}><span className="wod-order">{i+1}</span><div className="wod-selected-info"><strong>{ex.name}</strong><small>{ex.category} · {ex.body_area||'Fullkropp'}</small>{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer"><Video size={12}/> Video</a>}{ex.equipment==='Romaskin'?<div className="row-prescription"><label>Meter<input type="number" min="1" value={ex.meters} onChange={e=>updateItem(ex.key,{meters:e.target.value})}/></label><span>eller</span><label>Minutt<input type="number" min="0" value={ex.minutes} onChange={e=>updateItem(ex.key,{minutes:e.target.value})}/></label><label>Sekund<input type="number" min="0" max="59" value={ex.seconds} onChange={e=>updateItem(ex.key,{seconds:e.target.value})}/></label><label>Pause (sek.)<input type="number" min="0" value={ex.restSeconds} onChange={e=>updateItem(ex.key,{restSeconds:e.target.value})}/></label></div>:<div className="wod-dose"><label>Sett<input type="number" min="1" value={ex.sets} onChange={e=>updateItem(ex.key,{sets:e.target.value})}/></label><label>Reps<input value={ex.reps} onChange={e=>updateItem(ex.key,{reps:e.target.value})}/></label></div>}</div><div className="wod-selected-actions"><button type="button" title="Flytt opp" disabled={!i} onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" title="Flytt ned" disabled={i===selected.length-1} onClick={()=>move(i,1)}><ArrowDown size={14}/></button><button type="button" title="Fjern" onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={14}/></button></div></article>):<div className="empty-state">Klikk «Legg til» på øvingane i biblioteket. Dei dukkar opp her.</div>}</div>
     <label>Instruksjon / notat<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Rundar, pausar, teknikk og annan informasjon …"/></label>
     <button className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':'Publiser WOD'}</button>
    </form>
   </aside>
  </div>
 </div>
}
