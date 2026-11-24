import {useState} from 'react'
import {ShieldCheck,Download,FileCheck,AlertTriangle,ExternalLink} from 'lucide-react'
import {SAFEHOUSE_PROJECT,SAFEHOUSE_STORAGE_KEY,checkSafehouseReceipt,safehouseAge} from '../lib/safehouse.js'
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
   if(file.size>16384)throw Error('Vel berre den vesle SAFEHOUSE-kvitteringa, aldri databasefila.')
   const value=checkSafehouseReceipt(JSON.parse((await file.text()).replace(/^\uFEFF/,'')))
   localStorage.setItem(key,JSON.stringify(value));setReceipt(value)
  }catch(e){setError(e.message||'Kunne ikkje lesa kvitteringa.')}
 }
 return <section className="gg-safehouse" aria-label="SAFEHOUSE">
  <header><ShieldCheck size={27}/><div><strong>SAFEHOUSE 1.0</strong><small>Gratis · lokal backup · ingen databaseendringar</small></div></header>
  <div className={'gg-safehouse-status '+age.status}><FileCheck size={20}/><div><strong>{age.label}</strong>{receipt&&<small>{new Date(receipt.completed_at).toLocaleString('nn-NO')} · {(receipt.archive_bytes/1024/1024).toFixed(2)} MB · kode {receipt.code_commit.slice(0,8)}</small>}<small>Importert kvittering på denne eininga. Gjenoppretting er ikkje testa.</small></div></div>
  <p>Aktiv database: <b>garasjegym-2-test</b>. Backup køyrer på eigen PC, ikkje i nettlesaren. Passord og databasefiler skal aldri lastast opp her.</p>
  <div className="gg-safehouse-actions">
   <a className="primary-button" href={base+'safehouse/Safehouse.ps1'} download="Safehouse.ps1"><Download size={17}/> Last ned Windows-verktøy</a>
   <a className="secondary-button" href={base+'safehouse/LES-MEG.txt'} download="SAFEHOUSE-LES-MEG.txt"><Download size={17}/> Rettleiing</a>
   <a className="secondary-button" href="https://www.postgresql.org/download/windows/" target="_blank" rel="noreferrer"><ExternalLink size={16}/> PostgreSQL 17 ZIP-verktøy</a>
   <a className="secondary-button" href={'https://supabase.com/dashboard/project/'+SAFEHOUSE_PROJECT} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Supabase Connect</a>
  </div>
  <label className="gg-safehouse-receipt"><FileCheck size={18}/><span>Importer kontrollkvittering (.json)<small>Berre metadata, aldri sjølve sikkerheitskopien.</small></span><input type="file" accept=".json,application/json" onChange={importReceipt}/></label>
  {error&&<div className="auth-error" role="alert">{error}</div>}
  <div className="gg-safehouse-warning"><AlertTriangle size={18}/><small>Bruk berre godkjend, kryptert privat lagring. Jobb-PC kan ha sperrer og reglar mot private data. Verktøyet omgår ingen sperrer. Ta kopi til separat disk og test restore på ein isolert database før du stolar på backupen.</small></div>
  <details><summary>Gjenoppretting og fast rutine</summary><p>Ta kopi dagleg når PC-en er på, og før endringar i databasen. Behald fleire daterte kopiar. Databasearkivet inneheld ikkje Storage-filer, prosjektinnstillingar eller Edge Function-løyndomar. Ta vare på desse separat. SAFEHOUSE nektar å kvittera for komplett databasekopi dersom Storage inneheld objekt.</p><a href="https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore" target="_blank" rel="noreferrer">Offisiell gjenopprettingsrettleiing</a></details>
 </section>
}
