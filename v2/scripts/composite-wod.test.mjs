import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseWodImport} from '../src/lib/wodImport.js'
import {COMPOSITE_FORMAT,defaultCompositeBlocks,validateCompositeBlocks,compositeBlockForTimer,compositeTotalSeconds,isValidRirTarget} from '../src/lib/compositeWod.js'

const catalog=['Strict press','Push Press','Goblet squat','Alternating Dumbbell Push Jerk','Burpee Over Dumbbell','Bear Crawl'].map((name,index)=>({id:String(index+1),name,is_active:true}))
const painCave=`ØKT 2 · Frå man cave til pain cave
12. oktober 2026 · Pressestyrke, bein og koordinasjon i ein kort sirkel.
Oppvarming etter fast rutine
Etter fast oppvarming: skuldermobilitet, 8 air squats, 8 lette press og 10–20 sekund planke.
Hovuddel
Del A – striktpress + pushpress
E3MOM 9 (3 sett): 5 striktpress + 3 pushpress. Originalen: 1–2 RIR.
Del B – AMRAP 8
8 hantel goblet squat
8 alternerande hantel push jerk
4 burpees over hantel
10 m bear crawl
Frå originalen / status
Originale vektalternativ i AMRAP: RX 22,5 kg, Mstr 17,5 kg, Xprt 12,5 kg.
PT-notat – teknikk
Skalering og din progresjon
Du: hald 2–4 RIR på styrkedelen og jamn fart i AMRAP.
Etter økta: Noter belastning, rundar/reps og om press over hovudet var komfortabelt.`

test('Pain Cave import preserves two blocks, six library movements and personalized RIR',()=>{
 const wod=parseWodImport(painCave,catalog)
 assert.equal(wod.name,'Frå man cave til pain cave')
 assert.equal(wod.format,COMPOSITE_FORMAT)
 assert.deepEqual(wod.blocks.map(b=>[b.format,b.minutes]),[['E3MOM',9],['AMRAP',8]])
 assert.deepEqual(wod.items.map(x=>x.name),catalog.map(x=>x.name))
 assert.deepEqual(wod.items.map(x=>x.reps),['5','3','8','8','4',''])
 assert.deepEqual(wod.items.map(x=>x.block_id),['a','a','b','b','b','b'])
 assert.equal(wod.items[5].quantity.value,10)
 assert.equal(wod.items[5].quantity.unit,'m')
 assert.ok(wod.items.every(x=>x.matched))
 assert.equal(wod.unmatched.length,0)
 assert.equal(wod.items[0].rirTarget,'2–4')
 assert.equal(wod.items[1].rirTarget,'2–4')
 assert.match(wod.notes,/skuldermobilitet/)
 assert.match(wod.notes,/22,5 kg/)
 assert.equal(validateCompositeBlocks(wod.blocks,wod.items),'')
})

test('E3MOM repeats both movements every three minutes, while AMRAP stays separate',()=>{
 const slots=compositeBlockForTimer({id:'a',title:'Del A',format:'E3MOM',duration_seconds:540,items:[{exercise_name:'Strict press'},{exercise_name:'Push Press'}]})
 assert.deepEqual(slots.items.map(x=>x.minute_slot),['1,2,3','1,2,3'])
 assert.equal(compositeTotalSeconds(defaultCompositeBlocks()),1020)
 const b=compositeBlockForTimer({format:'AMRAP',duration_seconds:480,items:[{exercise_name:'Bear Crawl'}]})
 assert.equal(b.items[0].minute_slot,undefined)
})

test('RIR supports athlete-selected load, range and deliberate -1 marking',()=>{
 for(const v of ['0','10','-1','2','2–4','1-2'])assert.equal(isValidRirTarget(v),true,v)
 for(const v of ['11','4–2','-2','2–11','open',''])assert.equal(isValidRirTarget(v),false,v)
})

test('Composite format is wired to builder, timer, import and persistent log',()=>{
 const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')
 const builder=read('../src/components/WodBuilder.jsx')
 const timer=read('../src/components/Training.jsx')
 const panel=read('../src/components/WodImportPanel.jsx')
 assert.match(builder,/composite_blocks:isComposite/)
 assert.match(builder,/block_id:isComposite/)
 assert.match(builder,/schema\.wod_engine=\{\.\.\.engineConfig,blocks:isComposite/)
 assert.match(builder,/isValidRirTarget/)
 assert.match(timer,/function CompositeTimer/)
 assert.match(timer,/active_block_index:active/)
 assert.match(timer,/block_results:timerSnapshot\.block_results/)
 assert.match(timer,/format===COMPOSITE_FORMAT/)
 assert.match(panel,/wod-import-composite-preview/)
})
