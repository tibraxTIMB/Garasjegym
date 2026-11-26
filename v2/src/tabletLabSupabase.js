// Deliberately no Supabase SDK, URL, key, network or production identity.
import {LAB_WOD_ID} from './lib/tabletLabProtocol.js'
const uid='werkstatt-isolated-tablet-member-v1'
const user={id:uid,email:'tablet-lab@example.invalid'}
const profile={id:uid,display_name:'Testmedlem',role:'member',active:true,membership_status:'approved'}
const exercise={id:'werkstatt-lab-exercise',name:'Air squat',category:'Styrke',equipment:'Kroppsvekt',description:'Testøving',is_active:true}
let wods=[{id:LAB_WOD_ID,name:'Prøveøkt · 4 min',format:'AMRAP',category:'main',duration_minutes:4,movements:'10 Air squat',is_published:true,is_archived:false,created_at:'2026-11-26T00:00:00Z',timer_settings:{workout_schema:{version:6,format:'AMRAP',duration_seconds:240,items:[{exercise_id:exercise.id,exercise_name:exercise.name,sort_order:1,reps:10}]}}}]
const tables=new Map([['profiles',[profile]],['member_preferences',[{user_id:uid,super_simple_mode:true,preferred_display_mode:'simple'}]],['exercises',[exercise]],['workout_logs',[]]])
const read=table=>table==='wods'?wods:tables.get(table)||[]
export function setLabWod(row){wods=[{...row,id:LAB_WOD_ID,created_at:new Date().toISOString()}];const names=new Map();for(const item of row.timer_settings.workout_schema.items||[]){if(item.exercise_id)names.set(item.exercise_id,{id:item.exercise_id,name:item.exercise_name,category:item.category||'Styrke',equipment:item.equipment||'Kroppsvekt',is_active:true})}tables.set('exercises',[exercise,...names.values()])}
let serial=0
function query(table){
 let filters=[],mode='select',payload=null,limit=Infinity,offset=0,descending=false,orderKey='',head=false
 const q={
 select(_,opts){head=!!opts?.head;return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},is(k,v){filters.push(r=>(r[k]??null)===v);return q},in(k,values){filters.push(r=>values.includes(r[k]));return q},
 gt(k,v){filters.push(r=>r[k]>v);return q},gte(k,v){filters.push(r=>r[k]>=v);return q},lt(k,v){filters.push(r=>r[k]<v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},not(k,op,v){filters.push(r=>(r[k]??null)!==v);return q},contains(){return q},or(){return q},
 order(k,opt){orderKey=k;descending=opt?.ascending===false;return q},limit(n){limit=n;return q},range(a,b){offset=a;limit=b-a+1;return q},
 insert(v){mode='insert';payload=v;return q},upsert(v){mode='upsert';payload=v;return q},update(v){mode='update';payload=v;return q},delete(){mode='delete';return q},
 single:async()=>{const r=execute();return {...r,data:r.data?.[0]??null}},maybeSingle:async()=>q.single(),then(ok,fail){return Promise.resolve().then(execute).then(ok,fail)}
 }
 function execute(){
  const rows=read(table).filter(r=>filters.every(f=>f(r)))
  if(mode!=='select'){
   // Only selected synthetic interactions are simulated. Never claim real persistence.
   if(!['workout_logs','member_preferences','exercise_favorites','wod_favorites'].includes(table))return {data:null,error:{message:'Denne handlinga er ikkje simulert i testlaboratoriet.'}}
   const target=read(table)
   if(mode==='insert'||mode==='upsert'){const next=(Array.isArray(payload)?payload:[payload]).map(v=>({...v,id:v.id||'lab-'+(++serial)}));tables.set(table,[...target,...next]);return {data:next,error:null}}
   if(mode==='update'){rows.forEach(r=>Object.assign(r,payload));return {data:rows,error:null}}
   tables.set(table,target.filter(r=>!rows.includes(r)));return {data:rows,error:null}
  }
  if(orderKey)rows.sort((a,b)=>String(a[orderKey]??'').localeCompare(String(b[orderKey]??''))*(descending?-1:1))
  return {data:head?null:rows.slice(offset,offset+limit),count:rows.length,error:null}
 }
 return q
}
const receipts=new Map()
export const supabase={from:query,auth:{getUser:async()=>({data:{user},error:null}),getSession:async()=>({data:{session:{user}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:{message:'Lukk testlaboratoriet for å avslutta.'}})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>{},rpc:async(name,args)=>{
 if(name==='save_workout_with_pt_links'||name==='save_workout_atomic'){
  const p=args?.p_workout;if(p?.member_id!==uid||!p.save_token)return {data:null,error:{message:'Ugyldig testresultat.'}}
  if(receipts.has(p.save_token))return {data:receipts.get(p.save_token),error:null}
  const id='lab-workout-'+(++serial);receipts.set(p.save_token,id);tables.set('workout_logs',[...read('workout_logs'),{...p,id}]);return {data:id,error:null}
 }
 if(name==='get_class_attendance_counts')return {data:[],error:null}
 return {data:null,error:{message:'RPC '+name+' er ikkje simulert i testlaboratoriet.'}}
}}
export const isSupabaseConfigured=true
