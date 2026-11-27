// Self-selected workout prescription preference; never an authorization claim.
export const DOSE_PROFILE_KEY='gg_dose_variant'
export function doseProfile(value){return ['men','women'].includes(value)?value:'common'}
export function userDoseProfile(user){return doseProfile(user?.user_metadata?.[DOSE_PROFILE_KEY])}
const has=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0
export function prescribedKg(dose,variant='common'){
 if(dose?.loadMode!=='kg')return null
 const m=dose.loadKgMen,k=dose.loadKgWomen
 if(!has(m)&&!has(k))return has(dose.loadKg)?String(dose.loadKg):null
 if(variant==='men')return has(m)?String(m):null
 if(variant==='women')return has(k)?String(k):null
 return has(m)&&has(k)&&Number(m)===Number(k)?String(m):null
}
export function prescribedKgLabel(dose,variant='common'){
 const kg=prescribedKg(dose,variant)
 if(kg!==null)return kg+' kg'
 if(dose?.loadMode!=='kg')return ''
 if(variant!=='common')return 'Vekt ikkje programmert'
 return [has(dose.loadKgMen)?'M '+dose.loadKgMen+' kg':'',has(dose.loadKgWomen)?'K '+dose.loadKgWomen+' kg':''].filter(Boolean).join(' / ')
}
export async function saveDoseProfile(auth,actorId,variant){
 if(!actorId||!['common','men','women'].includes(variant))throw Error('Ugyldig doseringsprofil.')
 const current=await auth.getUser()
 if(current.error||current.data?.user?.id!==actorId)throw Error('Innlogginga kunne ikkje stadfestast.')
 const result=await auth.updateUser({data:{[DOSE_PROFILE_KEY]:variant==='common'?null:variant}})
 if(result.error||result.data?.user?.id!==actorId||userDoseProfile(result.data.user)!==variant)throw Error('Doseringsprofilen kunne ikkje lagrast.')
 return result.data.user
}
