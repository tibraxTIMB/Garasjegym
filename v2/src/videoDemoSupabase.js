// Video recording only. Resolved through vite.video-demo.config.js and never
// imported by the production app. No requests to Supabase are made here.
import {qualityRowConfig} from './lib/samspel.js'
import {buildZuendung} from './lib/zuendung.js'
import {compositeBlockForTimer,compositeTotalSeconds} from './lib/compositeWod.js'
import catalogueManifest from '../supabase/catalog/exercise_catalogue_manifest_sturmKopf_feuer_1_1.json'
const now = new Date()
const future = new Date(now.getTime() + 86400000 * 3).toISOString()
const scenario = () => new URLSearchParams(location.search).get('scenario') || ''
const isAudit = () => scenario().startsWith('audit')
const currentDemoId = () => ['maintenance','audit-admin','audit-pt-plan','audit-pt-schedule'].includes(scenario()) ? 'demo-admin' : 'demo-member'

let maintenanceLogs = []
let requests = []
let bookings = []
const scheduleAudit=()=>scenario()==='audit-pt-schedule'
const memberCalendarAudit=()=>scenario()==='audit-member-calendar'
const scheduleStart=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
const scheduleRows=[]
const scheduleAssignments=[]
const calendarPlanRows=()=>[1,2].map(n=>({id:'calendar-plan-'+n,program_id:'audit-plan',sequence_no:n,week_no:1,day_no:1,title:n===1?'Klar programøkt':'Låst programøkt',status:'planned',session_kind:'training',estimated_minutes:20,scheduled_date:scheduleStart(),wod_id:'demo-wod',workout_snapshot:{schedule_time:n===1?'17:15':'18:30'},workout_log_id:null,archived_at:null,flow_requires_approval:true,flow_approved:false,flow_override:false}))
const calendarAssignment=()=>({id:'calendar-assignment',member_id:'demo-member',wod_id:'demo-wod',status:'assigned',scheduled_date:scheduleStart(),scheduled_time:'16:30:00',due_date:null,linked_session_id:null,wods:{id:'demo-wod',name:'Tildelt kalender-WOD',format:'AMRAP',duration_minutes:12}})

const demoWods = [{
  id: 'demo-wod', name: 'Stålsnakke · 12 min', format: 'AMRAP', duration_minutes: 12,
  movements: '8 Wall Ball Shot · 12 cal Row · 3 Snatch Complex',
  notes: 'Demodata: tren i ditt eige tempo.',
  is_published: true, is_archived: false, category: 'standard', created_by: 'demo-admin', created_at: now.toISOString(),
  timer_settings: {workout_schema: {library_category: 'standard', items: [
    {id:'a',exercise_name:'Wall Ball Shot',levels:{rx:{reps:8,loadMode:'kg',loadKgMen:9,loadKgWomen:6}}},
    {id:'b',exercise_name:'Row',levels:{rx:{calories:12}}},
    {id:'c',exercise_name:'Snatch Complex',levels:{rx:{reps:3}}},
  ]}},
}]

const auditQualityWod={id:'audit-quality',name:'Audit Quality & Row',format:'Eigen økt',duration_minutes:10,movements:'Bird dog',notes:'Isolert test',category:'flow_prep',is_published:true,is_archived:false,created_by:'demo-admin',created_at:now.toISOString(),timer_settings:{workout_schema:{format:'Eigen økt',duration_seconds:600,library_category:'flow_prep',flowReporting:'done',flowPurpose:'prep',samspel:qualityRowConfig(),items:[{exercise_name:'Bird dog',equipment:'Kroppsvekt',reps:6,levels:{rx:{reps:6,loadMode:'none'}}}],wod_engine:{participation:'partner',collaboration:'parallel',participant_count:2}}}}
const auditCatalogue=catalogueManifest.exercises.map((e,i)=>({...e,id:'audit-ex-'+i,is_active:true}))
function auditWarmupWod(){
 const draft=buildZuendung('eisenkette','partner',auditCatalogue,()=> 'audit-prep')
 const main={id:'audit-main',title:'Hovudøkt',format:'AMRAP',minutes:2,flowPurpose:'perform',transitionMode:'manual'}
 const items=[...draft.items.map(({exercise,blockId,phase,move})=>({exercise_id:exercise.id,exercise_name:exercise.name,equipment:exercise.equipment,block_id:blockId,warmup_phase:phase,reps:Number(move.reps)||null,side_mode:move.side,minute_slot:move.minuteSlot||null,coach_note:move.note,levels:{rx:{reps:move.reps,durationSeconds:move.seconds||'',loadMode:'none'}}})),{exercise_name:'Air Squat',block_id:main.id,reps:5,levels:{rx:{reps:5,loadMode:'none'}}}]
 const blocks=[...draft.blocks,main].map((b,i)=>compositeBlockForTimer({...b,items:items.filter(x=>x.block_id===b.id)},i))
 const duration=compositeTotalSeconds(blocks)
 return {id:'audit-zuendung',name:'Audit ZÜNDUNG',format:'Samansett økt',category:'main',duration_minutes:Math.ceil(duration/60),movements:'Oppvarming og hovudøkt',is_published:true,is_archived:false,created_by:'demo-admin',timer_settings:{workout_schema:{format:'Samansett økt',duration_seconds:duration,library_category:'standard',items,composite_blocks:blocks,wod_engine:{version:2,participation:'individual',participant_count:1,collaboration:'solo',blocks}}}}
}
function rowsFor(table) {
  switch (table) {
    case 'garage_maintenance_schedule': return [{id:true,started_at:new Date(now.getTime()-1000*60*60*24*8).toISOString()}]
    case 'garage_maintenance_log': return maintenanceLogs
    case 'pt_coaches': return [{id:'coach-demo',user_id:'demo-coach',public_name:'Garasje PT (døme)',bio:'Hjelp med teknikk, styrke og treningsglede.',specialties:['Styrke','Kom i gang'],is_active:true}]
    case 'pt_services': return [{id:'service-demo',title:'Uforpliktande prat',description:'Finn ut om PT passar for deg.',duration_label:'Etter avtale',price_label:'0 kr i denne demoen',is_active:true}]
    case 'pt_service_requests': return requests
    case 'wods': return scenario()==='audit-frontdienst'?[...demoWods,auditQualityWod,auditWarmupWod()]:scenario()==='audit-folders'?[...demoWods,{...demoWods[0],id:'folder-wod-1',name:'Z – Første økt'},{...demoWods[0],id:'folder-wod-2',name:'A – Andre økt'}]:demoWods
    case 'wod_favorites': case 'wod_daily_schedules': case 'exercise_favorites': return []
    case 'classes': return [{id:'demo-class',title:'Garasjesirkel (døme)',type:'Gruppetime',starts_at:future,duration_minutes:45,capacity:6,published:true,cancelled_at:null,description:'Ei fellesøkt med roing, styrke og mobilitet.',workout_text:'45 min trening',wod_ids:[]}]
    case 'class_bookings': return bookings
    case 'profiles': return [{id:'demo-admin',display_name:'Demo-eigar',role:'admin',active:true,membership_status:'approved'},...(isAudit()?[{id:'demo-member',display_name:'Demomedlem med eit langt visningsnamn',role:'member',active:true,membership_status:'approved'}]:[])]
    case 'pt_programs': return memberCalendarAudit()?[{id:'audit-plan',client_id:'demo-member',title:'Kalenderplan',status:'active',weeks:6,start_date:scheduleStart(),archived_at:null,flow_unlock_mode:'sequence'}]:scheduleAudit()?[{id:'audit-plan',client_id:'demo-member',title:'Kalenderprøve',status:'active',weeks:6,start_date:scheduleStart(),archived_at:null,flow_unlock_mode:'open'}]:scenario()==='audit-folders'?[{id:'folder-plan',title:'Introkurs',archived_at:null},{id:'empty-plan',title:'Ny treningsplan',archived_at:null}]:isAudit()?[{id:'audit-plan',client_id:'demo-member',title:'Introkurs med eit ekstra langt programnamn',description:'Seks veker med styrke og teknikk.',status:'active',weeks:6,archived_at:null,flow_unlock_mode:'sequence'}]:[]
    case 'pt_wod_assignments': return memberCalendarAudit()?[calendarAssignment()]:scheduleAudit()?scheduleAssignments:scenario()==='audit-pt-plan'?[{id:'audit-assignment',member_id:'demo-member',wod_id:'demo-wod',status:'completed',completed_at:'2026-11-23T19:00:00Z',workout_log_id:'audit-log',wods:{id:'demo-wod',name:'Mancave Paincave med eit ekstra langt namn'}}]:[]
    case 'pt_program_sessions': return memberCalendarAudit()?calendarPlanRows():scheduleAudit()?scheduleRows:scenario()==='audit-folders'?[{program_id:'folder-plan',wod_id:'folder-wod-2',sequence_no:2,archived_at:null},{program_id:'folder-plan',wod_id:'folder-wod-1',sequence_no:1,archived_at:null}]:isAudit()?[1,2,3,4,5,6].map(n=>({id:'audit-session-'+n,program_id:'audit-plan',sequence_no:n,week_no:n,day_no:1,title:'Økt '+n+' – Alternating Dumbbell Push Jerk og grunnrørsler',status:'planned',session_kind:'training',estimated_minutes:35,focus_area:'Teknikk og styrke',coach_note:'Lett belastning.',wod_id:'demo-wod',archived_at:null,flow_requires_approval:true,flow_approved:false,flow_override:false})):[]
    case 'workout_logs': return scenario()==='audit-folders'?[{member_id:'demo-member',source_wod_id:'folder-wod-1',workout_date:'2026-11-24',created_at:'2026-11-24T12:00:00Z'},{member_id:'demo-member',source_wod_id:'demo-wod',workout_date:'2026-11-25',created_at:'2026-11-25T12:00:00Z'},{member_id:'other',source_wod_id:'folder-wod-2',workout_date:'2026-11-25',created_at:'2026-11-25T13:00:00Z'}]:[]
    case 'exercises': return scenario()==='audit-admin'||scenario()==='audit-frontdienst'?auditCatalogue:[]
    case 'personal_records': case 'class_live_sessions': return []
    default: return []
  }
}

function query(table) {
  let operation = 'select'
  let input = null
  let filters = []
  const self = {
    select() { return self },
    eq(column,value) { filters.push(row=>row[column]===value); return self },
    not(column,operator,value) { if(operator==='is')filters.push(row=>row[column]!==value&&row[column]!==undefined);return self },
    neq(column,value) { filters.push(row=>row[column]!==value); return self },
    lte(column,value) { filters.push(row=>row[column]<=value); return self },
    range() { return self },
    is(column,value) { filters.push(row=>row[column]===value); return self },
    in(column,values) { filters.push(row=>values.includes(row[column])); return self },
    gte(column,value) { filters.push(row=>row[column]>=value); return self },
    lt(column,value) { filters.push(row=>row[column]<value); return self },
    contains() { return self },
    order() { return self },
    limit() { return self },
    insert(value) { operation='insert'; input=value; return self },
    update(value) { operation='update'; input=value; return self },
    delete() { operation='delete'; return self },
    async single() { const r=await execute(); return {...r,data:Array.isArray(r.data)?r.data[0]||null:r.data} },
    async maybeSingle() { return self.single() },
    then(ok,fail) { return execute().then(ok,fail) },
  }
  async function execute() {
    if(scheduleAudit()&&['pt_program_sessions','pt_wod_assignments'].includes(table)&&['insert','update'].includes(operation)){
      const target=table==='pt_program_sessions'?scheduleRows:scheduleAssignments
      if(operation==='insert'){
        const rows=(Array.isArray(input)?input:[input]).map((row,i)=>({...row,id:'schedule-'+table+'-'+(target.length+i+1),archived_at:null,workout_log_id:null,updated_at:Date.now().toString(),...(table==='pt_wod_assignments'?{wods:demoWods.find(w=>w.id===row.wod_id)}:{})}))
        target.push(...rows);return {data:rows,error:null}
      }
      const rows=target.filter(row=>filters.every(fn=>fn(row)));rows.forEach(row=>Object.assign(row,input,{updated_at:Date.now().toString()}));return {data:rows,error:null}
    }
    if (operation === 'insert') {
      const data = {...input,id:'receipt-demo-'+(maintenanceLogs.length+1),completed_at:new Date().toISOString()}
      if(table==='garage_maintenance_log')maintenanceLogs=[data,...maintenanceLogs]
      if(table==='pt_service_requests')requests=[{...data,status:'pending',created_at:new Date().toISOString()},...requests]
      if(table==='class_bookings')bookings=[{...data,id:'booking-demo',status:'confirmed'},...bookings]
      return {data,error:null}
    }
    if (operation === 'update') return {data:[{id:'receipt-demo-1'}],error:null}
    if (operation === 'delete') return {data:[],error:null}
    return {data:rowsFor(table).filter(row=>filters.every(fn=>fn(row))),error:null}
  }
  return self
}

export const supabase = {
  from: query,
  rpc: async (name,args) => {
    if(memberCalendarAudit()&&name==='pt_flow_can_start'){
      const id=args?.p_session_id
      const calls=JSON.parse(sessionStorage.getItem('gg.audit.calendar.rpc')||'[]')
      sessionStorage.setItem('gg.audit.calendar.rpc',JSON.stringify([...calls,id]))
      return {data:id==='calendar-plan-1'&&sessionStorage.getItem('gg.audit.calendar.deny')!=='1',error:null}
    }
    if(scenario()==='audit-frontdienst'&&name==='save_workout_with_pt_links'){
      const payload=args?.p_workout
      if(payload?.member_id!=='demo-member'||!payload.save_token)return {data:null,error:{message:'Invalid synthetic save'}}
      const attempts='gg.audit.frontdienst.attempts'
      localStorage.setItem(attempts,String(Number(localStorage.getItem(attempts)||0)+1))
      const key='gg.audit.frontdienst.writes'
      const entries=JSON.parse(localStorage.getItem(key)||'[]')
      const prior=entries.find(row=>row.payload.save_token===payload.save_token)
      if(prior)return {data:prior.id,error:null}
      const id='audit-workout-'+(entries.length+1)
      localStorage.setItem(key,JSON.stringify([...entries,{id,payload}]))
      return {data:id,error:null}
    }
    return {data:name==='get_class_attendance_counts'?[{class_id:'demo-class',confirmed_count:2}]:[],error:null}
  },
  auth: {
    getUser: async () => ({data:{user:{id:currentDemoId(),email:'demo@example.invalid'}},error:null}),
    getSession: async () => ({data:{session:null},error:null}),
    onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}}),
    signOut: async () => ({error:null}),
  },
  channel: () => ({on(){return this},subscribe(){return this}}),
  removeChannel: async () => {},
}

export const isSupabaseConfigured = true
