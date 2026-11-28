// Shared interaction contract. No persistence or domain calculations here.
export const DNA_NUMBER_KEYS=Object.freeze(['1','2','3','backspace','4','5','6','previous','7','8','9','same','separator','0','reset','next'])
export function shouldDismissSheet(dx,dy){return Number.isFinite(dx)&&Number.isFinite(dy)&&dy>=60&&dy>Math.abs(dx)*1.5}
