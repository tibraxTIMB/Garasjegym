// Samspel is orthogonal to format. A versioned, opt-in capability; legacy WODs stay unchanged.
export const SAMSPEL_TASKS=[['row','Romaskin'],['bike','Sykkel'],['ski','SkiErg']]
export const SAMSPEL_METRICS=[['distance','Meter'],['calories','Kaloriar']]
export function samspelConfig(schema={}){
 const s=schema?.samspel
 if(s?.mode!=='parallel_round_swap')return null
 if(s.version===1)return s
 if(s.version===2&&Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8)return s
 return null
}
export function samspelIssue(s,{format,participation,collaboration,participantCount=2,items=[]}={}){
 if(!s)return null
 if(!samspelConfig({samspel:s}))return 'Ugyldig Samspel-oppsett.'
 const count=s.version===2?s.participant_count:2
 if(format!=='AMRAP'||(count===2?participation!=='partner':participation!=='team'||Number(participantCount)!==count))return 'Samspel krev AMRAP og samsvar mellom tal deltakarar og gjennomføringsform.'
 if(collaboration&&collaboration!=='parallel')return 'Vel parallelt arbeid under Gjennomføring, eller slå av rundebyte.'
 if(!SAMSPEL_TASKS.some(([id])=>id===s.task)||!SAMSPEL_METRICS.some(([id])=>id===s.metric))return 'Vel kondisjonsoppgåve og resultatmål.'
 if(!items.some(x=>!x.is_rest))return 'Legg til minst ei øving i AMRAP-runda.'
 return null
}
export function samspelRoles(s,rounds=0){
 const task=SAMSPEL_TASKS.find(([id])=>id===s?.task)?.[1]||'Kondisjon'
 const count=s?.version===2&&samspelConfig({samspel:s})?s.participant_count:2
 const n=Number(rounds)
 const index=(Number.isFinite(n)?Math.max(0,Math.floor(n)):0)%count
 return Array.from({length:count},(_,i)=>i===index?task:'AMRAP')
}
export function samspelResultIssue(s,value){
 if(!s)return null
 return value==null||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0?'Registrer faktisk samla '+(s.metric==='distance'?'distanse i meter':'kaloriar')+' (0 dersom ingen).':null
}
export function samspelScoring(s,base){
 return s?{type:'multi',fields:['rounds_reps',s.metric]}:base
}

export function samspelWithCount(s,count){
 if(!s||!Number.isInteger(count)||count<2||count>8)return null
 return {...s,version:2,participant_count:count}
}
export function samspelRoundInstruction(s){
 return s?.version===2&&s.participant_count>2?'Alle på AMRAP-sporet fullfører éi runde før de byter. Éin felles runde vert registrert.':'Byt rolle når AMRAP-partnaren har fullført éi runde.'
}
