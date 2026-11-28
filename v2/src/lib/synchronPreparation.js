import {synchronTransportFormatSupported,pairedEmomScheduleIssue,pairedEmomOpportunity} from './synchronSchedule.js'
import {synchronPlanIssue,createSynchronSession} from './synchron.js'
const idOk=x=>typeof x==='string'&&x.trim()!==''&&x.length<=128&&!['__proto__','constructor','prototype'].includes(x)
const amount=x=>(typeof x==='number'||typeof x==='string')&&String(x).trim()!==''&&Number.isSafeInteger(Number(x))&&Number(x)>0&&Number(x)<=100000?Number(x):null
const clonePrep=x=>JSON.parse(JSON.stringify(x))
// Deliberately limited to structured, single-block Chipper. Never flatten
// multi-block WODs or silently reinterpret sets, intervals or per-side doses.
export function synchronWodTargets(wod,level='rx'){
 const fail=issue=>({issue,rows:[]})
 const schema=wod?.timer_settings?.workout_schema
 const blocks=schema?.wod_engine?.blocks
 if(!synchronTransportFormatSupported(wod?.format)||!schema||blocks?.length>1||schema.composite_blocks?.length>1)return fail('Vel ein strukturert Chipper med éin del.')
 // A cap is read only from the trusted WOD, never the lobby request.
 const capInputs=[[schema.time_cap_seconds,1],[schema.time_cap_minutes,60],[blocks?.[0]?.time_cap_seconds,1]]
 const caps=[]
 for(const [raw,factor] of capInputs){
  if(raw===null||raw===undefined||raw===''||raw===0)continue
  if(typeof raw!=='number'&&typeof raw!=='string'||!String(raw).trim())return fail('Ugyldig tidsgrense.')
  const seconds=Number(raw)*factor
  if(!Number.isSafeInteger(seconds)||seconds<0||seconds>36000)return fail('Ugyldig tidsgrense.')
  if(seconds>0)caps.push(seconds)
 }
 if(new Set(caps).size>1)return fail('Tidsgrensene i WOD-en samsvarar ikkje.')
 const timeCapSeconds=caps[0]||null
 const items=blocks?.[0]?.items?.length?blocks[0].items:schema.items
 if(!Array.isArray(items)||!items.length||items.length>30)return fail('WOD-en manglar strukturerte øvingar.')
 const rows=[]
 for(let i=0;i<items.length;i++){
  const item=items[i],d=item.levels?item.levels[level]:null
  if(item.is_rest||item.is_complex||item.reps_mode==='amrap'||item.side_mode&&item.side_mode!=='none'||item.sideMode&&item.sideMode!=='none'||item.levels&&!d||!idOk(item.exercise_id)||!idOk(item.exercise_name))return fail('Øving '+(i+1)+' krev manuell programmering før SYNCHRON.')
  const rawSets=d?.sets??item.sets_count,sets=amount(rawSets)
  if(rawSets!=null&&String(rawSets).trim()!==''&&sets!==1||Array.isArray(item.sets)&&item.sets.length>1)return fail('Fleire sett må programmerast eksplisitt.')
  const values=d?{reps:d.reps,seconds:d.durationSeconds,meters:d.distanceMeters,calories:d.calories}:{reps:item.reps,seconds:item.work_seconds,meters:item.meters,calories:item.calories}
  const present=Object.entries(values).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number(v)!==0)
  if(present.length!==1||amount(present[0][1])===null)return fail('Vel éi eintydig måleeining og mengd for '+item.exercise_name+'.')
  const [unit,value]=present[0]
  rows.push({id:'movement-'+(i+1),exerciseId:item.exercise_id,name:item.exercise_name,unit,target:amount(value),method:unit==='seconds'?'clock':unit==='reps'?'estimate':'hybrid',collaboration:'relay'})
 }
 return {issue:null,rows,...(timeCapSeconds?{timeCapSeconds}:{})}
}
// Caller supplies the verified active roster and coach permission. A client
// cannot grant these rights; trusted server must load both independently.
export function prepareSynchronLobby({wod,level='rx',memberIds,leaderParticipates=false,doses,sessionId},{actorId,canCoach,eligibleMemberIds}={}){
 const fail=issue=>({issue})
 if(!canCoach||!idOk(actorId)||!parseSynchronInvitation('synchron-session:'+sessionId)||!idOk(sessionId)||!Array.isArray(eligibleMemberIds)||!Array.isArray(memberIds)||memberIds.includes(actorId)||new Set(memberIds).size!==memberIds.length||memberIds.some(id=>!idOk(id)||!eligibleMemberIds.includes(id)))return fail('Vel berre godkjende kundar du har tilgang til.')
 if(!idOk(wod?.id)||wod.is_archived===true||wod.is_published!==true)return fail('Vel ein publisert WOD.')
 const parsed=synchronWodTargets(wod,level);if(parsed.issue)return fail(parsed.issue)
 const members=leaderParticipates?[actorId,...memberIds]:memberIds.slice()
 const movements=parsed.rows.map(m=>({...m,doses:Object.fromEntries(members.map(id=>{const dose=doses?.[m.id]?.[id];return [id,dose?{variant:dose.variant,loadKg:dose.loadKg}:null]}))}))
 const plan={id:sessionId,title:wod.name||'Samspel',sourceWodId:wod.id,prescriptionLevel:level,leaderId:actorId,members,movements,...(parsed.timeCapSeconds?{timeCapSeconds:parsed.timeCapSeconds}:{})}
 const issue=synchronPlanIssue(plan);if(issue)return fail(issue)
 const state=createSynchronSession(plan)
 // Intent only. Host must atomically persist session + idempotent notifications.
 const invitations=memberIds.map(recipientId=>({recipientId,sessionId,href:'synchron-session:'+sessionId,title:'Delta i økta',body:plan.title}))
 return {state, invitations:clonePrep(invitations)}
}
export function parseSynchronInvitation(href){
 if(typeof href!=='string'||!href.startsWith('synchron-session:'))return null
 const id=href.slice('synchron-session:'.length)
 return /^[A-Za-z0-9_-]{1,128}$/.test(id)&&idOk(id)?id:null
}

// Server-side paired-EMOM preflight, deliberately NOT a lobby or a session.
// Caller must supply independently authenticated permissions, current WOD and roster.
// Distinct collaboration type prevents use in the Chipper reducer and result seal.
export function prepareSynchronPairedPlan({wod,memberIds,leaderParticipates=false,levelsByMember,doses,sessionId},{actorId,canCoach,eligibleMemberIds}={}){
 const fail=issue=>({issue})
 if(!canCoach||!idOk(actorId)||!parseSynchronInvitation('synchron-session:'+sessionId)||!Array.isArray(eligibleMemberIds)||!Array.isArray(memberIds)||memberIds.includes(actorId)||new Set(memberIds).size!==memberIds.length||memberIds.some(id=>!idOk(id)||!eligibleMemberIds.includes(id)))return fail('Vel berre godkjende kundar du har tilgang til.')
 const members=leaderParticipates?[actorId,...memberIds]:memberIds.slice()
 if(members.length!==2)return fail('YGIG EMOM krev akkurat to utøvarar.')
 if(!idOk(wod?.id)||wod.is_archived===true||wod.is_published!==true||wod.format!=='EMOM')return fail('Vel ein publisert YGIG EMOM.')
 const schema=wod.timer_settings?.workout_schema,config=schema?.samspel,engine=schema?.wod_engine,blocks=engine?.blocks
 if(!schema||schema.format!=='EMOM'||config?.version!==2||config.mode!=='parallel_round_swap'||config.main_track!=='paired_emom'||config.participant_count!==2||config.individual_scores!==true||config.switch_rule!=='time'||config.station_tasks||engine?.participation!=='partner'||engine.collaboration!=='you_go_i_go'||engine.participant_count!==2||blocks?.length>1||schema.composite_blocks?.length>1)return fail('Vel ein strukturert, sjølvstendig YGIG EMOM.')
 const items=schema.items
 if(!Array.isArray(items)||!Array.isArray(config.tracks)||config.tracks.length!==items.length||pairedEmomScheduleIssue({durationSeconds:config.duration_seconds,intervalSeconds:config.switch_seconds,exerciseCount:items.length}))return fail('Ugyldig intervallrekkje.')
 if(schema.duration_seconds!==config.duration_seconds||schema.interval?.work_every_seconds!==config.switch_seconds||[schema.time_cap_seconds,schema.time_cap_minutes].some(v=>Number(v)>0)||blocks?.[0]&&(blocks[0].format!=='EMOM'||blocks[0].duration_seconds!==config.duration_seconds||JSON.stringify(blocks[0].items)!==JSON.stringify(items)))return fail('Tidsramme eller øvingsrekkje samsvarar ikkje med WOD-en.')
 const levels=['rx','scaled','foundation']
 if(!levelsByMember||members.some(id=>!Object.hasOwn(levelsByMember,id)||!levels.includes(levelsByMember[id])))return fail('Vel doseringsnivå for kvar utøvar.')
 const schedule={duration_seconds:config.duration_seconds,switch_seconds:config.switch_seconds,tracks:config.tracks.slice()}
 const movements=[]
 for(const [i,item] of items.entries()){
  if(!item||!idOk(item.exercise_id)||!idOk(item.exercise_name)||item.exercise_name!==config.tracks[i]||item.is_rest||item.is_complex||item.reps_mode==='amrap'||String(item.minute_slot??item.minuteSlot??'').trim()||item.side_mode&&item.side_mode!=='none'||item.sideMode&&item.sideMode!=='none'||Array.isArray(item.sets)&&item.sets.length>1)return fail('Øving '+(i+1)+' krev eintydige faste repetisjonar.')
  const id='movement-'+(i+1),individual={}
  for(const [index,member] of members.entries()){
   const level=levelsByMember[member],dose=item.levels?.[level],given=doses?.[id]?.[member]
   const reps=amount(dose?.reps)
   if(!reps||[dose?.durationSeconds,dose?.distanceMeters,dose?.calories,dose?.heightCm].some(v=>v!=null&&String(v).trim()!==''&&Number(v)!==0)||dose?.sets!=null&&String(dose.sets).trim()!==''&&amount(dose.sets)!==1)return fail('Manglar eintydig repsdosering på valt nivå for '+item.exercise_name+'.')
   if(!given||!idOk(given.variant)||!Object.hasOwn(given,'loadKg')||given.loadKg!==null&&(!Number.isFinite(given.loadKg)||given.loadKg<0)||dose.loadMode==='kg'&&given.loadKg===null)return fail('Vel individuell variant og eventuell arbeidsvekt for '+item.exercise_name+'.')
   const intervals=pairedEmomOpportunity(schedule,i,index+1)
   if(!Number.isSafeInteger(reps*intervals)||reps*intervals>100000)return fail('Planlagt repetisjonsmengd er for stor.')
   individual[member]={level,variant:given.variant,loadKg:given.loadKg,repsPerInterval:reps,plannedIntervals:intervals,plannedReps:reps*intervals}
  }
  movements.push({id,exerciseId:item.exercise_id,name:item.exercise_name,unit:'reps',collaboration:'paired_emom',doses:individual})
 }
 return {plan:{version:1,mode:'paired_emom',id:sessionId,title:wod.name||'YGIG EMOM',sourceWodId:wod.id,leaderId:actorId,members,schedule,movements}}
}
