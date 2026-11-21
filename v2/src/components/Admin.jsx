import React,{useEffect,useState} from 'react'
import {CheckCircle2,LoaderCircle,Plus,ShieldCheck,Users,Trophy,Dumbbell,Coffee,Medal,Search,CalendarDays,ChevronDown,ChevronUp,Filter} from 'lucide-react'
import {rankForCount,RANK_TITLES} from './Overview.jsx'
import {supabase} from '../lib/supabase.js'
import CoffeeBar from './CoffeeBar.jsx'
import { RELEASE_NAME } from '../lib/release.js'
import { canManageMemberAccess } from '../lib/membershipAccess.js'
import WodImportPanel from './WodImportPanel.jsx'
import './admin-advanced.css'
import GarageOwnerBadge from './GarageOwnerBadge.jsx'

export default function Admin({profile,onOpenWodImport}){
 const [members,setMembers]=useState([]),[wods,setWods]=useState([]),[exercises,setExercises]=useState([]),[rankCounts,setRankCounts]=useState({}),[adminTab,setAdminTab]=useState('oversikt')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [wodName,setWodName]=useState(''),[wodFormat,setWodFormat]=useState('AMRAP'),[wodMinutes,setWodMinutes]=useState('20'),[wodMoves,setWodMoves]=useState(''),[wodNotes,setWodNotes]=useState(''),[wodWork,setWodWork]=useState('60'),[wodRest,setWodRest]=useState('0'),[wodRounds,setWodRounds]=useState('5'),[editingWod,setEditingWod]=useState(null)
 const [exerciseName,setExerciseName]=useState(''),[category,setCategory]=useState('Styrke'),[equipment,setEquipment]=useState(''),[videoUrl,setVideoUrl]=useState(''),[bodyArea,setBodyArea]=useState('Fullkropp'),[exerciseDescription,setExerciseDescription]=useState(''),[variantLabel,setVariantLabel]=useState(''),[doseDefaults,setDoseDefaults]=useState({rx:{men_kg:'',women_kg:''},scaled:{men_kg:'',women_kg:''},foundation:{men_kg:'',women_kg:''}}),[editingExercise,setEditingExercise]=useState(null),[showExerciseForm,setShowExerciseForm]=useState(false),[exerciseSearch,setExerciseSearch]=useState(''),[exerciseFilter,setExerciseFilter]=useState('all')
 const [wodExerciseSearch,setWodExerciseSearch]=useState(''),[wodSelectedExercises,setWodSelectedExercises]=useState([]),[customWodExercise,setCustomWodExercise]=useState('')
 const [memberSearch,setMemberSearch]=useState(''),[memberFilter,setMemberFilter]=useState('all'),[editingMemberId,setEditingMemberId]=useState(''),[memberNameDraft,setMemberNameDraft]=useState(''),[rankSearch,setRankSearch]=useState(''),[rankCatalogueOpen,setRankCatalogueOpen]=useState(false)
 const [inviteEmail,setInviteEmail]=useState('')
 const filteredMembers=members.filter(m=>{const q=memberSearch.trim().toLowerCase();const matches=!q||(m.display_name||'').toLowerCase().includes(q)||(m.email||'').toLowerCase().includes(q)||m.role.toLowerCase().includes(q);return matches&&(memberFilter==='all'||(memberFilter==='active'?m.active:memberFilter==='pending'?m.membership_status==='pending':memberFilter==='rejected'?m.membership_status==='rejected':!m.active))})
 const isAdmin=profile.role==='admin'
 const filteredExercises=exercises.filter(ex=>{const q=exerciseSearch.trim().toLowerCase();const match=!q||[ex.name,ex.category,ex.body_area,ex.equipment,ex.description].some(v=>(v||'').toLowerCase().includes(q));return match&&(exerciseFilter==='all'||(exerciseFilter==='active'?ex.is_active:!ex.is_active))})
 async function load(silent=false){
  if(!silent)setLoading(true);setError('')
  const [m,e,logs]=await Promise.all([
   supabase.from('profiles').select('id,display_name,email,role,active,membership_status,created_at').order('created_at',{ascending:false}),
   supabase.from('exercises').select('id,name,category,equipment,video_url,body_area,description,is_active,prescription_profiles').order('name'),
   supabase.from('workout_logs').select('member_id')
  ])
  let w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,is_published').order('created_at',{ascending:false})
  // Timer settings are optional until migration 006 is installed.
  if(w.error && /timer_settings|column .* does not exist/i.test(w.error.message||'')){
   w=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,is_published').order('created_at',{ascending:false})
  }
  if(m.error)setError(m.error.message);else setMembers(m.data||[])
  if(w.error)setError(w.error.message);else setWods(w.data||[])
  if(e.error)setError(e.error.message);else setExercises(e.data||[])
  if(logs.error)setError(logs.error.message);else setRankCounts((logs.data||[]).reduce((acc,row)=>{acc[row.member_id]=(acc[row.member_id]||0)+1;return acc},{}))
  setLoading(false)
 }
 useEffect(()=>{load();const refresh=setInterval(()=>load(true),60000);return()=>clearInterval(refresh)},[])
 async function addWod(event){
  event.preventDefault();setBusy('wod');setError('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   const movements=(wodSelectedExercises.length?wodSelectedExercises.join('\n'):wodMoves).trim()
   const values={name:wodName.trim(),format:wodFormat,duration_minutes:Number(wodMinutes)||null,movements,notes:wodNotes.trim(),timer_settings:{work_seconds:Number(wodWork),rest_seconds:Number(wodRest),rounds:Number(wodRounds)}}
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
   const values={name:exerciseName.trim(),category,equipment,video_url:videoUrl.trim()||null,body_area:bodyArea,description:exerciseDescription.trim(),prescription_profiles:{version:1,variant_label:variantLabel.trim()||equipment.trim()||'Standardvariant',levels:Object.fromEntries(Object.entries(doseDefaults).map(([level,v])=>[level,{men_kg:v.men_kg===''?null:Number(v.men_kg),women_kg:v.women_kg===''?null:Number(v.women_kg)}]))}}
   const result=editingExercise?await supabase.from('exercises').update(values).eq('id',editingExercise.id):await supabase.from('exercises').insert({...values,created_by:user.id})
   if(result.error)throw result.error
   setExerciseName('');setEquipment('');setVideoUrl('');setBodyArea('Fullkropp');setExerciseDescription('');setVariantLabel('');setDoseDefaults({rx:{men_kg:'',women_kg:''},scaled:{men_kg:'',women_kg:''},foundation:{men_kg:'',women_kg:''}});setEditingExercise(null);setShowExerciseForm(false);setNotice(editingExercise?'Øving oppdatert.':'Øving lagra i biblioteket.');await load()
  }catch(e){setError(e.message||'Kunne ikkje lagra øving.')}finally{setBusy('')}
 }
 function canManageMember(member){return canManageMemberAccess(profile,member)}
 function startMemberRename(member){setEditingMemberId(member.id);setMemberNameDraft(member.display_name||'')}
 function cancelMemberRename(){setEditingMemberId('');setMemberNameDraft('')}
 async function saveMemberName(member){
  const display_name=memberNameDraft.trim()
  if(!display_name){setError('Medlemmet må ha eit visingsnamn.');return}
  if(display_name.length>60){setError('Visingsnamnet kan ikkje vera lengre enn 60 teikn.');return}
  await updateMember(member,{display_name})
  setEditingMemberId('')
 }
 async function deleteMember(member){
  if(!isAdmin||member.id===profile.id){setError('Du kan ikkje sletta din eigen konto.');return}
  const label=member.display_name||member.email||'denne brukaren'
  if(!window.confirm('SLETT BRUKAR?\\n\\n'+label+' ('+(member.email||'utan e-post')+')\\n\\nDette fjernar innlogginga permanent og kan ikkje angrast. Historikk som er knytt til brukaren kan bli påverka.'))return
  setBusy(member.id);setError('');setNotice('')
  try{
   const {data,error:invokeError}=await supabase.functions.invoke('admin-delete-user',{body:{user_id:member.id}})
   if(invokeError){
    let message=invokeError.message||'Kunne ikkje sletta brukaren.'
    try{
     const payload=await invokeError.context?.json?.()
     if(payload?.error)message=payload.error
     if(payload?.linked_history?.length){
      message+=' Knytte data: '+payload.linked_history.map(row=>row.area+(row.count>1?' ('+row.count+')':'')).join(', ')+'.'
     }
    }catch{/* Vis standardfeilen dersom Edge Function-svaret ikkje kan lesast. */}
    throw new Error(message)
   }
   if(data?.error)throw new Error(data.error)
   setNotice('Brukaren er sletta.')
   await load()
  }catch(e){setError(e.message||'Kunne ikkje sletta brukaren.')}
  finally{setBusy('')}
 }
 async function inviteMember(event){
  event.preventDefault()
  if(!isAdmin)return
  const email=inviteEmail.trim().toLowerCase()
  if(!email)return
  setBusy('invite-member');setError('');setNotice('')
  try{
   const {data,error:invokeError}=await supabase.functions.invoke('admin-invite-user',{body:{email}})
   if(invokeError){
    let message=invokeError.message||'Kunne ikkje senda invitasjon.'
    try{const payload=await invokeError.context?.json?.();if(payload?.error)message=payload.error}catch{/* Standardfeil er nok. */}
    throw new Error(message)
   }
   if(data?.error&&!data?.invited)throw new Error(data.error)
   setNotice(data?.approved?'Standardinvitasjon sendt til '+email+'. Medlemskontoen er oppretta. Den nye brukaren opnar lenkja, får GarasjeGym-velkomst og vel sitt eige passord.':data?.error||'Invitasjonen er send. Kontroller medlemmet i registeret.')
   setInviteEmail('')
   await load(true)
  }catch(e){setError(e.message||'Kunne ikkje oppretta medlemskontoen.')}
  finally{setBusy('')}
 }
 async function updateMember(member,patch){
  if(!canManageMember(member)){setError('Du har ikkje tilgang til å endra denne medlemsprofilen.');return}
  if(Object.prototype.hasOwnProperty.call(patch,'role')&&(!isAdmin||member.id===profile.id)){setError('Berre admin kan endra roller, og du kan ikkje endra di eiga rolle.');return}
  if(Object.prototype.hasOwnProperty.call(patch,'active')&&(member.id===profile.id||(!isAdmin&&member.role!=='member'))){setError('Du kan ikkje deaktivere denne kontoen.');return}
  setBusy(member.id);setError('')
  try{const {error:e}=await supabase.from('profiles').update(patch).eq('id',member.id);if(e)throw e;setNotice('Medlemsprofil oppdatert.');await load()}
  catch(e){setError(e.message||'Kunne ikkje oppdatera medlemmet.')}finally{setBusy('')}
 }
 function editWod(wod){setEditingWod(wod);setWodName(wod.name||'');setWodFormat(wod.format||'AMRAP');setWodMinutes(String(wod.duration_minutes||20));setWodMoves(wod.movements||'');setWodSelectedExercises((wod.movements||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean));setWodNotes(wod.notes||'');setWodWork(String(wod.timer_settings?.work_seconds??60));setWodRest(String(wod.timer_settings?.rest_seconds??0));setWodRounds(String(wod.timer_settings?.rounds??5));window.scrollTo({top:0,behavior:'smooth'})}
 function addWodExercise(name){const value=String(name||'').trim();if(!value)return;setWodSelectedExercises(current=>[...current,value]);setWodMoves(current=>[current,value].filter(Boolean).join('\n'));setWodExerciseSearch('');setCustomWodExercise('')}
 function removeWodExercise(index){setWodSelectedExercises(current=>current.filter((_,i)=>i!==index));setWodMoves(current=>current.split(/\n|,/).map(x=>x.trim()).filter((_,i)=>i!==index).join('\n'))}
 function moveWodExercise(index,direction){const next=[...wodSelectedExercises];const target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setWodSelectedExercises(next);setWodMoves(next.join('\n'))}
 function cancelWodEdit(){if(window.confirm('Forkasta endringane i WOD-en?')){setEditingWod(null);setWodName('');setWodMoves('');setWodSelectedExercises([]);setWodNotes('')}}
 async function toggleWod(wod){
  setBusy(wod.id);try{const {error:e}=await supabase.from('wods').update({is_published:!wod.is_published}).eq('id',wod.id);if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy('')}
 }
 function editExercise(ex){
  setEditingExercise(ex);setExerciseName(ex.name||'');setCategory(ex.category||'Styrke');setEquipment(ex.equipment||'');setVideoUrl(ex.video_url||'');setBodyArea(ex.body_area||'Fullkropp');setExerciseDescription(ex.description||'');setVariantLabel(ex.prescription_profiles?.variant_label||ex.equipment||'');setDoseDefaults(Object.fromEntries(['rx','scaled','foundation'].map(level=>[level,{men_kg:ex.prescription_profiles?.levels?.[level]?.men_kg??'',women_kg:ex.prescription_profiles?.levels?.[level]?.women_kg??''}])));setShowExerciseForm(true)
  window.scrollTo({top:0,behavior:'smooth'})
 }
 function cancelExerciseEdit(){
  setEditingExercise(null);setExerciseName('');setEquipment('');setVideoUrl('');setBodyArea('Fullkropp');setExerciseDescription('');setVariantLabel('');setDoseDefaults({rx:{men_kg:'',women_kg:''},scaled:{men_kg:'',women_kg:''},foundation:{men_kg:'',women_kg:''}});setShowExerciseForm(false)
 }
 async function toggleExercise(ex){
  setBusy(ex.id);try{const {error:e}=await supabase.from('exercises').update({is_active:!ex.is_active}).eq('id',ex.id);if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy('')}
 }
 if(loading)return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar administrasjon …</div>
 return <div className="admin-module">
  <div className="training-heading"><div><div className="section-kicker">{RELEASE_NAME} · KONTROLLPANEL</div><h3>Administrasjon</h3></div><div className="garage-author-line"><GarageOwnerBadge userId={profile.id}/><span className="count-pill">{profile.role.toUpperCase()}</span></div></div>
  {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-message" role="status"><CheckCircle2 size={15}/>{notice}</div>}
  <div className="admin-stats"><div><Users size={17}/><strong>{members.length}</strong><span>Medlemmar</span></div><div><ShieldCheck size={17}/><strong>{members.filter(m=>m.active).length}</strong><span>Aktive</span></div><div><Dumbbell size={17}/><strong>{wods.length}</strong><span>WOD-ar</span></div><div><Plus size={17}/><strong>{exercises.length}</strong><span>Øvingar</span></div></div>
  <nav className="admin-tabs" aria-label="Administrasjonsområde">
   {[['oversikt','Oversikt',ShieldCheck],['medlemmer','Medlemmer og tilgang',Users],['rang','Rang & achievements',Trophy],['kaffi','Kaffebar',Coffee],['ovingar','Øvingsbibliotek',Dumbbell],...(isAdmin?[['drift','Drift',ShieldCheck]]:[])].map(([id,label,Icon])=><button type="button" key={id} className={adminTab===id?'selected':''} onClick={()=>setAdminTab(id)}><Icon size={15}/>{label}</button>)}
  </nav>
  {adminTab==='oversikt'&&<div className="admin-dashboard-grid">
   <article className="admin-dashboard-card"><span className="section-kicker">MEDLEMSSTATUS</span><strong>{members.filter(m=>m.active).length} / {members.length}</strong><p>Aktive medlemmar</p><button className="secondary-button" onClick={()=>setAdminTab('medlemmer')}>Opne medlemsregister</button></article>
   <article className="admin-dashboard-card"><span className="section-kicker">TRENING</span><strong>{Object.values(rankCounts).reduce((a,b)=>a+b,0)}</strong><p>Registrerte treningsøkter</p><button className="secondary-button" onClick={()=>setAdminTab('rang')}>Sjå rang og framgang</button></article>
   <article className="admin-dashboard-card"><span className="section-kicker">INNHALD</span><strong>{wods.length+wods.filter(w=>w.is_published).length*0} WOD-ar · {exercises.length} øvingar</strong><p>Bibliotek og øvingsbank</p><button className="secondary-button" onClick={()=>setAdminTab('ovingar')}>Administrer øvingar</button></article>
   <article className="admin-dashboard-card"><span className="section-kicker">DRIFT</span><strong>Kaffi · booking · PT</strong><p>Daglege arbeidsflater ligg i eigne menyar</p><button className="secondary-button" onClick={()=>setAdminTab(isAdmin?'drift':'kaffi')}>{isAdmin?'Opne drift':'Opne kaffebar'}</button></article>
  </div>}
  {isAdmin&&adminTab==='drift'&&<section className="engine-section"><div className="training-heading"><div><span className="section-kicker">ADMINISTRASJON</span><h4>Drift</h4><p>Avanserte verktøy som ikkje treng liggja i den daglege WOD-byggjaren.</p></div></div><details className="admin-advanced-tools"><summary><strong>Avansert</strong><span>Import og vedlikehald</span></summary><div className="admin-advanced-content"><WodImportPanel exerciseCatalog={exercises} onApply={onOpenWodImport}/></div></details></section>}
  {isAdmin&&adminTab==='medlemmer'&&<form className="admin-member-invite engine-section" onSubmit={inviteMember}><div className="section-kicker">TRYGG MEDLEMSINVITASJON</div><h4>Inviter ein ny brukar</h4><p>Berre administrator kan invitera. Den inviterte får ei personleg lenkje, vel sitt eige passord og får vanleg medlemstilgang – aldri adminrettar.</p><div className="admin-invite-preview"><div className="admin-invite-preview-head"><Dumbbell size={18}/> GARASJEGYM · VELKOMST ETTER E-POSTEN</div><p>Me brukar standard invitasjons-e-post frå Supabase. Når medlemmet opnar lenkja, kjem denne GarasjeGym-velkomsten fram:</p><ul><li>🏋️ WOD og økter</li><li>🏆 Personlege rekordar</li><li>📅 PT og timar</li><li>☕ Fellesskap</li></ul><small>Medlemmet opprettar der sitt eige passord på minst 12 teikn. Du treng ikkje endra e-postmalen.</small></div><div className="admin-member-invite-row"><label>E-postadresse<input type="email" autoComplete="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="namn@epost.no"/></label><button type="submit" className="primary-button" disabled={busy==='invite-member'}><Plus size={16}/>{busy==='invite-member'?'Sender …':'Opprett og inviter'}</button></div></form>}
  {adminTab==='medlemmer'&&<section className="engine-section"><div className="training-heading"><div><span className="section-kicker">MEDLEMSADMINISTRASJON</span><h4>Medlemsregister · {filteredMembers.length} av {members.length}</h4></div><span className="count-pill">{members.filter(m=>m.active).length} aktive</span></div><div className="engine-fields"><label>Søk etter medlem<input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Namn, e-post eller rolle"/></label><label>Vis<select value={memberFilter} onChange={e=>setMemberFilter(e.target.value)}><option value="all">Alle medlemmar</option><option value="active">Aktive</option><option value="pending">Ventande søknader</option><option value="inactive">Inaktive</option><option value="rejected">Avslåtte</option></select></label></div><div className="admin-member-help">Her handterer du søknader, medlemskap, roller og tilgang. Berre admin kan godkjenna nye medlemmer og endra roller.</div>{isAdmin&&<div className="admin-approval-summary"><strong>{members.filter(m=>m.membership_status==="pending").length} ventande søknader</strong><button type="button" className="secondary-button" onClick={()=>setMemberFilter("pending")}>Vis søknader</button></div>}{filteredMembers.length?filteredMembers.map(m=>{const count=rankCounts[m.id]||0;const rank=rankForCount(count);const canManage=canManageMember(m);const isSelf=m.id===profile.id;return <article className="admin-member admin-member-enhanced" key={m.id}><div className="admin-member-main">{editingMemberId===m.id?<form className="admin-member-rename" onSubmit={e=>{e.preventDefault();saveMemberName(m)}}><label>Visingsnamn<input autoFocus maxLength={60} value={memberNameDraft} onChange={e=>setMemberNameDraft(e.target.value)} placeholder="Namn som skal visast i appen"/></label><div className="admin-member-actions"><button className="primary-button" disabled={busy===m.id}>Lagre namn</button><button type="button" className="secondary-button" onClick={cancelMemberRename}>Avbryt</button></div></form>:<><strong>{m.display_name||'Utan namn'}</strong><small>{m.email||'E-post ikkje registrert'} · {m.role} · {m.membership_status==='pending'?'Ventande godkjenning':m.membership_status==='rejected'?'Avslått':m.active?'Aktiv':'Deaktivert'} · {count} økter · {rank.title} (nivå {rank.level}){isSelf?' · Deg':''}</small></>}</div>{isAdmin&&m.membership_status==='pending'&&<div className="admin-member-actions"><button type="button" className="primary-button" disabled={busy===m.id} onClick={()=>updateMember(m,{membership_status:'approved',active:true})}>Godkjenn</button><button type="button" className="secondary-button" disabled={busy===m.id} onClick={()=>updateMember(m,{membership_status:'rejected',active:false})}>Avslå</button></div>}{canManage&&<div className="admin-member-actions">{editingMemberId!==m.id&&<button type="button" className="secondary-button" disabled={busy===m.id} onClick={()=>startMemberRename(m)}>Endra namn</button>}{isAdmin&&!isSelf&&<select aria-label={'Rolle for '+(m.display_name||'medlem')} value={m.role} onChange={e=>updateMember(m,{role:e.target.value})} disabled={busy===m.id}><option value="member">Medlem</option><option value="manager">Manager</option><option value="admin">Admin</option></select>}{!isSelf&&(isAdmin||m.role==='member')&&m.membership_status!=='pending'&&m.membership_status!=='rejected'&&<button className="secondary-button" disabled={busy===m.id} onClick={()=>updateMember(m,{active:!m.active})}>{m.active?'Deaktiver':'Aktiver'}</button>}{isAdmin&&!isSelf&&<button type="button" className="danger-button" disabled={busy===m.id} onClick={()=>deleteMember(m)}>Slett brukar</button>}</div>}</article>}):<div className="empty-state">Ingen medlemmar samsvarar med søket.</div>}</section>}
  {adminTab==='rang'&&<section className="engine-section"><div className="training-heading"><div><span className="section-kicker">MEDLEMSUTVIKLING</span><h4>Rang og achievements</h4></div><span className="count-pill">{members.length} medlemmar</span></div><div className="admin-achievement-summary"><div><Trophy size={18}/><strong>{members.filter(m=>(rankCounts[m.id]||0)>=1).length}</strong><span>Har starta</span></div><div><Medal size={18}/><strong>{members.filter(m=>(rankCounts[m.id]||0)>=10).length}</strong><span>10+ økter</span></div><div><Dumbbell size={18}/><strong>{members.filter(m=>(rankCounts[m.id]||0)>=50).length}</strong><span>50+ økter</span></div><div><Trophy size={18}/><strong>{members.filter(m=>(rankCounts[m.id]||0)>=100).length}</strong><span>100+ økter</span></div></div><div className="admin-rank-list">{[...members].sort((a,b)=>(rankCounts[b.id]||0)-(rankCounts[a.id]||0)).map((m,index)=>{const count=rankCounts[m.id]||0;const rank=rankForCount(count);return <article className="admin-rank-row" key={m.id}><div><strong>#{index+1} · {m.display_name||'Utan namn'}</strong><small>{rank.title} · nivå {rank.level} · {'★'.repeat(rank.stars)}{'☆'.repeat(3-rank.stars)} · {m.role}</small></div><b>{count} økter</b></article>})}</div><p className="admin-note">Achievements her er førebels treningsmilepålar baserte på talet på registrerte økter. Dei er ikkje eigne, tildelte medaljar enno.</p><div className="admin-rank-catalogue"><button type="button" className="rank-catalogue-toggle" aria-expanded={rankCatalogueOpen} onClick={()=>setRankCatalogueOpen(v=>!v)}><span><span className="section-kicker">HEILE RANGSTIGEN</span><strong>Alle rangar</strong></span><span className="rank-catalogue-toggle-meta"><span className="count-pill">{RANK_TITLES.length} rangar</span>{rankCatalogueOpen?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button>{rankCatalogueOpen&&<><label className="rank-catalogue-search"><Search size={15}/><input value={rankSearch} onChange={e=>setRankSearch(e.target.value)} placeholder="Søk etter rang eller nivå …"/></label>{(()=>{const q=rankSearch.trim().toLowerCase();const filtered=RANK_TITLES.map((title,i)=>({title,level:i+1,from:i===0?0:i*3+1,to:i===199?'600+':(i+1)*3})).filter(r=>!q||r.title.toLowerCase().includes(q)||String(r.level).includes(q));const groups=[];for(let i=0;i<filtered.length;i+=25)groups.push(filtered.slice(i,i+25));return groups.length?groups.map((group,index)=><details className="rank-catalogue-group" key={group[0].level} open={!!q||index===0}><summary><strong>Nivå {group[0].level}–{group[group.length-1].level}</strong><span>{group.length} rangar</span></summary><div className="rank-catalogue-list">{group.map(r=><div className="rank-catalogue-row" key={r.level}><strong>{r.level}. {r.title}</strong><span>{r.level===1?'Startgrad':r.level===200?'600 økter · Gull for evig':r.from+'–'+r.to+' økter'}</span><b>{r.level===1?'☆☆☆':'★★★'}</b></div>)}</div></details>):<div className="empty-state">Ingen rangar passar søket.</div>})()}</>}</div></section>}
  {adminTab==='kaffi'&&<section className="engine-section"><CoffeeBar profile={profile} ordersOnly/></section>}
  {adminTab==='ovingar'&&<section className="engine-section admin-exercises-panel">
   <div className="training-heading"><div><span className="section-kicker">BIBLIOTEK</span><h4>Øvingsbibliotek</h4><p>{filteredExercises.length} av {exercises.length} øvingar</p></div><div className="admin-exercise-heading-actions"><span className="count-pill">{exercises.filter(x=>x.is_active).length} aktive</span><button type="button" className="primary-button" onClick={()=>{setShowExerciseForm(v=>!v);if(editingExercise)cancelExerciseEdit()}}><Plus size={15}/>{showExerciseForm?'Skjul skjema':'Ny øving'}</button></div></div>
   <div className="admin-exercise-toolbar"><label className="admin-exercise-search"><Search size={16}/><input value={exerciseSearch} onChange={e=>setExerciseSearch(e.target.value)} placeholder="Søk etter øving, kategori eller utstyr …"/></label><label className="admin-exercise-filter"><Filter size={14}/><select aria-label="Filtrer øvingar" value={exerciseFilter} onChange={e=>setExerciseFilter(e.target.value)}><option value="all">Alle øvingar</option><option value="active">Aktive</option><option value="inactive">Skjulte</option></select></label></div>
   {showExerciseForm&&<form className="admin-create-form admin-exercise-form" onSubmit={addExercise}>
    <div className="admin-exercise-form-title"><strong>{editingExercise?'Rediger øving':'Legg til ny øving'}</strong><button type="button" className="icon-button" aria-label="Lukk skjema" onClick={cancelExerciseEdit}><ChevronUp size={17}/></button></div>
    <label>Namn på øving<input value={exerciseName} onChange={e=>setExerciseName(e.target.value)} placeholder="T.d. Goblet squat" required/></label>
    <div className="engine-fields"><label>Kategori<select value={category} onChange={e=>setCategory(e.target.value)}>{['Styrke','Mobilitet','Kondisjon','Kjerne','Rehab / fysio'].map(x=><option key={x}>{x}</option>)}</select></label><label>Kroppsdel<select value={bodyArea} onChange={e=>setBodyArea(e.target.value)}>{["Fullkropp","Bein","Mage","Rygg","Overkropp","Hofte","Skulder","Kne"].map(x=><option key={x}>{x}</option>)}</select></label><label>Utstyr<input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="T.d. stong, manualar"/></label></div>
    <label>Kort beskriving<textarea rows="2" value={exerciseDescription} onChange={e=>setExerciseDescription(e.target.value)} placeholder="Kort forklart: korleis utfører ein øvinga?"/></label>
    <section className="admin-dose-profile"><strong>Standard belastningsprofil</strong><p>Opprett éi øving per konkret variant, til dømes «Bench press – stong, flat» og «Bench press – manualar, incline». Verdiane blir førehandsutfylte i WOD Builder. La felt stå tomme dersom de ikkje har ein kvalitetssikra standard.</p>
     <label>Variantnamn<input value={variantLabel} onChange={e=>setVariantLabel(e.target.value)} placeholder="T.d. Stong · flat benk"/></label>
     <div className="admin-dose-profile-grid"><span>Nivå</span><span>Menn (kg)</span><span>Kvinner (kg)</span>
      {['rx','scaled','foundation'].map(level=><React.Fragment key={level}><strong>{level==='rx'?'RX':level==='scaled'?'Scaled':'Foundation'}</strong><input aria-label={level+' menn kg'} type="number" min="0" step="0.5" value={doseDefaults[level].men_kg} onChange={e=>setDoseDefaults(v=>({...v,[level]:{...v[level],men_kg:e.target.value}}))} placeholder="Ikkje sett"/><input aria-label={level+' kvinner kg'} type="number" min="0" step="0.5" value={doseDefaults[level].women_kg} onChange={e=>setDoseDefaults(v=>({...v,[level]:{...v[level],women_kg:e.target.value}}))} placeholder="Ikkje sett"/></React.Fragment>)}
     </div>
    </section>
    <label>Videolenke<input type="url" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://…"/></label>
    <div className="admin-member-actions"><button className="primary-button" disabled={busy==='exercise'}><Plus size={15}/>{busy==='exercise'?'Lagrar …':editingExercise?'Lagre endring':'Lagre øving'}</button><button type="button" className="secondary-button" onClick={cancelExerciseEdit}>Avbryt</button></div>
   </form>}
   <div className="admin-exercise-list">{filteredExercises.map(ex=><article className="admin-exercise-item" key={ex.id}><div className="admin-exercise-item-main"><strong>{ex.name}</strong><div className="admin-exercise-tags"><span>{ex.category}</span><span>{ex.body_area||'Fullkropp'}</span>{ex.equipment&&<span>{ex.equipment}</span>}{ex.prescription_profiles?.variant_label&&<span>{ex.prescription_profiles.variant_label}</span>}<span className={ex.is_active?'is-active':'is-hidden'}>{ex.is_active?'Aktiv':'Skjult'}</span></div>{ex.description&&<p>{ex.description}</p>}{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå video <span aria-hidden="true">↗</span></a>}</div><div className="admin-exercise-item-actions"><button type="button" className="secondary-button" onClick={()=>editExercise(ex)}>Rediger</button><button type="button" className="secondary-button" onClick={()=>toggleExercise(ex)} disabled={busy===ex.id}>{ex.is_active?'Skjul':'Aktiver'}</button></div></article>)}{!filteredExercises.length&&<div className="empty-state">Ingen øvingar passar søket eller filteret.</div>}</div>
  </section>}

 </div>
}
