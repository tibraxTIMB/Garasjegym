/** Ladder is not Death By: each stage finishes when the athlete confirms it, not on a minute boundary. */
export function ladderStatus(completedRounds=0, ladder={}, plannedRounds=5) {
 const done=Math.max(0,Math.floor(Number(completedRounds)||0))
 const start=Math.max(1,Math.floor(Number(ladder?.start)||2))
 const step=Math.max(1,Math.floor(Number(ladder?.step)||2))
 const direction=ladder?.direction==='down'?'down':'up'
 const maxRounds=Math.max(1,Math.floor(Number(plannedRounds)||5))
 const reps=start+done*step*(direction==='down'?-1:1)
 const finished=done>=maxRounds||(direction==='down'&&reps<=0)
 return {completedRounds:done,currentRound:done+1,targetReps:finished?0:reps,finished,maxRounds,direction,start,step}
}
