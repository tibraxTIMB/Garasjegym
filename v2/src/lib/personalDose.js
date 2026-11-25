// Suggestions only: exact exercise and actual logged single-rep set; never estimated 1RM.
const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const positive=v=>v!=null&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>0?Number(v):null
export function percentPrescription(item,level='rx'){
 const d=item.levels?.[level]||{}
 const explicit=d.loadMode==='percent'
 const legacy=(!item.levels||level==='rx')&&!['kg','rir','bodyweight'].includes(d.loadMode)
 if(!explicit&&!legacy)return null
 const single=positive(d.percent1rm??item.percent_1rm)
 const low=positive(d.percentMin??(legacy?item.percent_1rm_min:null))||single
 const high=positive(d.percentMax??(legacy?item.percent_1rm_max:null))||single
 if(!low||!high||high<low||high>150)return null
 const reference=String(d.referenceRm||item.reference_rm||item.exercise_name||item.name||'').trim()
 if(!reference||item.is_complex&&!d.referenceRm&&!item.reference_rm)return null
 return {reference,low,high}
}
export function personalWeightSuggestion(item,level,logs=[]){
 const p=percentPrescription(item,level);if(!p)return null
 let best=null
 for(const log of logs){
 const data=log.result_data||{}
 if(data.wod_engine?.participation&&data.wod_engine.participation!=='individual')continue
 for(const row of data.exercise_results||[]){
 if(row.is_complex||row.side_mode&&row.side_mode!=='none'||key(row.exercise_name)!==key(p.reference))continue
 for(const set of row.sets||[]){
 const kg=positive(set.load_kg)
 if(Number(set.reps)!==1||!kg||['failed','partial'].includes(set.complex_status))continue
 if(!best||kg>best.kg)best={kg,date:log.workout_date||null}
 }}
 }
 if(!best)return {...p,available:false}
 return {...p,available:true,baseKg:best.kg,date:best.date,minKg:Math.round(best.kg*p.low)/100,maxKg:Math.round(best.kg*p.high)/100}
}
export function weightSuggestionText(s){
 if(!s)return ''
 if(!s.available)return 'Ingen registrert 1-repsreferanse for '+s.reference+' i det henta loggutvalet.'
 const f=v=>v.toLocaleString('nn-NO',{maximumFractionDigits:2})
 return 'Personleg forslag: '+f(s.minKg)+(s.maxKg!==s.minKg?'–'+f(s.maxKg):'')+' kg · basert på '+f(s.baseKg)+' kg × 1 ('+s.reference+(s.date?', '+s.date:'')+'). Tilpass til utstyret.'
}
