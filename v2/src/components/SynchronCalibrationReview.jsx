import React,{useState} from 'react'
const units={reps:'reps',meters:'m',calories:'cal'}
// Optional independent observation, never an inferred result or required input.
export default function SynchronCalibrationReview({calibration,revision,controls,onAction}){
 const [draft,setDraft]=useState(null)
 const row=draft&&calibration.rows.find(r=>r.segmentIndex===draft.segmentIndex)
 const valid=draft?.revision===revision
 const amount=draft?.amount??''
 const canSubmit=valid&&controls.canCalibrate&&draft.attested&&/^\d+$/.test(amount)&&Number(amount)<=100000
 return <details className="gg-sync-review"><summary>Leistungsprofil · observerte arbeidsbolkar</summary>
  <p>Registrer berre mengd du faktisk talde, eller differansen du las av på maskina for heile arbeidsbolken. La resten stå tomt. Eigne arbeidsbolkar kan ikkje stadfestast her.</p>
  {calibration.rows.length===0&&<small>Ingen eigna arbeidsbolkar.</small>}
  {calibration.rows.map(r=><article key={r.segmentIndex} className="gg-sync-review">
   <strong>Utøvar {r.slot} · {r.name}</strong>
   <small>{r.variant}{r.loadKg!==null?' · '+r.loadKg+' kg':''} · {Math.round(r.assignedSeconds)} sek tildelt arbeid</small>
   <small>{r.amount===null?'Ikkje observert':r.amount+' '+units[r.unit]+' · registrert av øktleiar'}</small>
   <button type="button" className="secondary-button" disabled={!controls.canCalibrate} onClick={()=>setDraft({segmentIndex:r.segmentIndex,revision,amount:r.amount===null?'':String(r.amount),attested:false})}>{r.amount===null?'Registrer observasjon':'Korriger observasjon'}</button>
  </article>)}
  {row&&<section className="gg-sync-review"><strong>Utøvar {row.slot} · {row.name}</strong>
   {!valid?<p role="alert">Økta er endra. Opne arbeidsbolken på nytt.</p>:<>
    <label>Faktisk mengd ({units[row.unit]})<input type="number" inputMode="numeric" min="0" max="100000" step="1" value={amount} onChange={e=>setDraft(d=>({...d,amount:e.target.value,attested:false}))}/></label>
    <label><input type="checkbox" checked={draft.attested} onChange={e=>setDraft(d=>({...d,attested:e.target.checked}))}/> {row.unit==='reps'?'Eg talde denne mengda sjølv.':'Eg las av den faktiske endringa på maskina.'}</label>
    <button type="button" className="primary-button" disabled={!canSubmit} onClick={()=>{onAction('calibration_record',{segmentIndex:row.segmentIndex,amount:Number(amount),attested:true});setDraft(null)}}>Stadfest observasjon</button>
   </>}
   <button type="button" className="secondary-button" onClick={()=>setDraft(null)}>Lukk</button>
  </section>}
  <small>{calibration.sealed?'Observasjonane er låste.':'Frivillig. Endrar ikkje resultatfordelinga eller personlege rekordar.'} Permanent kalibreringslagring er ikkje aktivert.</small>
 </details>
}
