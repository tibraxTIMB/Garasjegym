// Portable planning documents. Never export profiles, IDs, check-ins or workout logs.
export const MAX_EXCHANGE_BYTES=2_000_000
const clean=v=>String(v??'').trim()
const key=v=>clean(v).normalize('NFKC').toLowerCase().replace(/\s+/g,' ')
const integer=(v,min,max,label)=>{const n=Number(v);if(clean(v)===''||!Number.isInteger(n)||n<min||n>max)throw Error(label+' må vera mellom '+min+' og '+max+'.');return n}
const short=(v,max,label)=>{const s=clean(v);if(s.length>max)throw Error(label+' er for lang.');return s}
export function exchangeRole(profile,coach=false){
 const approved=profile?.active===true&&profile?.membership_status==='approved'
 const staff=approved&&['admin','manager'].includes(profile.role)
 return {office:approved&&(staff||coach),staff,importWod:staff&&profile.role==='admin',planTemplate:staff}
}
export function csvCell(value){
 const s=String(value??'')
 // Prefix spreadsheet formula triggers without changing ordinary numeric strings.
 const safe=/^[\s\u0000-\u001f]*[=+@-]/.test(s)&&!/^[-+]?\d+(?:[.,]\d+)?$/.test(s)? "'"+s:s
 return '"'+safe.replace(/"/g,'""')+'"'
}
export function makeCsv(headers,rows){return '\uFEFF'+[headers,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n')+'\r\n'}
export function parseDelimited(input){
 const text=String(input??'').replace(/^\uFEFF/,'')
 if(text.length>MAX_EXCHANGE_BYTES)throw Error('Fila er for stor.')
 // Detect delimiter from the unquoted header; semicolon for Norwegian Excel.
 let quoted=false,counts={';':0,',':0,'\t':0}
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue}quoted=!quoted}else if(!quoted){if(c==='\n'||c==='\r')break;if(c in counts)counts[c]++}}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]
 if(!counts[delimiter])throw Error('Finn ikkje kolonnar. Bruk CSV med semikolon, komma eller tabulator.')
 const rows=[];let row=[],cell='',inQuote=false,closed=false
 const push=()=>{row.push(cell);cell='';closed=false}
 const finish=()=>{push();if(row.some(x=>x.trim()))rows.push(row);row=[]}
 for(let i=0;i<text.length;i++){
  const c=text[i]
  if(inQuote){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{inQuote=false;closed=true}}else cell+=c;continue}
  if(c===delimiter){push();continue}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;finish();continue}
  if(c==='"'&&!cell&&!closed){inQuote=true;continue}
  if(closed||c==='"')throw Error('Ugyldige hermeteikn i CSV-fila.')
  cell+=c
 }
 if(inQuote)throw Error('CSV-fila har eit uavslutta hermeteikn.')
 if(cell||row.length||closed)finish()
 const headers=(rows.shift()||[]).map(key)
 if(new Set(headers).size!==headers.length||headers.some(x=>!x))throw Error('Kolonnenamna må vera unike.')
 if(!rows.length||rows.length>500)throw Error('Fila må innehalda 1–500 datarader.')
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error('Feil tal kolonnar på datarad '+(i+1)+'.');return Object.fromEntries(headers.map((h,j)=>[h,r[j]]))})
}
export function planDocument(title,sessions,wods=[]){
 const names=new Map(wods.map(w=>[w.id,w.name]))
 return {type:'garasjegym.plan',version:1,title:clean(title)||'Treningsplan',sessions:sessions.filter(s=>!s.archived_at).map(s=>({week:Number(s.week_no)||1,day:Number(s.day_no)||1,title:clean(s.title),wod:s.wod_id?names.get(s.wod_id)||clean(s.workout_snapshot?.wod_title):'',minutes:Number(s.estimated_minutes)||45,kind:s.session_kind||'training'}))}
}
export function parsePlanDocument(source,format,wods=[]){
 if(String(source??'').length>MAX_EXCHANGE_BYTES)throw Error('Fila er for stor.')
 let doc
 if(format==='json'){try{doc=JSON.parse(source)}catch{throw Error('Ugyldig JSON.')}if(doc?.type!=='garasjegym.plan'||doc.version!==1)throw Error('Vel ein GarasjeGym planfil, versjon 1.')}
 else doc={type:'garasjegym.plan',version:1,title:'Importert treningsplan',sessions:parseDelimited(source)}
 if(!Array.isArray(doc.sessions)||!doc.sessions.length||doc.sessions.length>364)throw Error('Planen må ha 1–364 økter.')
 const map=new Map();for(const w of wods.filter(w=>w.is_published===true&&!w.is_archived)){const k=key(w.name);map.set(k,[...(map.get(k)||[]),w])}
 const sessions=doc.sessions.map((s,i)=>{
  const label='Rad '+(i+1)+': '
  const title=short(s?.title,160,label+'namn'),wod=short(s?.wod,160,label+'WOD')
  if(!title&&!wod)throw Error(label+'øktnamn eller WOD manglar.')
  const week=integer(s.week,1,52,label+'veke'),day=integer(s.day,1,7,label+'dag')
  const minutes=integer(clean(s.minutes)||45,1,300,label+'minutt')
  const kind=clean(s.kind)||'training'
  if(!['training','information','assessment'].includes(kind))throw Error(label+'ukjend økttype.')
  if(kind==='information'&&wod)throw Error(label+'informasjonstime kan ikkje ha WOD.')
  const hits=wod?map.get(key(wod))||[]:[]
  if(wod&&hits.length!==1)throw Error(label+'WOD «'+wod+'» må ha eitt eintydig treff i det publiserte biblioteket.')
  const found=hits[0]
  return {sequence_no:i+1,week_no:week,day_no:day,title:title||found.name,session_kind:kind,estimated_minutes:minutes,wod_id:found?.id||null,focus_area:'',workout_snapshot:found?{id:found.id,title:found.name,wod_title:found.name,format:found.format,duration_minutes:found.duration_minutes,movements:found.movements,notes:found.notes,timer_settings:found.timer_settings}:null}
 })
 const perWeek={};for(const s of sessions)perWeek[s.week_no]=(perWeek[s.week_no]||0)+1
 if(Object.values(perWeek).some(n=>n>7))throw Error('Maks 7 økter per veke i import.')
 return {title:short(doc.title||'Importert treningsplan',160,'Plannamn'),weeks:Math.max(...sessions.map(s=>s.week_no)),sessions_per_week:Math.max(...Object.values(perWeek)),sessions}
}
export function planCsv(doc){return makeCsv(['week','day','title','wod','minutes','kind'],doc.sessions.map(s=>[s.week,s.day,s.title,s.wod,s.minutes,s.kind]))}
export function planText(doc){return [doc.title,'',...doc.sessions.map(s=>'Veke '+s.week+' · dag '+s.day+' · '+s.title+(s.wod?' · WOD: '+s.wod:'')+' · '+s.minutes+' min')].join('\n')}
export function wodDocument(rows){return {type:'garasjegym.wods',version:1,wods:rows.filter(w=>w.is_published===true&&!w.is_archived).map(w=>({name:w.name,format:w.format,category:w.category,duration_minutes:w.duration_minutes,movements:w.movements,notes:w.notes,timer_settings:w.timer_settings}))}}
const movementText=m=>typeof m==='string'?m:Array.isArray(m)?m.map(x=>typeof x==='string'?x:[x.exercise_name||x.name,x.reps,x.load_kg!=null?x.load_kg+' kg':''].filter(Boolean).join(' ')).join('\n'):''
export function wodText(rows,markdown=false){return wodDocument(rows).wods.map(w=>[markdown?'## '+w.name:w.name,[w.format,w.duration_minutes?w.duration_minutes+' min':''].filter(Boolean).join(' · '),movementText(w.movements),w.notes||''].filter(Boolean).join('\n')).join('\n\n---\n\n')}
export function wodCsv(rows){return makeCsv(['name','format','minutes','movements','notes'],wodDocument(rows).wods.map(w=>[w.name,w.format,w.duration_minutes,movementText(w.movements),w.notes]))}
// A versioned WOD export is a structured reference, not an automatic round-trip.
export function wodImportSource(source,format){
 if(String(source??'').length>MAX_EXCHANGE_BYTES)throw Error('Fila er for stor.')
 if(format==='json'){
  let doc;try{doc=JSON.parse(source)}catch{throw Error('Ugyldig JSON.')}
  if(doc?.type!=='garasjegym.wods'||doc.version!==1||!Array.isArray(doc.wods)||doc.wods.length!==1)throw Error('Vel ei GarasjeGym-fil med éin WOD.')
  const w=doc.wods[0]
  if(w.timer_settings?.workout_schema?.composite_blocks?.length>1||w.timer_settings?.workout_schema?.items?.some(i=>i.is_complex||i.side_mode&&i.side_mode!=='none')||w.timer_settings?.workout_schema?.samspel)throw Error('Denne strukturen krev full manuell kontroll i byggjaren. Bruk original WOD eller tekstimport; JSON-konvertering kan mista detaljar.')
  if(!clean(w.name)||!clean(w.format)||!movementText(w.movements))throw Error('WOD-fila manglar namn, format eller øvingar.')
  return [w.name,w.format+(w.duration_minutes?' '+w.duration_minutes+' min':''),movementText(w.movements)].join('\n')
 }
 const rows=parseDelimited(source)
 const names=new Set(rows.map(r=>key(r.name))),formats=new Set(rows.map(r=>key(r.format))),times=new Set(rows.map(r=>clean(r.minutes)))
 if(names.size!==1||formats.size!==1||times.size!==1||!clean(rows[0].name)||!clean(rows[0].format))throw Error('Importer éin WOD per fil med same namn, format og tid.')
 const lines=rows.map((r,i)=>{if(clean(r.movements))return r.movements;const ex=short(r.exercise,160,'Øving');if(!ex)throw Error('Øving manglar på rad '+(i+1)+'.');const reps=clean(r.reps);if(reps&&!/^\d+(?:-\d+)*$/.test(reps))throw Error('Ugyldig reps på rad '+(i+1)+'.');const kg=clean(r.kg);if(kg&&!/^\d+(?:[.,]\d+)?$/.test(kg))throw Error('Ugyldig kg på rad '+(i+1)+'.');return [reps,ex,kg?kg.replace(',','.')+' kg':''].filter(Boolean).join(' ')})
 return [rows[0].name,rows[0].format+(rows[0].minutes?' '+rows[0].minutes+' min':''),...lines].join('\n')
}
const icsEscape=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')
const dateOk=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s
export function planCalendar(sessions,now=new Date()){
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GarasjeGym//Werkstatt//NN','CALSCALE:GREGORIAN']
 for(const [i,s] of sessions.entries()){if(!dateOk(s.date))continue;const date=s.date.replace(/-/g,'');lines.push('BEGIN:VEVENT','UID:gg-'+date+'-'+i+'-'+stamp+'@garasjegym','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+date,'SUMMARY:'+icsEscape(s.title),'END:VEVENT')}
 lines.push('END:VCALENDAR')
 return lines.join('\r\n')+'\r\n'
}
export function saveExchange(name,text,type='text/plain;charset=utf-8'){
 const safe=name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').slice(0,120)||'garasjegym'
 const href=URL.createObjectURL(new Blob([text],{type}))
 const a=document.createElement('a');a.href=href;a.download=safe;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000)
}
export function printExchange(title,content){
 const win=window.open('','_blank')
 if(!win)throw Error('Nettlesaren blokkerte utskriftsvindauget.')
 win.opener=null;win.document.title=title
 const heading=win.document.createElement('h1');heading.textContent=title
 const body=win.document.createElement('pre');body.textContent=content;body.style.cssText='white-space:pre-wrap;font:14px/1.6 system-ui;color:#111'
 win.document.body.style.cssText='margin:32px;color:#111;background:#fff;font-family:system-ui'
 win.document.body.replaceChildren(heading,body);win.focus();win.print()
}
