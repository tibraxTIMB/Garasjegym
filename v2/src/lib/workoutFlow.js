// FLOW: purpose is independent of timer format. Legacy templates remain readable.
export const FLOW_PURPOSES=[['prep','Felles oppvarming'],['build','Teknikk / finn arbeidsvekt'],['perform','Hovudøkt'],['recovery','Nedtrapping']]
export const FLOW_REPORTING=[['auto','Automatisk etter føremål og format'],['done','Berre utført'],['sets','Settvis resultat'],['score','Hovudresultat']]
export function flowPurpose(block={},schema={}){
 if(FLOW_PURPOSES.some(([key])=>key===block.flowPurpose))return block.flowPurpose
 if(schema.library_category==='warmup')return 'prep'
 const title=String(block.title||'').replace(/^Del\s+[A-H0-9]+\s*[–—:-]\s*/i,'').trim()
 if(/^(felles )?(oppvarming|warm[ -]?up)\b/i.test(title))return 'prep'
 if(/^(fri teknisk innøving|teknisk førebuing|finn arbeidsvekt|finn vekt|build to (a )?working weight)\b/i.test(title))return 'build'
 if(/^(nedtrapping|cool[ -]?down)\b/i.test(title))return 'recovery'
 return 'perform'
}
export function flowReporting(block={},schema={}){
 if(FLOW_REPORTING.some(([key])=>key===block.flowReporting&&key!=='auto'))return block.flowReporting
 if(['completion','none'].includes(block.scoreMode))return 'done'
 if(block.scoreMode==='load')return 'sets'
 if(block.scoreMode&&block.scoreMode!=='auto')return 'score'
 if(flowPurpose(block,schema)!=='perform')return 'done'
 if(/^(AMRAP|For Time|Chipper|Death By|Ladder)$/i.test(block.format||'')||['Couplet','Triplet'].includes(block.format)&&['AMRAP','For Time'].includes(block.combinationMode||block.combination_mode))return 'score'
 return 'sets'
}
export function flowBlockForItem(item,schema={},format=''){
 const blocks=schema.wod_engine?.blocks?.length>1?schema.wod_engine.blocks:schema.composite_blocks||[]
 return blocks.find(b=>b.id===item.block_id)||{id:'main',title:format,format,combination_mode:schema.combination_mode,flowPurpose:schema.flowPurpose,flowReporting:schema.flowReporting}
}
export function flowItemGroup(item,schema={},format=''){
 const block=flowBlockForItem(item,schema,format)
 if(schema.library_category==='warmup')return {id:item.warmup_phase==='movement_rehearsal'?'warmup-build':'warmup-prep',title:item.warmup_phase==='movement_rehearsal'?'Teknikk / finn arbeidsvekt':'Felles oppvarming',reporting:'done'}
 return {id:block.id,title:block.title||format,reporting:flowReporting(block,schema),purpose:flowPurpose(block,schema)}
}
export function emptyFlowSet(set={}){return {...set,flow_status:'',reps:'',load_kg:'',height_cm:'',time_text:'',time_seconds:'',rir:'',complex_status:''}}
export function clearFlowItem(item){return {...item,prescribed_sets_prefilled:false,rowValue:'',workSeconds:'',sets:(item.sets||[]).map(emptyFlowSet)}}

export function flowCompletionRows(scores={}){return Object.entries(scores).filter(([key,v])=>key.startsWith('flow:')&&['done','partial','skipped'].includes(v?.status)).map(([key,v])=>({id:key.slice(5),title:v.title||key.slice(5),status:v.status}))}

export function hasMeasuredFlowSet(set={},prefilled=false){const entered=v=>v!=null&&String(v).trim()!=='';return [set.load_kg,set.height_cm,set.time_seconds,set.time_text,set.rir,set.complex_status].some(entered)||!prefilled&&entered(set.reps)}
