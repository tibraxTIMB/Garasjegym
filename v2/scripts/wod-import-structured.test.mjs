import test from 'node:test'
import assert from 'node:assert/strict'
import {parseWodImport,materializeImportGroups,importWorkGroupIssue} from '../src/lib/wodImport.js'
import {validateCompositeBlocks} from '../src/lib/compositeWod.js'
const library=['Strict press','Push Press','Goblet squat','Alternating Dumbbell Push Jerk','Burpee Over Dumbbell','Bear Crawl','Air squat','Plank','Thruster','Pull-up'].map((name,i)=>({id:String(i+1),name,is_active:true}))
const painCave=`ØKT 2 · Frå man cave til pain cave
Del A – striktpress + pushpress
E3MOM 9 (3 sett): 5 striktpress + 3 pushpress.
Del B – AMRAP 8
8 hantel goblet squat
8 alternerande hantel push jerk
4 burpees over hantel
10 m bear crawl
PT-notat – teknikk
Du: hald 2–4 RIR på styrkedelen.`
const fiveParts=`Trening 5 delar
Del A – Styrke
Strength 12 min
3 x 8 strict press
Del B – Intervall
Intervall 40/20 x 3 rundar
8 burpee over dumbbell
10 m bear crawl
Pause 90 sek
Del C – AMRAP 8
8 goblet squat
8 burpee over dumbbell
Del D – For Time
For Time time cap 10 min
10 strict press
10 push press
Del E – Tabata
Tabata 20/10 x 8 rundar
8 air squats
8 plank`

test('Pain Cave imports six catalog exercises, both timers and individual RIR target',()=>{
 const result=parseWodImport(painCave,library)
 assert.equal(result.name,'Frå man cave til pain cave')
 assert.equal(result.format,'Samansett økt')
 assert.deepEqual(result.blocks.map(x=>x.format),['E3MOM','AMRAP'])
 assert.equal(result.items.length,6)
 assert.ok(result.items.every(x=>x.matched))
 assert.equal(result.items[0].rirTarget,'2–4')
 assert.equal(result.items[1].rirTarget,'2–4')
 assert.equal(validateCompositeBlocks(result.blocks,result.items),'')
})

test('Five-part structured WOD imports formats, intervals, sets, pauses and distances',()=>{
 const parsed=parseWodImport(fiveParts,library)
 assert.deepEqual(parsed.blocks.map(x=>x.format),['Strength','Intervall','AMRAP','For Time','Tabata'])
 assert.equal(parsed.items[0].sets,3)
 assert.equal(parsed.items[0].reps,'8')
 assert.equal(parsed.blocks[1].transitionMode,'timed')
 assert.equal(parsed.blocks[1].transitionSeconds,90)
 assert.equal(parsed.blocks[1].workSeconds,40)
 assert.equal(parsed.blocks[1].restSeconds,20)
 assert.equal(parsed.blocks[1].rounds,3)
 assert.equal(parsed.items.find(x=>x.name==='Bear Crawl').quantity.value,10)
 assert.equal(validateCompositeBlocks(parsed.blocks,parsed.items),'')
 assert.ok(parsed.items.every(x=>x.matched))
})

test('Unclear part format must fail instead of silently flattening several timers',()=>{
 const malformed='Del A – Styrke\n8 strict press\nDel B – AMRAP 8\n8 goblet squat'
 assert.throws(()=>parseWodImport(malformed,library),/format|varigheit|tidsgrense/)
})

test('Original single-format Fran still imports',()=>{
 const parsed=parseWodImport('Fran\n21-15-9\nThrusters 43 kg\nPull-ups',library)
 assert.equal(parsed.format,'For Time')
 assert.equal(parsed.blocks,undefined)
 assert.equal(parsed.items.length,2)
})


test('Gazelle keeps fixed timing in composite EMOM, preserves transition and distinguishes slots',()=>{
 const text='Haldning og styrke\nDel A – E1MOM9\n20/40\n20 sec Plank\n20 sec Air squat\n20 sec Pull-up\nPause 90 sek\nDel B – Intervall 20/40\n9 arbeidsintervall\n5 Air squat\n5 Pull-up\n5 Plank';
 const parsed=parseWodImport(text,library);
 assert.equal(parsed.blocks[0].format,'E1MOM');
 assert.deepEqual(parsed.blocks[0].fixedTiming,{workSeconds:20,restSeconds:40});
 assert.equal(parsed.blocks[0].transitionSeconds,90);
 assert.equal(parsed.blocks[1].rounds,3);
 assert.equal(Math.round(parsed.blocks[1].minutes*60),500);
 assert.equal(parsed.items.length,6);
 assert.equal(validateCompositeBlocks(parsed.blocks,parsed.items),'');
});

test('E2MOM x6 and a 2+1 group preserve both catalog identities and six shared slots',()=>{
 const catalog=[{id:'pc',name:'Power Clean',equipment:'Vektstong'},{id:'pj',name:'Push Jerk',equipment:'Vektstong'},{id:'hpc',name:'Hang Power Clean'}]
 const parsed=parseWodImport("E2MOM x 6\n2 PC\n+ 1 PJ\nBuild to a heavy unbroken complex\nScore: heaviest successful set",catalog)
 assert.equal(parsed.minutes,12)
 assert.deepEqual(parsed.items.map(x=>x.exercise.id),['pc','pj'])
 assert.equal(parsed.workGroups.length,1)
 const group=parsed.workGroups[0]
 assert.ok(importWorkGroupIssue(parsed.workGroups,parsed.items,{}))
 const separate=materializeImportGroups(parsed.items,parsed.workGroups,{[group.id]:'sequence'})
 assert.deepEqual(separate.map(x=>x.minuteSlot),['1,2,3,4,5,6','1,2,3,4,5,6'])
 const complex=materializeImportGroups(parsed.items,parsed.workGroups,{[group.id]:'complex'})
 assert.equal(complex.length,1);assert.equal(complex[0].reps,'1')
 assert.deepEqual(complex[0].exercise.complex_steps,[{exercise_id:'pc',name:'Power Clean',reps:2},{exercise_id:'pj',name:'Push Jerk',reps:1}])
 assert.equal(complex[0].exercise.id,null)
 assert.ok(parsed.notes.includes('Score: heaviest successful set'))
 assert.throws(()=>materializeImportGroups(parsed.items.slice(0,1),parsed.workGroups,{[group.id]:'complex'}),/delvis/)
})
test('Every 90 sec x 8 retains second precision and no artificial movement',()=>{
 const result=parseWodImport('Every 90 sec x 8\n2 PC + 1 PJ',[{id:'a',name:'Power Clean'},{id:'b',name:'Push Jerk'}])
 assert.equal(result.minutes,12);assert.equal(result.emomIntervalSeconds,90);assert.equal(result.items.length,2)
})

import {buildCustomComplex,complexResultSummary} from '../src/lib/wodComplexes.js'
test('custom complex records successful attempts separately from heavy failed attempts',()=>{
 const exercise=buildCustomComplex([{exercise_id:'pc',name:'Power Clean',reps:2},{exercise_id:'pj',name:'Push Jerk',reps:1}])
 assert.equal(exercise.name,'2 Power Clean + 1 Push Jerk')
 const result=complexResultSummary({sets:[{complex_status:'complete',reps:1,load_kg:60},{complex_status:'partial',reps:0,load_kg:65},{complex_status:'failed',reps:0,load_kg:70},{reps:1,load_kg:100}]})
 assert.deepEqual(result,{attempts:3,completed:1,partial:1,failed:1,best_load_kg:60})
 assert.equal(complexResultSummary({sets:[{complex_status:'complete',reps:1,load_kg:''}]}).best_load_kg,null)
})
