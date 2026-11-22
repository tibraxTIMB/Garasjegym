import {useEffect,useMemo,useState} from 'react'
import {FileImage,FileText,Upload,ClipboardPaste,CheckCircle2,AlertTriangle,Search,X,Check,SkipForward} from 'lucide-react'
import {parseWodImport} from '../lib/wodImport.js'
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
 const [choices,setChoices]=useState({})
 const [searchOpen,setSearchOpen]=useState({})
 const [searchTerms,setSearchTerms]=useState({})
 const preview=useMemo(()=>parsed?.items||[],[parsed])
 const unresolved=preview.filter((item,index)=>!item.exercise&&!choices[index]).length
 const included=preview.filter((item,index)=>choices[index]!=='skip'&&(item.exercise||choices[index])).length
 const ignored=parsed?.ignored||[]
 useEffect(()=>()=>{if(filePreview)URL.revokeObjectURL(filePreview)},[filePreview])
 async function readFile(file){
  if(!file)return
  setFileName(file.name);setError('');setParsed(null);setIsPdf(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))
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
 function parse(){setError('');setChoices({});setSearchOpen({});setSearchTerms({});try{setParsed(parseWodImport(source,exerciseCatalog))}catch(e){setParsed(null);setError(e.message||'Kunne ikkje tolka WOD-teksten.')}}
 function choose(index,exercise){setChoices(current=>({...current,[index]:exercise}));setSearchOpen(current=>({...current,[index]:false}))}
 function apply(){
  if(unresolved){setError('Vel ei øving frå biblioteket eller «Hopp over» for kvar ukjend linje.');return}
  const rows=preview.flatMap((item,index)=>{
   const choice=choices[index]
   if(choice==='skip')return []
   const exercise=choice||item.exercise
   return exercise?[{...item,name:exercise.name,exercise,matched:true}]:[]
  })
  if(!rows.length){setError('Vel minst éi øving før du går vidare.');return}
  setError('')
  onApply?.({...parsed,items:rows,unmatched:[]})
 }
 return <section className="wod-import-panel">
  <div className="wod-import-head"><div><span className="wod-classic-kicker">KOPIER TIL BIBLIOTEKET</span><strong>Importer WOD</strong><small>Lim inn tekst eller bruk ei fil som kjelde. Kontroller alltid dosering og øvingsnamn.</small></div><ClipboardPaste size={22}/></div>
  <label className="wod-import-file"><Upload size={16}/> Last opp kjelde<input type="file" accept=".txt,.csv,.md,.pdf,image/*" onChange={event=>readFile(event.target.files?.[0])}/></label>
  {fileName&&<div className="wod-import-file-name">{filePreview?<FileImage size={15}/>:<FileText size={15}/>} {fileName}</div>}
  {filePreview&&<div className="wod-import-source-preview">{isPdf?<iframe title="PDF-kjelde" src={filePreview}/>:<img src={filePreview} alt="Opplasta WOD-kjelde"/>}</div>}
  <label className="wod-import-text-label">WOD-tekst<textarea rows="6" value={source} onChange={event=>{setSource(event.target.value);setParsed(null)}} placeholder={'FRAN\n21-15-9\nThrusters 43 kg\nPull-ups'} /></label>
  {ocrBusy&&<div className="wod-import-message"><FileImage size={15}/> Les bilete med OCR … {ocrProgress}%</div>}
  {error&&<div className="wod-import-message"><AlertTriangle size={15}/>{error}</div>}
  <div className="wod-import-actions"><button type="button" className="secondary-button" onClick={parse} disabled={!source.trim()||ocrBusy}>Analyser tekst</button></div>
  {parsed&&<div className="wod-import-result">
   <div className="wod-import-result-head"><CheckCircle2 size={17}/><div><strong>Gå gjennom øvingane</strong><small>{preview.length} tolka linjer · {unresolved?unresolved+' må avklarast': 'klare for import'}</small></div></div>
   <div className="wod-import-meta"><span>{parsed.name}</span><span>{parsed.format||'Format uavklart'}</span><span>{parsed.minutes?parsed.minutes+' min':'Varigheit uavklart'}</span><span>{parsed.rounds} {parsed.rounds===1?'runde':'rundar'}</span></div>
   <div className="wod-import-review-list">{preview.map((item,index)=>{
    const choice=choices[index]
    const skipped=choice==='skip'
    const selected=choice&&!skipped?choice:item.exercise
    const searching=searchOpen[index]
    const query=(searchTerms[index]||'').toLocaleLowerCase('nn-NO').trim()
    const results=query?exerciseCatalog.filter(ex=>[ex.name,ex.equipment,ex.category].some(value=>String(value||'').toLocaleLowerCase('nn-NO').includes(query))).slice(0,8):exerciseCatalog.slice(0,8)
    return <article className={'wod-import-review-item'+(skipped?' is-skipped':selected?' is-resolved':' needs-choice')} key={index}>
     <div className="wod-import-review-top"><span className="wod-import-order">{index+1}</span><div className="wod-import-review-text"><strong>{item.rawName||item.name}</strong><small>{item.quantity?item.quantity.value+' '+item.quantity.unit:item.reps?item.reps+' reps':'Dosering uavklart'}{item.loadKg?' · ca. '+item.loadKg.toFixed(1)+' kg':''}</small></div><span className="wod-import-status">{skipped?'Hoppa over':selected?'Funne':'Kontroller'}</span></div>
     {selected&&!skipped&&<div className="wod-import-matched"><Check size={14}/> {selected.name}{selected.name!==(item.rawName||item.name)?' · frå biblioteket':''}</div>}
     {!selected&&!skipped&&<div className="wod-import-suggestions"><small>{item.suggestions?.length?'Moglege tilsvarande øvingar:':'Ingen sikre treff. Søk i øvingsbiblioteket:'}</small><div className="wod-import-suggestion-buttons">{(item.suggestions||[]).map(ex=><button type="button" key={ex.id||ex.name} onClick={()=>choose(index,ex)}>{ex.name}</button>)}</div></div>}
     {(searching||!selected&&!skipped&&!item.suggestions?.length)&&!skipped&&<div className="wod-import-search"><label><Search size={15}/><input type="search" aria-label={'Søk etter øving for '+item.name} placeholder="Søk i heile biblioteket" value={searchTerms[index]||''} onChange={event=>setSearchTerms(current=>({...current,[index]:event.target.value}))}/></label><div className="wod-import-search-results">{results.map(ex=><button type="button" key={ex.id||ex.name} onClick={()=>choose(index,ex)}>{ex.name}</button>)}{!results.length&&<small>Ingen treff. Prøv eit anna namn, eller hopp over linja.</small>}</div></div>}
     <div className="wod-import-review-actions">
      {!skipped&&<button type="button" onClick={()=>setSearchOpen(current=>({...current,[index]:!searching}))}>{searching?<X size={13}/>:<Search size={13}/>} {searching?'Lukk søk':selected?'Vel ei anna':'Søk etter anna'}</button>}
      <button type="button" onClick={()=>{setChoices(current=>({...current,[index]:'skip'}));setSearchOpen(current=>({...current,[index]:false}))}}>{skipped?<Check size={13}/>:<SkipForward size={13}/>} {skipped?'Hoppa over':'Hopp over'}</button>
      {skipped&&<button type="button" onClick={()=>setChoices(current=>{const next={...current};delete next[index];return next})}>Ta med likevel</button>}
     </div>
    </article>
   })}</div>
   {ignored.length>0&&<details className="wod-import-ignored"><summary>{ignored.length} overskrifter og opplysningar vart ikkje tekne med som øvingar</summary><ul>{ignored.map((line,index)=><li key={index}>{line}</li>)}</ul></details>}
   <p className="wod-import-warning">Ingen ukjende øvingar blir lagde inn automatisk. Kontroller reps, belastning og oppsett i byggjaren etterpå.</p>
   <button type="button" className="primary-button wod-import-confirm" onClick={apply} disabled={unresolved>0||included===0}>{unresolved?unresolved+' øvingar må avklarast':'Bruk '+included+' '+(included===1?'øving':'øvingar')+' i WOD-byggjaren'}</button>
  </div>}
 </section>
}
