// Only explicit, sequential confirmations count; never infer work from time.
export function confirmedChipperCount(targets=[],value=0){
 return Number.isSafeInteger(value)&&value>=0?Math.min(targets.length,value):0
}
export function chipperConfirmedTotals(config,snapshot={}){
 if(config?.team_totals_only!==true||!Array.isArray(config.targets))return {}
 const n=confirmedChipperCount(config.targets,snapshot.chipper_confirmed_count)
 return Object.fromEntries(config.targets.slice(0,n).map((t,i)=>[i,String(t.target_reps)]))
}
export function nextChipperCount(targets,count,{running,elapsed,cap,locked}={}){
 const n=confirmedChipperCount(targets,count)
 if(!running||locked||n>=targets.length||cap>0&&elapsed>=cap)return n
 return n+1
}
