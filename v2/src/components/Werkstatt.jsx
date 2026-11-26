import {useEffect,useMemo,useRef,useState} from 'react'
import {Dumbbell,CalendarDays,Users,Settings,Upload,Download,RefreshCw,Monitor,FileText} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import WodImportPanel from './WodImportPanel.jsx'
import PlanProduction from './PlanProduction.jsx'
import ProjectControl from './ProjectControl.jsx'
import {readProjects,persistProjects,checkpoint,restoreRevision,projectSnapshot} from '../lib/meisterwerkProjects.js'
import {readPlanProject,savePlanProject,clearPlanProject} from '../lib/werkstattProjects.js'
import {exchangeRole,MAX_EXCHANGE_BYTES,parsePlanDocument,planCsv,planDocument,planText,wodDocument,wodText,wodCsv,wodImportSource,saveExchange,printExchange} from '../lib/werkstattExchange.js'
import './werkstatt.css'

export default function Werkstatt({profile,coachMode,onOpenWod,onBuildWod,onOpenPT,onOpenAdmin,onOpenCalendar,onOpenImport,onExit,onPreview}){
 const role=exchangeRole(profile,coachMode)
 const [tab,setTab]=useState('home'),[wods,setWods]=useState([]),[catalog,setCatalog]=useState([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [query,setQuery]=useState(''),[selected,setSelected]=useState([]),[source,setSource]=useState(''),[sourceVersion,setSourceVersion]=useState(0)
 const [planSource,setPlanSource]=useState(''),[planFormat,setPlanFormat]=useState('csv'),[planTitle,setPlanTitle]=useState('Importert treningsplan'),[preview,setPreview]=useState(null),[confirmed,setConfirmed]=useState(false),[saving,setSaving]=useState(false)
 const [projectRows,setProjectRows]=useState(()=>readPlanProject(profile.id)?.rows||[{week:1,day:1,title:'',wod:'',minutes:45,kind:'training'}]),[projectTitle,setProjectTitle]=useState(()=>readPlanProject(profile.id)?.title||'Ny treningsplan')
 const [projectProtected,setProjectProtected]=useState(true)
 useEffect(()=>{if(role.planTemplate)setProjectProtected(savePlanProject(profile.id,{title:projectTitle,rows:projectRows}))},[profile.id,projectTitle,projectRows,role.planTemplate])
 const [archive,setArchive]=useState(()=>readProjects(profile.id)),[projectId,setProjectId]=useState(null),[undo,setUndo]=useState([]),[redo,setRedo]=useState([])
 const request=useRef(0),lock=useRef(false)
 function currentProject(){return projectSnapshot({title:projectTitle,rows:projectRows})}
 function applyProject(p){setProjectTitle(p.title);setProjectRows(p.rows);invalidateProject()}
 function editProject(p){setUndo(a=>[...a,currentProject()].slice(-30));setRedo([]);applyProject(p)}
 function undoProject(){if(!undo.length)return;setRedo(a=>[...a,currentProject()].slice(-30));applyProject(undo.at(-1));setUndo(a=>a.slice(0,-1))}
 function redoProject(){if(!redo.length)return;setUndo(a=>[...a,currentProject()].slice(-30));applyProject(redo.at(-1));setRedo(a=>a.slice(0,-1))}
 function saveCheckpoint(){try{const id=projectId||crypto.randomUUID();const next=persistProjects(profile.id,checkpoint(readProjects(profile.id),id,currentProject(),new Date().toISOString()));setArchive(next);setProjectId(id);setNotice('Kontrollpunkt lagra lokalt.');setError('')}catch(e){setError(e.message)}}
 function openProject(id){const p=readProjects(profile.id).projects.find(p=>p.id===id);if(!p)return;if(!window.confirm('Opna prosjektet? Lagre kontrollpunkt først dersom du vil behalda gjeldande endringar.'))return;applyProject(p);setProjectId(id);setUndo([]);setRedo([])}
 function restoreProject(i){if(!projectId||!window.confirm('Gjenopprett lokal revisjon? Gjeldande arkivversjon blir bevart.'))return;try{const doc=readProjects(profile.id),withCurrent=checkpoint(doc,projectId,currentProject(),new Date().toISOString());const target=doc.projects.find(p=>p.id===projectId)?.revisions[i];if(!target)throw Error('Revisjonen finst ikkje.');const next=persistProjects(profile.id,checkpoint(withCurrent,projectId,target,new Date().toISOString(),'Før gjenoppretting'));setArchive(next);applyProject(next.projects.find(p=>p.id===projectId));setUndo([]);setRedo([])}catch(e){setError(e.message)}}
 async function load(){
  const seq=++request.current;setLoaded(false);setError('');setPreview(null);setConfirmed(false)
  try{
   const results=await Promise.all([supabase.from('wods').select('id,name,format,category,duration_minutes,movements,notes,timer_settings,is_published,is_archived').eq('is_published',true).eq('is_archived',false).order('name'),role.importWod?supabase.from('exercises').select('id,name,category,equipment,body_area,description,is_active,is_rehab,prescription_profiles').eq('is_active',true).order('name'):Promise.resolve({data:[]})])
   if(seq!==request.current)return
   const failed=results.find(r=>r.error);if(failed)throw failed.error
   setWods(results[0].data||[]);setCatalog(results[1].data||[]);setSelected(old=>old.filter(id=>(results[0].data||[]).some(w=>w.id===id)));setLoaded(true)
  }catch(e){if(seq===request.current)setError(e.message||'Kunne ikkje lesa biblioteket.')}
 }
 useEffect(()=>{if(role.office)load();return()=>{request.current++}},[profile.id,role.office,role.importWod])
 const filtered=useMemo(()=>wods.filter(w=>[w.name,w.format,w.category].some(x=>String(x||'').toLowerCase().includes(query.toLowerCase()))),[wods,query])
 const picked=wods.filter(w=>selected.includes(w.id))
 async function readWod(file){if(!file)return;setError('');try{if(file.size>MAX_EXCHANGE_BYTES)throw Error('Maks 2 MB for CSV og JSON.');setSource(wodImportSource(await file.text(),file.name.toLowerCase().endsWith('.json')?'json':'csv'));setSourceVersion(x=>x+1);setNotice('Kjeldeteksten er klargjord. Kontroller format, dosering og skalering; dette er ikkje tapsfri JSON-gjenoppretting.')}catch(e){setError(e.message)}}
 async function readPlan(file){if(!file)return;setError('');setPreview(null);setConfirmed(false);try{if(file.size>MAX_EXCHANGE_BYTES)throw Error('Maks 2 MB.');setPlanSource(await file.text());setPlanFormat(file.name.toLowerCase().endsWith('.json')?'json':'csv')}catch(e){setError(e.message)}}
 function invalidateProject(){setPreview(null);setConfirmed(false)}
 function checkProject(){setError('');invalidateProject();try{const p=parsePlanDocument(JSON.stringify({type:'garasjegym.plan',version:1,title:projectTitle,sessions:projectRows}),'json',wods);setPreview(p);setPlanTitle(p.title)}catch(e){setError(e.message)}}
 function checkPlan(){setError('');setPreview(null);setConfirmed(false);try{const p=parsePlanDocument(planSource,planFormat,wods);setPreview(p);setPlanTitle(p.title)}catch(e){setError(e.message)}}
 async function savePlan(){
  if(!role.planTemplate||!preview||!confirmed||lock.current||!planTitle.trim())return
  lock.current=true;setSaving(true);setError('')
  try{
   const {data:auth,error:a}=await supabase.auth.getUser();if(a||auth?.user?.id!==profile.id)throw Error('Innlogginga er endra.')
   const {data:current,error:e}=await supabase.from('profiles').select('id,role,active,membership_status').eq('id',profile.id).single()
   if(e||!exchangeRole(current).planTemplate)throw Error('Du har ikkje lenger tilgang til planmalar.')
   const {error:failure}=await supabase.from('pt_program_templates').insert({title:planTitle.trim().slice(0,160),description:'Importert og kontrollert i Werkstatt',template_type:'training_plan',weeks:preview.weeks,sessions_per_week:preview.sessions_per_week,focus_areas:[],sessions:preview.sessions,created_by:profile.id})
   if(failure)throw failure
   setNotice('Planmalen er lagra. Vel kunden og tildel malen i PT Studio. Ingen kundeplan er oppretta eller endra.');setPreview(null);setConfirmed(false);setPlanSource('')
  }catch(e){setError(e.message||'Kunne ikkje lagra malen.')}finally{lock.current=false;setSaving(false)}
 }
 function exportWods(format){if(!picked.length)return;try{if(format==='pdf')printExchange('GarasjeGym · WOD',wodText(picked));else{const data=format==='json'?JSON.stringify(wodDocument(picked),null,2):format==='csv'?wodCsv(picked):wodText(picked,format==='md');saveExchange('garasjegym-wod.'+format,data,format==='json'?'application/json':format==='csv'?'text/csv;charset=utf-8':undefined)}}catch(e){setError(e.message)}}
 if(!role.office)return <section><p>Werkstatt krev godkjend PT- eller driftsrolle.</p><button type="button" onClick={onExit}>Tilbake</button></section>
 const tabs=[['home','Arbeidsbord'],['library','WOD-eksport'],...(role.importWod?[['import','WOD-import']]:[]),...(role.planTemplate?[['project','Plan Studio'],['plan','Planimport']]:[])]
 return <div className="gg-werkstatt">
  <header className="gg-werkstatt-head"><div><span className="section-kicker">GARASJEGYM 49 · PC COMPANION</span><h2>WERKSTATT</h2><p>Programmering, planlegging og drift. Same GarasjeGym, same data.</p></div><button type="button" className="secondary-button" onClick={onExit}>Til vanleg app</button></header>
  <nav className="gg-werkstatt-tabs" aria-label="Werkstatt"><span><Monitor size={17}/> Arbeidsflate</span>{tabs.map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} className={tab===id?'selected':''} onClick={()=>{setTab(id);invalidateProject();setError('');setNotice('')}}>{label}</button>)}<button type="button" className="secondary-button" onClick={load}><RefreshCw size={15}/> Oppdater</button></nav>
  {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="auth-message" role="status">{notice}</p>}
  {tab==='home'&&<div className="gg-werkstatt-grid">
    {role.staff&&<button type="button" onClick={onBuildWod}><Dumbbell/><strong>Bygg WOD</strong><span>Original WOD-byggjar · alle format og skaleringar</span></button>}
    <button type="button" onClick={onOpenWod}><FileText/><strong>WOD-bibliotek</strong><span>Finn, sjå og gjenbruk økter</span></button>
    <button type="button" onClick={onOpenPT}><Users/><strong>PT og treningsplanar</strong><span>Kundar, programmalar, tildeling og oppfølging</span></button>
    <button type="button" onClick={onOpenCalendar}><CalendarDays/><strong>Kalender</strong><span>Planlagde aktivitetar og booking</span></button>
    {role.staff&&<button type="button" onClick={onOpenAdmin}><Settings/><strong>Administrasjon</strong><span>Medlemmer, bibliotek, utstyr og drift</span></button>}
    <button type="button" onClick={()=>setTab('library')}><Download/><strong>Filutveksling</strong><span>CSV, JSON, Markdown, tekst og utskrift</span></button>
    {role.importWod&&<button type="button" onClick={()=>setTab('import')}><Upload/><strong>Importer WOD</strong><span>Tekst, CSV, JSON-kjelde, bilete og PDF-referanse</span></button>}
    {role.planTemplate&&<button type="button" onClick={()=>setTab('project')}><CalendarDays/><strong>Planproduksjon</strong><span>Rediger økter, veker, WOD-koplingar og prosjektkontroll</span></button>}
    {role.planTemplate&&<button type="button" onClick={()=>setTab('plan')}><Upload/><strong>Importer planmal</strong><span>CSV / JSON, veke, dag og bibliotekskopling</span></button>}
  </div>}
  {tab==='library'&&<section className="gg-werkstatt-panel"><h3>Eksporter publiserte WOD-ar</h3><p>Vel éi eller fleire økter. Private kunde-WOD-ar og personlege resultat er ikkje med.</p><div className="gg-werkstatt-toolbar"><input aria-label="Søk i eksportbibliotek" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Søk namn eller format"/><button type="button" className="secondary-button" onClick={()=>setSelected(old=>[...new Set([...old,...filtered.map(w=>w.id)])])}>Vel viste ({filtered.length})</button><button type="button" className="secondary-button" onClick={()=>setSelected([])}>Nullstill val</button></div>
    <div className="gg-werkstatt-toolbar">{['csv','json','md','txt','pdf'].map(f=><button type="button" key={f} className="secondary-button" disabled={!loaded||!picked.length} onClick={()=>exportWods(f)}>{f==='pdf'?'Skriv ut / PDF':f.toUpperCase()}</button>)}<small>{picked.length} valde</small></div>
    <div className="gg-werkstatt-table-wrap"><table><thead><tr><th>Vel</th><th>Namn</th><th>Format</th><th>Min</th></tr></thead><tbody>{filtered.map(w=><tr key={w.id}><td><input type="checkbox" aria-label={'Vel '+w.name} checked={selected.includes(w.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,w.id]:old.filter(id=>id!==w.id))}/></td><td>{w.name}{onPreview&&w.timer_settings?.workout_schema&&<button type="button" className="text-button" onClick={()=>onPreview(w)}>Test på nettbrett</button>}</td><td>{w.format}</td><td>{w.duration_minutes??'–'}</td></tr>)}</tbody></table></div>{!filtered.length&&<p>{loaded?'Ingen WOD-ar funne.':'Hentar bibliotek …'}</p>}
  </section>}
  {tab==='import'&&role.importWod&&<section className="gg-werkstatt-panel"><h3>WOD-import</h3><p>CSV/JSON blir omforma til kjeldetekst; full dosering og alle format må kontrollerast i byggjaren. PDF krev kopiert tekst. Ingenting blir publisert ved import.</p><div className="gg-werkstatt-toolbar"><label>Strukturert kjelde <input type="file" accept=".csv,.tsv,.json" onChange={e=>readWod(e.target.files?.[0])}/></label><button type="button" className="secondary-button" onClick={()=>saveExchange('wod-mal.csv','\uFEFFname;format;minutes;exercise;reps;kg\r\nDøme;AMRAP;12;Air squat;10;\r\n','text/csv;charset=utf-8')}>Last ned CSV-mal</button></div>
   {loaded?<WodImportPanel key={sourceVersion} initialSource={source} exerciseCatalog={catalog} onApply={onOpenImport}/>:<p>Hentar øvingsbibliotek …</p>}
  </section>}
  {tab==='project'&&role.planTemplate&&<section className="gg-werkstatt-panel"><div className="gg-werkstatt-toolbar"><small role="status">{projectProtected?'Prosjektkladd sikra lokalt på denne PC-en':'Lokal lagring utilgjengeleg – eksporter prosjektet før du går vidare'}</small><button type="button" className="secondary-button" onClick={()=>saveExchange('planprosjekt.json',JSON.stringify({type:'garasjegym.plan',version:1,title:projectTitle,sessions:projectRows},null,2),'application/json')}>Eksporter prosjektkladd</button><button type="button" className="secondary-button" disabled={saving} onClick={()=>{if(window.confirm('Start eit nytt planprosjekt? Den lokale kladden blir erstatta.')){clearPlanProject(profile.id);setProjectId(null);setUndo([]);setRedo([]);setProjectTitle('Ny treningsplan');setProjectRows([{week:1,day:1,title:'',wod:'',minutes:45,kind:'training'}]);invalidateProject()}}}>Nytt prosjekt</button></div><ProjectControl archive={archive} projectId={projectId} onSelect={openProject} onCheckpoint={saveCheckpoint} onRestore={restoreProject} onUndo={undoProject} onRedo={redoProject} canUndo={!!undo.length} canRedo={!!redo.length} rows={projectRows} wods={wods} disabled={saving}/><PlanProduction wods={wods} title={projectTitle} rows={projectRows} onTitle={v=>editProject({title:v,rows:projectRows})} onRows={v=>editProject({title:projectTitle,rows:v})} onCheck={checkProject} disabled={!loaded||saving}/></section>}
  {tab==='plan'&&role.planTemplate&&<section className="gg-werkstatt-panel"><h3>Importer treningsplan som mal</h3><p>Bruk CSV med week, day, title, wod, minutes, kind, eller ein GarasjeGym-plan i JSON. WOD-namn må ha eitt eksakt bibliotekstreff. Import tildeler ikkje planen til nokon.</p><div className="gg-werkstatt-toolbar"><label>Planfil <input type="file" accept=".csv,.tsv,.json" onChange={e=>readPlan(e.target.files?.[0])} disabled={saving}/></label><button type="button" className="secondary-button" onClick={()=>saveExchange('plan-mal.csv',planCsv({sessions:[{week:1,day:1,title:'Grunnstyrke',wod:'',minutes:45,kind:'training'},{week:1,day:3,title:'Kondisjon',wod:'',minutes:30,kind:'training'}]}),'text/csv;charset=utf-8')}>Last ned planmal</button></div>
   <label>Format <select value={planFormat} disabled={saving} onChange={e=>{setPlanFormat(e.target.value);setPreview(null);setConfirmed(false)}}><option value="csv">CSV / TSV</option><option value="json">GarasjeGym JSON</option></select></label>
   <textarea aria-label="Planfilinnhald" value={planSource} disabled={saving} onChange={e=>{setPlanSource(e.target.value);setPreview(null);setConfirmed(false)}} rows={7} placeholder="Lim inn planinnhald"/>
   <button type="button" className="primary-button" disabled={!loaded||!planSource.trim()||saving} onClick={checkPlan}>Kontroller plan</button>
  </section>}
  {(tab==='project'||tab==='plan')&&preview&&role.planTemplate&&<section className="gg-werkstatt-panel"><div className="gg-werkstatt-preview"><label>Namn på ny mal<input value={planTitle} maxLength={160} disabled={saving} onChange={e=>{setPlanTitle(e.target.value);setConfirmed(false)}}/></label><p>{preview.weeks} veker · {preview.sessions.length} økter</p>{onPreview&&<button type="button" className="secondary-button" onClick={()=>onPreview({...preview,kind:'plan',title:planTitle})}>Test plan på nettbrett</button>}<div className="gg-werkstatt-table-wrap"><table><thead><tr><th>Veke</th><th>Dag</th><th>Økt</th><th>Min</th><th>WOD</th></tr></thead><tbody>{preview.sessions.map(s=><tr key={s.sequence_no}><td>{s.week_no}</td><td>{s.day_no}</td><td>{s.title}</td><td>{s.estimated_minutes}</td><td>{s.workout_snapshot?.wod_title||'Ingen'}</td></tr>)}</tbody></table></div><label><input type="checkbox" checked={confirmed} disabled={saving} onChange={e=>setConfirmed(e.target.checked)}/> Eg har kontrollert alle øktene og ønskjer å oppretta ein ny, sjølvstendig planmal.</label><button type="button" className="primary-button" disabled={!confirmed||!planTitle.trim()||saving} onClick={savePlan}>{saving?'Lagrar …':'Lagra ny planmal'}</button></div>
  </section>}
 </div>
}
