// Each exercise occupies two consecutive slots, one for each partner.
// Slot numbering is one-based and the clock remains at the programmed interval.
export function partnerEmomSlot(slot,exerciseCount){
 if(!Number.isInteger(slot)||slot<1||!Number.isInteger(exerciseCount)||exerciseCount<1)return null
 return {exerciseIndex:Math.floor((slot-1)/2)%exerciseCount,worker:(slot-1)%2+1,resting:slot%2+1}
}
export function partnerEmomCount({slots,exerciseIndex,exerciseCount,worker=1}){
 if(!Number.isInteger(slots)||slots<0||![1,2].includes(worker)||!Number.isInteger(exerciseIndex)||exerciseIndex<0||exerciseIndex>=exerciseCount||!Number.isInteger(exerciseCount)||exerciseCount<1)return 0
 const first=2*exerciseIndex+worker
 return slots<first?0:Math.floor((slots-first)/(2*exerciseCount))+1
}
export function emomExerciseIndices(items,slot,{partner=false}={}){
 if(!items.length)return []
 if(partner){const role=partnerEmomSlot(slot,items.length);return role?[role.exerciseIndex]:[]}
 const explicit=items.some(item=>String(item.minute_slot??item.minuteSlot??'').trim())
 return explicit?items.flatMap((item,index)=>String(item.minute_slot??item.minuteSlot??'').split(/[,;\s/]+/).some(n=>Number(n)===slot)?[index]:[]):[(slot-1)%items.length]
}


 // SYNCHRON transport support is narrower than shared-clock programming.
export function synchronTransportFormatSupported(format){return format==='Chipper'}
export function pairedEmomScheduleIssue({durationSeconds,intervalSeconds,exerciseCount}={}){
 if(!Number.isSafeInteger(intervalSeconds)||intervalSeconds<5||intervalSeconds>3600||!Number.isSafeInteger(durationSeconds)||durationSeconds>10800||!Number.isSafeInteger(exerciseCount)||exerciseCount<1||exerciseCount>30)return 'Vel gyldig tidsramme og 1–30 øvingar.'
 if(durationSeconds<2*intervalSeconds*exerciseCount||durationSeconds%(2*intervalSeconds*exerciseCount)!==0)return 'YGIG krev komplette rotasjonar: eitt intervall per partnar på kvar øving.'
 return null
}
export function pairedEmomOpportunity(s,exerciseIndex,worker,elapsed=s?.duration_seconds){
 if(!s||pairedEmomScheduleIssue({durationSeconds:s.duration_seconds,intervalSeconds:s.switch_seconds,exerciseCount:s.tracks?.length})||!Number.isFinite(elapsed))return 0
 const slots=Math.ceil(Math.min(s.duration_seconds,Math.max(0,elapsed))/s.switch_seconds)
 return partnerEmomCount({slots,exerciseIndex,exerciseCount:s.tracks.length,worker})
}

// Deterministic shared-clock view. A transport supplies authoritative active elapsed
// seconds; the local timer supplies its pause-adjusted elapsed. Never infer results.
export function pairedEmomClock(s,elapsed=0){
 if(!s||pairedEmomScheduleIssue({durationSeconds:s.duration_seconds,intervalSeconds:s.switch_seconds,exerciseCount:s.tracks?.length})||!Number.isFinite(elapsed))return null
 const active=Math.min(s.duration_seconds,Math.max(0,elapsed)),total=s.duration_seconds/s.switch_seconds
 const finished=active===s.duration_seconds
 const interval=Math.min(total,Math.floor(active/s.switch_seconds)+1)
 const current=partnerEmomSlot(interval,s.tracks.length)
 const next=interval<total?partnerEmomSlot(interval+1,s.tracks.length):null
 return {interval,total,elapsed:active,finished,current,next,remaining:Math.max(0,interval*s.switch_seconds-active),nextSwitchSeconds:finished||!next?null:Math.ceil(interval*s.switch_seconds-active)}
}
