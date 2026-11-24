export const SAFEHOUSE_PROJECT='izwzwvlexqxqewzijhhd'
export const SAFEHOUSE_VERSION=1
export const SAFEHOUSE_MAX_AGE_HOURS=24
export const SAFEHOUSE_STORAGE_KEY='garasjegym.safehouse.receipt.v1'
export function checkSafehouseReceipt(input,now=Date.now()){
 if(!input||input.version!==SAFEHOUSE_VERSION||input.project!==SAFEHOUSE_PROJECT)throw Error('Kvitteringa gjeld ikkje denne GarasjeGym-databasen.')
 const completed=Date.parse(input.completed_at)
 if(!Number.isFinite(completed)||completed>now+300000)throw Error('Ugyldig dato i kvitteringa.')
 if(input.archive_checked!==true||input.auth_tables_present!==true||input.public_tables_present!==true||input.storage_objects!==0||input.code_zip_checked!==true)throw Error('Kvitteringa dokumenterer ikkje ein kontrollert database- og appkopi.')
 if(!/^[a-f0-9]{64}$/i.test(input.archive_sha256||'')||!Number.isSafeInteger(input.archive_bytes)||input.archive_bytes<1024||!/^[a-f0-9]{40}$/i.test(input.code_commit||''))throw Error('Kontrollsum, storleik eller kodeversjon manglar.')
 // Never store arbitrary uploaded content, raw data, file paths or credentials.
 return {version:1,project:SAFEHOUSE_PROJECT,completed_at:new Date(completed).toISOString(),archive_checked:true,auth_tables_present:true,public_tables_present:true,storage_objects:0,code_zip_checked:true,archive_sha256:input.archive_sha256.toLowerCase(),archive_bytes:input.archive_bytes,code_commit:input.code_commit.toLowerCase()}
}
export function safehouseAge(receipt,now=Date.now()){
 if(!receipt)return {status:'missing',label:'Ingen backupkvittering på denne eininga'}
 const hours=Math.max(0,(now-Date.parse(receipt.completed_at))/3600000)
 return {hours,status:hours<=SAFEHOUSE_MAX_AGE_HOURS?'recent':'old',label:hours<=SAFEHOUSE_MAX_AGE_HOURS?'Kopi kontrollert lokalt':'Tid for ny sikkerheitskopi'}
}
