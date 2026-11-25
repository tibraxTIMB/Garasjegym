import {flowItemGroup,flowReporting} from './workoutFlow.js'
import {parseCompositeScoreTime,explicitBlockResults} from './compositeWod.js'
const entered=v=>v!=null&&String(v).trim()!==''
const numberError=(v,integer=false,min=0,max=Infinity)=>entered(v)&&(!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max||(integer&&!Number.isInteger(Number(v))))
const timeError=v=>{if(!entered(v))return false;const s=String(v).trim();return !/^\d{1,3}:\d{1,2}(?::\d{1,2})?$/.test(s)||s.split(':').slice(1).some(n=>Number(n)>59)}
export function collectResultIssues({items=[],schema={},format='',blocks=[],blockScores={},manualLibraryEntry=false,scoreRounds='',scoreReps='',scoreTime='',scoreLoad='',scoreCalories='',scoreDistance=''}={}){
 const issues=[]
 const add=(location,field,message)=>issues.push({...location,field,message})
 items.forEach((item,itemIndex)=>{
  const group=flowItemGroup(item,schema,format)
  const location={itemIndex,blockId:group.id,part:group.title,exercise:item.exercise_name||'Øving '+(itemIndex+1)}
  if(numberError(item.rowValue))add(location,'rowValue','Resultatet må vera eit tal på null eller meir.')
  ;(item.sets||[]).forEach((set,setIndex)=>{
   const loc={...location,setIndex}
   if(numberError(set.reps,true))add(loc,'reps','Reps må vera eit heiltal på null eller meir.')
   if(numberError(set.load_kg))add(loc,'load_kg','Vekt må vera eit tal på null eller meir.')
   if(entered(set.height_cm)&&(!Number.isFinite(Number(set.height_cm))||Number(set.height_cm)<=0))add(loc,'height_cm','Høgd må vera større enn 0 cm.')
   if(numberError(set.time_seconds))add(loc,'time_seconds','Tid må vera eit tal på null eller meir.')
   if(numberError(set.rir,true,-1,10))add(loc,'rir','RIR må vera eit heiltal frå -1 til 10.')
   if(item.is_complex&&item.complex_family==='custom'){
    if([set.reps,set.load_kg].some(entered)&&!['complete','partial','failed'].includes(set.complex_status))add(loc,'complex_status','Vel fullført, delvis eller mislukka for dette komplekset.')
    if(set.complex_status==='complete'&&(!Number.isInteger(Number(set.reps))||Number(set.reps)<1))add(loc,'reps','Oppgi minst éin fullført syklus.')
    if(['partial','failed'].includes(set.complex_status)&&Number(set.reps)>0)add(loc,'reps','Delvis eller mislukka kompleks kan ikkje ha fullførte syklusar.')
   }
  })
 })
 const root={part:'Samla resultat'}
 for(const [field,value,label,integer] of [['scoreRounds',scoreRounds,'Rundar',true],['scoreReps',scoreReps,'Ekstra reps',true],['scoreLoad',scoreLoad,'Vekt',false],['scoreCalories',scoreCalories,'Kaloriar',false],['scoreDistance',scoreDistance,'Distanse',false]]){
  if(numberError(value,integer))add(root,field,label+' må vera '+(integer?'eit heiltal':'eit tal')+' på null eller meir.')
 }
 if(timeError(scoreTime))add(root,'scoreTime','Skriv sluttid som mm:ss eller tt:mm:ss.')
 if(manualLibraryEntry&&format==='AMRAP'&&!entered(scoreRounds)&&entered(scoreReps))add(root,'scoreRounds','Oppgi også fullførte rundar.')
 for(const block of blocks){
  if(!block?.id||flowReporting(block,schema)==='done')continue
  const v=blockScores[block.id]||{}
  const itemIndex=items.findIndex(item=>flowItemGroup(item,schema,format).id===block.id)
  const loc={blockId:block.id,part:block.title||block.format,...(itemIndex>=0?{itemIndex}:{}),score:true}
  if(numberError(v.rounds,true))add(loc,'rounds','Fullførte rundar må vera eit heiltal på null eller meir.')
  if(numberError(v.extraReps,true))add(loc,'extraReps','Ekstra reps må vera eit heiltal på null eller meir.')
  if(manualLibraryEntry&&entered(v.extraReps)&&!entered(v.rounds))add(loc,'rounds','Oppgi også fullførte rundar.')
  if(entered(v.time)&&(!Number.isFinite(parseCompositeScoreTime(v.time))||parseCompositeScoreTime(v.time)<=0))add(loc,'time','Skriv ei gyldig sluttid, til dømes 04:15.')
  if(block.scoreMode&&block.scoreMode!=='auto'&&entered(v.primary)){
   try{explicitBlockResults([block],blockScores,items)}catch{add(loc,'primary','Oppgi eit gyldig hovudresultat for denne delen.')}
  }
 }
 return issues
}
export function resultIssueLabel(issue){return [issue.part,issue.exercise,Number.isInteger(issue.setIndex)?'Sett '+(issue.setIndex+1):''].filter(Boolean).join(' · ')}
