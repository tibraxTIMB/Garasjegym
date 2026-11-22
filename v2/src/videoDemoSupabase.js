// Video recording only. Resolved through vite.video-demo.config.js and never
// imported by the production app. No requests to Supabase are made here.
const now = new Date()
const future = new Date(now.getTime() + 86400000 * 3).toISOString()
const currentDemoId = () => new URLSearchParams(location.search).get('scenario') === 'maintenance' ? 'demo-admin' : 'demo-member'

let maintenanceLogs = []
let requests = []
let bookings = []

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

function rowsFor(table) {
  switch (table) {
    case 'garage_maintenance_schedule': return [{id:true,started_at:new Date(now.getTime()-1000*60*60*24*8).toISOString()}]
    case 'garage_maintenance_log': return maintenanceLogs
    case 'pt_coaches': return [{id:'coach-demo',user_id:'demo-coach',public_name:'Garasje PT (døme)',bio:'Hjelp med teknikk, styrke og treningsglede.',specialties:['Styrke','Kom i gang'],is_active:true}]
    case 'pt_services': return [{id:'service-demo',title:'Uforpliktande prat',description:'Finn ut om PT passar for deg.',duration_label:'Etter avtale',price_label:'0 kr i denne demoen',is_active:true}]
    case 'pt_service_requests': return requests
    case 'wods': return demoWods
    case 'wod_favorites': case 'wod_daily_schedules': case 'exercise_favorites': return []
    case 'classes': return [{id:'demo-class',title:'Garasjesirkel (døme)',type:'Gruppetime',starts_at:future,duration_minutes:45,capacity:6,published:true,cancelled_at:null,description:'Ei fellesøkt med roing, styrke og mobilitet.',workout_text:'45 min trening',wod_ids:[]}]
    case 'class_bookings': return bookings
    case 'profiles': return [{id:'demo-admin',display_name:'Demo-eigar',role:'admin',active:true}]
    case 'workout_logs': case 'personal_records': case 'exercises': case 'class_live_sessions': return []
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
    is(column,value) { filters.push(row=>row[column]===value); return self },
    in(column,values) { filters.push(row=>values.includes(row[column])); return self },
    gte(column,value) { filters.push(row=>row[column]>=value); return self },
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
  rpc: async name => ({data:name==='get_class_attendance_counts'?[{class_id:'demo-class',confirmed_count:2}]:[],error:null}),
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
