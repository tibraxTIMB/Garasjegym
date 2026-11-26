import React from 'react'
export default function SamspelParticipantResults({samspel}){
 const rows=Array.isArray(samspel?.participant_results)?samspel.participant_results:[]
 const stations=Array.isArray(samspel?.station_results)?samspel.station_results:[]
 if(!rows.length&&!stations.length)return null
 const unit=samspel.metric==='distance'?'m':'cal'
 return <>{stations.length>0&&<section className="workout-detail-timing"><h3>Separate stasjonsresultat</h3>{stations.map(row=><p key={row.slot}><strong>{row.label}</strong> · {row.value} {row.unit}</p>)}<small>Ikkje summerte på tvers av maskiner.</small></section>}{rows.length>0&&<details className="workout-detail-timing"><summary>Resultat per utøvar · {rows.length} registrerte</summary><p>Plassnummer i denne lagøkta, ikkje personlege rekordar.</p>{rows.map(row=><div key={row.slot}><strong>Utøvar {row.slot}</strong><p>{samspel.main_track==='quality'?({'done':'Utført','partial':'Delvis utført','skipped':'Ikkje utført'}[row.quality_status]||'Ikkje registrert'):<>{row.rounds??'–'} rundar · {row.extra_reps??'–'} ekstra reps</>}{!stations.length&&<> · {row.erg_value??'–'} {unit}</>}</p></div>)}</details>}</>
}
