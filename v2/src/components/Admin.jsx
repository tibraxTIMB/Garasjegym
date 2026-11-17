import {useEffect,useState} from 'react'
import {CheckCircle2,LoaderCircle,Plus,ShieldCheck,Users} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

export default function Admin({profile}){
 const [members,setMembers]=useState([]),[wods,setWods]=useState([]),[exercises,setExercises]=useState([])
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [wodName,setWodName]=useState(''),[wodFormat,setWodFormat]=useState('AMRAP'),[wodMinutes,setWodMinutes]=useState('20'),[wodMoves,setWodMoves]=useState(''),[wodNotes,setWodNotes]=useState(''),[wodWork,setWodWork]=useState('60'),[wodRest,setWodRest]=useState('0'),[wodRounds,setWodRounds]=useState('5'),[editingWod,setEditingWod]=useState(null)
 const [exerciseName,setExerciseName]=useState(''),[category,setCategory]=useState('Styrke'),[equipment,setEquipment]=useState(''),[editingExercise,setEditingExercise]=useState(null)
 const [wodExerciseSearch,setWodExerciseSearch]=useState(''),[wodSelectedExercises,setWodSelectedExercises]=useState([]),[customWodExercise,setCustomWodExercise]=useState('')
 const [memberSearch,setMemberSearch]=useState(''),[memberFilter,setMemberFilter]=useState('all')
 const filteredMembers=members.filter(m=>{const q=memberSearch.trim().toLowerCase();const matches=!q||(m.display_name||'').toLowerCase().includes(q)||m.role.toLowerCase().includes(q);return matches&&(memberFilter==='all'||(memberFilter==='active'?m.active:!m.active))})
 const isAdmin=profile.role==='admin'
 async function load(silent=false){
  if(!silent)setLoading(true);setError('')
  const [m,e]=await Promise.all([
   supabase.from('profiles').select('id,display_name,role,active,created_at').order('created_at',{ascending:false}),
   supabase.from('exercises').select('id,name,category,equipment,is_active').order('name')
  ])
  let w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,is_published').order('created_at',{ascending:false})
  // Timer settings are optional until migration 006 is installed.
  if(w.error && /timer_settings|column .* does not exist/i.test(w.error.message||'')){
   w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,is_published').order('created_at',{ascending:false})
  }
  if(m.error)setError(m.error.message);else setMembers(m.data||[])
  if(w.error)setError(w.error.message);else setWods(w.data||[])
  if(e.error)setError(e.error.message);else setExercises(e.data||[])
  setLoading(false)
 }
 useEffect(()=>{load();const refresh=setInterval(()=>load(true),60000);return()=>clearInterval(refresh)},[])
 async function addWod(event){
  event.preventDefault();setBusy('wod');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const movements=(wodSelectedExercises.length?wodSelectedExercises.join('\\n'):wodMoves).trim()\n   const values={name:wodName.trim(),format:wodFormat,duration_minutes:Number(wodMinutes)||null,movements,notes:wodNotes.trim(),timer_settings:{work_seconds:Number(wodWork),rest_seconds:Number(wodRest),rounds:Number(wodRounds)}}
   let result=editingWod?await supabase.from('wods').update(values).eq('id',editingWod.id):await supabase.from('wods').insert({...values,is_published:true,created_by:user.id})
   if(result.error && /timer_settings|column .* does not exist/i.test(result.error.message||'')){
    const {timer_settings,...baseValues}=values
    result=editingWod?await supabase.from('wods').update(baseValues).eq('id',editingWod.id):await supabase.from('wods').insert({...baseValues,is_published:true,created_by:user.id})
   }
   if(result.error)throw result.error
   setWodName('');setWodMoves('');setWodSelectedExercises([]);setWodNotes('');setWodExerciseSearch('');setCustomWodExercise('');setEditingWod(null);setNotice(editingWod?'WOD oppdatert.':'WOD publisert.');await load()
  }
  catch(e){setError(e.message||'Kunne ikkje publisera WOD.')}finally{setBusy('')}
 }
 async function addExercise(event){
  event.preventDefault();setBusy('exercise');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const values={name:exerciseName.trim(),category,equipment}
   const result=editingExercise?await supabase.from('exercises').update(values).eq('id',editingExercise.id):await supabase.from('exercises').insert({...values,created_by:user.id})
   if(result.error)throw result.error
   setExerciseName('');setEquipment('');setEditingExercise(null);setNotice(editingExercise?'Øving oppdatert.':'Øving lagra i biblioteket.');await load()
  }catch(e){setError(e.message||'Kunne ikkje lagra øving.')}finally{setBusy('')}
 }
 async function updateMember(member,patch){
  setBusy(member.id);setError('')
  try{const {error:e}=await supabase.from('profiles').update(patch).eq('id',member.id);if(e)throw e;setNotice('Medlemsprofil oppdatert.');await load()}
  catch(e){setError(e.message||'Kunne ikkje oppdatera medlemmet.')}finally{setBusy('')}
 }
 function editWod(wod){setEditingWod(wod);setWodName(wod.name||'');setWodFormat(wod.format||'AMRAP');setWodMinutes(String(wod.duration_minutes||20));setWodMoves(wod.movements||'');setWodSelectedExercises((wod.movements||'').split(/\\n|,/).map(x=>x.trim()).filter(Boolean));setWodNotes(wod.notes||'');setWodWork(String(wod.timer_settings?.work_seconds??60));setWodRest(String(wod.timer_settings?.rest_seconds??0));setWodRounds(String(wod.timer_settings?.rounds??5));window.scrollTo({top:0,behavior:'smooth'})}
 function addWodExercise(name){const value=String(name||'').trim();if(!value)return;setWodSelectedExercises(current=>[...current,value]);setWodMoves(current=>[current,value].filter(Boolean).join('\\n'));setWodExerciseSearch('');setCustomWodExercise('')}
 function removeWodExercise(index){setWodSelectedExercises(current=>current.filter((_,i)=>i!==index));setWodMoves(current=>current.split(/\\n|,/).map(x=>x.trim()).filter((_,i)=>i!==index).join('\\n'))}
 function moveWodExercise(index,direction){const next=[...wodSelectedExercises];const target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setWodSelectedExercises(next);setWodMoves(next.join('\\n'))}
 function cancelWodEdit(){if(window.confirm('Forkasta endringane i WOD-en?')){setEditingWod(null);setWodName('');setWodMoves('');setWodSelectedExercises([]);setWodNotes('')}}
 async function toggleWod(wod){
  setBusy(wod.id);try{const {error:e}=await supabase.from('wods').update({is_published:!wod.is_published}).eq('id',wod.id);if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy('')}
 }
 function editExercise(ex){
  setEditingExercise(ex);setExerciseName(ex.name||'');setCategory(ex.category||'Styrke');setEquipment(ex.equipment||'')
  window.scrollTo({top:0,behavior:'smooth'})
 }
 function cancelExerciseEdit(){
  setEditingExercise(null);setExerciseName('');setEquipment('')
 }
 async function toggleExercise(ex){
  setBusy(ex.id);try{const {error:e}=await supabase.from('exercises').update({is_active:!ex.is_active}).eq('id',ex.id);if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar administrasjon …</div>
 return <div className="admin-module">
  <div className="training-heading"><div><div className="section-kicker">STURMKOPF · KONTROLLPANEL</div><h3>Administrasjon</h3></div><span className="count-pill">{profile.role.toUpperCase()}</span></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  <div className="admin-stats"><div><Users size={17}/><strong>{members.length}</strong><span>Medlemmar</span></div><div><ShieldCheck size={17}/><strong>{members.filter(m=>m.active).length}</strong><span>Aktive</span></div><div><Plus size={17}/><strong>{wods.length}</strong><span>WOD-ar</span></div><div><Plus size={17}/><strong>{exercises.length}</strong><span>Øvingar</span></div></div>
  <section className="engine-section"><h4>Medlemsadministrasjon · {filteredMembers.length} av {members.length}</h4><div className="engine-fields"><label>Søk etter medlem<input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Namn eller rolle"/></label><label>Vis<select value={memberFilter} onChange={e=>setMemberFilter(e.target.value)}><option value="all">Alle medlemmar</option><option value="active">Aktive</option><option value="inactive">Inaktive</option></select></label></div>{filteredMembers.length?filteredMembers.map(m=><article className="admin-member" key={m.id}><div><strong>{m.display_name||'Utan namn'}</strong><small>{m.role} · {m.active?'Aktiv':'Inaktiv'}</small></div>{isAdmin&&<div className="admin-member-actions"><select aria-label="Medlemsrolle" value={m.role} onChange={e=>updateMember(m,{role:e.target.value})} disabled={busy===m.id}><option value="member">Medlem</option><option value="manager">Manager</option><option value="admin">Admin</option></select><button className="secondary-button" disabled={busy===m.id} onClick={()=>updateMember(m,{active:!m.active})}>{m.active?'Deaktiver':'Aktiver'}</button></div>}</article>):<div className="empty-state">Ingen medlemmar samsvarar med søket.</div>}</section>
  <section className="engine-section"><h4>WOD-studio</h4>{editingWod&&<div className="auth-message">Redigerer: {editingWod.name}</div>}<form className="admin-create-form" onSubmit={addWod}><input value={wodName} onChange={e=>setWodName(e.target.value)} placeholder="Namn på WOD" required/><div className="engine-fields"><label>Format<select value={wodFormat} onChange={e=>setWodFormat(e.target.value)}>{['AMRAP','EMOM 1','EMOM 2','EMOM','For Time','Tabata','Intervall','Styrke','Eigen økt'].map(x=><option key={x}>{x}</option>)}</select></label><label>Varigheit (min)<input type="number" min="1" value={wodMinutes} onChange={e=>setWodMinutes(e.target.value)}/></label></div><div className="engine-fields three"><label>Arbeid (sek.)<input type="number" min="1" max="3600" value={wodWork} onChange={e=>setWodWork(e.target.value)}/></label><label>Kvile (sek.)<input type="number" min="0" max="3600" value={wodRest} onChange={e=>setWodRest(e.target.value)}/></label><label>Rundar<input type="number" min="1" max="100" value={wodRounds} onChange={e=>setWodRounds(e.target.value)}/></label></div><div className="engine-section-title"><h4>Bygg WOD med øvingar</h4><span>Klikk for å leggje til</span></div><input value={wodExerciseSearch} onChange={e=>setWodExerciseSearch(e.target.value)} placeholder="Søk i øvingsbiblioteket …"/><div className="exercise-pick-list">{exercises.filter(ex=>ex.is_active!==false&&(!wodExerciseSearch||[ex.name,ex.category,ex.equipment].filter(Boolean).join(' ').toLowerCase().includes(wodExerciseSearch.toLowerCase()))).slice(0,12).map(ex=><button type="button" key={ex.id} onClick={()=>addWodExercise(ex.name)}><Plus size={14}/><span>{ex.name}</span><small>{ex.category||'Øving'}</small></button>)}</div><div className="engine-section-title"><h4>Øvingar i WOD-en</h4><span>{wodSelectedExercises.length} valde</span></div>{wodSelectedExercises.length?wodSelectedExercises.map((name,index)=><div className="admin-list-row" key={index}><div><strong>{index+1}. {name}</strong></div><div className="admin-member-actions"><button type="button" className="secondary-button" onClick={()=>moveWodExercise(index,-1)} disabled={index===0}>↑</button><button type="button" className="secondary-button" onClick={()=>moveWodExercise(index,1)} disabled={index===wodSelectedExercises.length-1}>↓</button><button type="button" className="secondary-button" onClick={()=>removeWodExercise(index)}>Fjern</button></div></div>):<div className="empty-state">Søk etter ei øving og trykk på henne for å leggje ho til.</div>}<div className="engine-fields"><label>Legg til eiga øving<input value={customWodExercise} onChange={e=>setCustomWodExercise(e.target.value)} placeholder="Skriv namn på øving"/></label><button type="button" className="secondary-button" onClick={()=>addWodExercise(customWodExercise)} disabled={!customWodExercise.trim()}>Legg til eiga øving</button></div><textarea value={wodNotes} onChange={e=>setWodNotes(e.target.value)} rows="2" placeholder="Instruksjon / notat"/><div className="admin-member-actions"><button className="primary-button" disabled={busy==='wod'}><Plus size={15}/> {editingWod?'Lagre endringar':'Publiser WOD'}</button>{editingWod&&<button type="button" className="secondary-button" onClick={cancelWodEdit}>Avbryt</button>}</div></form>{wods.map(w=><div className="admin-list-row" key={w.id}><div><strong>{w.name}</strong><small>{w.format} · {w.is_published?'Publisert':'Skjult'}</small></div><div className="admin-member-actions"><button className="secondary-button" onClick={()=>editWod(w)}>Rediger</button><button className="secondary-button" onClick={()=>toggleWod(w)} disabled={busy===w.id}>{w.is_published?'Skjul':'Publiser'}</button></div></div>)}</section>
  <section className="engine-section"><h4>Øvingsbibliotek</h4><form className="admin-create-form" onSubmit={addExercise}>{editingExercise&&<strong>Redigerer øving: {editingExercise.name}</strong>}<input value={exerciseName} onChange={e=>setExerciseName(e.target.value)} placeholder="Namn på øving" required/><div className="engine-fields"><label>Kategori<select value={category} onChange={e=>setCategory(e.target.value)}>{['Styrke','Kondisjon','Kroppsvekt','Mobilitet','Olympisk løft','Gymnastikk'].map(x=><option key={x}>{x}</option>)}</select></label><label>Utstyr<input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="t.d. Stong, manualar"/></label></div><div className="admin-member-actions"><button className="primary-button" disabled={busy==='exercise'}><Plus size={15}/> {editingExercise?'Lagre øving':'Legg til øving'}</button>{editingExercise&&<button type="button" className="secondary-button" onClick={cancelExerciseEdit}>Avbryt</button>}</div></form>{exercises.map(ex=><div className="admin-list-row" key={ex.id}><div><strong>{ex.name}</strong><small>{ex.category} · {ex.equipment||'Utan utstyr'} · {ex.is_active?'Aktiv':'Skjult'}</small></div><div className="admin-member-actions"><button className="secondary-button" onClick={()=>editExercise(ex)}>Rediger</button><button className="secondary-button" onClick={()=>toggleExercise(ex)} disabled={busy===ex.id}>{ex.is_active?'Skjul':'Aktiver'}</button></div></div>)}</section>
 </div>
}
