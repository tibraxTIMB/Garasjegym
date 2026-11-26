// A preparation checklist, not an inventory count. Equipment descriptions are
// explicit catalogue text; alternatives and sharing must be confirmed by the coach.
export function equipmentPreparation(items=[]){
 const groups=new Map(),unknown=[]
 for(const item of items){
  if(item?.is_rest)continue
  const name=typeof item==='string'?item:item?.exercise_name||item?.name
  if(!name)continue
  const raw=typeof item==='object'?String(item.equipment||'').trim():''
  if(!raw){unknown.push(name);continue}
  if(/^(ingen|kroppsvekt|bodyweight)$/i.test(raw))continue
  // Do not split slash/or expressions into assumed simultaneous requirements.
  const key=raw.toLowerCase().replace(/\s+/g,' ')
  if(!groups.has(key))groups.set(key,{equipment:raw,exercises:new Set()})
  groups.get(key).exercises.add(name)
 }
 return {groups:[...groups.values()].map(x=>({...x,exercises:[...x.exercises]})),unknown:[...new Set(unknown)]}
}
export function preparationItems(snapshot={}){
 const schema=snapshot.timer_settings?.workout_schema
 if(Array.isArray(schema?.items)&&schema.items.length)return schema.items
 if(Array.isArray(snapshot.exercises)&&snapshot.exercises.length)return snapshot.exercises
 if(Array.isArray(snapshot.movements))return snapshot.movements
 if(typeof snapshot.movements==='string')return snapshot.movements.split('\n').map(s=>s.trim()).filter(Boolean)
 return []
}
