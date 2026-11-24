import {useEffect,useMemo,useState} from 'react'
import {FileImage,FileText,Upload,ClipboardPaste,CheckCircle2,AlertTriangle,Search,X,Check,SkipForward,ScanSearch} from 'lucide-react'
import {parseWodImport} from '../lib/wodImport.js'
import {isFixedInterval,fixedIntervalSummary,fixedIntervalLabel,importIntervalAdvice,clockLabel} from '../lib/wodFormatAdvisor.js'
import {COMPOSITE_FORMAT, validateCompositeBlocks} from '../lib/compositeWod.js'
import './wod-import.css'

export default function WodImportPanel({exerciseCatalog=[],onApply}){
 const [source,setSource]=useState('')
 const [fileName,setFileName]=useState('')
 const [filePreview,setFilePreview]=useState('')
 const [isPdf,setIsPdf]=useState(false)
 const [ocrBusy,setOcrBusy]=useState(false)
 const [ocrProgress,setOcrProgress]=useState(0)
 const [error,setError]=useState('')
 const [parsed,setParsed]=useState(null)
 const [meta,setMeta]=useState({name:'',format:'',minutes:'',rounds:'1'})
 const [doseChanges,setDoseChanges]=useState({})
 const [approved,setApproved]=useState(false)
 const [choices,setChoices]=useState({})
 const [searchOpen,setSearchOpen]=useState({})
 const [searchTerms,setSearchTerms]=useState({})
 const preview=useMemo(()=>parsed?.items||[],[parsed])
 const unresolved=preview.filter((item,index)=>!item.exercise&&!choices[index]).length
 const included=preview.filter((item,index)=>choices[index]!=='skip'&&(item.exercise||choices[index])).length
 const ignored=parsed?.ignored||[]
 const warnings=parsed?.warnings||[]
 const compositeIssue=parsed?.blocks?.length>1?validateCompositeBlocks(parsed.blocks,preview.filter((item,index)=>choices[index]!=='skip')):''
 const intervalPlan=isFixedInterval(meta.format)?fixedIntervalSummary({workSeconds:meta.workSeconds,restSeconds:meta.restSeconds,rounds:meta.rounds,exerciseCount:included}):null
 const advice=parsed&&!parsed.blocks&&meta.format===parsed.format&&Number(meta.minutes)===Number(parsed.minutes)&&included===preview.length&&unresolved===0?importIntervalAdvice(parsed,included):null
 const activeCatalog=useMemo(()=>exerciseCatalog.filter(ex=>ex?.name&&ex.is_active!==false),[exerciseCatalog])
 const requiresDuration=/^(AMRAP|E(?:MOM|[1-7](?:\.25|\.5|\.75)?MOM)|Tabata|Intervall|Stasjonssirkel)$/.test(meta.format)
 const invalidQuantity=preview.some((item,index)=>choices[index]!=='skip'&&item.quantity&&(!Number.isFinite(Number(doseChanges[index]?.quantity??item.quantity.value))||Number(doseChanges[index]?.quantity??item.quantity.value)<=0))
 const invalidLoad=preview.some((item,index)=>choices[index]!=='skip'&&doseChanges[index]?.loadKg!==undefined&&doseChanges[index].loadKg!==''&&(!Number.isFinite(Number(doseChanges[index].loadKg))||Number(doseChanges[index].loadKg)<0))
 const invalidReps=preview.some((item,index)=>choices[index]!=='skip'&&!item.quantity&&!/^(?:\d+(?:-\d+)*|\d+\s*[x×]\s*\d+)$/.test(String(doseChanges[index]?.reps??item.reps).trim()))
 const invalidSetup=!!(isFixedInterval(meta.format)&&!intervalPlan)||!!(parsed?.blocks?.length>1&&meta.format!==COMPOSITE_FORMAT)||!meta.name.trim()||!meta.format||!Number.isInteger(Number(meta.rounds))||Number(meta.rounds)<1||Number(meta.rounds)>99||(meta.minutes!==''&&(!Number.isFinite(Number(meta.minutes))||Number(meta.minutes)<1||Number(meta.minutes)>300))||(requiresDuration&&!isFixedInterval(meta.format)&&!(Number(meta.minutes)>0))
 const ready=unresolved===0&&included>0&&!compositeIssue&&!invalidSetup&&!invalidQuantity&&!invalidReps&&!invalidLoad&&approved

 useEffect(()=>()=>{if(filePreview)URL.revokeObjectURL(filePreview)},[filePreview])
 async function readFile(file){
  if(!file)return
  setFileName(file.name);setError('');setParsed(null);setApproved(false);setIsPdf(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))
  if(file.type.startsWith('text/')||/\.(txt|csv|md)$/i.test(file.name)){setSource(await file.text());setFilePreview('')}
  else if(file.type.startsWith('image/')){
   setFilePreview(URL.createObjectURL(file));setOcrBusy(true);setOcrProgress(0)
   try{
    const {createWorker}=await import('tesseract.js')
    const options={logger:message=>{if(message.status==='recognizing text')setOcrProgress(Math.round((message.progress||0)*100))}}
    let worker
    try{worker=await createWorker(['eng','nor'],1,options)}
    catch{worker=await createWorker('eng',1,options)}
    try{const result=await worker.recognize(file);setSource(result.data.text||'');setError(result.data.text?.trim()?'OCR-tekst er henta ut. Kontroller namn, format, øvingar og tal før import.':'OCR fann ikkje lesbar tekst. Skriv inn teksten manuelt.')}
    finally{await worker.terminate()}
   }catch(error){setError('Biletet er lasta inn, men OCR feila: '+(error.message||'ukjend feil')+'. Du kan framleis skrive eller lime inn teksten manuelt.')}
   finally{setOcrBusy(false)}
  }else if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
   setFilePreview(URL.createObjectURL(file));setIsPdf(true)
   setError('PDF-en er lasta inn som kjeldereferanse. Kopier teksten frå PDF-en og lim han inn i feltet under; automatisk PDF-tekstuttrekk er ikkje aktivert.')
  }else setError('Denne filtypen kan ikkje lesast direkte. Bruk TXT, CSV, Markdown, bilete eller PDF.')
 }
 function parse(){setError('');setChoices({});setDoseChanges({});setApproved(false);setSearchOpen({});setSearchTerms({});try{const draft=parseWodImport(source,activeCatalog);setParsed(draft);setMeta({name:draft.name,format:draft.format||'',minutes:draft.minutes?String(draft.minutes):'',rounds:draft.rounds==null?'':String(draft.rounds),workSeconds:draft.fixedTiming?.workSeconds??'',restSeconds:draft.fixedTiming?.restSeconds??''})}catch(e){setParsed(null);setError(e.message||'Kunne ikkje tolka WOD-teksten.')}}
 function choose(index,exercise){setChoices(current=>({...current,[index]:exercise}));setApproved(false);setSearchOpen(current=>({...current,[index]:false}))}
 function apply(){
  if(unresolved){setError('Vel ei øving frå biblioteket eller «Hopp over» for kvar ukjend linje.');return}
  if(invalidSetup||compositeIssue){setError(compositeIssue||'Kontroller WOD-namn, format, rundar og påkravd tidsramme.');return}
  if(invalidQuantity||invalidLoad||invalidReps){setError('Kontroller doseringa: reps, mengd og belastning må vera gyldige tal.');return}
  if(!approved){setError('Admin må stadfesta at innhaldet er gjennomgått før overføring.');return}
  const rows=preview.flatMap((item,index)=>{
   const choice=choices[index]
   if(choice==='skip')return []
   const exercise=choice||item.exercise
   const dose=doseChanges[index]||{}
   return exercise?[{...item,name:exercise.name,exercise,matched:true,
    reps:item.quantity?'':String(dose.reps??item.reps).trim(),
    quantity:item.quantity?{...item.quantity,value:Number(dose.quantity??item.quantity.value)}:null,
    loadKg:dose.loadKg!==undefined?(dose.loadKg===''?null:Number(dose.loadKg)):item.loadKg
   }]:[]
  })
  if(!rows.length){setError('Vel minst éi øving før du går vidare.');return}
  setError('')
  onApply?.({...parsed,name:meta.name.trim(),format:meta.format,minutes:meta.minutes?Number(meta.minutes):null,rounds:Number(meta.rounds),...(intervalPlan?{fixedTiming:{workSeconds:intervalPlan.workSeconds,restSeconds:intervalPlan.restSeconds}}:{}),items:rows,unmatched:[],reviewedByAdmin:true})
 }
 return <section className="wod-import-panel">
  <div className="wod-import-head"><div><span className="wod-classic-kicker">ADMIN · SMART WOD-ASSISTENT</span><strong>Regelbasert WOD-import og bibliotekskontroll</strong><small>Lokal, regelbasert teksttolking – utan betalt KI-teneste. Du får forslag, men avgjer sjølv kva som blir brukt.</small></div><ScanSearch size={22}/></div>
  <label className="wod-import-file"><Upload size={16}/> Last opp kjelde<input type="file" accept=".txt,.csv,.md,.pdf,image/*" onChange={event=>readFile(event.target.files?.[0])}/></label>
  {fileName&&<div className="wod-import-file-name">{filePreview?<FileImage size={15}/>:<FileText size={15}/>} {fileName}</div>}
  {filePreview&&<div className="wod-import-source-preview">{isPdf?<iframe title="PDF-kjelde" src={filePreview}/>:<img src={filePreview} alt="Opplasta WOD-kjelde"/>}</div>}
  <label className="wod-import-text-label">WOD-tekst<textarea rows="6" value={source} onChange={event=>{setSource(event.target.value);setParsed(null);setApproved(false)}} placeholder={'FRAN\n21-15-9\nThrusters 43 kg\nPull-ups'} /></label>
  {ocrBusy&&<div className="wod-import-message"><FileImage size={15}/> Les bilete med OCR … {ocrProgress}%</div>}
  {error&&<div className="wod-import-message"><AlertTriangle size={15}/>{error}</div>}
  <div className="wod-import-actions"><button type="button" className="secondary-button" onClick={parse} disabled={!source.trim()||ocrBusy} >Analyser og samanlikn med øvingsbibliotek</button></div>
  {parsed&&<div className="wod-import-result">
   <div className="wod-import-result-head"><CheckCircle2 size={17}/><div><strong>Admin-kontroll før overføring</strong><small>{preview.length} tolka linjer · {unresolved?unresolved+' må avklarast':'alle bibliotekstreff er avklarte'}</small></div></div>
   {parsed.blocks?.length>1&&<div className="wod-import-composite-preview"><strong>Samansett treningsøkt · {parsed.blocks.length} delar</strong>{parsed.blocks.map((block,i)=><p key={block.id}>{i+1}. {block.title} · {block.format} · {block.minutes} min · {preview.filter(item=>item.block_id===block.id).length} øvingar</p>)}<small>Delane blir førte til WOD Builder med kvar sin timer. PT-notat og originale belastningsalternativ ligg i kjeldeteksten.</small></div>}
    <div className="wod-import-meta-editor">
    <label>WOD-namn<input type="text" maxLength="100" value={meta.name} onChange={e=>{setMeta(current=>({...current,name:e.target.value}));setApproved(false)}}/></label>
    <label>GarasjeGym-format<select value={meta.format} onChange={e=>{setMeta(current=>({...current,format:e.target.value}));setApproved(false)}}>
     <option value="">Vel format – uavklart</option>
     {[COMPOSITE_FORMAT,'AMRAP','For Time','Chipper','EMOM','E1MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM','Tabata','Intervall','Stasjonssirkel','Complex','Eigen økt','Strength'].map(f=><option key={f} value={f}>{f}</option>)}
    </select></label>
    <label>Tidsramme (min){requiresDuration?' *':''}<input type="number" min="1" max="300" step="1" value={meta.minutes} onChange={e=>{setMeta(current=>({...current,minutes:e.target.value}));setApproved(false)}} placeholder="Ingen tidsramme"/></label>
    <label>Rundar<input type="number" min="1" max="99" step="1" value={meta.rounds} onChange={e=>{setMeta(current=>({...current,rounds:e.target.value}));setApproved(false)}}/></label>
   </div>
   {advice&&<div className="wod-import-review-hint"><div><strong>Fast arbeid og kvile?</strong><p>{advice.workSeconds}/{advice.restSeconds} sek · {fixedIntervalLabel(advice)}. EMOM varer {clockLabel(advice.sourceSeconds)}; Intervall sluttar {advice.finalRestSeconds} sek tidlegare. Byt berre dersom øvingane går på omgang, ikkje samtidig.</p><button type="button" className="secondary-button" onClick={()=>{setMeta(current=>({...current,format:'Intervall',rounds:String(advice.rounds),minutes:String(Math.ceil(advice.totalSeconds/60)),workSeconds:advice.workSeconds,restSeconds:advice.restSeconds}));setApproved(false)}}>Bruk intervall · øvingane går på omgang</button></div></div>}
   {isFixedInterval(meta.format)&&<div className="wod-import-meta-editor"><label>Arbeid (sek)<input type="number" min="1" max="600" value={meta.workSeconds??''} onChange={e=>{setMeta(current=>({...current,workSeconds:e.target.value}));setApproved(false)}}/></label><label>Kvile (sek)<input type="number" min="0" max="600" value={meta.restSeconds??''} onChange={e=>{setMeta(current=>({...current,restSeconds:e.target.value}));setApproved(false)}}/></label><p className="wod-help">{fixedIntervalLabel(intervalPlan)}</p></div>}
   {warnings.length>0&&<details className="wod-import-warnings"><summary><AlertTriangle size={15}/> {warnings.length} punkt som krev manuell kontroll</summary><ul>{warnings.map((item,i)=><li key={i}>{item}</li>)}</ul></details>}{compositeIssue&&<div className="wod-import-review-hint"><AlertTriangle size={15}/>{compositeIssue}</div>}
    {(!parsed.format||!parsed.minutes)&&<div className="wod-import-review-hint"><AlertTriangle size={15}/><span>{!parsed.format?'Format vart ikkje funne sikkert. Vel rett WOD-format. ':''}{!parsed.minutes?'Tidsramma må vurderast før import.':''}</span></div>}
   <div className="wod-import-review-list">{preview.map((item,index)=>{
    const choice=choices[index]
    const skipped=choice==='skip'
    const selected=choice&&!skipped?choice:item.exercise
    const searching=searchOpen[index]
    const query=(searchTerms[index]||'').toLocaleLowerCase('nn-NO').trim()
    const results=query?activeCatalog.filter(ex=>[ex.name,ex.equipment,ex.category].some(value=>String(value||'').toLocaleLowerCase('nn-NO').includes(query))).slice(0,8):activeCatalog.slice(0,8)
    return <article className={'wod-import-review-item'+(skipped?' is-skipped':selected?' is-resolved':' needs-choice')} key={index}>
     <div className="wod-import-review-top"><span className="wod-import-order">{index+1}</span><div className="wod-import-review-text"><strong>{item.rawName||item.name}</strong><small>{item.quantity?item.quantity.value+' '+item.quantity.unit:item.reps?item.reps+' reps':'Dosering uavklart'}{item.sets?' · '+item.sets+' sett':''}{item.loadKg?' · ca. '+item.loadKg.toFixed(1)+' kg':''}{item.rirTarget?' · RIR '+item.rirTarget:''}{item.block_id?' · '+(parsed.blocks?.find(x=>x.id===item.block_id)?.title||item.block_id):''}</small></div><span className="wod-import-status">{skipped?'Hoppa over':selected?(selected.name!==(item.rawName||item.name)?'Liknande treff – kontroller':'Funne'):'Kontroller'}</span></div>
     {selected&&!skipped&&<div className="wod-import-matched"><Check size={14}/> {selected.name}{selected.name!==(item.rawName||item.name)?' · tilsvarande namn, kontroller at varianten er rett':''}</div>}
     {!skipped&&<div className="wod-import-dose-editor">
      {item.quantity
       ?<label>{({m:'Mengd (meter)',cal:'Kaloriar',s:'Sekund',min:'Minutt'})[item.quantity.unit]||'Mengd'}<input type="number" min="0.01" step="any" inputMode="decimal" value={doseChanges[index]?.quantity??item.quantity.value} onChange={e=>{setDoseChanges(current=>({...current,[index]:{...current[index],quantity:e.target.value}}));setApproved(false)}}/></label>
       :<label>Repetisjonar / rekkje<input type="text" inputMode="numeric" value={doseChanges[index]?.reps??item.reps} onChange={e=>{setDoseChanges(current=>({...current,[index]:{...current[index],reps:e.target.value}}));setApproved(false)}}/></label>}
      <label>Belastning (kg, valfritt)<input type="number" min="0" step="any" inputMode="decimal" placeholder="Ikkje oppgitt" value={doseChanges[index]?.loadKg??(item.loadKg??'')} onChange={e=>{setDoseChanges(current=>({...current,[index]:{...current[index],loadKg:e.target.value}}));setApproved(false)}}/></label>
     </div>}
     {!selected&&!skipped&&<div className="wod-import-suggestions"><small>{item.suggestions?.length?'Moglege tilsvarande øvingar:':'Ingen sikre treff. Søk i øvingsbiblioteket:'}</small><div className="wod-import-suggestion-buttons">{(item.suggestions||[]).map(ex=><button type="button" key={ex.id||ex.name} onClick={()=>choose(index,ex)}>{ex.name}</button>)}</div></div>}
     {(searching||!selected&&!skipped&&!item.suggestions?.length)&&!skipped&&<div className="wod-import-search"><label><Search size={15}/><input type="search" aria-label={'Søk etter øving for '+item.name} placeholder="Søk i heile biblioteket" value={searchTerms[index]||''} onChange={event=>setSearchTerms(current=>({...current,[index]:event.target.value}))}/></label><div className="wod-import-search-results">{results.map(ex=><button type="button" key={ex.id||ex.name} onClick={()=>choose(index,ex)}>{ex.name}</button>)}{!results.length&&<small>Ingen treff. Prøv eit anna namn, eller hopp over linja.</small>}</div></div>}
     <div className="wod-import-review-actions">
      {!skipped&&<button type="button" onClick={()=>setSearchOpen(current=>({...current,[index]:!searching}))}>{searching?<X size={13}/>:<Search size={13}/>} {searching?'Lukk søk':selected?'Vel ei anna':'Søk etter anna'}</button>}
      <button type="button" onClick={()=>{setApproved(false);setChoices(current=>({...current,[index]:'skip'}));setSearchOpen(current=>({...current,[index]:false}))}}>{skipped?<Check size={13}/>:<SkipForward size={13}/>} {skipped?'Hoppa over':'Hopp over'}</button>
      {skipped&&<button type="button" onClick={()=>{setApproved(false);setChoices(current=>{const next={...current};delete next[index];return next})}}>Ta med likevel</button>}
     </div>
    </article>
   })}</div>
   {ignored.length>0&&<details className="wod-import-ignored"><summary>{ignored.length} overskrifter og opplysningar vart ikkje tekne med som øvingar</summary><ul>{ignored.map((line,index)=><li key={index}>{line}</li>)}</ul></details>}
   <p className="wod-import-warning">Berre aktive øvingar frå biblioteket kan overførast. Eit tilsvarande treff er eit forslag, ikkje ei automatisk erstatning. Resultatet blir eit upublisert utkast i WOD-byggjaren.</p>
   <label className="wod-import-admin-approval"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/><span>Eg har kontrollert namn, format, rundar, øvingar, dosering og eventuelle erstatningar. Overfør som utkast.</span></label>
   <button type="button" className="primary-button wod-import-confirm" onClick={apply} disabled={!ready}>{unresolved?unresolved+' øvingar må avklarast':compositeIssue?'Kontroller øktdelane':invalidSetup?'Kontroller WOD-oppsettet':!approved?'Stadfest admin-kontroll':'Bruk '+included+' '+(included===1?'øving':'øvingar')+' i WOD-byggjaren'}</button>
  </div>}
 </section>
}
