// Local planning projects only. No personal training records or production mutations.
const PREFIX='gg.werkstatt.projects.v2.'
const MAX_PROJECTS=20,MAX_REVISIONS=12,MAX_BYTES=3000000
const text=(v,n)=>String(v??'').slice(0,n)
export function projectSnapshot(p){
 if(!Array.isArray(p?.rows)||p.rows.length>364)throw Error('Ugyldig prosjektinnhald.')
 return {title:text(p.title,160),rows:p.rows.map(r=>({week:text(r.week,8),day:text(r.day,8),title:text(r.title,160),wod:text(r.wod,160),minutes:text(r.minutes,8),kind:text(r.kind,24)}))}
}
const empty=()=>({version:2,projects:[]})
export function readProjects(actor,storage=globalThis.localStorage){
 if(!actor)return empty()
 try{const doc=JSON.parse(storage.getItem(PREFIX+actor)||'null');if(doc?.version!==2||!Array.isArray(doc.projects)||doc.projects.length>MAX_PROJECTS)return empty();return {version:2,projects:doc.projects.map(p=>({...projectSnapshot(p),id:text(p.id,100),updated:text(p.updated,40),revisions:(Array.isArray(p.revisions)?p.revisions:[]).slice(0,MAX_REVISIONS).map(r=>({...projectSnapshot(r),at:text(r.at,40),label:text(r.label,80)}))}))}}catch{return empty()}
}
export function persistProjects(actor,doc,storage=globalThis.localStorage){
 if(!actor||doc?.version!==2||!Array.isArray(doc.projects)||doc.projects.length>MAX_PROJECTS)throw Error('Maks 20 lokale prosjekt.')
 const json=JSON.stringify(doc);if(json.length>MAX_BYTES)throw Error('Prosjektarkivet er fullt. Eksporter ein kladd før du fjernar han.')
 storage.setItem(PREFIX+actor,json);if(storage.getItem(PREFIX+actor)!==json)throw Error('Lokal lagring vart ikkje stadfesta.')
 return doc
}
export function checkpoint(doc,id,snapshot,at,label='Kontrollpunkt'){
 if(!id)throw Error('Prosjekt-ID manglar.')
 const snap=projectSnapshot(snapshot),prior=doc.projects.find(p=>p.id===id)
 const changed=prior&&JSON.stringify(projectSnapshot(prior))!==JSON.stringify(snap)
 const revisions=prior?(changed?[{...projectSnapshot(prior),at:prior.updated,label:text(label,80)},...prior.revisions].slice(0,MAX_REVISIONS):prior.revisions):[]
 const row={...snap,id,updated:at,revisions}
 const projects=[row,...doc.projects.filter(p=>p.id!==id)]
 if(projects.length>MAX_PROJECTS)throw Error('Maks 20 lokale prosjekt.')
 return {version:2,projects}
}
export function restoreRevision(doc,id,index,at){
 const p=doc.projects.find(x=>x.id===id),r=p?.revisions[index]
 if(!r)throw Error('Revisjonen finst ikkje.')
 return checkpoint(doc,id,r,at,'Før gjenoppretting')
}
export function planOverview(rows,wods){
 const byName=new Map();for(const w of wods){const k=String(w.name).trim().toLowerCase();byName.set(k,[...(byName.get(k)||[]),w])}
 const weeks=new Map(),issues=[]
 for(const [i,row] of rows.entries()){
  const week=Number(row.week),day=Number(row.day),minutes=Number(row.minutes)
  if(!Number.isInteger(week)||week<1||week>52||!Number.isInteger(day)||day<1||day>7||!Number.isInteger(minutes)||minutes<1||minutes>300){issues.push({row:i+1,message:'Ugyldig veke, dag eller varigheit'});continue}
  const r=weeks.get(week)||{week,sessions:0,minutes:0,trainingMinutes:0,days:new Set(),formats:{},unlinked:0};r.sessions++;r.minutes+=minutes;r.days.add(day)
  if(row.kind!=='information')r.trainingMinutes+=minutes
  const matches=byName.get(String(row.wod||'').trim().toLowerCase())||[]
  if(row.wod&&matches.length!==1)issues.push({row:i+1,message:'WOD-kopling er ikkje eintydig'})
  if(row.kind!=='information'&&!row.wod)r.unlinked++
  if(matches.length===1){const f=matches[0].format||'Ukjent';r.formats[f]=(r.formats[f]||0)+1}
  weeks.set(week,r)
 }
 return {weeks:[...weeks.values()].sort((a,b)=>a.week-b.week).map(r=>({...r,days:r.days.size})),issues}
}
