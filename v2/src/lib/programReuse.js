// Copies never inherit database identity, completion state or scheduled date.
export function copyWodPart(block,items,newId,makeKey){
 const cloned=JSON.parse(JSON.stringify(block));const copiedItems=items.filter(x=>x.blockId===block.id).map(x=>({...JSON.parse(JSON.stringify(x)),key:makeKey(),blockId:newId}))
 return {block:{...cloned,id:newId,title:(block.title||block.format||'Del')+' (kopi)',source_wod_id:null,source_wod_name:null,benchmark_source_wod_id:null},items:copiedItems}
}
export function copyProgramWeekRows(programId,allSessions,sourceWeek,targetWeek){
 if(!programId||!Number.isInteger(targetWeek)||targetWeek<1||targetWeek>52||sourceWeek===targetWeek)throw Error('Vel ei anna gyldig veke.')
 const all=allSessions.filter(s=>s.program_id===programId)
 if(all.some(s=>!s.archived_at&&Number(s.week_no)===targetWeek))throw Error('Målveka har allereie økter.')
 const rows=all.filter(s=>!s.archived_at&&Number(s.week_no)===sourceWeek).sort((a,b)=>(Number(a.day_no)||1)-(Number(b.day_no)||1)||(Number(a.sequence_no)||0)-(Number(b.sequence_no)||0))
 if(!rows.length)throw Error('Ingen økter å kopiera.')
 const last=all.reduce((n,s)=>Math.max(n,Number(s.sequence_no)||0),0)
 return rows.map((s,i)=>({program_id:programId,sequence_no:last+i+1,title:s.title,wod_id:s.wod_id||null,scheduled_date:null,week_no:targetWeek,day_no:Number(s.day_no)||1,session_kind:s.session_kind||'training',focus_area:s.focus_area||'',estimated_minutes:s.estimated_minutes??null,workout_snapshot:s.workout_snapshot||{},coach_note:s.coach_note||'',status:'planned'}))
}
export function nextCoachSession(sessions=[]){return sessions.find(s=>!s.archived_at&&s.status==='planned'&&s.session_kind!=='rest')||null}
