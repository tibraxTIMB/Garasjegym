export const LAB_CHANNEL='gg-werkstatt-tablet-v1'
export const LAB_WOD_ID='werkstatt-lab-wod'
// Validate nested planning metadata as well as the top-level export fields.
// Reject explicit identity/result records rather than silently alter a WOD schema.
const privateKeys=new Set(['memberid','clientid','userid','actorid','leaderid','createdby','updatedby','email','accesstoken','refreshtoken','savetoken','resultdata','workoutlogid','participantscores','synchronresult','actualresults','exerciseresults','workoutsets','password'])
function assertPlanningOnly(value){
 const stack=[value];let visited=0
 while(stack.length){const item=stack.pop();if(++visited>200000)throw Error('Treningsskjemaet er for stort.');if(!item||typeof item!=='object')continue
  for(const [key,v] of Object.entries(item)){if(privateKeys.has(key.replace(/[_-]/g,'').toLowerCase()))throw Error('Testlaboratoriet kan berre ta imot planleggingsdata.');if(v&&typeof v==='object')stack.push(v)}
 }
}
export function labWod(wod){
 if(!wod||typeof wod.name!=='string'||!wod.name.trim()||typeof wod.format!=='string'||!wod.timer_settings?.workout_schema||!Array.isArray(wod.timer_settings.workout_schema.items))throw Error('WOD-en manglar eit gyldig treningsskjema.')
 // Copy only planning fields; never transfer member IDs, actual results or account data.
 const row={id:LAB_WOD_ID,name:wod.name,format:wod.format,category:wod.category||'main',duration_minutes:wod.duration_minutes??null,movements:wod.movements||'',notes:wod.notes||'',timer_settings:wod.timer_settings,is_published:true,is_archived:false}
 assertPlanningOnly(row.timer_settings)
 const encoded=JSON.stringify(row)
 if(encoded.length>1000000)throw Error('WOD-en er for stor for testlaboratoriet.')
 return JSON.parse(encoded)
}
export function isLabMessage(message,type){return !!message&&message.channel===LAB_CHANNEL&&message.type===type}

export function labPlan(plan,scenario='open'){
 if(!plan||typeof plan.title!=='string'||!Array.isArray(plan.sessions)||plan.sessions.length<1||plan.sessions.length>364)throw Error('Planen manglar validerte økter.')
 const wods=[],sessions=plan.sessions.map((s,i)=>{
  const week=Number(s.week_no),day=Number(s.day_no),minutes=Number(s.estimated_minutes)
  if(!Number.isInteger(week)||week<1||week>52||!Number.isInteger(day)||day<1||day>7||!Number.isInteger(minutes)||minutes<1||minutes>300||typeof s.title!=='string')throw Error('Ugyldig planøkt.')
  let wod=null
  if(s.wod_id){const snap=s.workout_snapshot;if(!snap)throw Error('WOD-kopling manglar.');wod={...labWod({...snap,name:snap.wod_title||snap.title}),id:'lab-plan-wod-'+(i+1)};wods.push(wod)}
  return {id:'lab-plan-session-'+(i+1),sequence_no:i+1,week_no:week,day_no:day,title:s.title,estimated_minutes:minutes,session_kind:s.session_kind,status:'planned',wod_id:wod?.id||null,workout_snapshot:wod?{...wod,title:wod.name,wod_title:wod.name}:null}
 })
 const out={kind:'plan',title:plan.title,weeks:Math.max(...sessions.map(s=>s.week_no)),sessions,wods,flowMode:scenario==='sequence'?'sequence':'open'}
 if(JSON.stringify(out).length>2000000)throw Error('Planen er for stor for testlaboratoriet.')
 return out
}

// Compact viewports must always leave positive dimensions and a reachable header.
export function tabletDockGeometry({width,height,scale,viewportWidth,viewportHeight,position=null}){
 const w=Math.max(1,Number(viewportWidth)||1),h=Math.max(1,Number(viewportHeight)||1)
 const requested=Number.isFinite(scale)?Math.min(.85,Math.max(.3,scale)):.55
 const fit=Math.max(Number.EPSILON,Math.min(requested,Math.max(1,w-32)/width,Math.max(1,h-150)/height))
 const clamp=(v,max)=>Math.max(0,Math.min(max,Number.isFinite(v)?v:0))
 return {fit,position:position?{left:clamp(position.left,Math.max(0,w-120)),top:clamp(position.top,Math.max(0,h-48))}:null}
}
