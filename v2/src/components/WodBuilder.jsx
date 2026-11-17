import {useEffect,useMemo,useState} from 'react'
import {Plus,Search,Video,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles,Dices,Info,Copy,Footprints} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const categories=['Alle','Styrke','Mobilitet','Kondisjon','Kjerne','Rehab / fysio']
const areas=['Alle område','Fullkropp','Bein','Mage','Rygg','Overkropp','Hofte','Skulder','Kne']
const formats=['AMRAP','EMOM','For Time','Chipper','Couplet','Triplet','Ladder','Tabata','Intervall','Death By','Strength','Row Intervals','Eigen økt']
const names=['Stål i underbuksa','Panser på leggane','Rammstein på romaskina','Schmerz und Svette','Betongbein Deluxe','Der Muskelhammer','Keine Gnade, berre knebøy','Brutal Frühstück','Biceps aus Stahl','Du Hast Burpees','Full Metall Fitness','Übermensch på overtid','Kettlebell mit Gefühl','Siste mann i garasjen']
const shuffle=items=>[...items].sort(()=>Math.random()-.5)
const blankItem=ex=>({key:crypto.randomUUID(),...ex,sets:'3',reps:ex.equipment==='Romaskin'?'500':'10',loadMode:'none',loadKg:'',percent1rm:'70',rir:'2',rpe:'8',restSeconds:'90',tempo:'',meters:ex.equipment==='Romaskin'?'500':'',calories:'',workSeconds:'',distanceUnit:'m',coachNote:''})
const fmtLoad=x=>x.loadMode==='kg'&&x.loadKg?x.loadKg+' kg':x.loadMode==='percent'&&x.percent1rm?x.percent1rm+' % 1RM':x.loadMode==='rir'?'RIR '+x.rir:x.loadMode==='rpe'?'RPE '+x.rpe:x.loadMode==='bodyweight'?'Kroppsvekt / assistanse':'Eigen belastning'

export default function WodBuilder(){
 const [exercises,setExercises]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('Alle'),[area,setArea]=useState('Alle område')
 const [selected,setSelected]=useState([]),[name,setName]=useState(()=>names[Math.floor(Math.random()*names.length)]),[format,setFormat]=useState('AMRAP')
 const [minutes,setMinutes]=useState('20'),[notes,setNotes]=useState(''),[stimulus,setStimulus]=useState('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
 const [rounds,setRounds]=useState('5'),[workSeconds,setWorkSeconds]=useState('60'),[restSeconds,setRestSeconds]=useState('0'),[timeCap,setTimeCap]=useState('20')
 const [ladderStart,setLadderStart]=useState('2'),[ladderStep,setLadderStep]=useState('2'),[ladderDirection,setLadderDirection]=useState('up')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [rowMeters,setRowMeters]=useState('500'),[rowRounds,setRowRounds]=useState('5'),[rowRest,setRowRest]=useState('90')
 const [prescription,setPrescription]=useState('rx')

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
  const tags=(x.body_area||'').toLowerCase(),needle=area==='Mage'?'kjerne':area.toLowerCase()
  return matchesCategory&&matchesSearch&&(area==='Alle område'||tags.includes(needle))
 }),[exercises,category,area,search])
 const isStrength=['Strength'].includes(format)
 const isInterval=['Intervall','Tabata','Row Intervals'].includes(format)
 const isEmom=format==='EMOM'
 const isLadder=format==='Ladder'||format==='Death By'
 function add(ex){setSelected(rows=>[...rows,blankItem(ex)])}
 function updateItem(key,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,...patch}:x))}
 function move(i,dir){setSelected(rows=>{const next=[...rows],j=i+dir;if(j<0||j>=next.length)return rows;[next[i],next[j]]=[next[j],next[i]];return next})}
 function randomWod(){
  const pool=exercises.filter(x=>!x.is_rehab&&x.category!=='Rehab / fysio')
  if(!pool.length)return
  const chosen=shuffle(pool).slice(0,3+Math.floor(Math.random()*4))
  setSelected(chosen.map(blankItem));setFormat(['AMRAP','EMOM','For Time','Chipper','Intervall'][Math.floor(Math.random()*5)])
  setMinutes(String([10,12,15,18,20][Math.floor(Math.random()*5)]));setTimeCap('20')
  setName(names[Math.floor(Math.random()*names.length)]);setNotes('');setStimulus('Jamn intensitet · god teknikk · hald att litt kapasitet')
  setNotice('Ny WOD er generert. Gå gjennom belastning, reps og stimulus før du publiserer.');setError('')
 }
 function generateRowWod(){
  const row=exercises.find(x=>x.equipment==='Romaskin')
  if(!row){setError('Romaskinøvinga manglar i biblioteket.');return}
  setSelected([blankItem(row)]);setFormat('Row Intervals');setMinutes(String(Number(rowRounds)*3));setRounds(rowRounds)
  setName(names[Math.floor(Math.random()*names.length)]+' · Ro')
  setNotice('Ro-intervall er lagt i byggjaren. Du kan kombinera med andre øvingar.');setError('')
 }
 function buildPrescription(x,i){
  const load=fmtLoad(x),base=x.name+' – '+(x.sets||'1')+' sett × '+(x.reps||'valfri reps')
  const row=x.equipment==='Romaskin'
  return base+(row?' · '+(x.meters?x.meters+' m':x.calories?x.calories+' kcal':x.workSeconds?x.workSeconds+' sek':'valfri distanse'):'')+(x.loadMode!=='none'?' · '+load:'')+(x.rir?' · RIR '+x.rir:'')+(x.restSeconds?' · pause '+x.restSeconds+' sek':'')+(x.tempo?' · tempo '+x.tempo:'')+(x.coachNote?' · '+x.coachNote:'')
 }
 async function save(event){
  event.preventDefault();setError('');setNotice('')
  if(!selected.length){setError('Legg minst ei øving til WOD-en.');return}
  if(!name.trim()){setError('Gi WOD-en eit namn.');return}
  if(selected.some(x=>!x.reps&&!x.meters&&!x.calories&&!x.workSeconds)){setError('Alle øvingar må ha reps, distanse, kalorier eller arbeidstid.');return}
  setBusy(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const movementLines=selected.map((x,i)=>buildPrescription(x,i))
   const movements=movementLines.join('\n')
   const workoutSchema={version:2,format,minutes:Number(minutes)||null,time_cap:Number(timeCap)||null,rounds:Number(rounds)||null,work_seconds:Number(workSeconds)||null,rest_seconds:Number(restSeconds)||null,ladder:{start:Number(ladderStart),step:Number(ladderStep),direction:ladderDirection},stimulus,prescription,items:selected.map((x,i)=>({sort_order:i+1,exercise_id:x.id||null,exercise_name:x.name,category:x.category,body_area:x.body_area,equipment:x.equipment,sets:Number(x.sets)||1,reps:x.reps,load_mode:x.loadMode,load_kg:x.loadKg?Number(x.loadKg):null,percent_1rm:x.percent1rm?Number(x.percent1rm):null,rir:x.rir?Number(x.rir):null,rpe:x.rpe?Number(x.rpe):null,rest_seconds:Number(x.restSeconds)||0,tempo:x.tempo,meters:x.meters?Number(x.meters):null,calories:x.calories?Number(x.calories):null,work_seconds:x.workSeconds?Number(x.workSeconds):null,coach_note:x.coachNote}))}
   const timer_settings={work_seconds:Number(workSeconds)||60,rest_seconds:Number(restSeconds)||0,rounds:Number(rounds)||5,workout_schema:workoutSchema}
   const {error:e}=await supabase.from('wods').insert({name:name.trim(),format,duration_minutes:Number(minutes)||null,movements,notes:[stimulus,notes].filter(Boolean).join('\n\n'),is_published:true,created_by:user.id,timer_settings})
   if(e)throw e
   setNotice('WOD publisert med full programmering og belastningsdata.')
   setSelected([]);setNotes('');setName(names[Math.floor(Math.random()*names.length)])
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
 return <div className="wod-builder">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PROGRAMMERINGSVERKSTAD</div><h3>WOD-studio PRO</h3><p>Bygg presise økter med format, dosering, belastning og treningsstimulus.</p></div><span className="count-pill"><WandSparkles size={14}/> PRO</span></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  <div className="wod-studio-tools"><button type="button" className="primary-button" onClick={randomWod}><Dices size={17}/> Generer tilfeldig WOD</button><button type="button" className="secondary-button" onClick={generateRowWod}><Footprints size={16}/> Ro-intervall</button><button type="button" className="secondary-button" onClick={()=>{setSelected([]);setNotes('');setName(names[Math.floor(Math.random()*names.length)])}}><Copy size={15}/> Ny blank økt</button></div>
  <div className="wod-builder-layout">
   <section className="engine-section wod-library"><div className="engine-section-title"><h4>Øvingsbibliotek</h4><span>{filtered.length} av {exercises.length}</span></div>
    <div className="wod-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk øving, kroppsdel eller utstyr …"/></div>
    <div className="wod-category-filter">{categories.map(x=><button type="button" key={x} className={category===x?'selected':''} onClick={()=>setCategory(x)}>{x}</button>)}</div>
    <div className="wod-area-filter"><span>KROPPSOMRÅDE</span>{areas.map(x=><button type="button" key={x} className={area===x?'selected':''} onClick={()=>setArea(x)}>{x}</button>)}</div>
    {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar øvingar …</div>:filtered.length?<div className="wod-exercise-grid">{filtered.map(ex=><article className="wod-exercise-card" key={ex.id}><div className="wod-exercise-info"><strong>{ex.name}</strong>{ex.video_url?<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå video</a>:<small className="no-video">Video kjem</small>}<small>{ex.category} · {ex.body_area||'Fullkropp'}{ex.equipment?' · '+ex.equipment:''}</small>{ex.description&&<p>{ex.description}</p>}{ex.is_rehab&&<em><Info size={12}/> Etter råd frå fysioterapeut</em>}</div><button className="wod-add-button" type="button" onClick={()=>add(ex)}><Plus size={16}/> Legg til</button></article>)}</div>:<div className="empty-state">Ingen øvingar treff søket.</div>}
   </section>
   <aside className="engine-section wod-composer">
    <div className="engine-section-title"><h4>Programmer økta</h4><span>{selected.length} øvingar</span></div>
    <form className="admin-create-form" onSubmit={save}>
     <label>WOD-namn<input value={name} onChange={e=>setName(e.target.value)} required/></label>
     <div className="engine-fields"><label>Format<select value={format} onChange={e=>setFormat(e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</select></label><label>Varigheit (min)<input type="number" min="1" max="300" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></div>
     {isEmom&&<div className="wod-advanced-fields"><label>EMOM-varigheit (min)<input type="number" min="1" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label>Arbeid per minutt (sek.)<input type="number" min="1" max="60" value={workSeconds} onChange={e=>setWorkSeconds(e.target.value)}/></label></div>}
     {isInterval&&<div className="wod-advanced-fields"><label>Arbeid (sek.)<input type="number" min="1" value={workSeconds} onChange={e=>setWorkSeconds(e.target.value)}/></label><label>Pause (sek.)<input type="number" min="0" value={restSeconds} onChange={e=>setRestSeconds(e.target.value)}/></label><label>Tal drag/rundar<input type="number" min="1" value={rounds} onChange={e=>setRounds(e.target.value)}/></label></div>}
     {isLadder&&<div className="wod-advanced-fields"><label>Startreps<input type="number" min="1" value={ladderStart} onChange={e=>setLadderStart(e.target.value)}/></label><label>Endring per runde<input type="number" min="1" value={ladderStep} onChange={e=>setLadderStep(e.target.value)}/></label><label>Retning<select value={ladderDirection} onChange={e=>setLadderDirection(e.target.value)}><option value="up">Aukande</option><option value="down">Minkande</option></select></label></div>}
     {['AMRAP','For Time','Chipper','Couplet','Triplet'].includes(format)&&<div className="wod-advanced-fields"><label>{format==='AMRAP'?'Tidsgrense (min)':'Maks tid (min)'}<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label><label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(e.target.value)}/></label></div>}
     <div className="wod-selected-list">{selected.length?selected.map((ex,i)=><article key={ex.key}><span className="wod-order">{i+1}</span><div className="wod-selected-info"><strong>{ex.name}</strong><small>{ex.category} · {ex.body_area||'Fullkropp'}</small>{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Video</a>}
      <div className="wod-dose-grid"><label>Sett<input type="number" min="1" value={ex.sets} onChange={e=>updateItem(ex.key,{sets:e.target.value})}/></label><label>Reps / mål<input value={ex.reps} onChange={e=>updateItem(ex.key,{reps:e.target.value})}/></label><label>Belastning<select value={ex.loadMode} onChange={e=>updateItem(ex.key,{loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Fast kg</option><option value="percent">% 1RM</option><option value="rir">RIR</option><option value="rpe">RPE</option><option value="bodyweight">Kroppsvekt / assistanse</option></select></label>
       {ex.loadMode==='kg'&&<label>Kg<input type="number" min="0" step="0.5" value={ex.loadKg} onChange={e=>updateItem(ex.key,{loadKg:e.target.value})}/></label>}
       {ex.loadMode==='percent'&&<label>% av 1RM<input type="number" min="1" max="100" value={ex.percent1rm} onChange={e=>updateItem(ex.key,{percent1rm:e.target.value})}/></label>}
       {ex.loadMode==='rir'&&<label>Reps i reserve<input type="number" min="0" max="10" value={ex.rir} onChange={e=>updateItem(ex.key,{rir:e.target.value})}/></label>}
       {ex.loadMode==='rpe'&&<label>RPE (1–10)<input type="number" min="1" max="10" step="0.5" value={ex.rpe} onChange={e=>updateItem(ex.key,{rpe:e.target.value})}/></label>}
       <label>Pause (sek.)<input type="number" min="0" value={ex.restSeconds} onChange={e=>updateItem(ex.key,{restSeconds:e.target.value})}/></label>
       <label>Tempo<input value={ex.tempo} onChange={e=>updateItem(ex.key,{tempo:e.target.value})} placeholder="t.d. 3-1-1"/></label>
       {ex.equipment==='Romaskin'&&<><label>Meter<input type="number" min="1" value={ex.meters} onChange={e=>updateItem(ex.key,{meters:e.target.value})}/></label><label>Kalorier<input type="number" min="1" value={ex.calories} onChange={e=>updateItem(ex.key,{calories:e.target.value})}/></label><label>Arbeidstid (sek.)<input type="number" min="1" value={ex.workSeconds} onChange={e=>updateItem(ex.key,{workSeconds:e.target.value})}/></label></>}
      </div><label className="wod-coach-note">Instruksjon for øving<input value={ex.coachNote} onChange={e=>updateItem(ex.key,{coachNote:e.target.value})} placeholder="Teknikk, skalering, mål …"/></label><small className="wod-load-summary">{ex.sets} × {ex.reps} · {fmtLoad(ex)} · pause {ex.restSeconds}s</small>
     </div><div className="wod-selected-actions"><button type="button" title="Flytt opp" disabled={!i} onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" title="Flytt ned" disabled={i===selected.length-1} onClick={()=>move(i,1)}><ArrowDown size={14}/></button><button type="button" title="Fjern" onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={14}/></button></div></article>):<div className="empty-state">Legg til øvingar frå biblioteket.</div>}</div>
     <div className="wod-programming-note"><label>Planlagd treningsstimulus<textarea rows="2" value={stimulus} onChange={e=>setStimulus(e.target.value)}/></label><small>Skal økta vera tung og kontrollert, jamn kondisjon eller høg intensitet med korte pausar?</small></div>
     <label>Coach-notat / skalering<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="RX, skalering, tekniske krav, oppvarming …"/></label>
     <button className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':'Publiser WOD'}</button>
    </form>
   </aside>
  </div>
 </div>
}
