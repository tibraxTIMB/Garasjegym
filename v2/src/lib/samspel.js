// Samspel is orthogonal to format. A versioned, opt-in capability; legacy WODs stay unchanged.
export const SAMSPEL_TASKS=[['row','Romaskin'],['bike','Sykkel'],['ski','SkiErg']]
export const SAMSPEL_STATION_TASKS=[...SAMSPEL_TASKS,['strength','Styrke']]
export const SAMSPEL_METRICS=[['distance','Meter'],['calories','Kaloriar']]
// Quality & Row is a non-competitive two-person track using the existing timer.
export function samspelQuality(s){return s?.version===2&&s.main_track==='quality'}
export function qualityRowConfig(minutes=10){return {version:2,mode:'parallel_round_swap',main_track:'quality',task:'row',metric:'distance',participant_count:2,erg_slots:1,available_ergs:1,switch_rule:'manual',duration_seconds:Number(minutes)*60,individual_scores:true}}
// Engine Swap: one erg track, remaining athletes on the shared EMOM clock.
export function samspelEmom(s){return s?.version===2&&s.main_track==='emom'}
export function engineSwapConfig(interval=60,duration=600){return {version:2,mode:'parallel_round_swap',main_track:'emom',task:'row',metric:'distance',participant_count:2,erg_slots:1,available_ergs:1,switch_rule:'time',switch_seconds:interval,duration_seconds:duration,individual_scores:true}}
export function samspelMainLabel(s){return samspelQuality(s)?'Kvalitet':samspelEmom(s)?'EMOM':'AMRAP'}
export function samspelEmomOpportunity(s,slot,elapsed=s?.duration_seconds){
 if(!samspelEmom(s)||!samspelConfig({samspel:s})||!Number.isInteger(slot)||slot<1||slot>s.participant_count||!Number.isFinite(elapsed))return 0
 const intervals=Math.ceil(Math.max(0,Math.min(elapsed,s.duration_seconds))/s.switch_seconds)
 const offset=slot-1
 const ergIntervals=intervals>offset?1+Math.floor((intervals-1-offset)/s.participant_count):0
 return intervals-ergIntervals
}
export function samspelConfig(schema={}){
 const s=schema?.samspel
 if(s?.mode!=='parallel_round_swap')return null
 if(s.main_track!==undefined&&!samspelQuality(s)&&!samspelEmom(s))return null
 if(samspelEmom(s))return Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&s.switch_rule==='time'&&Number.isInteger(s.switch_seconds)&&s.switch_seconds>=5&&s.switch_seconds<=3600&&Number.isInteger(s.duration_seconds)&&s.duration_seconds<=10800&&s.duration_seconds>=s.participant_count*s.switch_seconds&&s.duration_seconds%(s.participant_count*s.switch_seconds)===0&&(s.erg_slots??1)===1&&!Array.isArray(s.station_tasks)&&s.individual_scores===true&&SAMSPEL_TASKS.some(([id])=>id===s.task)&&SAMSPEL_METRICS.some(([id])=>id===s.metric)?s:null
 if(samspelQuality(s))return s.participant_count===2&&s.task==='row'&&s.metric==='distance'&&s.switch_rule==='manual'&&(s.erg_slots??1)===1&&!Array.isArray(s.station_tasks)&&s.individual_scores===true&&Number.isInteger(s.duration_seconds)&&s.duration_seconds>=60&&s.duration_seconds<=10800?s:null
 if(s.version===1)return s
 if(s.version===2&&Number.isInteger(s.participant_count)&&s.participant_count>=2&&s.participant_count<=8&&(!s.switch_rule||s.switch_rule==='round'||s.switch_rule==='manual'||s.switch_rule==='time'&&Number.isInteger(s.switch_seconds)&&s.switch_seconds>=15&&s.switch_seconds<=600))return s
 return null
}
export function samspelIssue(s,{format,participation,collaboration,participantCount=2,items=[]}={}){
 if(!s)return null
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
 const task=SAMSPEL_TASKS.find(([id])=>id===s?.task)?.[1]||'Kondisjon'
 const count=s?.version===2&&samspelConfig({samspel:s})?s.participant_count:2
 const n=Number(rounds)
 const index=(Number.isFinite(n)?Math.max(0,Math.floor(n)):0)%count
 const slots=samspelErgSlots(s)
 const stations=samspelMixed(s)?samspelStationRows(s):null
 return Array.from({length:count},(_,i)=>{const offset=(i-index+count)%count;return offset<slots?(stations?stations[offset]?.label||'Uavklart stasjon':task):samspelMainLabel(s)})
}
export function samspelResultIssue(s,value){
 if(!s)return null
 return value==null||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0?'Registrer faktisk samla '+(s.metric==='distance'?'distanse i meter':'kaloriar')+' (0 dersom ingen).':null
}
export function samspelScoring(s,base){
 if(samspelQuality(s))return {type:'distance',fields:['distance']}
 if(samspelEmom(s))return {type:s.metric,fields:[s.metric]}
 return s?samspelMixed(s)?{type:'rounds_reps',fields:['rounds_reps']}:{type:'multi',fields:['rounds_reps',s.metric]}:base
}

export function samspelWithCount(s,count){
 if(samspelQuality(s))return count===2?s:null
 if(!s||!Number.isInteger(count)||count<2||count>8)return null
 return {...s,version:2,participant_count:count}
}
export function samspelRoundInstruction(s){
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
  if(samspelQuality(s))return {slot,quality:row.quality??'',erg:row.erg??''}
  if(samspelEmom(s))return {slot,intervals:row.intervals??'',erg:row.erg??''}
  return {slot,rounds:row.rounds??'',reps:row.reps??'',erg:row.erg??''}
 })
}
export function samspelParticipantResults(s,values={}, {elapsed}={}){
 const rows=samspelParticipantRows(s,values), results=[]
 for(const row of rows){
  if(samspelQuality(s)){
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
 return {rows:results,issue:null}
}

// Multiple identical erg stations share one metric. Mixed-machine results must not be summed.
export function samspelErgSlots(s){
 const count=s?.version===2?s.participant_count:2
 const slots=s?.version===2?(s.erg_slots??1):1
 return Number.isInteger(slots)&&slots>=1&&slots<count?slots:1
}
export function samspelCapacityIssue(s){
 if(s?.version!==2)return null
 if(samspelMixed(s))return samspelMixedCapacityIssue(s)
 const slots=s.erg_slots??1, available=s.available_ergs
 if(!Number.isInteger(slots)||slots<1||slots>=s.participant_count)return 'Vel minst eitt kondisjonsspor og lat minst éin utøvar vera på AMRAP-sporet.'
 if(available==null&&slots===1)return null
 if(!Number.isInteger(available)||available<slots||available>30)return 'Oppgi nok tilgjengelege maskiner av same type ('+slots+' nødvendige).'
 return null
}
export function samspelStationLabels(s,roles){
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
 if(!s)return null
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
 if(samspelQuality(s)||samspelEmom(s))return s
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
