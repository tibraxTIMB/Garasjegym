// Preflight shares the real execution builder; no parallel format rules or writes.
export function sessionQueueCheck(ids,selected,build){
 if(!Array.isArray(ids)||!ids.length)return {ok:false,issue:'Vel minst éin WOD.'}
 if(!Array.isArray(selected)||selected.length!==ids.length||selected.some((w,i)=>w?.id!==ids[i]||w.is_archived))return {ok:false,issue:'Ein vald WOD er ikkje lenger tilgjengeleg. Fjern valet.'}
 try{return {ok:true,session:build(selected)}}catch(e){return {ok:false,issue:e?.message||'Kunne ikkje klargjera økta.'}}
}
