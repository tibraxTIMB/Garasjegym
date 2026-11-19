import {useEffect,useMemo,useState} from 'react'
import {FileImage,FileText,Upload,ClipboardPaste,CheckCircle2,AlertTriangle} from 'lucide-react'
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
 const preview=useMemo(()=>parsed?.items||[],[parsed])
 useEffect(()=>()=>{if(filePreview)URL.revokeObjectURL(filePreview)},[filePreview])
 async function readFile(file){
  if(!file)return
  setFileName(file.name);setError('');setParsed(null);setIsPdf(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf'))
  if(file.type.startsWith('text/')||/\.(txt|csv|md)$/i.test(file.name)){setSource(await file.text());setFilePreview('')}
  else if(file.type.startsWith('image/')){
   setFilePreview(URL.createObjectURL(file));setOcrBusy(true);setOcrProgress(0)
   try{
    const {createWorker}=await import('tesseract.js')
    const worker=await createWorker('eng',1,{logger:message=>{if(message.status==='recognizing text')setOcrProgress(Math.round((message.progress||0)*100))}})
    try{const result=await worker.recognize(file);setSource(result.data.text||'');setError(result.data.text?.trim()?'OCR-tekst er henta ut. Kontroller namn, format, øvingar og tal før import.':'OCR fann ikkje lesbar tekst. Skriv inn teksten manuelt.')}
    finally{await worker.terminate()}
   }catch(error){setError('Biletet er lasta inn, men OCR feila: '+(error.message||'ukjend feil')+'. Du kan framleis skrive eller lime inn teksten manuelt.')}
   finally{setOcrBusy(false)}
  }else if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
   setFilePreview(URL.createObjectURL(file));setIsPdf(true)
   setError('PDF-en er lasta inn som kjeldereferanse. Kopier teksten frå PDF-en og lim han inn i feltet under; automatisk PDF-tekstuttrekk er ikkje aktivert.')
  }else setError('Denne filtypen kan ikkje lesast direkte. Bruk TXT, CSV, Markdown, bilete eller PDF.')
 }
 function parse(){setError('');try{setParsed(parseWodImport(source,exerciseCatalog))}catch(e){setParsed(null);setError(e.message||'Kunne ikkje tolka WOD-teksten.')}}
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
   <div className="wod-import-result-head"><CheckCircle2 size={17}/><strong>Kontroller importen</strong></div>
   <div className="wod-import-meta"><span>{parsed.name}</span><span>{parsed.format||'Format uavklart'}</span><span>{parsed.minutes?parsed.minutes+' min':'Varigheit uavklart'}</span><span>{parsed.rounds} rundar</span></div>
   <ol>{preview.map((item,index)=><li key={index}><strong>{item.name}</strong><span>{item.reps} reps{item.loadKg?' · Importert last ca. '+item.loadKg.toFixed(1)+' kg – må stadfestast':''}</span>{!item.matched&&<small>Finst ikkje i øvingsbiblioteket – blir lagt inn som tekstnamn</small>}</li>)}</ol>
   {parsed.unmatched.length>0&&<p className="wod-import-warning">Nye/ukjende øvingar: {parsed.unmatched.join(', ')}.</p>}
   <button type="button" className="primary-button" onClick={()=>onApply?.(parsed)}>Bruk i WOD Builder</button>
  </div>}
 </section>
}
