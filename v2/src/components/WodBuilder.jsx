import {useEffect,useMemo,useState} from 'react'
import {Plus,Search,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles,Dices,Info,Footprints,Copy} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const categories=['Alle','Styrke','Mobilitet','Kondisjon','Kjerne','Rehab / fysio']
const areas=['Alle område','Fullkropp','Bein','Mage','Rygg','Overkropp','Hofte','Skulder','Kne']
const formats=[
 {group:'Metcon',items:['AMRAP','For Time','Chipper','Couplet','Triplet','Ladder','Death By']},
 {group:'Tidsstyrt',items:['EMOM','E2MOM','E3MOM']},
 {group:'Intervall',items:['Intervall','Tabata','Row Intervals']},
 {group:'Styrke',items:['Strength','Pyramid','Superset','Complex']},
 {group:'Anna',items:['Eigen økt']}
]
const allFormats=formats.flatMap(x=>x.items)
const nameAdjectives=['Brutale','Wilde','Geile','Scharfe','Eiserne','Explosive','Böse','Dreckige','Donnernde','Panzerstarke','Stählerne','Brachiale','Knallharte','Furchtlose','Massive','Giftige','Hungrige','Brennende','Wuchtige','Legendäre','Gnadenlose','Kraftvolle','Kompromisslose']
const nameNouns=['Panzer','Granate','Berserker','Keule','Kampfsau','Eber','Bär','Wolf','Gorilla','Mammut','Kobra','Hammer','Amboss','Donnerfaust','Stahlkoloss','Kraftpaket','Schlachtschiff','Sprengkopf','Dampfwalze','Kommandant','Knochenbrecher','Rammbock','Stahlfaust','Kampfhamster','Muskelmonster']
const nameNumbers=['1942','1939','69']
const randomWodName=()=>{
 const base=nameAdjectives[Math.floor(Math.random()*nameAdjectives.length)]+' '+nameNouns[Math.floor(Math.random()*nameNouns.length)]
 if(Math.random()>=0.22)return base
 const n=nameNumbers[Math.floor(Math.random()*nameNumbers.length)]
 return Math.random()<0.5?n+' '+base:base+' '+n
}
const shuffle=items=>[...items].sort(()=>Math.random()-.5)
const newSet=()=>({reps:'8',loadMode:'none',loadKg:'',percent1rm:'',rir:'',rpe:'',restSeconds:'120',tempo:''})
const blankItem=ex=>({key:crypto.randomUUID(),...ex,reps:ex.equipment==='Romaskin'?'':'10',rowValue:ex.equipment==='Romaskin'?'500':'',rowUnit:'m',loadMode:'none',loadKg:'',percent1rm:'',rir:'',rpe:'',meters:ex.equipment==='Romaskin'?'500':'',calories:'',workSeconds:'',restSeconds:'',tempo:'',coachNote:'',sets:[newSet()],minuteSlot:'',group:'A'})
const fmtLoad=x=>x.loadMode==='kg'&&x.loadKg?x.loadKg+' kg':x.loadMode==='percent'&&x.percent1rm?x.percent1rm+' % 1RM':x.loadMode==='rir'&&x.rir!==''?'RIR '+x.rir:x.loadMode==='rpe'&&x.rpe!==''?'RPE '+x.rpe:x.loadMode==='bodyweight'?'Kroppsvekt / assistanse':''
const strengthFormats=['Strength','Pyramid','Superset','Complex']
const strengthLike=f=>strengthFormats.includes(f)
const intervalFormats=['Intervall','Tabata','Row Intervals']
const timedFormats=['EMOM','E2MOM','E3MOM']
const timedLabel=f=>f==='E2MOM'?'kvart 2. minutt':f==='E3MOM'?'kvart 3. minutt':'kvart minutt'
const isRow=x=>x.equipment==='Romaskin'

export default function WodBuilder({assignedClientId=null,onAssigned}){
 const [exercises,setExercises]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('Alle'),[area,setArea]=useState('Alle område')
 const [selected,setSelected]=useState([]),[name,setName]=useState(()=>randomWodName()),[format,setFormat]=useState('AMRAP')
 const [minutes,setMinutes]=useState('20'),[notes,setNotes]=useState(''),[stimulus,setStimulus]=useState('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
 const [rounds,setRounds]=useState('5'),[workSeconds,setWorkSeconds]=useState('60'),[restSeconds,setRestSeconds]=useState('10'),[timeCap,setTimeCap]=useState('20')
 const [ladderStart,setLadderStart]=useState('2'),[ladderStep,setLadderStep]=useState('2'),[ladderDirection,setLadderDirection]=useState('up')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [prescription,setPrescription]=useState('rx'),[customInstructions,setCustomInstructions]=useState(''),[customUseSets,setCustomUseSets]=useState(false),[combinationMode,setCombinationMode]=useState('For Time')

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
 const showSets=strengthLike(format)||(format==='Eigen økt'&&customUseSets)
 const isInterval=intervalFormats.includes(format)
 const isTimed=timedFormats.includes(format)
 const isLadder=['Ladder','Death By'].includes(format)
 const isAmrap=format==='AMRAP'
 const isForTime=['For Time','Chipper'].includes(format)
 const isCoupletTriplet=['Couplet','Triplet'].includes(format)
 const isTabata=format==='Tabata'
 const isRowIntervals=format==='Row Intervals'
 const isCustom=format==='Eigen økt'
 function add(ex){setSelected(rows=>[...rows,blankItem(ex)])}
 function updateItem(key,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,...patch}:x))}
 function updateSet(key,index,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,sets:x.sets.map((s,i)=>i===index?{...s,...patch}:s)}:x))}
 function move(i,dir){setSelected(rows=>{const next=[...rows],j=i+dir;if(j<0||j>=next.length)return rows;[next[i],next[j]]=[next[j],next[i]];return next})}
 function addRowing(){
  const row=exercises.find(x=>x.equipment==='Romaskin')
  if(!row){setError('Romaskinøvinga manglar i biblioteket.');return}
  add(row);setNotice('Romaskin er lagt til som ei vanleg øving.');setError('')
 }
 function randomWod(){
  const pool=exercises.filter(x=>!x.is_rehab&&x.category!=='Rehab / fysio')
  if(!pool.length)return
  const chosen=shuffle(pool).slice(0,3+Math.floor(Math.random()*4))
  setSelected(chosen.map(blankItem));setFormat(['AMRAP','EMOM','For Time','Chipper','Intervall'][Math.floor(Math.random()*5)])
  setMinutes(String([10,12,15,18,20][Math.floor(Math.random()*5)]));setTimeCap('20');setRounds('5')
  setName(randomWodName());setNotes('');setStimulus('Jamn intensitet · god teknikk · hald att litt kapasitet')
  setNotice('Ny WOD er generert. Kontroller dosering og stimulus før publisering.');setError('')
 }
 function reset(){
  setSelected([]);setNotes('');setCustomInstructions('');setCustomUseSets(false);setCombinationMode('For Time');setStimulus('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
  setName(randomWodName());setError('');setNotice('Økta er forkasta. Du kan byrja på nytt.')
 }
 function buildPrescription(x){
  const load=fmtLoad(x)
  const target=isRow(x)?(x.rowValue?x.rowValue+' '+({s:'sek',min:'min',m:'m',cal:'cal'}[x.rowUnit]||'m'):'ikkje dosert'):x.reps+' reps'
  const loadText=load?' · '+load:''
  const dose=showSets?x.sets.map((s,i)=>(i+1)+': '+s.reps+' reps'+(s.loadMode==='kg'&&s.loadKg?' @ '+s.loadKg+' kg':s.loadMode==='percent'&&s.percent1rm?' @ '+s.percent1rm+'% 1RM':s.loadMode==='rir'&&s.rir!==''?' · RIR '+s.rir:s.loadMode==='rpe'&&s.rpe!==''?' · RPE '+s.rpe:'')+(s.restSeconds?' · pause '+s.restSeconds+'s':'')).join(' | '):target+loadText
  return x.name+' – '+dose+(x.tempo?' · tempo '+x.tempo:'')+(x.coachNote?' · '+x.coachNote:'')
 }
 async function save(event){
  event.preventDefault();setError('');setNotice('')
  if(!selected.length){setError('Legg minst ei øving til WOD-en.');return}
  if(format==='Couplet'&&selected.length!==2){setError('Couplet skal ha nøyaktig to øvingar.');return}
  if(format==='Triplet'&&selected.length!==3){setError('Triplet skal ha nøyaktig tre øvingar.');return}
  if(!name.trim()){setError('Gi WOD-en eit namn.');return}
  if(showSets&&selected.some(x=>!x.sets.length||x.sets.some(s=>!s.reps||Number(s.reps)<1))){setError('Alle styrkesett må ha minst éi repetisjon.');return}
  if(!showSets&&selected.some(x=>isRow(x)?(!x.rowValue||Number(x.rowValue)<=0):!x.reps)){setError('Alle øvingar må ha reps, distanse, kalorier eller arbeidstid.');return}
  if(isInterval&&(!Number(rounds)||!Number(workSeconds))){setError('Intervall krev arbeidstid og tal drag.');return}
  if(isTabata&&Number(workSeconds)+Number(restSeconds)<=0){setError('Kontroller arbeid og pause i Tabata.');return}
  setBusy(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)throw new Error('Du må vera innlogga for å publisera WOD.')
   const schema={
    version:3,format,structure:showSets?'strength':isTimed?'interval_clock':isInterval?'interval':isAmrap||isForTime||isLadder?'metcon':'custom',
    duration_minutes:Number(minutes)||null,time_cap_minutes:isAmrap||isForTime||(isCoupletTriplet&&combinationMode!=='Open')?Number(timeCap)||null:null,combination_mode:isCoupletTriplet?combinationMode:null,
    rounds:isInterval||isLadder||isForTime?Number(rounds)||null:null,
    interval:{work_seconds:isTabata?20:Number(workSeconds)||null,rest_seconds:isTabata?10:Number(restSeconds)||0,work_every_minutes:isTimed?(format==='E2MOM'?2:format==='E3MOM'?3:1):null},
    ladder:isLadder?{start:Number(ladderStart),step:Number(ladderStep),direction:ladderDirection}:null,
    stimulus,coach_notes:notes,prescription,
    superset_groups:showSets&&format==='Superset'?Array.from(new Set(selected.map(x=>x.group))):[],
    complex_order:showSets&&format==='Complex'?selected.map(x=>x.name):[],
    items:selected.map((x,i)=>({
     sort_order:i+1,exercise_id:x.id||null,exercise_name:x.name,category:x.category,body_area:x.body_area,equipment:x.equipment,
     sets:showSets?x.sets.map(s=>({reps:Number(s.reps),load_mode:s.loadMode,load_kg:s.loadKg?Number(s.loadKg):null,percent_1rm:s.percent1rm?Number(s.percent1rm):null,rir:s.rir!==''?Number(s.rir):null,rpe:s.rpe!==''?Number(s.rpe):null,rest_seconds:Number(s.restSeconds)||0,tempo:s.tempo||null})):null,
     reps:showSets?null:x.reps,load_mode:showSets?null:x.loadMode,load_kg:x.loadKg?Number(x.loadKg):null,percent_1rm:x.percent1rm?Number(x.percent1rm):null,rir:x.rir!==''?Number(x.rir):null,rpe:x.rpe!==''?Number(x.rpe):null,
     row_value:isRow(x)?Number(x.rowValue):null,row_unit:isRow(x)?x.rowUnit:null,meters:isRow(x)&&x.rowUnit==='m'?Number(x.rowValue):null,calories:isRow(x)&&x.rowUnit==='cal'?Number(x.rowValue):null,work_seconds:isRow(x)&&x.rowUnit==='s'?Number(x.rowValue):null,
     rest_seconds:showSets?null:Number(x.restSeconds)||null,tempo:x.tempo||null,coach_note:x.coachNote||null,
     minute_slot:x.minuteSlot||null,superset_group:x.group||'A'
    }))
   }
   const movements=selected.map((x,i)=>(i+1)+'. '+buildPrescription(x)).join('\n')
   const timer_settings={workout_schema:schema,work_seconds:Number(workSeconds)||null,rest_seconds:Number(restSeconds)||null,rounds:Number(rounds)||null}
   const {data:savedWod,error:e}=await supabase.from('wods').insert({name:name.trim(),format,duration_minutes:Number(minutes)||null,movements,notes:[stimulus,notes,customInstructions].filter(Boolean).join('\n\n'),is_published:true,created_by:user.id,timer_settings}).select('id').single()
   if(e)throw e
   if(assignedClientId){const {error:linkError}=await supabase.from('pt_sessions').insert({client_id:assignedClientId,title:name.trim(),starts_at:new Date().toISOString(),duration_minutes:Number(minutes)||60,capacity:1,status:'planned',created_by:user.id,wod_ids:[savedWod.id],message:'WOD oppretta direkte frå PT Studio'}) ;if(linkError)throw new Error('WOD-en vart lagra, men kunne ikkje knytast til kunden: '+linkError.message);onAssigned?.() }
   setNotice('WOD publisert med full programmering.')
   setSelected([]);setNotes('');setCustomInstructions('');setName(randomWodName())
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
 return <div className="wod-builder">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PROGRAMMERINGSVERKSTAD</div><h3>WOD-studio PRO</h3><p>Programmer styrke, metcon og intervall med formattilpassa dosering.</p></div><span className="count-pill"><WandSparkles size={14}/> PRO</span></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  <div className="wod-studio-tools"><button type="button" className="primary-button" onClick={randomWod}><Dices size={17}/> Generer tilfeldig WOD</button><button type="button" className="secondary-button" onClick={addRowing}><Footprints size={16}/> Legg til romaskin</button><button type="button" className="secondary-button" onClick={reset}><Trash2 size={15}/> Forkast økt</button></div>
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
     <div className="wod-name-field"><label>WOD-namn<input value={name} onChange={e=>setName(e.target.value)} required/></label><button type="button" className="secondary-button" onClick={()=>setName(randomWodName())}>Nytt namn</button></div>
     <label>Programmeringsnivå<select value={prescription} onChange={e=>setPrescription(e.target.value)}><option value="rx">RX · Føreskriven</option><option value="scaled">Skalert</option><option value="beginner">Nybegynnar</option><option value="custom">Individuelt tilpassa</option></select></label>
     <div className="engine-fields"><label>Format<select value={format} onChange={e=>setFormat(e.target.value)}>{formats.map(group=><optgroup key={group.group} label={group.group}>{group.items.map(x=><option key={x} value={x}>{x}</option>)}</optgroup>)}</select></label>{!isTimed&&<label>Varigheit (min)<input type="number" min="1" max="300" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}</div>
     {isTimed&&<div className="wod-advanced-fields"><label>Varigheit (min)<input type="number" min="1" max="300" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><p className="wod-help">Arbeidet startar {timedLabel(format)}. Reps-feltet på kvar øving er målet per arbeidsintervall.</p></div>}
     {isInterval&&<div className="wod-advanced-fields"><label>Arbeid (sek.)<input type="number" min="1" value={isTabata?'20':workSeconds} onChange={e=>setWorkSeconds(e.target.value)}/></label><label>Pause (sek.)<input type="number" min="0" value={isTabata?'10':restSeconds} onChange={e=>setRestSeconds(e.target.value)}/></label><label>Tal drag<input type="number" min="1" value={rounds} onChange={e=>setRounds(e.target.value)}/></label></div>}
     {isLadder&&<div className="wod-advanced-fields"><label>Startreps<input type="number" min="1" value={ladderStart} onChange={e=>setLadderStart(e.target.value)}/></label><label>Endring per runde<input type="number" min="1" value={ladderStep} onChange={e=>setLadderStep(e.target.value)}/></label><label>Retning<select value={ladderDirection} onChange={e=>setLadderDirection(e.target.value)}><option value="up">Aukande</option><option value="down">Minkande</option></select></label></div>}
     {isAmrap&&<div className="wod-advanced-fields"><label>Tidsgrense (min)<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label><p className="wod-help">Resultatet blir rundar + ekstra repetisjonar.</p></div>}
     {isForTime&&<div className="wod-advanced-fields"><label>{format==='Chipper'?'Tidsgrense (valfri, min)':'Maks tid (min)'}<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label>{format!=='Chipper'&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(e.target.value)}/></label>}</div>}
     {isCoupletTriplet&&<div className="wod-advanced-fields"><label>Tidsstruktur<select value={combinationMode} onChange={e=>setCombinationMode(e.target.value)}><option value="For Time">For Time</option><option value="AMRAP">AMRAP</option><option value="Open">Open / utan klokke</option></select></label>{combinationMode!=='Open'&&<label>Tidsgrense (min)<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label>}<p className="wod-help">Couplet krev to øvingar, Triplet krev tre. Tidsstrukturen bestemmer korleis dei skal gjennomførast.</p></div>}
     {isTabata&&<p className="wod-help">Standard Tabata er 20 sek arbeid / 10 sek pause × 8 rundar. Du kan endra alle tre verdiane.</p>}
     {format==='Superset'&&<p className="wod-help">Gruppér øvingar med same bokstav. Utfør gruppa etter kvarandre, kvil etterpå.</p>}
     {format==='Complex'&&<p className="wod-help">Utfør øvingane i oppgitt rekkjefølgje som eitt kompleks, normalt utan å setja frå deg vekta.</p>}
     {format==='Pyramid'&&<p className="wod-help">Programmer kvart sett individuelt for stigande eller fallande reps/belastning.</p>}
     {isCustom&&<><label className="wod-custom-sets"><input type="checkbox" checked={customUseSets} onChange={e=>setCustomUseSets(e.target.checked)}/> Bruk sett-programmering på øvingane</label><label>Fri struktur / instruksjon<textarea rows="3" value={customInstructions} onChange={e=>setCustomInstructions(e.target.value)} placeholder="Beskriv struktur, sett, rundar, pausar og gjennomføring …"/></label></>}
     <div className="wod-selected-list">{selected.length?selected.map((ex,i)=><article key={ex.key}><span className="wod-order">{i+1}</span><div className="wod-selected-info"><strong>{ex.name}</strong><small>{ex.category} · {ex.body_area||'Fullkropp'}{ex.equipment?' · '+ex.equipment:''}</small>{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Video</a>}
      {showSets?<div className="wod-set-editor"><strong>Settprogram</strong>{ex.sets.map((s,si)=><div className="wod-set-row" key={si}><span>Sett {si+1}</span><label>Reps<input type="number" min="1" value={s.reps} onChange={e=>updateSet(ex.key,si,{reps:e.target.value})}/></label><label>Belastning<select value={s.loadMode} onChange={e=>updateSet(ex.key,si,{loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Kg</option><option value="percent">% 1RM</option><option value="rir">RIR</option><option value="rpe">RPE</option></select></label>{s.loadMode==='kg'&&<label>Kg<input type="number" step="0.5" value={s.loadKg} onChange={e=>updateSet(ex.key,si,{loadKg:e.target.value})}/></label>}{s.loadMode==='percent'&&<label>% 1RM<input type="number" value={s.percent1rm} onChange={e=>updateSet(ex.key,si,{percent1rm:e.target.value})}/></label>}{s.loadMode==='rir'&&<label>RIR<input type="number" min="0" max="10" value={s.rir} onChange={e=>updateSet(ex.key,si,{rir:e.target.value})}/></label>}{s.loadMode==='rpe'&&<label>RPE<input type="number" min="1" max="10" step="0.5" value={s.rpe} onChange={e=>updateSet(ex.key,si,{rpe:e.target.value})}/></label>}<label>Pause (sek.)<input type="number" min="0" value={s.restSeconds} onChange={e=>updateSet(ex.key,si,{restSeconds:e.target.value})}/></label><button type="button" className="wod-mini-action" onClick={()=>updateItem(ex.key,{sets:ex.sets.filter((_,j)=>j!==si)})} disabled={ex.sets.length===1}>×</button></div>)}<button type="button" className="secondary-button wod-add-set" onClick={()=>updateItem(ex.key,{sets:[...ex.sets,newSet()]})}><Plus size={13}/> Legg til sett</button></div>:<div className="wod-dose-grid"><label>{isRow(ex)?'Dosering':'Reps'}<input type="number" min="1" value={isRow(ex)?ex.rowValue:ex.reps} onChange={e=>updateItem(ex.key,isRow(ex)?{rowValue:e.target.value}:{reps:e.target.value})} placeholder={isRow(ex)?'T.d. 500':'T.d. 10'}/></label><label>Belastning<select value={ex.loadMode} onChange={e=>updateItem(ex.key,{loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Fast kg</option><option value="percent">% 1RM</option><option value="bodyweight">Kroppsvekt / assistanse</option></select></label>{ex.loadMode==='kg'&&<label>Kg<input type="number" step="0.5" value={ex.loadKg} onChange={e=>updateItem(ex.key,{loadKg:e.target.value})}/></label>}{ex.loadMode==='percent'&&<label>% av 1RM<input type="number" value={ex.percent1rm} onChange={e=>updateItem(ex.key,{percent1rm:e.target.value})}/></label>}{isTimed&&<label>Minutt / oppgåve<input value={ex.minuteSlot} onChange={e=>updateItem(ex.key,{minuteSlot:e.target.value})} placeholder="T.d. 1, 2 eller 3"/></label>}{format==='Superset'&&<label>Supersett-gruppe<input value={ex.group} onChange={e=>updateItem(ex.key,{group:e.target.value.toUpperCase().slice(0,2)})}/></label>}{isRow(ex)&&<label>Einheit<select value={ex.rowUnit} onChange={e=>updateItem(ex.key,{rowUnit:e.target.value})}><option value="s">Sekund</option><option value="min">Minutt</option><option value="m">Meter</option><option value="cal">Cal</option></select></label>}{isInterval&&!isRow(ex)&&<><label>Meter<input type="number" min="1" value={ex.meters} onChange={e=>updateItem(ex.key,{meters:e.target.value})}/></label><label>Kalorier<input type="number" min="1" value={ex.calories} onChange={e=>updateItem(ex.key,{calories:e.target.value})}/></label><label>Arbeidstid (sek.)<input type="number" min="1" value={ex.workSeconds} onChange={e=>updateItem(ex.key,{workSeconds:e.target.value})}/></label></>}{(format==='Intervall'||format==='Row Intervals')&&<label>Pause etter øving (sek.)<input type="number" min="0" value={ex.restSeconds} onChange={e=>updateItem(ex.key,{restSeconds:e.target.value})}/></label>}</div>}
      <label className="wod-coach-note">Instruksjon for øving<input value={ex.coachNote} onChange={e=>updateItem(ex.key,{coachNote:e.target.value})} placeholder="Teknikk, skalering, mål …"/></label>
      <small className="wod-load-summary">{showSets?ex.sets.length+' sett · '+ex.sets.map(s=>s.reps).join(' / ')+' reps':isRow(ex)?(ex.rowValue||'—')+' '+({s:'sek',min:'min',m:'m',cal:'cal'}[ex.rowUnit]||'m'):ex.reps+(isTimed?' reps '+(ex.minuteSlot?'· minutt '+ex.minuteSlot:'per '+(format==='E2MOM'?'2.':format==='E3MOM'?'3.':'')+' minutt'):' reps')}{fmtLoad(ex)?' · '+fmtLoad(ex):''}</small>
     </div><div className="wod-selected-actions"><button type="button" title="Flytt opp" disabled={!i} onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" title="Flytt ned" disabled={i===selected.length-1} onClick={()=>move(i,1)}><ArrowDown size={14}/></button><button type="button" title="Fjern" onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={14}/></button></div></article>):<div className="empty-state">Legg til øvingar frå biblioteket.</div>}</div>
     <div className="wod-programming-note"><label>Planlagd treningsstimulus<textarea rows="2" value={stimulus} onChange={e=>setStimulus(e.target.value)}/></label><small>Beskriv kva kunden skal oppleva og kva som er målet med økta.</small></div>
     <label>Coach-notat / skalering<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="RX, skalering, tekniske krav, oppvarming …"/></label>
     <button className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':'Publiser WOD'}</button>
    </form>
   </aside>
  </div>
 </div>
}
