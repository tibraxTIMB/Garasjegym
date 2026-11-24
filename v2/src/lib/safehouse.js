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

const RECEIPT_ENTRY='03-KONTROLL/SAFEHOUSE-receipt.json'
export async function receiptFromBackupZip(file){
 if(file.size<22)throw Error('Dette er ikkje ei SAFEHOUSE ZIP-fil.')
 const tailOffset=Math.max(0,file.size-65557)
 const tail=new DataView(await file.slice(tailOffset).arrayBuffer())
 let e=-1
 for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50&&i+22+tail.getUint16(i+20,true)===tail.byteLength){e=i;break}
 if(e<0||tail.getUint16(e+4,true)!==0||tail.getUint16(e+6,true)!==0)throw Error('ZIP-fila er ufullstendig eller ikkje støtta.')
 const count=tail.getUint16(e+10,true),size=tail.getUint32(e+12,true),offset=tail.getUint32(e+16,true)
 if(count===65535||size>2*1024*1024||offset+size>tailOffset+e)throw Error('ZIP-formatet er ikkje støtta. Pakk ut og vel kontrollkvitteringa.')
 const cd=new DataView(await file.slice(offset,offset+size).arrayBuffer())
 const decoder=new TextDecoder();let at=0,entry=null;const names=new Set()
 for(let i=0;i<count;i++){
  if(at+46>cd.byteLength||cd.getUint32(at,true)!==0x02014b50)throw Error('Skadd ZIP-register.')
  const nameLen=cd.getUint16(at+28,true),extra=cd.getUint16(at+30,true),comment=cd.getUint16(at+32,true),next=at+46+nameLen+extra+comment
  if(next>cd.byteLength)throw Error('Skadd ZIP-register.')
  const name=decoder.decode(new Uint8Array(cd.buffer,at+46,nameLen));names.add(name)
  if(name===RECEIPT_ENTRY){if(entry)throw Error('Fleire kontrollkvitteringar.');entry={flags:cd.getUint16(at+8,true),method:cd.getUint16(at+10,true),compressed:cd.getUint32(at+20,true),plain:cd.getUint32(at+24,true),local:cd.getUint32(at+42,true)}}
  at=next
 }
 for(const name of ['01-DATABASE/database.pgbackup','02-APP/app-source.zip','03-KONTROLL/SHA256SUMS.txt','04-GJENOPPRETTING/START-HER.txt'])if(!names.has(name))throw Error('SAFEHOUSE ZIP manglar '+name)
 if(!entry||entry.flags&1||entry.plain>16384||entry.compressed>32768||entry.local+30>offset)throw Error('Kontrollkvitteringa kan ikkje lesast.')
 const header=new DataView(await file.slice(entry.local,entry.local+30).arrayBuffer())
 if(header.getUint32(0,true)!==0x04034b50)throw Error('Skadd kontrollkvittering.')
 const begin=entry.local+30+header.getUint16(26,true)+header.getUint16(28,true)
 if(begin+entry.compressed>offset)throw Error('Skadd kontrollkvittering.')
 let bytes=await file.slice(begin,begin+entry.compressed).arrayBuffer()
 if(entry.method===8){
  if(typeof DecompressionStream==='undefined')throw Error('Pakk ut ZIP-fila og vel SAFEHOUSE-receipt.json.')
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks=[];let length=0
  try{while(true){const part=await stream.read();if(part.done)break;length+=part.value.length;if(length>16384)throw Error('Kontrollkvitteringa er for stor.');chunks.push(part.value)}}finally{await stream.cancel().catch(()=>{})}
  bytes=await new Blob(chunks).arrayBuffer()
 }else if(entry.method!==0)throw Error('Pakk ut ZIP-fila og vel SAFEHOUSE-receipt.json.')
 if(bytes.byteLength!==entry.plain)throw Error('Skadd kontrollkvittering.')
 return checkSafehouseReceipt(JSON.parse(decoder.decode(bytes).replace(/^\uFEFF/,'')))
}
