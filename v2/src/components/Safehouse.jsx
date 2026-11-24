import {useState} from 'react'
import {ShieldCheck,Download,FileCheck,AlertTriangle,ExternalLink} from 'lucide-react'
import {SAFEHOUSE_PROJECT,SAFEHOUSE_STORAGE_KEY,checkSafehouseReceipt,safehouseAge,receiptFromBackupZip} from '../lib/safehouse.js'
const base=import.meta.env.BASE_URL
function initialReceipt(key){try{return checkSafehouseReceipt(JSON.parse(localStorage.getItem(key)))}catch{return null}}
export default function Safehouse({profile}){
 const key=SAFEHOUSE_STORAGE_KEY+':'+profile.id
 const [receipt,setReceipt]=useState(()=>initialReceipt(key)),[error,setError]=useState('')
 const age=safehouseAge(receipt)
 if(profile.role!=='admin')return null
 async function importReceipt(event){
  const file=event.target.files?.[0];event.target.value=''
  if(!file)return
  setError('')
  try{
   let value
   if(/\.zip$/i.test(file.name))value=await receiptFromBackupZip(file)
   else{if(file.size>16384)throw Error('Vel den daterte SAFEHOUSE ZIP-fila eller kontrollkvitteringa.');value=checkSafehouseReceipt(JSON.parse((await file.text()).replace(/^\uFEFF/,'')))}
   localStorage.setItem(key,JSON.stringify(value));setReceipt(value)
  }catch(e){setError(e.message||'Kunne ikkje lesa kvitteringa.')}
 }
 return <section className="gg-safehouse" aria-label="SAFEHOUSE">
  <header><ShieldCheck size={27}/><div><strong>SAFEHOUSE 1.0</strong><small>Gratis · lokal backup · ingen databaseendringar</small></div></header>
  <div className={'gg-safehouse-status '+age.status}><FileCheck size={20}/><div><strong>{age.label}</strong>{receipt&&<small>{new Date(receipt.completed_at).toLocaleString('nn-NO')} · {(receipt.archive_bytes/1024/1024).toFixed(2)} MB · kode {receipt.code_commit.slice(0,8)}</small>}<small>Kontrollkvittering lesen lokalt på denne eininga. Gjenoppretting er ikkje testa.</small></div></div>
  <p>Aktiv database: <b>garasjegym-2-test</b>. Første gong: last ned dei to ZIP-filene. Etterpå dobbeltklikkar du TA-BACKUP på PC-en og skriv databasepassordet. Éi datert ZIP-fil blir lagra.</p>
  <div className="gg-safehouse-actions">
   <a className="primary-button" href={base+'safehouse/SAFEHOUSE-Windows.zip'} download="SAFEHOUSE-Windows.zip"><Download size={17}/> 1 · Last ned SAFEHOUSE</a>
   <a className="secondary-button" href={base+'safehouse/LES-MEG.txt'} download="SAFEHOUSE-LES-MEG.txt"><Download size={17}/> Rettleiing</a>
   <a className="secondary-button" href="https://www.postgresql.org/download/windows/" target="_blank" rel="noreferrer"><ExternalLink size={16}/> 2 · Last ned databaseverktøy</a>
   <a className="secondary-button" href={'https://supabase.com/dashboard/project/'+SAFEHOUSE_PROJECT} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Supabase Connect</a>
  </div>
  <label className="gg-safehouse-receipt"><FileCheck size={18}/><span>Kontroller den daterte ZIP-fila<small>Vel fila frå PC-en. Berre kontrollkvitteringa blir lesen lokalt; ingenting blir lasta opp.</small></span><input type="file" accept=".zip,.json,application/zip,application/json" onChange={importReceipt}/></label>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  <div className="gg-safehouse-warning"><AlertTriangle size={18}/><small>ZIP-fila er ikkje passordkryptert. Bruk berre godkjend, kryptert privat lagring. Jobb-PC kan ha sperrer og reglar mot private data. Verktøyet omgår ingen sperrer. Ta kopi til separat disk og test restore på ein isolert database før du stolar på backupen.</small></div>
  <details><summary>Gjenoppretting og fast rutine</summary><p>Ta kopi dagleg når PC-en er på, og før endringar i databasen. Behald fleire daterte kopiar. Databasearkivet inneheld ikkje Storage-filer, prosjektinnstillingar eller Edge Function-løyndomar. Ta vare på desse separat. SAFEHOUSE nektar å kvittera for komplett databasekopi dersom Storage inneheld objekt.</p><a href="https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore" target="_blank" rel="noreferrer">Offisiell gjenopprettingsrettleiing</a></details>
 </section>
}
