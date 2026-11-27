// Empirical pace model. The host must supply independently verified observations.
// A self-approved estimate, allocated team total or unverified duration is not training evidence.
const nonneg=x=>Number.isFinite(x)&&x>=0
const id=x=>typeof x==='string'&&x.trim()!==''&&x.length<=128
const bands=(x,edges)=>edges.filter(e=>x>=e).length
const context=(duration,previous,rest)=>[bands(duration,[30,60,120]),bands(previous,[1,60,180]),rest===null?'first':bands(rest,[15,60,120])].join(':')
const median=values=>{const a=[...values].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2}
export function synchronObservationIssue(o){
 if(o?.version!==1||o.source!=='observed'||!['counted','machine'].includes(o.evidence)||!id(o.observationId)||!id(o.sessionId)||!id(o.memberId)||!id(o.exerciseId)||!id(o.variant)||!Number.isSafeInteger(o.observedAt)||o.observedAt<0||!['reps','meters','calories'].includes(o.unit)||o.evidence==='machine'&&o.unit==='reps'||o.loadKg!==null&&!nonneg(o.loadKg)||!Number.isSafeInteger(o.amount)||o.amount<0||o.amount>100000||!Number.isFinite(o.assignedSeconds)||o.assignedSeconds<5||o.assignedSeconds>3600||!nonneg(o.previousWorkSeconds)||o.restSeconds!==null&&!nonneg(o.restSeconds))return 'Ugyldig observasjon.'
 if((o.previousWorkSeconds===0)!==(o.restSeconds===null))return 'Ugyldig arbeids-/kvilehistorikk.'
 return null
}
function validObservations(records,query){
 const unique=new Map(),conflicts=new Set()
 for(const o of records){
  if(synchronObservationIssue(o)||o.memberId!==query.memberId||o.exerciseId!==query.exerciseId||o.variant!==query.variant||o.unit!==query.unit||o.sessionId===query.sessionId||o.observedAt>=query.before)continue
  const key=JSON.stringify([o.sessionId,o.observationId]),signature=JSON.stringify([o.observedAt,o.loadKg,o.amount,o.assignedSeconds,o.previousWorkSeconds,o.restSeconds,o.evidence])
  if(unique.has(key)&&unique.get(key).signature!==signature)conflicts.add(key)
  else unique.set(key,{o,signature})
 }
 return [...unique].filter(([k])=>!conflicts.has(k)).map(([,x])=>x.o)
}
function summarize(records){
 // Each historical session has equal weight, regardless of number of bolks.
 const sessions=new Map()
 for(const o of records){const list=sessions.get(o.sessionId)||[];list.push(o.amount*60/o.assignedSeconds);sessions.set(o.sessionId,list)}
 const rates=[...sessions.values()].map(median)
 return rates.length?{pace:median(rates),low:Math.min(...rates),high:Math.max(...rates),sessions:rates.length}:null
}
export function synchronPaceProfile(records,query){
 if(!Array.isArray(records)||!query||!nonneg(query.previousWorkSeconds)||!Number.isFinite(query.duration)||query.duration<=0||query.restSeconds!==null&&!nonneg(query.restSeconds)||!Number.isFinite(query.before))return null
 const observed=validObservations(records,query)
 const matching=observed.filter(o=>context(o.assignedSeconds,o.previousWorkSeconds,o.restSeconds)===context(query.duration,query.previousWorkSeconds,query.restSeconds))
 const exact=summarize(matching.filter(o=>o.loadKg===query.loadKg))
 if(exact)return {...exact,method:'observed_context',rangeAvailable:exact.sessions>=2}
 // Interpolate only inside a personally observed load bracket. No extrapolation,
 // no transfer across variants, no assumption of a universal fatigue curve.
 if(typeof query.loadKg==='number'&&query.loadKg>0){
  const loads=[...new Set(matching.map(o=>o.loadKg).filter(x=>typeof x==='number'&&x>0))].sort((a,b)=>a-b)
  const lo=loads.filter(x=>x<query.loadKg).at(-1),hi=loads.find(x=>x>query.loadKg)
  if(lo!==undefined&&hi!==undefined&&hi/lo<=1.5){
   const a=summarize(matching.filter(o=>o.loadKg===lo)),b=summarize(matching.filter(o=>o.loadKg===hi))
   if(a.sessions>=3&&b.sessions>=3&&a.pace>=b.pace){
    const w=(query.loadKg-lo)/(hi-lo)
    return {pace:a.pace+(b.pace-a.pace)*w,low:Math.min(a.low,b.low),high:Math.max(a.high,b.high),sessions:Math.min(a.sessions,b.sessions),method:'interpolated_load',rangeAvailable:true}
   }
  }
 }
 // Backward-compatible exact-load legacy pace only. No interval or evidence
 // count is claimed for old records without independently identifiable sessions.
 const legacy=records.filter(o=>o?.version===undefined&&o.source==='observed'&&o.memberId===query.memberId&&o.exerciseId===query.exerciseId&&o.variant===query.variant&&o.unit===query.unit&&o.loadKg===query.loadKg&&Number.isFinite(o.perMinute)&&o.perMinute>0)
 return legacy.length?{pace:median(legacy.map(o=>o.perMinute)),sessions:null,method:'legacy_exact',rangeAvailable:false}:null
}
