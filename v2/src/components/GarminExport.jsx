import {useMemo,useState} from 'react'
import {fitExerciseOptions,fitPreview,encodeStrengthFit} from '../lib/exportwerkFit.js'
import {saveExchange} from '../lib/werkstattExchange.js'
export default function GarminExport({data,approved,busy,onAuthorize}){
 const [id,setId]=useState(''),[start,setStart]=useState(''),[elapsed,setElapsed]=useState(''),[timer,setTimer]=useState(''),[confirmed,setConfirmed]=useState(false),[own,setOwn]=useState(false),[skip,setSkip]=useState(false),[mappings,setMappings]=useState({}),[times,setTimes]=useState({}),[showTimes,setShowTimes]=useState(false),[working,setWorking]=useState(false),[message,setMessage]=useState('')
 const records=data.records,options=useMemo(fitExerciseOptions,[])
 let preview=null,error=''
 if(id)try{preview=fitPreview(records,id,mappings)}catch(e){error=e.message}
 const clear=()=>{setConfirmed(false);setMessage('')}
 function select(id){setId(id);setStart('');setElapsed('');setTimer('');setMappings({});setTimes({});setOwn(false);setSkip(false);clear()}
 const unknown=[...new Set((preview?.rows||[]).filter(r=>!r.mapping).map(r=>r.exercise))]
 const invalid=preview?.rows.filter(r=>r.problem).length||0
 async function download(){
  if(!approved||busy||working||!confirmed||!own||!preview)return
  setWorking(true);setMessage('')
  try{
   await onAuthorize()
   const input=new Date(start)
   if(!Number.isFinite(input.getTime())||start.slice(0,10)!==preview.log.workout_date)throw Error('Startdato må samsvara med økta.')
   const bytes=encodeStrengthFit(preview,{startIso:input.toISOString(),elapsed,timer,individualConfirmed:own,confirmed,skipInvalid:skip,timings:showTimes?times:{}})
   saveExchange('garasjegym-'+preview.log.workout_date+'-'+preview.log.id+'.fit',bytes,'application/octet-stream')
   setMessage('FIT bestod intern SDK-dekoding. Importer manuelt i Garmin Connect. Visning av sett må kontrollerast der.')
  }catch(e){setMessage(e.message||'FIT-eksport feila.')}finally{setWorking(false)}
 }
 return <section className="gg-werkstatt-preview"><h4>Garmin FIT · éi styrkeaktivitet</h4><p>Vel ei eiga økt. Filformatet blir koda og dekoda med Garmin sin offisielle SDK. Garmin Connect kan tolka sett annleis; ingen direkte synkronisering. Ikkje eksporter lagresultat som personlege resultat.</p><label>Økt<select value={id} disabled={working||busy} onChange={e=>select(e.target.value)}><option value="">Vel økt</option>{records.logs.map(l=><option key={l.id} value={l.id}>{l.workout_date} · {l.title}</option>)}</select></label>{error&&<p role="alert">{error}</p>}{preview&&<>
 <p>{preview.rows.length} registrerte sett · {invalid} avvik. {preview.elapsed?'Registrert medgått tid: '+preview.elapsed+' s. Stadfest sjølv kva tid Garmin skal få.':''}</p>
 <div className="gg-werkstatt-toolbar"><label>Start (lokal tid på eininga)<input type="datetime-local" disabled={working} value={start} onChange={e=>{setStart(e.target.value);clear()}}/></label><label>Medgått tid (sek)<input type="number" min="1" max="86400" value={elapsed} disabled={working} onChange={e=>{setElapsed(e.target.value);clear()}}/></label><label>Aktiv timertid (sek)<input type="number" min="1" max="86400" value={timer} disabled={working} onChange={e=>{setTimer(e.target.value);clear()}}/></label></div>
 <p>Vel faktiske eller uttrykkeleg stadfesta omtrentlege økttider. Ukjend setttid blir ikkje oppdikta. Vekt i FIT har oppløysing 1/16 kg.</p>
 {unknown.map(name=><div key={name} className="gg-werkstatt-toolbar"><strong>{name}</strong><label>Garmin-kategori<select value={mappings[name]?.[0]||''} disabled={working} onChange={e=>{setMappings(m=>({...m,[name]:[e.target.value,'']}));clear()}}><option value="">Vel kategori</option>{options.map(o=><option key={o.category}>{o.category}</option>)}</select></label><label>Garmin-øving<select value={mappings[name]?.[1]||''} disabled={working||!mappings[name]?.[0]} onChange={e=>{setMappings(m=>({...m,[name]:[m[name][0],e.target.value]}));clear()}}><option value="">Vel øving</option>{(options.find(o=>o.category===mappings[name]?.[0])?.exercises||[]).map(n=><option key={n}>{n}</option>)}</select></label></div>)}
 <label><input type="checkbox" checked={showTimes} disabled={working} onChange={e=>{setShowTimes(e.target.checked);clear()}}/>Eg kjenner nøyaktig startoffset og varigheit for enkelte sett</label>
 <div className="gg-werkstatt-table-wrap"><table><thead><tr><th>Øving / sett</th><th>Reps</th><th>Kg</th><th>Garmin</th>{showTimes&&<><th>Start sek</th><th>Varigheit sek</th></>}</tr></thead><tbody>{preview.rows.map(r=><tr key={r.id}><td>{r.exercise} · {r.number}</td><td>{r.reps??'–'}</td><td>{r.kg??'–'}</td><td>{r.problem||r.mapping?.subtype}</td>{showTimes&&<><td><input type="number" min="0" aria-label={'Start '+r.exercise+' '+r.number} disabled={working||!!r.problem} value={times[r.id]?.offset??''} onChange={e=>{setTimes(t=>({...t,[r.id]:{duration:t[r.id]?.duration??'',offset:e.target.value}}));clear()}}/></td><td><input type="number" min="1" aria-label={'Varigheit '+r.exercise+' '+r.number} disabled={working||!!r.problem} value={times[r.id]?.duration??''} onChange={e=>{setTimes(t=>({...t,[r.id]:{offset:t[r.id]?.offset??'',duration:e.target.value}}));clear()}}/></td></>}</tr>)}</tbody></table></div>
 {invalid>0&&<label><input type="checkbox" checked={skip} disabled={working} onChange={e=>{setSkip(e.target.checked);clear()}}/>Eg godkjenner at {invalid} sett med avvik blir utelatne. CSV/Excel beheld originaldata.</label>}
 <label><input type="checkbox" checked={own} disabled={working} onChange={e=>{setOwn(e.target.checked);clear()}}/>Eg stadfestar at dette er mi eiga individuelle styrkeøkt.</label>
 <label><input type="checkbox" checked={confirmed} disabled={working} onChange={e=>setConfirmed(e.target.checked)}/>Eg har kontrollert øvingskodar, reps, vekter og tidsdata.</label>
 <button type="button" className="primary-button" disabled={!approved||busy||working||!confirmed||!own||!start||!elapsed||!timer||!preview.rows.some(r=>!r.problem)||invalid>0&&!skip} onClick={download}>Last ned Garmin FIT</button>
 </>}{message&&<p role="status">{message}</p>}<a href="https://connect.garmin.com/modern/import-data" target="_blank" rel="noreferrer">Garmin Connect · manuell import</a></section>
}
