// Death By: one fixed countdown per round. Each successful round adds a fixed rep step.
// The athlete must confirm each round before its deadline; missing a deadline ends the workout.

const whole = (value, fallback, min, max) => {
 const n=Number(value)
 return Number.isInteger(n) && n>=min && n<=max ? n : fallback
}

export function deathByConfig(ladder = {}) {
 return {
  intervalSeconds: whole(ladder?.interval_seconds, 60, 5, 3600),
  start: whole(ladder?.start, 1, 1, 1000),
  step: whole(ladder?.step, 1, 1, 1000),
 }
}

export function deathByTimerState(elapsedSeconds = 0, completedRounds = 0, ladder = {}) {
 const {intervalSeconds,start,step}=deathByConfig(ladder)
 const elapsed=Math.max(0,Number(elapsedSeconds)||0)
 const completed=Math.max(0,Math.floor(Number(completedRounds)||0))
 const failureAt=(completed+1)*intervalSeconds
 const failed=elapsed>=failureAt
 const round=failed ? completed+1 : Math.floor(elapsed/intervalSeconds)+1
 const secondsLeft=failed ? 0 : Math.max(0,intervalSeconds-(elapsed%intervalSeconds))
 return {
  intervalSeconds,start,step,round,completedRounds:completed,
  targetReps:start+(round-1)*step,
  secondsLeft,failed,failedRound:failed?completed+1:null,failureAt,
  roundConfirmed:completed>=round,
  canConfirm:!failed&&completed===round-1,
 }
}
