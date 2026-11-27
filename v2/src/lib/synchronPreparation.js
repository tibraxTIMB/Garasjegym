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
 if(wod?.format!=='Chipper'||!schema||blocks?.length>1||schema.composite_blocks?.length>1)return fail('Vel ein strukturert Chipper med éin del.')
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
 return {issue:null,rows}
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
 const plan={id:sessionId,title:wod.name||'Samspel',sourceWodId:wod.id,prescriptionLevel:level,leaderId:actorId,members,movements}
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
