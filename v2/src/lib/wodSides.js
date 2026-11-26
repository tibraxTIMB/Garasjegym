import {isQualitySideExercise} from './exerciseQuality.js'
// Side is a property of one exercise occurrence in a WOD, not of the
// exercise catalogue. A KB snatch can be right, left or alternating.
export const WOD_SIDE_OPTIONS = [
  {value:'',label:'Ikkje spesifisert'},
  {value:'right',label:'Høgre side'},
  {value:'left',label:'Venstre side'},
  {value:'both',label:'Begge sider · reps per side'},
  {value:'alternating',label:'Vekslande · reps totalt'},
]

const normalizeSide = value => {
  const text = String(value ?? '').trim().toLowerCase()
  if (['right','høgre','høyre'].includes(text)) return 'right'
  if (['left','venstre','venstr'].includes(text)) return 'left'
  if (['both','begge','begge sider','per side','kvar side'].includes(text)) return 'both'
  if (['alternating','vekslande','vekselvis','annankvar arm'].includes(text)) return 'alternating'
  return ''
}

export function getWodSideMode(item, level='rx') {
  const explicit = item?.side_mode ?? item?.sideMode
  // `none` explicitly clears a previously saved free-text instruction.
  if (explicit != null) return normalizeSide(explicit)
  const current = normalizeSide(item?.levels?.[level]?.instruction ?? item?.prescription_levels?.[level]?.instruction)
  return current || normalizeSide(item?.levels?.rx?.instruction ?? item?.prescription_levels?.rx?.instruction)
}

export function getWodSideLabel(item, level='rx') {
  return {right:'Høgre',left:'Venstre',both:'per side',alternating:'vekslande'}[getWodSideMode(item,level)] || ''
}

export function isSideSelectableExercise(item) {
  if(isQualitySideExercise(item))return true
  const name=String(item?.name || item?.exercise_name || '').toLowerCase()
  const equipment=String(item?.equipment || '').toLowerCase()
  return /(kettlebell|manual|dumbbell)/.test(equipment) &&
    /(snatch|clean|press|jerk|row|lunge|windmill|step|carry|high pull|turkish|get.up|one.arm|single.arm)/.test(name)
}
