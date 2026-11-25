import {parseCompositeScoreTime} from './compositeWod.js'
const present=v=>v!=null&&String(v).trim()!==''
const whole=(v,label)=>{if(!present(v))return null;const n=Number(v);if(!Number.isInteger(n)||n<0)throw Error('Ugyldig '+label);return n}
export function retrospectiveBlocks(schema={},engine={}){
 const blocks=Array.isArray(engine.blocks)&&engine.blocks.length>1?engine.blocks:schema.composite_blocks||[]
 return blocks.filter(b=>b&&b.id).map(b=>({...b,combination_mode:b.combination_mode||b.combinationMode||b.timer_settings?.workout_schema?.combination_mode||null}))
}
export function retrospectiveScoreKind(b){
 if(b.scoreMode&&b.scoreMode!=='auto')return 'explicit'
 if(b.format==='AMRAP'||(['Couplet','Triplet'].includes(b.format)&&b.combination_mode==='AMRAP'))return 'rounds'
 if(b.format==='Death By'||b.format==='Ladder')return 'steps'
 if(['For Time','Chipper'].includes(b.format)||(['Couplet','Triplet'].includes(b.format)&&b.combination_mode==='For Time'))return 'time'
 return 'sets'
}
export function retrospectiveBlockResults(blocks=[],scores={}){
 return blocks.flatMap(b=>{
 const v=scores[b.id]||{},kind=retrospectiveScoreKind(b),base={id:b.id,title:b.title||b.format,format:b.format,combination_mode:b.combination_mode||null,scoreMode:b.scoreMode||'auto',benchmark_source_wod_id:b.benchmark_source_wod_id||null,source_wod_name:b.source_wod_name||null,manual_entry:true}
 if(kind==='rounds'||kind==='steps'){
 const rounds=whole(v.rounds,'tal rundar i '+base.title),reps=kind==='rounds'?whole(v.extraReps,'ekstra reps i '+base.title):null
 if(rounds===null&&reps===null)return []
 if(rounds===null)throw Error('Oppgi også fullførte rundar i '+base.title)
 return [{...base,roundsCompleted:rounds,extra_reps:reps??0,elapsed:0,completed:v.completed===true,...(b.format==='Death By'?{death_by_completed_rounds:rounds}:b.format==='Ladder'?{ladder_completed_rounds:rounds}:{})}]
 }
 if(kind==='time'){
 if(!present(v.time))return []
 const elapsed=parseCompositeScoreTime(v.time)
 if(!Number.isFinite(elapsed)||elapsed<=0)throw Error('Ugyldig sluttid i '+base.title)
 return [{...base,elapsed,completed:v.completed===true}]
 }
 return []
 })
}
