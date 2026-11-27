import React,{useState} from 'react'
const units={reps:'reps',seconds:'sek',meters:'m',calories:'cal'}
const qualities={confirmed:'Sjølvrapportert faktisk mengd',estimated:'Estimert',unknown:'Ukjend'}
export default function SynchronResultReview({review,controls,onAction}){
 const [draft,setDraft]=useState(null)
 const current=draft&&review.rows.find(r=>r.movementId===draft.id)
 const valid=draft&&draft.revision===review.revision
 const amount=draft?.value??''
 const validAmount=/^\d+$/.test(amount)&&Number(amount)<=100000
 return <section className="gg-sync-review" aria-label="Mitt resultat">
  <strong>Etterøkta · mitt resultat</strong>
  <small>Arbeidsbolktid er ikkje nødvendigvis effektiv arbeidstid. Estimat blir ikkje personlege rekordar.</small>
  {review.rows.map(r=><article key={r.movementId} className="gg-sync-review">
   <div className="gg-sync-status"><strong>{r.name}</strong><b>{r.value===null?'Ukjend':r.value+' '+units[r.unit]}</b></div>
   <small>{qualities[r.quality]} · arbeidsbolk {Math.round(r.assignedSeconds)} sek</small>
   <small>{r.teamActual===null?'Lagresultat ukjent':'Lagresultat '+r.teamActual+' '+units[r.unit]}{r.conflict?' · avvik må rettast':r.reconciled===false?' · fordelinga er ikkje avstemd':''}</small>
   {r.segments.length>0&&<details><summary>Belastning og arbeidsbolkar</summary>{r.segments.map((seg,i)=><p key={i}>{Math.round(seg.seconds)} sek · {seg.variant}{seg.loadKg!==null?' · '+seg.loadKg+' kg':''}</p>)}</details>}
   <button className="secondary-button" disabled={!controls.canReview} onClick={()=>setDraft({id:r.movementId,revision:review.revision,value:r.value===null?'':String(r.value),quality:r.quality==='confirmed'?'confirmed':'estimated'})}>Kontroller / korriger</button>
  </article>)}
  {current&&<section className="gg-sync-review"><strong>{current.name}</strong>
   {!valid?<p role="alert">Resultatfordelinga er endra. Opne feltet på nytt.</p>:<><label>Mengd ({units[current.unit]})<input type="number" min="0" max="100000" step="1" inputMode="numeric" value={amount} onChange={e=>setDraft(d=>({...d,value:e.target.value}))}/></label>
   <label>Korleis veit du mengda?<select value={draft.quality} onChange={e=>setDraft(d=>({...d,quality:e.target.value}))}><option value="estimated">Estimat</option><option value="confirmed">Eg kjenner faktisk mengd</option></select></label>
   <button className="primary-button" disabled={!controls.canReview||!validAmount} onClick={()=>{onAction('review_update',{movementId:current.movementId,value:Number(amount),quality:draft.quality});setDraft(null)}}>Stadfest endring</button>
   <button className="secondary-button" disabled={!controls.canReview} onClick={()=>{onAction('review_update',{movementId:current.movementId,value:null,quality:'unknown'});setDraft(null)}}>Eg veit ikkje mengda</button></>}
   <button className="secondary-button" onClick={()=>setDraft(null)}>Lukk</button>
  </section>}
  <small>{review.approvedCount}/{review.participantCount} godkjent · {review.sealed?'Resultatfordelinga er låst for lagring.':'Endringar krev ny godkjenning.'}</small>
  <button className="primary-button" disabled={!controls.canApprove||!!draft} onClick={()=>onAction('review_approve')}>{review.approved?'Godkjent':'Godkjenn mitt resultat'}</button>
  {!review.canApprove&&<small>Kontroller manglande mengder eller avvik i fellesresultatet først.</small>}
  <small>Utviklingstest – ingen treningslogg blir lagra.</small>
 </section>
}
