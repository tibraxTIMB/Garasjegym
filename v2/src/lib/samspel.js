// Samspel is orthogonal to format. A versioned, opt-in capability; legacy WODs stay unchanged.
export const SAMSPEL_TASKS=[['row','Romaskin'],['bike','Sykkel'],['ski','SkiErg']]
export const SAMSPEL_STATION_TASKS=[...SAMSPEL_TASKS,['strength','Styrke']]
export const SAMSPEL_METRICS=[['distance','Meter'],['calories','Kaloriar']]
// Quality & Row is a non-competitive two-person track using the existing timer.
export function samspelQuality(s){return s?.version===2&&s.main_track==='quality'}
// Relay: work/rest alternation, with explicit results independent of handovers.
// Team Chipper: one shared target per movement and measured individual contributions.
export function samspelChipper(s){return s?.version===2&&s.main_track==='chipper'}
export function teamChipperConfig(){return {version:2,mode:'parallel_round_swap',main_track:'chipper',participant_count:2,switch_rule:'fixed',individual_scores:true,targets:[]}}
export function teamChipperProgress(s,rows=[]){
 if(!samspelChipper(s)||!samspelConfig({samspel:s})||!Array.isArray(rows))return []
 return s.targets.map((target,i)=>{
  const reps=rows.reduce((sum,row)=>{const n=row.chipper_reps?.[i];return sum+(Number.isSafeInteger(n)&&n>=0?n:0)},0)
  return {...target,reps,remaining:Math.max(0,target.target_reps-reps),complete:reps===target.target_reps}
 })
}
export function teamChipperComplete(s,rows=[]){
 const progress=teamChipperProgress(s,rows)
 return progress.length>0&&progress.every(r=>r.complete)&&rows.length===s.participant_count&&Array.from({length:s.participant_count},(_,i)=>i+1).every(slot=>rows.filter(r=>r.slot===slot&&Array.isArray(r.chipper_reps)&&r.chipper_reps.length===s.targets.length&&r.chipper_reps.every(n=>Number.isSafeInteger(n)&&n>=0)).length===1)
}
export function samspelRelay(s){return s?.version===2&&s.main_track==='relay'}
export function youGoIGoConfig(){return {version:2,mode:'parallel_round_swap',main_track:'relay',participant_count:2,switch_rule:'manual',individual_scores:true}}
export function relayTotal(s,rows=[]){
 if(!samspelRelay(s)||!samspelConfig({samspel:s})||rows.length!==s.participant_count||!Array.from({length:s.participant_count},(_,i)=>i+1).every(slot=>rows.filter(r=>r.slot===slot&&Number.isSafeInteger(r.rounds)&&r.rounds>=0).length===1))return null
 return rows.reduce((sum,r)=>sum+r.rounds,0)
}
export function samspelRecovery(s){return s?.version===2&&s.main_track==='recovery'}
export function samspelNoncompetitive(s){return samspelQuality(s)||samspelRecovery(s)}
export function activeRecoveryConfig(minutes=10,count=2){return {version:2,mode:'parallel_round_swap',main_track:'recovery',participant_count:count,switch_rule:'fixed',duration_seconds:Number(minutes)*60,individual_scores:true}}
export function qualityRowConfig(minutes=10){return {version:2,mode:'parallel_round_swap',main_track:'quality',task:'row',metric:'distance',participant_count:2,erg_slots:1,available_ergs:1,switch_rule:'manual',duration_seconds:Number(minutes)*60,individual_scores:true}}
// Engine Swap: one erg track, remaining athletes on the shared EMOM clock.
export function samspelEmom(s){return s?.version===2&&s.main_track==='emom'}
export function engineSwapConfig(interval=60,duration=600){return {version:2,mode:'parallel_round_swap',main_track:'emom',task:'row',metric:'distance',participant_count:2,erg_slots:1,available_ergs:1,switch_rule:'time',switch_seconds:interval,duration_seconds:duration,individual_scores:true}}
// Iron Twins: two athletes, one prescribed lift, independent measured sets.
export function samspelStrength(s){return s?.version===2&&s.main_track==='strength'}
export function ironTwinsConfig(){return {version:2,mode:'parallel_round_swap',main_track:'strength',participant_count:2,individual_scores:true,switch_rule:'fixed',planned_sets:3,exercise_name:''}}
export function samspelStrengthComplete(s,rows=[]){
 return samspelStrength(s)&&!!samspelConfig({samspel:s})&&rows.length===2&&[1,2].every(slot=>rows.filter(r=>r.slot===slot).length===1&&rows.find(r=>r.slot===slot).strength_sets?.length===s.planned_sets&&rows.find(r=>r.slot===slot).strength_sets.every(set=>set.reps>0))
}
// Double EMOM: two explicit exercise tracks on the existing interval clock.
export function samspelDouble(s){return s?.version===2&&s.main_track==='double_emom'}
export function samspelClockedEmom(s){return samspelEmom(s)||samspelDouble(s)}
export function doubleEmomConfig(interval=60,duration=600){return {version:2,mode:'parallel_round_swap',main_track:'double_emom',participant_count:2,individual_scores:true,switch_rule:'time',switch_seconds:interval,duration_seconds:duration,tracks:[]}}
export function doubleEmomOpportunity(s,slot,elapsed=s?.duration_seconds){
 if(!samspelDouble(s)||!samspelConfig({samspel:s})||![1,2].includes(slot)||!Number.isFinite(elapsed))return [0,0]
 const n=Math.ceil(Math.max(0,Math.min(elapsed,s.duration_seconds))/s.switch_seconds)
 if(s.switch_rule==='fixed')return slot===1?[n,0]:[0,n]
 const a=slot===1?Math.ceil(n/2):Math.floor(n/2)
 return [a,n-a]
}
export function doubleEmomComplete(s,rows=[],{elapsed}={}){
 if(!samspelDouble(s)||!samspelConfig({samspel:s})||rows.length!==2||elapsed!==undefined&&(!Number.isFinite(elapsed)||elapsed<s.duration_seconds))return false
 return [1,2].every(slot=>{const r=rows.filter(r=>r.slot===slot),[a,b]=doubleEmomOpportunity(s,slot);return r.length===1&&(a===0?r[0].track_a_intervals==null||r[0].track_a_intervals===0:r[0].track_a_intervals===a)&&(b===0?r[0].track_b_intervals==null||r[0].track_b_intervals===0:r[0].track_b_intervals===b)})
}
export function samspelMainLabel(s){return samspelStrength(s)?'Styrke':samspelQuality(s)?'Kvalitet':samspelEmom(s)?'EMOM':'AMRAP'}
export function samspelEmomOpportunity(s,slot,elapsed=s?.duration_seconds){
 if(!samspelEmom(s)||!samspelConfig({samspel:s})||!Number.isInteger(slot)||slot<1||slot>s.participant_count||!Number.isFinite(elapsed))return 0
 const intervals=Math.ceil(Math.max(0,Math.min(elapsed,s.duration_seconds))/s.switch_seconds)
 const offset=slot-1
 const ergIntervals=intervals>offset?1+Math.floor((intervals-1-offset)/s.participant_count):0
 return intervals-ergIntervals
}
// Full team completion requires all individual interval counts, not merely
// an expired clock. Missing or partial evidence remains incomplete.
export function samspelEmomComplete(s,rows=[],{elapsed}={}){
 if(!samspelEmom(s)||!samspelConfig({samspel:s})||!Array.isArray(rows)||rows.length!==s.participant_count)return false
 if(elapsed!==undefined&&(!Number.isFinite(elapsed)||elapsed<s.duration_seconds))return false
 return Array.from({length:s.participant_count},(_,i)=>i+1).every(slot=>rows.filter(r=>r.slot===slot).length===1&&rows.find(r=>r.slot===slot).completed_intervals===samspelEmomOpportunity(s,slot))
}
export function samspelConfig(schema={}){
 const s=schema?.samspel
 if(s?.mode!=='parallel_round_swap')return null
 if(samspelChipper(s))return Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&s.switch_rule==='fixed'&&s.individual_scores===true&&!s.station_tasks&&Array.isArray(s.targets)&&s.targets.length>=1&&s.targets.length<=30&&s.targets.every(x=>typeof x?.exercise_name==='string'&&!!x.exercise_name.trim()&&Number.isSafeInteger(x.target_reps)&&x.target_reps>=1&&x.target_reps<=10000)?s:null
 if(samspelRelay(s))return Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&s.switch_rule==='manual'&&s.individual_scores===true&&!s.station_tasks?s:null
 if(samspelRecovery(s))return Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&s.individual_scores===true&&s.switch_rule==='fixed'&&Number.isInteger(s.duration_seconds)&&s.duration_seconds>=60&&s.duration_seconds<=10800&&!s.station_tasks?s:null
 if(samspelDouble(s))return s.participant_count===2&&s.individual_scores===true&&['fixed','time'].includes(s.switch_rule)&&Number.isInteger(s.switch_seconds)&&s.switch_seconds>=5&&s.switch_seconds<=3600&&Number.isInteger(s.duration_seconds)&&s.duration_seconds>=s.switch_seconds*(s.switch_rule==='time'?2:1)&&s.duration_seconds<=10800&&s.duration_seconds%(s.switch_seconds*(s.switch_rule==='time'?2:1))===0&&Array.isArray(s.tracks)&&s.tracks.length===2&&s.tracks.every(x=>typeof x==='string'&&x.trim())&&!s.station_tasks?s:null
 if(samspelStrength(s))return s.participant_count===2&&s.switch_rule==='fixed'&&s.individual_scores===true&&Number.isInteger(s.planned_sets)&&s.planned_sets>=1&&s.planned_sets<=30&&typeof s.exercise_name==='string'&&!!s.exercise_name.trim()&&!s.station_tasks?s:null
 if(s.main_track!==undefined&&!samspelQuality(s)&&!samspelEmom(s))return null
 if(samspelEmom(s))return Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&s.switch_rule==='time'&&Number.isInteger(s.switch_seconds)&&s.switch_seconds>=5&&s.switch_seconds<=3600&&Number.isInteger(s.duration_seconds)&&s.duration_seconds<=10800&&s.duration_seconds>=s.participant_count*s.switch_seconds&&s.duration_seconds%(s.participant_count*s.switch_seconds)===0&&(s.erg_slots??1)===1&&!Array.isArray(s.station_tasks)&&s.individual_scores===true&&SAMSPEL_TASKS.some(([id])=>id===s.task)&&SAMSPEL_METRICS.some(([id])=>id===s.metric)?s:null
 if(samspelQuality(s))return s.participant_count===2&&s.task==='row'&&s.metric==='distance'&&s.switch_rule==='manual'&&(s.erg_slots??1)===1&&!Array.isArray(s.station_tasks)&&s.individual_scores===true&&Number.isInteger(s.duration_seconds)&&s.duration_seconds>=60&&s.duration_seconds<=10800?s:null
 if(s.version===1)return s
 if(s.version===2&&Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&(!s.switch_rule||s.switch_rule==='round'||s.switch_rule==='manual'||s.switch_rule==='time'&&Number.isInteger(s.switch_seconds)&&s.switch_seconds>=15&&s.switch_seconds<=600))return s
 return null
}
export function samspelIssue(s,{format,participation,collaboration,participantCount=2,items=[]}={}){
 if(!s)return null
 if(samspelChipper(s)){
  if(!samspelConfig({samspel:s}))return 'Vel 1–30 øvingar med 1–10 000 felles reps per øving.'
  if(format!=='Chipper'||collaboration!=='free_split'||(s.participant_count===2?participation!=='partner':participation!=='team'||Number(participantCount)!==s.participant_count))return 'Team Chipper krev Chipper og fritt delt arbeid.'
  if(items.length!==s.targets.length||items.some((x,i)=>x.is_rest||x.is_complex||String(x.name||x.exercise_name||'').trim()!==s.targets[i].exercise_name))return 'Vel vanlege repetisjonsbaserte øvingar utan pausar.'
  return null
 }
 if(samspelRelay(s)){
  if(!samspelConfig({samspel:s}))return 'Vel 2–8 utøvarar.'
  if(format!=='AMRAP'||collaboration!=='you_go_i_go'||(s.participant_count===2?participation!=='partner':participation!=='team'||Number(participantCount)!==s.participant_count))return 'You Go I Go krev AMRAP og vekselvis arbeid.'
  return items.some(x=>!x.is_rest)?null:'Legg til minst ei arbeidsøving.'
 }
 if(samspelRecovery(s)){
  if(!samspelConfig({samspel:s}))return 'Vel 2–8 utøvarar og ei tidsramme på 1–180 minutt.'
  if(format!=='Eigen økt'||collaboration!=='parallel'||(s.participant_count===2?participation!=='partner':participation!=='team'||Number(participantCount)!==s.participant_count))return 'Active Recovery krev Eigen økt og samsvar i tal utøvarar.'
  return items.some(x=>!x.is_rest)?null:'Vel minst ei roleg øving.'
 }
 if(samspelDouble(s)){
  if(format!=='EMOM'||participation!=='partner'||collaboration!=='parallel')return 'Double EMOM krev EMOM og to utøvarar.'
  if(items.length!==2||items.some((x,i)=>x.is_rest||x.is_complex||String(x.minuteSlot??x.minute_slot??'').trim()||String(x.name||x.exercise_name||'').trim()!==s.tracks[i]))return 'Vel to vanlege øvingar utan eigne minuttslotar.'
  return samspelConfig({samspel:s})?null:'Vel heile intervall; ved rollebyte må begge få like mange på kvart spor.'
 }
 if(samspelStrength(s)){
  if(format!=='Strength'||participation!=='partner'||collaboration!=='parallel')return 'Iron Twins krev Strength, to utøvarar og parallelt individuelt arbeid.'
  if(items.length!==1||items[0].is_rest||items[0].is_complex||String(items[0].name||items[0].exercise_name||'').trim()!==s.exercise_name)return 'Vel éi vanleg styrkeøving til Iron Twins.'
  return samspelConfig({samspel:s})?null:'Vel 1–30 planlagde sett.'
 }
 if(!samspelConfig({samspel:s}))return samspelEmom(s)?'Engine Swap krev heile EMOM-intervall og ei øktlengd som går opp i komplette rotasjonar for alle utøvarane (maks 180 min).':'Ugyldig Samspel-oppsett.'
 const count=s.version===2?s.participant_count:2
 if((samspelQuality(s)?format!=='Eigen økt':samspelEmom(s)?format!=='EMOM':format!=='AMRAP')||(count===2?participation!=='partner':participation!=='team'||Number(participantCount)!==count))return samspelQuality(s)?'Quality & Row krev Eigen økt og to utøvarar.':samspelEmom(s)?'Engine Swap krev EMOM og samsvar i tal utøvarar.':'Samspel krev AMRAP og samsvar mellom tal deltakarar og gjennomføringsform.'
 if(collaboration&&collaboration!=='parallel')return 'Vel parallelt arbeid under Gjennomføring, eller slå av rundebyte.'
 if(!SAMSPEL_TASKS.some(([id])=>id===s.task)||!SAMSPEL_METRICS.some(([id])=>id===s.metric))return 'Vel kondisjonsoppgåve og resultatmål.'
 const capacityIssue=samspelCapacityIssue(s)
 if(capacityIssue)return capacityIssue
 if(!items.some(x=>!x.is_rest))return 'Legg til minst ei øving på '+samspelMainLabel(s)+'-sporet.'
 return null
}
export function samspelRoles(s,rounds=0){
 if(samspelChipper(s))return Array.from({length:s.participant_count},()=> 'Delt arbeid')
 if(samspelRelay(s)){const i=Math.max(0,Math.floor(Number(rounds)||0))%s.participant_count;return Array.from({length:s.participant_count},(_,j)=>i===j?'Arbeid':'Kvile')}
 if(samspelRecovery(s))return Array.from({length:s.participant_count},()=> 'Rolig arbeid')
 if(samspelDouble(s)){const roles=['A · '+(s.tracks[0]||'Spor A'),'B · '+(s.tracks[1]||'Spor B')];return s.switch_rule==='time'&&Math.floor(Number(rounds)||0)%2?roles.reverse():roles}
 if(samspelStrength(s))return ['Styrke','Styrke']
 const task=SAMSPEL_TASKS.find(([id])=>id===s?.task)?.[1]||'Kondisjon'
 const count=s?.version===2&&samspelConfig({samspel:s})?s.participant_count:2
 const n=Number(rounds)
 const index=(Number.isFinite(n)?Math.max(0,Math.floor(n)):0)%count
 const slots=samspelErgSlots(s)
 const stations=samspelMixed(s)?samspelStationRows(s):null
 return Array.from({length:count},(_,i)=>{const offset=(i-index+count)%count;return offset<slots?(stations?stations[offset]?.label||'Uavklart stasjon':task):samspelMainLabel(s)})
}
export function samspelResultIssue(s,value){
 if(!s||samspelStrength(s)||samspelDouble(s)||samspelRecovery(s)||samspelRelay(s)||samspelChipper(s))return null
 return value==null||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0?'Registrer faktisk samla '+(s.metric==='distance'?'distanse i meter':'kaloriar')+' (0 dersom ingen).':null
}
export function samspelScoring(s,base){
 if(samspelChipper(s))return {type:'time',fields:['time']}
 if(samspelRelay(s))return {type:'rounds_reps',fields:['rounds_reps']}
 if(samspelRecovery(s))return {type:'reps',fields:[]} // legacy engine type only; actual result is completion status
 if(samspelDouble(s))return {type:'reps',fields:['reps']}
 if(samspelStrength(s))return {type:'load',fields:['load']}
 if(samspelQuality(s))return {type:'distance',fields:['distance']}
 if(samspelEmom(s))return {type:s.metric,fields:[s.metric]}
 return s?samspelMixed(s)?{type:'rounds_reps',fields:['rounds_reps']}:{type:'multi',fields:['rounds_reps',s.metric]}:base
}

export function samspelWithCount(s,count){
 if(samspelStrength(s)||samspelDouble(s))return count===2?s:null
 if(samspelQuality(s))return count===2?s:null
 if(!s||!Number.isInteger(count)||count<2||count>8)return null
 return {...s,version:2,participant_count:count}
}
export function samspelRoundInstruction(s){
 if(samspelChipper(s))return 'Del repetisjonane fritt innan kvar øving. Gå vidare når laget har nådd målet for øvinga. Registrer kvar utøvar sitt faktiske bidrag. Ikkje registrer same reps to gonger.'
 if(samspelRelay(s))return 'Éin arbeider medan resten kviler. Byt manuelt etter avtalt arbeidsbolk. Eit byte er ikkje ei fullført runde. Registrer faktiske rundar og ekstra reps per utøvar etterpå.'
 if(samspelRecovery(s))return 'Gjer dei rolege øvingane i eige tempo, med pausar ved behov. Ingen konkurranse. Avslutt når de er ferdige eller når tidsramma går ut.'
 if(samspelDouble(s))return s.switch_rule==='fixed'?'To ulike øvingar på same klokke. Hald kvart dykkar spor gjennom økta.':'To ulike øvingar på same klokke. Byt spor ved kvart nye intervall.'
 if(samspelStrength(s))return 'Same øving, individuelle sett og vekter. Del utstyret etter behov og kvil mellom setta. Ingen felles løfteskår.'
 if(samspelQuality(s))return 'Éin ror medan den andre gjer kvalitetsøvingane i roleg tempo. Byt manuelt når kvalitetsarbeidet er ferdig. Byte tel ikkje som prestasjon. Avslutt ved tidsgrensa eller når begge er ferdige.'
 if(samspelEmom(s))return 'Byt rolle ved kvart nye EMOM-intervall. Éin på maskina, resten på EMOM. Registrer berre faktisk fullførte intervall per utøvar; byte er ikkje eit resultat.'
 if(samspelIsManual(s))return 'Byt rolle med eigen knapp. Registrer fullførte rundar separat.'
 if(samspelIsTimed(s))return 'Byt på klokka. Registrer berre faktisk fullførte felles rundar; byte tel ikkje som runde.'
 return s?.version===2&&s.participant_count>2?'Alle på AMRAP-sporet fullfører éi runde før de byter. Éin felles runde vert registrert.':'Byt rolle når AMRAP-partnaren har fullført éi runde.'
}

export function samspelIsTimed(s){
 return s?.version===2&&s.switch_rule==='time'&&!!samspelConfig({samspel:s})
}
export function samspelWithSwitch(s,rule,seconds=60){
 if(samspelChipper(s))return rule==='fixed'?s:null
 if(samspelRelay(s))return rule==='manual'?s:null
 if(samspelRecovery(s))return rule==='fixed'?s:null
 if(samspelDouble(s))return ['fixed','time'].includes(rule)?{...s,switch_rule:rule}:null
 if(samspelStrength(s))return rule==='fixed'?s:null
 if(samspelQuality(s))return rule==='manual'?s:null
 if(samspelEmom(s))return rule==='time'?s:null
 if(!s||!['round','time','manual'].includes(rule))return null
 const next={...s,version:2,participant_count:s.participant_count||2,switch_rule:rule}
 if(rule==='time')next.switch_seconds=Number(seconds)
 else delete next.switch_seconds
 return next
}
// Driven by the existing active elapsed clock: pauses and reloads need no second timer.
// At the workout deadline preserve the final working roles, rather than announcing an extra swap.
export function samspelRotation(s,{rounds=0,elapsed=0,target=Infinity,manualSwaps=[]}={}){
 if(samspelChipper(s)||samspelRecovery(s))return {roles:samspelRoles(s,0),nextSwitchSeconds:null,timed:false}
 if(samspelDouble(s)&&s.switch_rule==='fixed')return {roles:samspelRoles(s,0),nextSwitchSeconds:null,timed:false}
 if(samspelStrength(s))return {roles:['Styrke','Styrke'],nextSwitchSeconds:null,timed:false}
 if(samspelIsManual(s))return {roles:samspelRoles(s,normalizeSamspelSwaps(manualSwaps).length),nextSwitchSeconds:null,timed:false}
 if(!samspelIsTimed(s))return {roles:samspelRoles(s,rounds),nextSwitchSeconds:null,timed:false}
 const n=Number(elapsed),end=Number(target)
 const t=Number.isFinite(n)?Math.max(0,n):0
 const finiteEnd=Number.isFinite(end)&&end>0
 const finished=finiteEnd&&t>=end
 const active=finiteEnd?Math.min(t,Math.max(0,end-0.001)):t
 const index=Math.floor(active/s.switch_seconds)
 const next=(index+1)*s.switch_seconds
 return {roles:samspelRoles(s,index),nextSwitchSeconds:finished||(finiteEnd&&next>=end)?null:Math.max(0,Math.ceil(next-t)),timed:true}
}

export function samspelIsManual(s){
 return s?.version===2&&s.switch_rule==='manual'&&!!samspelConfig({samspel:s})
}
// Active elapsed seconds, separate from AMRAP laps; never infer a round.
export function normalizeSamspelSwaps(value){
 if(!Array.isArray(value))return []
 const out=[]
 for(const t of value)if(typeof t==='number'&&Number.isFinite(t)&&t>=0&&(!out.length||t-out[out.length-1]>=2))out.push(t)
 return out
}
export function appendSamspelSwap(s,history,{elapsed,running,target}={}){
 const rows=normalizeSamspelSwaps(history)
 if(!samspelIsManual(s)||!running||!Number.isFinite(elapsed)||elapsed<0||!Number.isFinite(target)||elapsed>=target)return rows
 if(rows.length&&elapsed-rows[rows.length-1]<2)return rows
 return [...rows,elapsed]
}

// Participant slots are local to this team result, not authenticated member identities.
export function samspelParticipantRows(s,values={}){
 const count=s?.version===2?s.participant_count:2
 if(!samspelConfig({samspel:s})||!s.individual_scores)return []
 return Array.from({length:count},(_,i)=>{
  const slot=i+1, row=values[slot]||{}
  if(samspelChipper(s))return {slot,chipper:s.targets.map((_,i)=>row['chipper-'+i]??'')}
  if(samspelRelay(s))return {slot,rounds:row.rounds??'',reps:row.reps??''}
  if(samspelDouble(s))return {slot,trackA:row.trackA??'',trackB:row.trackB??''}
  if(samspelStrength(s))return {slot,sets:Array.from({length:s.planned_sets},(_,i)=>({set_number:i+1,reps:row['reps-'+i]??'',load_kg:row['load-'+i]??'',rir:row['rir-'+i]??''}))}
  if(samspelRecovery(s))return {slot,quality:row.quality??'',erg:''}
  if(samspelQuality(s))return {slot,quality:row.quality??'',erg:row.erg??''}
  if(samspelEmom(s))return {slot,intervals:row.intervals??'',erg:row.erg??''}
  return {slot,rounds:row.rounds??'',reps:row.reps??'',erg:row.erg??''}
 })
}
export function samspelParticipantResults(s,values={}, {elapsed}={}){
 const rows=samspelParticipantRows(s,values), results=[]
 for(const row of rows){
  if(samspelChipper(s)){
   const actual=[]
   for(const [i,value] of row.chipper.entries()){
    const n=Number(value)
    if(String(value).trim()===''||!Number.isSafeInteger(n)||n<0||n>s.targets[i].target_reps)return {rows:[],issue:'Utøvar '+row.slot+' · '+s.targets[i].exercise_name+': oppgi faktisk reps (0 dersom ingen).',slot:row.slot,field:'chipper-'+i}
    actual.push(n)
   }
   results.push({slot:row.slot,chipper_reps:actual,rounds:null,extra_reps:null,erg_value:null})
   continue
  }
  if(samspelRelay(s)){
   for(const field of ['rounds','reps'])if(String(row[field]).trim()===''||!Number.isSafeInteger(Number(row[field]))||Number(row[field])<0)return {rows:[],issue:'Utøvar '+row.slot+': oppgi faktisk '+(field==='rounds'?'tal rundar':'ekstra reps')+' (0 dersom ingen).',slot:row.slot,field}
   results.push({slot:row.slot,rounds:Number(row.rounds),extra_reps:Number(row.reps),erg_value:null})
   continue
  }
  if(samspelDouble(s)){
   const [a,b]=doubleEmomOpportunity(s,row.slot,elapsed),values=[row.trackA,row.trackB]
   if(values.every(v=>String(v).trim()===''))continue
   const parsed=values.map(v=>String(v).trim()===''?null:Number(v))
   for(const [i,n] of parsed.entries())if(n!==null&&(!Number.isSafeInteger(n)||n<0||n>[a,b][i]))return {rows:[],issue:'Utøvar '+row.slot+': registrer faktisk fullførte intervall på spor '+['A','B'][i]+'.',slot:row.slot,field:['trackA','trackB'][i]}
   results.push({slot:row.slot,track_a_intervals:parsed[0],track_b_intervals:parsed[1],rounds:null,extra_reps:null,erg_value:null})
   continue
  }
  if(samspelStrength(s)){
   const strength_sets=[]
   const entered=v=>v!=null&&String(v).trim()!==''
   for(const [i,set] of row.sets.entries()){
    if(![set.reps,set.load_kg,set.rir].some(entered))continue
    const reps=Number(set.reps),load=Number(set.load_kg),rir=Number(set.rir)
    const issue=(field,message)=>({rows:[],issue:'Utøvar '+row.slot+' · sett '+(i+1)+': '+message,slot:row.slot,field:field+'-'+i})
    if(!entered(set.reps)||!Number.isSafeInteger(reps)||reps<0)return issue('reps','Oppgi faktisk reps, 0 ved mislukka forsøk.')
    if(!entered(set.load_kg)||!Number.isFinite(load)||load<0)return issue('load','Oppgi faktisk kg (0 utan ekstern belastning).')
    if(entered(set.rir)&&(!Number.isInteger(rir)||rir< -1||rir>10))return issue('rir','RIR må vera eit heiltal frå -1 til 10.')
    strength_sets.push({set_number:i+1,reps,load_kg:load,rir:entered(set.rir)?rir:null})
   }
   if(strength_sets.length)results.push({slot:row.slot,exercise_name:s.exercise_name,strength_sets,rounds:null,extra_reps:null,erg_value:null})
   continue
  }
  if(samspelNoncompetitive(s)){
   if(!['done','partial','skipped'].includes(row.quality))return {rows:[],issue:'Utøvar '+row.slot+': stadfest kvalitetsarbeidet.',slot:row.slot,field:'quality'}
   if(String(row.erg).trim()!==''&&(!Number.isFinite(Number(row.erg))||Number(row.erg)<0))return {rows:[],issue:'Utøvar '+row.slot+': oppgi gyldig distanse.',slot:row.slot,field:'erg'}
   results.push({slot:row.slot,quality_status:row.quality,rounds:null,extra_reps:null,erg_value:String(row.erg).trim()===''?null:Number(row.erg)})
   continue
  }
  if(samspelEmom(s)){
   const entered=String(row.intervals).trim()!=='',ergEntered=String(row.erg).trim()!==''
   if(!entered&&!ergEntered)continue
   const n=Number(row.intervals),erg=Number(row.erg)
   if(entered&&(!Number.isSafeInteger(n)||n<0||n>samspelEmomOpportunity(s,row.slot,elapsed)))return {rows:[],issue:'Utøvar '+row.slot+': oppgi faktisk fullførte EMOM-intervall innanfor tilgjengelege intervall.',slot:row.slot,field:'intervals'}
   if(ergEntered&&(!Number.isFinite(erg)||erg<0))return {rows:[],issue:'Utøvar '+row.slot+': oppgi gyldig maskinresultat.',slot:row.slot,field:'erg'}
   results.push({slot:row.slot,completed_intervals:entered?n:null,rounds:null,extra_reps:null,erg_value:ergEntered?erg:null})
   continue
  }
  const fields=samspelMixed(s)?['rounds','reps']:['rounds','reps','erg']
  const entered=fields.filter(k=>String(row[k]).trim()!=='')
  if(!entered.length)continue
  for(const k of entered){
   const n=Number(row[k])
   if(!Number.isFinite(n)||n<0||k!=='erg'&&!Number.isSafeInteger(n))return {rows:[],issue:'Utøvar '+row.slot+': registrer gyldige positive tal eller null.',slot:row.slot,field:k}
  }
  results.push({slot:row.slot,rounds:entered.includes('rounds')?Number(row.rounds):null,extra_reps:entered.includes('reps')?Number(row.reps):null,erg_value:entered.includes('erg')?Number(row.erg):null})
 }
 if(samspelChipper(s)){
  const excess=teamChipperProgress(s,results).findIndex(r=>r.reps>r.target_reps)
  if(excess>=0)return {rows:[],issue:s.targets[excess].exercise_name+': summen av registrerte reps overstig felles mål. Kontroller dobbelregistrering.',slot:1,field:'chipper-'+excess}
 }
 return {rows:results,issue:null}
}

// Multiple identical erg stations share one metric. Mixed-machine results must not be summed.
export function samspelErgSlots(s){
 if(samspelStrength(s)||samspelDouble(s)||samspelRecovery(s)||samspelRelay(s)||samspelChipper(s))return 0
 const count=s?.version===2?s.participant_count:2
 const slots=s?.version===2?(s.erg_slots??1):1
 return Number.isInteger(slots)&&slots>=1&&slots<count?slots:1
}
export function samspelCapacityIssue(s){
 if(samspelStrength(s)||samspelDouble(s)||samspelRecovery(s)||samspelRelay(s)||samspelChipper(s))return null // Existing equipment preparation owns capacity checks.
 if(s?.version!==2)return null
 if(samspelMixed(s))return samspelMixedCapacityIssue(s)
 const slots=s.erg_slots??1, available=s.available_ergs
 if(!Number.isInteger(slots)||slots<1||slots>=s.participant_count)return 'Vel minst eitt kondisjonsspor og lat minst éin utøvar vera på AMRAP-sporet.'
 if(available==null&&slots===1)return null
 if(!Number.isInteger(available)||available<slots||available>30)return 'Oppgi nok tilgjengelege maskiner av same type ('+slots+' nødvendige).'
 return null
}
export function samspelStationLabels(s,roles){
 if(samspelStrength(s)||samspelDouble(s)||samspelRecovery(s)||samspelRelay(s)||samspelChipper(s))return [...roles]
 if(samspelMixed(s))return [...roles]
 const task=SAMSPEL_TASKS.find(([id])=>id===s?.task)?.[1]||'Kondisjon'
 const slots=samspelErgSlots(s)
 if(slots===1)return [...roles]
 // Preserve station numbering across the wraparound of the rotating block.
 const count=roles.length
 const start=roles.findIndex((role,i)=>role===task&&roles[(i-1+count)%count]==='AMRAP')
 return roles.map((role,i)=>role===task?task+' '+((i-start+count)%count+1):role)
}

// Cue only a forward swap observed during this running session. No replay on restore,
// pause, undo or end. A missed interval never emits a burst of historical cues.
export function samspelCueStep(previous,current,{running=false,finished=false}={}){
 const next=Number.isSafeInteger(current)&&current>=0?current:null
 if(next===null)return {next:null,signal:null}
 return {next,signal:running&&!finished&&Number.isSafeInteger(previous)&&next>previous?'station':null}
}
export function samspelSwapIndex(s,{rounds=0,elapsed=0,target=Infinity,manualSwaps=[]}={}){
 if(!s||samspelStrength(s)||samspelRecovery(s)||samspelChipper(s)||samspelDouble(s)&&s.switch_rule==='fixed')return null
 if(samspelIsManual(s))return normalizeSamspelSwaps(manualSwaps).length
 if(!samspelIsTimed(s))return Math.max(0,Math.floor(Number(rounds)||0))
 const t=Number.isFinite(elapsed)?Math.max(0,elapsed):0
 const end=Number.isFinite(target)&&target>0?Math.max(0,target-0.001):Infinity
 return Math.floor(Math.min(t,end)/s.switch_seconds)
}

// Explicit per-station configuration. Historical v1/v2 single-type scores stay unchanged.
export function samspelMixed(s){return s?.version===2&&Array.isArray(s.station_tasks)}
export function samspelStationRows(s){
 if(!samspelMixed(s))return []
 return s.station_tasks.map((row,i)=>({slot:i+1,task:row.task,metric:row.metric,...(row.task==='strength'?{exercise_id:row.exercise_id,exercise_name:row.exercise_name,instruction:row.instruction,equipment:row.equipment}:{}),label:(row.task==='strength'?row.exercise_name||'Styrke':SAMSPEL_TASKS.find(([id])=>id===row.task)?.[1]||'Uavklart')+' · S'+(i+1)}))
}
export function samspelMixedCapacityIssue(s){
 const stations=s.station_tasks,count=s.participant_count
 if(!Array.isArray(stations)||stations.length<2||stations.length>=count||s.erg_slots!==stations.length)return 'Vel minst to stasjonar og minst éin utøvar på AMRAP.'
 const needed={}
 for(const row of stations){
  if(row?.task==='strength'){
   if(row.metric!=='reps'||!row.exercise_id||!String(row.exercise_name||'').trim()||!String(row.instruction||'').trim()||!String(row.equipment||'').trim())return 'Vel styrkeøving, utstyr og konkret dosering for kvar styrkestasjon.'
   const key='strength:'+String(row.equipment).trim().toLowerCase();needed[key]=(needed[key]||0)+1
  }else{
   if(!SAMSPEL_TASKS.some(([id])=>id===row?.task)||!SAMSPEL_METRICS.some(([id])=>id===row?.metric))return 'Vel maskintype og måleeining for kvar stasjon.'
   needed[row.task]=(needed[row.task]||0)+1
  }
 }
 for(const [task,n] of Object.entries(needed)){
  const available=s.station_capacity?.[task]
  if(!Number.isInteger(available)||available<n||available>30)return 'Oppgi minst '+n+' tilgjengelege '+(task.startsWith('strength:')?task.slice(9):SAMSPEL_TASKS.find(([id])=>id===task)?.[1]||task)+'-stasjonar.'
 }
 return null
}
export function samspelWithStations(s,enabled,slots=s?.erg_slots??1){
 if(!s)return null
 if(samspelNoncompetitive(s)||samspelClockedEmom(s)||samspelStrength(s)||samspelRelay(s)||samspelChipper(s))return s
 if(!enabled){const {station_tasks,station_capacity,...legacy}=s;return legacy}
 const n=Math.max(2,Math.min(Number(slots)||2,s.participant_count-1))
 if(s.participant_count<3)return s
 return {...s,erg_slots:n,station_tasks:Array.from({length:n},(_,i)=>s.station_tasks?.[i]||{task:s.task||'row',metric:s.metric||'distance'}),station_capacity:s.station_capacity||{}}
}
export function samspelStationResults(s,values={}){
 const rows=[]
 for(const station of samspelStationRows(s)){
  const raw=values['station-'+station.slot]?.erg
  if(raw==null||String(raw).trim()===''||!Number.isFinite(Number(raw))||Number(raw)<0||station.metric==='reps'&&!Number.isSafeInteger(Number(raw)))return {rows:[],issue:'Registrer faktisk resultat for '+station.label+' (0 dersom ingen).',slot:station.slot}
  rows.push({...station,value:Number(raw),unit:station.metric==='distance'?'m':station.metric==='reps'?'reps':'cal'})
 }
 return {rows,issue:null}
}

export function samspelStationCapacityKeys(s){
 const keys=new Map()
 for(const row of samspelStationRows(s)){
  if(row.task==='strength'){const eq=String(row.equipment||'').trim();if(eq)keys.set('strength:'+eq.toLowerCase(),eq)}
  else keys.set(row.task,SAMSPEL_TASKS.find(([id])=>id===row.task)?.[1]||row.task)
 }
 return [...keys]
}

// One format-aware entry point for the builder; the existing factories remain authoritative.
export function samspelTemplateOptions(format,{composite=false}={}){
 if(composite)return []
 return [
  ...(format==='AMRAP'?[['legacy','Parallelt arbeid med rollebyte'],['relay','You Go I Go · arbeid og kvile']]:[]),
  ...(format==='EMOM'?[['emom','Engine Swap · EMOM og maskin'],['double_emom','Double EMOM · to øvingar']]:[]),
  ...(format==='Strength'?[['strength','Iron Twins · individuelle sett']]:[]),
  ...(format==='Chipper'?[['chipper','Team Chipper · del repetisjonane']]:[]),
  ['quality','Quality & Row · kvalitetsarbeid og roing'],['recovery','Active Recovery · roleg fellesøkt']
 ]
}
export function samspelTemplateName(s){
 if(!s)return ''
 return ({relay:'You Go I Go',chipper:'Team Chipper',quality:'Quality & Row',recovery:'Active Recovery',emom:'Engine Swap',double_emom:'Double EMOM',strength:'Iron Twins'})[s.main_track]||'Parallelt arbeid med rollebyte'
}
export function samspelTemplateChoice(key,{format,interval=60,duration=600,composite=false}={}){
 if(!samspelTemplateOptions(format,{composite}).some(([id])=>id===key))return null
 const factories={legacy:()=>({version:2,mode:'parallel_round_swap',task:'row',metric:'distance',participant_count:2}),relay:youGoIGoConfig,chipper:teamChipperConfig,quality:qualityRowConfig,recovery:activeRecoveryConfig,emom:()=>engineSwapConfig(interval,duration),double_emom:()=>doubleEmomConfig(interval,duration),strength:ironTwinsConfig}
 const config=factories[key]()
 return {config,name:samspelTemplateName(config),format:['quality','recovery'].includes(key)?'Eigen økt':format,collaboration:key==='relay'?'you_go_i_go':key==='chipper'?'free_split':'parallel'}
}
