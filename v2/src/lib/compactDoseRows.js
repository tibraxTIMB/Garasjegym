// Compact editor for the existing prescription schema. Shared repetitions;
// male and female weights only where the exercise has external loading.
export function compactDoseRows(items,level){
 return items.map(({ex,dose:d={},metric,fields={},timed,strength})=>{
  const cells=[]
  const add=(id,label,value,patch,{decimal=false,kind='level',max=100000}={})=>cells.push({id,label,value:String(value??''),patch,decimal,kind,max})
  if(ex.is_rest)add('pause','Pause (sek)',ex.pauseSeconds||'30',v=>({pauseSeconds:v}),{kind:'item',max:3600})
  else{
   if(strength)add('sets','Sett',d.sets,v=>({sets:v}),{max:30})
   if(!['rowing','distance','calories','time'].includes(metric)&&!(timed&&ex.repsMode==='amrap'))add('reps',ex.is_complex?'Syklusar':'Reps',d.reps,v=>({reps:v}))
   if(metric==='rowing'){
    const unit=ex.rowUnit||'m',field=unit==='m'?'distanceMeters':unit==='cal'?'calories':'durationSeconds'
    const value=level==='rx'?ex.rowValue:d[field]!==''&&d[field]!=null&&unit==='min'?String(Number(d[field])/60):d[field]
    add('row',({m:'Meter',cal:'Kaloriar',s:'Sekund',min:'Minutt'})[unit]||'Meter',value,v=>level==='rx'?{reps:'',distanceMeters:unit==='m'?v:'',calories:unit==='cal'?v:'',durationSeconds:unit==='s'?v:unit==='min'&&v!==''?String(Number(v)*60):''}:{[field]:unit==='min'&&v!==''?String(Number(v)*60):v},{kind:level==='rx'?'row':'level',decimal:unit==='min'})
   }
   if(metric==='time')add('time','Sekund',d.durationSeconds,v=>({durationSeconds:v}))
   if(metric==='distance')add('distance','Meter',d.distanceMeters,v=>({distanceMeters:v}))
   if(metric==='calories')add('cal','Kaloriar',d.calories,v=>({calories:v}))
   if(fields.height)add('height','Høgd (cm)',d.heightCm,v=>({heightCm:v}),{max:300})
   if(fields.load&&!['percent','rir','bodyweight'].includes(d.loadMode)){
    add('men','♂ kg',d.loadKgMen,v=>({loadMode:'kg',loadKgMen:v,loadKg:''}),{decimal:true,max:2000})
    add('women','♀ kg',d.loadKgWomen,v=>({loadMode:'kg',loadKgWomen:v,loadKg:''}),{decimal:true,max:2000})
   }
   if(fields.load&&d.loadMode==='percent')add('percent','% 1RM',d.percent1rm,v=>({percent1rm:v}),{decimal:true,max:150})
  }
  return {key:ex.key,name:ex.name,category:ex.category,body_area:ex.body_area,is_rest:ex.is_rest,is_complex:ex.is_complex,cells,amrap:timed&&ex.repsMode==='amrap',equipment:ex.equipment||'',special:d.loadMode==='rir'?'RIR '+(d.rirRange||d.rir||'–'):d.loadMode==='bodyweight'?'Kroppsvekt':''}
 })
}
export function doseKeyAllowed(value,field){return value===''||(value.length<=10&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=field.max)}
