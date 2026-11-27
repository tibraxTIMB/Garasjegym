import React from 'react'
import {warmupGuidance} from '../lib/warmupGuidance.js'
export default function WarmupGuide({schema={},items=[],expanded=false}){
 const guide=warmupGuidance(schema,items)
 if(guide.kind==='none')return null
 return <details className="engine-section gg-warmup-guide" open={expanded||undefined}><summary>{guide.kind==='planned'?'Planlagd oppvarming':'Oppvarming og mobilitet · valfritt'}</summary><div style={{display:'grid',gap:8,padding:'8px 0'}}>{guide.kind==='planned'?<small>Følg oppsettet som er planlagt. Det blir ikkje lagt til ei ekstra oppvarming.</small>:<small>Forslag før hovudøkta. Tilpass sjølv etter dagsform og tid. Ikkje ei rehabiliteringsoppskrift.</small>}{guide.sections.map((s,i)=><section key={i}><strong>{s.title}</strong>{s.names.map((name,j)=><div key={j}><small>{name}</small></div>)}{s.note&&<small>{s.note}</small>}</section>)}{guide.unknown>0&&<small>Nokre øvingar har ikkje ei kjend rørsleprofil. Tilpass førebuinga manuelt.</small>}</div></details>
}
