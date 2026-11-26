export const LAB_CHANNEL='gg-werkstatt-tablet-v1'
export const LAB_WOD_ID='werkstatt-lab-wod'
export function labWod(wod){
 if(!wod||typeof wod.name!=='string'||!wod.name.trim()||typeof wod.format!=='string'||!wod.timer_settings?.workout_schema||!Array.isArray(wod.timer_settings.workout_schema.items))throw Error('WOD-en manglar eit gyldig treningsskjema.')
 // Copy only planning fields; never transfer member IDs, actual results or account data.
 const row={id:LAB_WOD_ID,name:wod.name,format:wod.format,category:wod.category||'main',duration_minutes:wod.duration_minutes??null,movements:wod.movements||'',notes:wod.notes||'',timer_settings:wod.timer_settings,is_published:true,is_archived:false}
 const encoded=JSON.stringify(row)
 if(encoded.length>1000000)throw Error('WOD-en er for stor for testlaboratoriet.')
 return JSON.parse(encoded)
}
export function isLabMessage(message,type){return !!message&&message.channel===LAB_CHANNEL&&message.type===type}
