import React from 'react'
import {documentedExerciseRows,muscleExerciseEvidence,summarizeMuscleExposure,MUSCLE_LABELS} from '../lib/anatomicalIntelligence.js'

const roleLabels={primary:'Primær',secondary:'Sekundær',stabilizing:'Stabilisering'}
export default function AnatomyEvidence({exercises=[],scope='Registrerte øvingar'}){
 const rows=documentedExerciseRows(exercises)
 const result=summarizeMuscleExposure(rows)
 const evidence=muscleExerciseEvidence(rows)
 return <details className="engine-section">
  <summary>Muskelgrupper · {scope}</summary>
  <p>Førebels klassifisering av øvingar med registrerte reps eller tid. Ikkje målt belastning eller restitusjon.</p>
  <small>{result.classifiedSets} klassifiserte sett · {result.unclassifiedSets} uklassifiserte sett</small>
  {evidence.size?[...evidence].map(([muscle,roles])=><details key={muscle}>
    <summary>{MUSCLE_LABELS[muscle]}</summary>
    {Object.entries(roles).filter(([,names])=>names.size).map(([role,names])=><p key={role}><strong>{roleLabels[role]}</strong> · {[...names].join(', ')}</p>)}
  </details>):<p>Ingen klassifiserte øvingar med slike resultat.</p>}
  {result.unclassified.length>0&&<p>Uklassifiserte øvingar: {result.unclassified.join(', ')}</p>}
 </details>
}
