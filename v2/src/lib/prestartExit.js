// Only an untouched, prepared WOD may be closed without discarding results.
const progressed = snapshot => Boolean(snapshot?.hasStarted || snapshot?.running ||
 Number(snapshot?.elapsed)>0 || snapshot?.laps?.length ||
 ['PÅGÅR','PAUSE','FERDIG','TIDSGRENSE','FULLFØRT'].includes(snapshot?.phase))
export function canLeavePreparedWod(snapshot={},now=Date.now()){
 if(progressed(snapshot)||Number(snapshot?.active_block_index)>0||snapshot?.composite_transition)return false
 if(snapshot?.countdownDeadline!=null&&Number(snapshot.countdownDeadline)<=now)return false
 if(Object.values(snapshot?.block_results||{}).some(progressed))return false
 if(snapshot?.block_summary?.some(block=>block.completed||progressed(block)))return false
 return true
}
