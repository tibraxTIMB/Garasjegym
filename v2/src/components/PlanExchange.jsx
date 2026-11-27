import {useState} from 'react'
import {planDocument,planCsv,planText,planCalendar,saveExchange,printExchange} from '../lib/werkstattExchange.js'
import {planDate} from '../lib/ptSchedule.js'
// Operates only on the selected, already-authorized customer plan.
// Do not include name, client id, private notes, results or source database ids.
export default function PlanExchange({program,sessions,wods}){
 const [error,setError]=useState('')
 const rows=sessions.filter(s=>s.program_id===program.id&&!s.archived_at)
 const doc=planDocument('Treningsplan',rows,wods)
 function run(format){
  setError('')
  try{
   if(format==='pdf')printExchange('GarasjeGym · Treningsplan',planText(doc))
   else if(format==='ics')saveExchange('garasjegym-plan.ics',planCalendar(rows.map(s=>({date:planDate(program,s),title:s.title}))),'text/calendar;charset=utf-8')
   else saveExchange('garasjegym-plan.'+format,format==='json'?JSON.stringify(doc,null,2):format==='csv'?planCsv(doc):planText(doc),format==='json'?'application/json':format==='csv'?'text/csv;charset=utf-8':undefined)
  }catch(e){setError(e.message)}
 }
 return <details className="gg-plan-exchange"><summary>Eksporter plan</summary><p>Berre øktnamn, veke/dag, WOD-referansar og varigheit. Kalenderfila brukar heildagsoppføringar. Kontroller at øktnamn ikkje inneheld personopplysningar før deling.</p><div className="gg-werkstatt-toolbar">{['csv','json','txt','ics','pdf'].map(f=><button key={f} type="button" className="secondary-button" disabled={!rows.length||(f==='ics'&&!rows.some(s=>planDate(program,s)))} onClick={()=>run(f)}>{f==='pdf'?'Skriv ut / PDF':f.toUpperCase()}</button>)}</div>{error&&<p role="alert">{error}</p>}</details>
}
