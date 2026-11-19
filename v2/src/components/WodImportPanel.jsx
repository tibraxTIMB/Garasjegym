import {useMemo,useState} from 'react'
import {FileImage,FileText,Upload,ClipboardPaste,CheckCircle2,AlertTriangle} from 'lucide-react'
import './wod-import.css'

const normalize=value=>String(value||'').toLocaleLowerCase('nn-NO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()
const formatFrom=text=>{
 const value=text.toLowerCase()
 if(/\bamrap\b/.test(value))return 'AMRAP'
 if(/\btabata\b/.test(value))return 'Tabata'
 if(/\be[1-7]mom\b|\bemom\b/.test(value)){const n=Number(value.match(/e([1-7])mom/)?.[1]||1);return 'E'+n+'MOM'}
 if(/\bstation|stasjonssirkel\b/.test(value))return 'Stasjonssirkel'
 if(/\bcomplex\b|kompleks/.test(value))return 'Complex'
 if(/\bintervall|intervals\b/.test(value))return 'Intervall'
 return 'For Time'
}
export function parseWodImport(source,exerciseCatalog=[]){
 const lines=String(source||'').split(/\r?\n/).map(line=>line.replace(/[•·]/g,' ').trim()).filter(Boolean)
 if(!lines.length)throw new Error('Lim inn WOD-tekst eller last opp ei tekstfil først.')
 const whole=lines.join('\n')
 const schemeLine=lines.find(line=>/\b\d{1,3}\s*[-–/]\s*\d{1,3}(?:\s*[-–/]\s*\d{1,3})+\b/.test(line))
 const scheme=schemeLine?.match(/\d{1,3}/g)?.map(Number)||null
 const first=lines[0]
 const firstIsMetadata=/\b(amrap|emom|tabata|for time|chipper|intervall|rounds?|rundar)\b/i.test(first)||/\d+\s*(min|minutes|minutt)/i.test(first)
 const name=!firstIsMetadata&&first.length<=48&&!/^\d/.test(first)?first:'Importert WOD'
 const minutesMatch=whole.match(/\b(\d{1,3})\s*(?:min(?:utt)?|minutes?)\b/i)
 const minutes=minutesMatch?Number(minutesMatch[1]):null
 const items=[]
 for(const line of lines){
  if(line===name||line===schemeLine)continue
  if(/\b(amrap|emom|tabata|for time|chipper|stasjonssirkel|intervall)\b/i.test(line)&&!/(thruster|squat|deadlift|pull|push|row|run|clean|snatch|burpee|plank|press|bike|wall ball|box)/i.test(line))continue
  if(/^\d+\s*(?:min|minutes|minutt)/i.test(line)||/^\d+\s*(?:rounds?|rundar)/i.test(line))continue
  const loadMatch=line.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\b/i)
  const load=loadMatch?Number(loadMatch[1].replace(',','.'))*(/lb/i.test(loadMatch[2])?0.45359237:1):null
  let exerciseText=line.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|lb|lbs)\b/ig,'').trim()
  let reps=scheme?scheme.join('-'):null
  const prefix=exerciseText.match(/^(\d+(?:\s*[-–/]\s*\d+)*)\s*(?:x|×)?\s+(.+)$/i)
  if(prefix){reps=prefix[1].replace(/\s/g,'');exerciseText=prefix[2].trim()}
  const suffix=exerciseText.match(/^(.+?)\s+(\d+(?:\s*[-–/]\s*\d+)*)\s*(?:reps?|repetisjonar?)?$/i)
  if(suffix){exerciseText=suffix[1].trim();reps=suffix[2].replace(/\s/g,'')}
  exerciseText=exerciseText.replace(/^[-–*\d.)\s]+/,'').replace(/\s+/g,' ').trim()
  if(!exerciseText||/^(round|runde|rest|pause)$/i.test(exerciseText))continue
  const key=normalize(exerciseText)
  const match=exerciseCatalog.find(ex=>normalize(ex.name)===key)||exerciseCatalog.find(ex=>normalize(ex.name).includes(key)||key.includes(normalize(ex.name)))
  items.push({name:match?.name||exerciseText,exercise:match||null,reps:reps||'10',loadKg:load,matched:Boolean(match)})
 }
 if(!items.length)throw new Error('Fann ingen sikre øvingslinjer. Kontroller teksten og prøv igjen.')
 const format=formatFrom(whole)
 return {name,format,minutes:minutes||20,items,notes:'Importert kjeldetekst:\n'+whole,unmatched:items.filter(item=>!item.matched).map(item=>item.name)}
}

export default function WodImportPanel({exerciseCatalog=[],onApply}){
 const [source,setSource]=useState('')
 const [fileName,setFileName]=useState('')
 const [filePreview,setFilePreview]=useState('')
 const [error,setError]=useState('')
 const [parsed,setParsed]=useState(null)
 const preview=useMemo(()=>parsed?.items||[],[parsed])
 async function readFile(file){
  if(!file)return
  setFileName(file.name);setError('');setParsed(null)
  if(file.type.startsWith('text/')||/\.(txt|csv|md)$/i.test(file.name)){setSource(await file.text());setFilePreview('')}
  else if(file.type.startsWith('image/')||file.type==='application/pdf'||/\.(png|jpe?g|webp|pdf)$/i.test(file.name)){
   setFilePreview(URL.createObjectURL(file))
   setError('Fila er lasta inn som kjeldereferanse. Automatisk OCR er ikkje aktivert i gratisoppsettet; lim inn eller skriv av teksten i feltet under, og kontroller tolkinga før import.')
  }else setError('Denne filtypen kan ikkje lesast direkte. Bruk TXT, CSV, Markdown, bilete eller PDF.')
 }
 function parse(){setError('');try{setParsed(parseWodImport(source,exerciseCatalog))}catch(e){setParsed(null);setError(e.message||'Kunne ikkje tolka WOD-teksten.')}}
 return <section className="wod-import-panel">
  <div className="wod-import-head"><div><span className="wod-classic-kicker">KOPIER TIL BIBLIOTEKET</span><strong>Importer WOD</strong><small>Lim inn tekst eller bruk ei fil som kjelde. Kontroller alltid dosering og øvingsnamn.</small></div><ClipboardPaste size={22}/></div>
  <label className="wod-import-file"><Upload size={16}/> Last opp kjelde<input type="file" accept=".txt,.csv,.md,.pdf,image/*" onChange={event=>readFile(event.target.files?.[0])}/></label>
  {fileName&&<div className="wod-import-file-name">{filePreview?<FileImage size={15}/>:<FileText size={15}/>} {fileName}</div>}
  {filePreview&&<div className="wod-import-source-preview">{filePreview.toLowerCase().endsWith('.pdf')?<iframe title="PDF-kjelde" src={filePreview}/>:<img src={filePreview} alt="Opplasta WOD-kjelde"/>}</div>}
  <label className="wod-import-text-label">WOD-tekst<textarea rows="6" value={source} onChange={event=>{setSource(event.target.value);setParsed(null)}} placeholder={'FRAN\n21-15-9\nThrusters 43 kg\nPull-ups'} /></label>
  {error&&<div className="wod-import-message"><AlertTriangle size={15}/>{error}</div>}
  <div className="wod-import-actions"><button type="button" className="secondary-button" onClick={parse} disabled={!source.trim()}>Analyser tekst</button></div>
  {parsed&&<div className="wod-import-result">
   <div className="wod-import-result-head"><CheckCircle2 size={17}/><strong>Kontroller importen</strong></div>
   <div className="wod-import-meta"><span>{parsed.name}</span><span>{parsed.format}</span><span>{parsed.minutes} min</span></div>
   <ol>{preview.map((item,index)=><li key={index}><strong>{item.name}</strong><span>{item.reps} reps{item.loadKg?' · Importert last ca. '+item.loadKg.toFixed(1)+' kg – må stadfestast':''}</span>{!item.matched&&<small>Finst ikkje i øvingsbiblioteket – blir lagt inn som tekstnamn</small>}</li>)}</ol>
   {parsed.unmatched.length>0&&<p className="wod-import-warning">Nye/ukjende øvingar: {parsed.unmatched.join(', ')}.</p>}
   <button type="button" className="primary-button" onClick={()=>onApply?.(parsed)}>Bruk i WOD Builder</button>
  </div>}
 </section>
}
