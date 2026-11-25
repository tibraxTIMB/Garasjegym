// Samspel is orthogonal to format. A versioned, opt-in capability; legacy WODs stay unchanged.
export const SAMSPEL_TASKS=[['row','Romaskin'],['bike','Sykkel'],['ski','SkiErg']]
export const SAMSPEL_METRICS=[['distance','Meter'],['calories','Kaloriar']]
export function samspelConfig(schema={}){
 const s=schema.samspel
 if(s?.version!==1||s.mode!=='parallel_round_swap')return null
 return s
}
export function samspelIssue(s,{format,participation,items=[]}={}){
 if(!s)return null
 if(format!=='AMRAP'||participation!=='partner')return 'Parallelt rundebyte krev førebels AMRAP med to partnarar.'
 if(!SAMSPEL_TASKS.some(([id])=>id===s.task)||!SAMSPEL_METRICS.some(([id])=>id===s.metric))return 'Vel kondisjonsoppgåve og resultatmål.'
 if(!items.some(x=>!x.is_rest))return 'Legg til minst ei øving i AMRAP-runda.'
 return null
}
export function samspelRoles(s,rounds=0){
 const task=SAMSPEL_TASKS.find(([id])=>id===s?.task)?.[1]||'Kondisjon'
 return Math.max(0,Math.floor(Number(rounds)||0))%2===0?[task,'AMRAP']:['AMRAP',task]
}
export function samspelResultIssue(s,value){
 if(!s)return null
 return value==null||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0?'Registrer faktisk samla '+(s.metric==='distance'?'distanse i meter':'kaloriar')+' (0 dersom ingen).':null
}
export function samspelScoring(s,base){
 return s?{type:'multi',fields:['rounds_reps',s.metric]}:base
}
