/** Light-duty owner plan for a small private garage gym. No daily log. */
export const GARAGE_MAINTENANCE_PLAN = [
  {
    id:'weekly', title:'Vekesjekk', type:'Reinhald', intervalDays:7, minutes:5,
    summary:'Ein rask runde når det passar i løpet av veka.',
    items:[
      {id:'surfaces',label:'Tørk av benk, matter, handtak og utstyr med synleg sveitte.'},
      {id:'floor',label:'Kost eller støvsug treningsgolvet.'},
      {id:'erg',label:'Tørk over romaskin, sykkelrulle og område rundt dei.'},
      {id:'air',label:'Luft og sjekk at rommet er tørt og ryddig.'},
    ],
  },
  {
    id:'monthly', title:'Månadskontroll', type:'Utstyr og tryggleik', intervalDays:30, minutes:10,
    summary:'Sjå etter slitasje og slark før noko blir eit problem.',
    items:[
      {id:'weights',label:'Sjå over stong, EZ-stong, vektskiver, låsar og manualar/kettlebells.'},
      {id:'frame',label:'Kontroller benk, dips-/pullupstativ og landmine for slark og skadar.'},
      {id:'soft',label:'Sjå over TRX, strikk, hoppetau, medisinball og plyoboks.'},
      {id:'machines',label:'Tørk roskinna og sjekk fotstroppar, sete, sykkelrulle og kablar.'},
    ],
  },
  {
    id:'seasonal', title:'Kvartalssjekk', type:'Litt grundigare', intervalDays:90, minutes:15,
    summary:'Ein sesongvis gjennomgang – berre fire gonger i året.',
    items:[
      {id:'deep',label:'Reingjer under/kring utstyr og på vanskeleg tilgjengelege stader.'},
      {id:'service',label:'Sjå over Concept2-kjede, sete og sykkelrulle. Gjer service ved behov etter rettleiinga til produsenten.'},
      {id:'replace',label:'Vurder om strikk, stroppar, tau eller andre slitedelar må bytast.'},
    ],
  },
]

const DAY = 24*60*60*1000

export function maintenanceOverview(logs=[],startedAt=null,now=Date.now()) {
  const current=now instanceof Date?now.getTime():new Date(now).getTime()
  const start=new Date(startedAt||'').getTime()
  const dated=Array.isArray(logs)?logs:[]
  const periods=GARAGE_MAINTENANCE_PLAN.map(plan=>{
    const last=dated.filter(row=>row.period===plan.id&&Number.isFinite(new Date(row.completed_at).getTime()))
      .sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at))[0]||null
    const base=last?new Date(last.completed_at).getTime():start
    const dueAt=Number.isFinite(base)?new Date(base+plan.intervalDays*DAY):null
    const remaining=dueAt?dueAt.getTime()-current:null
    const due=remaining!==null&&remaining<=0
    const daysLeft=remaining===null?null:Math.ceil(remaining/DAY)
    const overdueDays=due?Math.floor(-remaining/DAY):0
    const status=due?(overdueDays>=1?`${overdueDays} dagar over tida`:'På tide')
      :daysLeft===null?'Ikkje sett opp':daysLeft<=1?'I morgon':`Om ${daysLeft} dagar`
    return {...plan,last,dueAt,due,daysLeft,overdueDays,status}
  })
  const issues=dated.filter(row=>row.needs_followup&&!row.resolved_at)
    .sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at))
  return {periods,issues,due:periods.filter(period=>period.due)}
}

// Virtual inbox notices: recalculated from receipts, never written as a
// growing collection of duplicate notifications.
export function maintenanceReminders(overview,now=Date.now()) {
  const created_at=new Date(now).toISOString()
  const items=[]
  if(overview.due.length)items.push({
    id:'garage-maintenance-due',virtualMaintenance:true,category:'system',
    href:'admin-maintenance',title:'Drift: sjekk på tide',
    body:overview.due.map(item=>item.title).join(', ')+'. Opna Drift og kvitter når du har gjort runden.',
    priority:'normal',requires_action:true,requires_ack:false,status:'open',
    is_read:false,created_at,
  })
  if(overview.issues.length)items.push({
    id:'garage-maintenance-followup',virtualMaintenance:true,category:'system',
    href:'admin-maintenance',title:'Utstyr treng oppfølging',
    body:`${overview.issues.length} ${overview.issues.length===1?'merknad står':'merknader står'} att. Sjå kva som må rettast i Drift.`,
    priority:'high',requires_action:true,requires_ack:false,status:'open',
    is_read:false,created_at,
  })
  return items
}
