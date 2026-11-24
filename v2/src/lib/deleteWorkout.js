// Delete a single member-owned log, then remove only PR rows that were linked to it.
export async function deleteWorkoutAndLinkedRecords(supabase,workoutId,memberId){
 if(!workoutId||!memberId)throw Error('Økt eller brukar manglar.')
 const linked=await supabase.from('personal_records').select('id').eq('member_id',memberId).eq('workout_log_id',workoutId)
 if(linked.error)throw linked.error
 const ids=(linked.data||[]).map(record=>record.id)
 const deleted=await supabase.from('workout_logs').delete().eq('id',workoutId).eq('member_id',memberId).select('id').maybeSingle()
 if(deleted.error||!deleted.data)throw deleted.error||Error('Du har ikkje tilgang til å sletta denne økta.')
 if(!ids.length)return {deleted:true,linkedIds:[],cleanupError:null}
 // Existing FK detaches old PR rows on log deletion. Scope cleanup to the
 // captured IDs and the same member; never touch independent PR entries.
 try{
  const cleanup=await supabase.from('personal_records').delete().eq('member_id',memberId).in('id',ids).is('workout_log_id',null).select('id')
  if(cleanup.error)throw cleanup.error
  if((cleanup.data||[]).length!==ids.length)throw Error('Ikkje alle tilknytte PR-noteringar kunne fjernast.')
  return {deleted:true,linkedIds:ids,cleanupError:null}
 }catch(error){return {deleted:true,linkedIds:ids,cleanupError:error?.message||'Ukjend feil'}}
}
