import {DETAILED_MUSCLE_LABELS,exerciseMuscleProfile} from './exerciseMuscleProfiles.js'
export const MUSCLE_LABELS=DETAILED_MUSCLE_LABELS
export function muscleProfile(items=[]){
 const primary=new Set(),secondary=new Set(),stabilizers=new Set(),modes=new Set(),unknown=[];let known=0,total=0,mobility=0
 for(const item of items){
  if(item?.is_rest)continue
  const name=typeof item==='string'?item:item?.exercise_name||item?.name||''
  if(!name||/^(pause|rest)$/i.test(name))continue
  const steps=Array.isArray(item?.complex_steps)&&item.complex_steps.length?item.complex_steps.map(s=>s.name||s.exercise_name||''):[name]
  for(const movement of steps){total++;const p=exerciseMuscleProfile(movement);if(!p){unknown.push(movement);continue}known++;modes.add(p.mode);if(p.mode==='mobility'){mobility++;continue}p.primary.forEach(g=>primary.add(g));p.secondary.forEach(g=>secondary.add(g));p.stabilizers.forEach(g=>stabilizers.add(g))}
 }
 primary.forEach(g=>{secondary.delete(g);stabilizers.delete(g)});secondary.forEach(g=>stabilizers.delete(g))
 return {primary:[...primary],secondary:[...secondary],stabilizers:[...stabilizers],modes:[...modes],known,total,mobility,unknown:[...new Set(unknown)]}
}
