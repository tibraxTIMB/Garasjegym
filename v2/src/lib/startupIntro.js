// Duration is measured from document navigation; do not add a full delay after slow JS load.
export const INTRO_DURATION_MS=3200
export function startupDelay(elapsedMs,reducedMotion=false){
 const elapsed=Number.isFinite(elapsedMs)?Math.max(0,elapsedMs):0
 return reducedMotion?0:Math.max(180,INTRO_DURATION_MS-elapsed)
}
