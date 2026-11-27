// An approved working copy is bound to an exact payload and source revision.
// All write paths in the protected library use the authenticated client and existing RLS.
export const LIBRARY_TYPES=Object.freeze({
 exercises:{label:'Øvingar',id:'id',name:'name',fields:{name:['Namn','text',160],category:['Kategori','text',100],equipment:['Utstyr','text',240],body_area:['Kroppsområde','text',100],description:['Beskriving','textarea',4000],video_url:['Video (https)','url',1000],is_active:['Aktiv','boolean'],is_rehab:['Rehab','boolean']}},
 wods:{label:'WOD-ar',id:'id',name:'name',fields:{notes:['Notat','textarea',8000],is_published:['Publisert','boolean']}},
 pt_program_templates:{label:'Planmalar / program',id:'id',name:'title',fields:{title:['Namn','text',160],description:['Beskriving','textarea',4000],is_active:['Aktiv','boolean']}}
})
export const staffApproved=p=>p?.active===true&&p?.membership_status==='approved'&&['admin','manager'].includes(p.role)
export function stableJson(v){return JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x)}
export const same=(a,b)=>stableJson(a)===stableJson(b)
export function prepareLibraryChange(kind,baseline,values){
 const config=LIBRARY_TYPES[kind];if(!config)throw Error('Ukjend bibliotektype.')
 if(!baseline&&kind!=='exercises')throw Error('Bruk den originale byggjaren til nye WOD-ar og planmalar.')
 if(baseline&&(!baseline[config.id]||!baseline.updated_at))throw Error('Kjelderevisjonen manglar. Oppdater biblioteket.')
 const payload={}
 for(const [key,[label,type,max]] of Object.entries(config.fields)){
  if(!(key in values))continue
  if(type==='boolean'){if(typeof values[key]!=='boolean')throw Error(label+' må vera av eller på.');payload[key]=values[key];continue}
  const value=String(values[key]??'').trim()
  if(value.length>max)throw Error(label+' er for langt.')
  if((key==='name'||key==='title')&&!value)throw Error(label+' manglar.')
  if(type==='url'&&value){let u;try{u=new URL(value)}catch{throw Error('Ugyldig videolenke.')}if(u.protocol!=='https:'||u.username||u.password)throw Error('Berre offentlege https-videolenker utan passord.')}
  payload[key]=type==='url'?value||null:value
 }
 if(baseline&&kind==='exercises'&&payload.name!==undefined&&payload.name!==baseline.name)throw Error('Øvingsnamn er historisk identitet. Opprett ein ny variant i staden.')
 if(kind==='wods'&&baseline?.is_archived&&payload.is_published)throw Error('Arkiverte WOD-ar må ikkje publiserast.')
 if(!baseline&&!payload.name)throw Error('Namn manglar.')
 const diff=Object.entries(payload).filter(([k,v])=>!baseline||!same(v,baseline[k])).map(([field,after])=>({field,label:config.fields[field][0],before:baseline?.[field]??null,after}))
 if(!diff.length)throw Error('Ingen endringar å senda.')
 return {kind,id:baseline?.[config.id]||null,version:baseline?.updated_at||null,baseline:baseline?Object.fromEntries(Object.keys(config.fields).map(k=>[k,baseline[k]])):null,patch:Object.fromEntries(diff.map(d=>[d.field,d.after])),diff}
}
export async function authorizeLibrary(client,profile){
 if(!staffApproved(profile))throw Error('Godkjend driftsrolle krevst.')
 const {data,error}=await client.auth.getUser();if(error||data?.user?.id!==profile.id)throw Error('Innlogginga er endra.')
 const p=await client.from('profiles').select('id,role,active,membership_status').eq('id',profile.id).single()
 if(p.error||p.data?.id!==profile.id||!staffApproved(p.data))throw Error('Tilgangen er endra.')
 return profile.id
}
export async function applyLibraryChange(client,profile,review,approval){
 if(!review||approval!==stableJson(review))throw Error('Endringa er ikkje godkjend, eller arbeidskopien er endra.')
 const config=LIBRARY_TYPES[review.kind];if(!config)throw Error('Ukjend bibliotektype.')
 const actor=await authorizeLibrary(client,profile)
 if(review.id){
  const fields=[config.id,'updated_at',...Object.keys(config.fields),...(review.kind==='wods'?['is_archived']:[])].join(',')
  const {data,error}=await client.from(review.kind).select(fields).eq(config.id,review.id).single()
  if(error||data?.updated_at!==review.version||!same(Object.fromEntries(Object.keys(config.fields).map(k=>[k,data?.[k]])),review.baseline))throw Error('Kjelda er endra. Hent ei ny arbeidskopi.')
  const checked=prepareLibraryChange(review.kind,data,{...review.baseline,...review.patch})
  if(!same(checked,review))throw Error('Endringskontrollen er ikkje lenger gyldig.')
  let q=client.from(review.kind).update({...review.patch,updated_at:new Date().toISOString()}).eq(config.id,review.id).eq('updated_at',review.version)
  // Additional field compare protects even legacy writers that do not update timestamps.
  for(const [k,v] of Object.entries(review.baseline))q=v==null?q.is(k,null):q.eq(k,v)
  const saved=await q.select(fields).maybeSingle()
  if(saved.error||!saved.data)throw saved.error||Error('Endringa vart ikkje stadfesta. Oppdater før nytt forsøk.')
  if(!Object.entries(review.patch).every(([k,v])=>same(saved.data[k],v)))throw Error('Lagring svara, men etterkontrollen avvik. Oppdater lista før nytt forsøk.')
  return saved.data
 }
 const checked=prepareLibraryChange(review.kind,null,review.patch)
 if(!same(checked,review))throw Error('Ny arbeidskopi er endra.')
 // Insert only; no upsert, no overwrite. Caller refreshes after an uncertain result.
 const {data,error}=await client.from(review.kind).insert({...review.patch,created_by:actor}).select('id,updated_at,'+Object.keys(config.fields).join(',')).single()
 if(error||!data?.id)throw error||Error('Lagringa vart ikkje stadfesta.')
 if(!Object.entries(review.patch).every(([k,v])=>same(data[k],v)))throw Error('Lagring svara, men etterkontrollen avvik. Oppdater lista.')
 return data
}
