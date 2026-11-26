import React from 'react'
export default function SamspelParticipantResults({samspel}){
 const rows=Array.isArray(samspel?.participant_results)?samspel.participant_results:[]
 if(!rows.length)return null
 const unit=samspel.metric==='distance'?'m':'cal'
 return <details className="workout-detail-timing"><summary>Resultat per utøvar · {rows.length} registrerte</summary><p>Plassnummer i denne lagøkta, ikkje personlege rekordar.</p>{rows.map(row=><div key={row.slot}><strong>Utøvar {row.slot}</strong><p>{row.rounds??'–'} rundar · {row.extra_reps??'–'} ekstra reps · {row.erg_value??'–'} {unit}</p></div>)}</details>
}
