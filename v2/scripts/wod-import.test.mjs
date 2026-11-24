import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseWodImport,suggestWodExercises} from '../src/lib/wodImport.js';

test('tolkar Fran med 21-15-9 og last som ein For Time-WOD',()=>{
 const catalog=[{id:'1',name:'Thruster'},{id:'2',name:'Pull-up'}];
 const result=parseWodImport('Fran\n21-15-9\nThrusters 43 kg\nPull-ups',catalog);
 assert.equal(result.name,'Fran');assert.equal(result.format,'For Time');
 assert.deepEqual(result.items.map(x=>x.reps),['21-15-9','21-15-9']);
 assert.equal(result.items[0].loadKg,43);assert.equal(result.items[0].matched,true);
});

test('les AMRAP-varigheit og eksplisitte reps',()=>{
 const result=parseWodImport('AMRAP 20 min\n10 Wall balls\n5 Pull-ups');
 assert.equal(result.format,'AMRAP');assert.equal(result.minutes,20);
 assert.deepEqual(result.items.map(x=>x.reps),['10','5']);
});

test('marker ukjende øvingar for manuell kontroll',()=>{
 const result=parseWodImport('WOD X\n5-10-15\nMystery movement');
 assert.equal(result.items[0].matched,false);assert.deepEqual(result.unmatched,['Mystery movement']);
});

test('les rundetal frå WOD-tekst',()=>{
 const result=parseWodImport('5 rounds\n10 Air squats');
 assert.equal(result.rounds,5);
});

test('marker format som uavklart når teksten ikkje gir grunnlag for val',()=>{
 const result=parseWodImport('Eigen økt\n12 Air squats');
 assert.equal(result.format,null);
});

test('avvis tom tekst og tekst utan øvingar',()=>{
 assert.throws(()=>parseWodImport('  '),/Lim inn WOD-tekst/);
 assert.throws(()=>parseWodImport('AMRAP 20 min'),/Fann ingen sikre øvingslinjer/);
});

test('les OCR-overskrift som namn, ikkje som øving',()=>{
 const catalog=[{id:'row',name:'Row',equipment:'Romaskin'},{id:'snatch',name:'Snatch Complex'}];
 const result=parseWodImport('ØKT2 - Framancavetilpancave\nAMRAP 12 min\nRundar\n12 cal Row\n3 Snatch Complex',catalog);
 assert.equal(result.name,'ØKT2 - Framancavetilpancave');
 assert.deepEqual(result.items.map(row=>row.name),['Row','Snatch Complex']);
 assert.deepEqual(result.items[0].quantity,{value:12,unit:'cal'});
 assert.equal(result.items[0].reps,'');
 assert.equal(result.items[1].reps,'3');
 assert.ok(!result.items.some(row=>/^ØKT/.test(row.name)));
});

test('gjenkjenner engelske og nynorske synonym utan å akseptera andre variantar automatisk',()=>{
 const catalog=[{id:'row',name:'Romaskin'},{id:'barbell',name:'Barbell Row'},{id:'squat',name:'Air Squat'},{id:'ball',name:'Wall Ball Shot'}];
 const result=parseWodImport('AMRAP 14 min\n12 cal rowing\n10 air squats\n8 Wall Balls',catalog);
 assert.deepEqual(result.items.map(item=>item.exercise?.id),['row','squat','ball']);
 const plural=parseWodImport('WOD A\n12 Barbell Rows',catalog);
 assert.equal(plural.items[0].exercise?.id,'barbell');
 const ambiguous=parseWodImport('WOD A\n12 Pendlay Row',catalog);
 assert.equal(ambiguous.items[0].matched,false);
 assert.ok(ambiguous.items[0].suggestions.some(ex=>ex.name==='Barbell Row'));
});

test('liknande øvingar blir berre forslag og ikkje automatiske treff',()=>{
 const catalog=[{id:'1',name:'Deadlift'},{id:'2',name:'Kettlebell Swing'}];
 const result=parseWodImport('WOD A\n10 Deedlift',catalog);
 assert.equal(result.items[0].matched,false);
 assert.equal(result.items[0].suggestions[0].name,'Deadlift');
 assert.equal(suggestWodExercises('heilt ukjend',catalog).length,0);
});

test('tolkar distanse og tidsmål som mengd, ikkje repetisjonar',()=>{
 const catalog=[{id:'1',name:'Row'}];
 const result=parseWodImport('For Time\n500 m Row\nRow 30 sec',catalog);
 assert.deepEqual(result.items.map(item=>item.quantity),[{value:500,unit:'m'},{value:30,unit:'s'}]);
});

test('ukjende importlinjer må avklarast og mobilkortet har eiga rekkje for knappar',()=>{
 const panel=readFileSync(new URL('../src/components/WodImportPanel.jsx',import.meta.url),'utf8');
 const builder=readFileSync(new URL('../src/components/WodBuilder.jsx',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../src/components/wod-wizard-refine.css',import.meta.url),'utf8');
 assert.match(panel,/disabled=\{!ready\}/);
 assert.match(panel,/Hopp over/);
 assert.match(builder,/parsed\.items\.filter\(row=>row\.exercise\)/);
 assert.match(styles,/grid-template-columns:28px minmax\(0,1fr\)!important/);
 assert.match(styles,/\.wod-reorder-controls\{\s*grid-column:2!important;grid-row:2!important/);
});

test('smart import enforces admin approval and copies reviewed WOD metadata into an unpublished draft',()=>{
 const panel=readFileSync(new URL('../src/components/WodImportPanel.jsx',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../src/components/Admin.jsx',import.meta.url),'utf8');
 const builder=readFileSync(new URL('../src/components/WodBuilder.jsx',import.meta.url),'utf8');
 assert.match(panel,/checked=\{approved\}/);
 assert.match(panel,/if\(!approved\)/);
 assert.match(panel,/reviewedByAdmin:true/);
 assert.match(panel,/meta\.format/);
 assert.match(panel,/setDoseChanges/);
 assert.match(panel,/activeCatalog=useMemo/);
 assert.match(admin,/exerciseCatalog=\{exercises\.filter\(ex=>ex\.is_active\)\}/);
 assert.match(builder,/setPublishToMembers\(false\)/);
 assert.match(builder,/parsed\.items\.filter\(row=>row\.exercise\)/);
});


test('WOD import identifies rule-based matching without claiming AI', () => {
  const src = readFileSync(new URL('../src/components/WodImportPanel.jsx', import.meta.url), 'utf8')
  assert.match(src, /Regelbasert WOD-import/)
  assert.match(src, /Liknande treff – kontroller/)
})


// Gazelle regression: shared planning uses the same finite-slot timer as training.
import {fixedIntervalSummary,intervalAdvice,readFixedTiming,importIntervalAdvice} from '../src/lib/wodFormatAdvisor.js';
test('20/40 with three movements has nine work slots and eight rests',()=>{
 const plan=fixedIntervalSummary({workSeconds:20,restSeconds:40,rounds:3,exerciseCount:3});
 assert.equal(plan.totalIntervals,9);assert.equal(plan.totalSeconds,500);assert.equal(plan.workTotal,180);assert.equal(plan.restTotal,320);
 assert.equal(intervalAdvice({format:'E1MOM',periodSeconds:60,durationSeconds:540,workSeconds:20,restSeconds:40,exerciseCount:3,rotating:true}).rounds,3);
 assert.equal(intervalAdvice({format:'E1MOM',periodSeconds:60,durationSeconds:540,workSeconds:20,restSeconds:40,exerciseCount:3,rotating:false}),null);
 assert.equal(intervalAdvice({format:'E1MOM',periodSeconds:60,durationSeconds:480,workSeconds:20,restSeconds:40,exerciseCount:3,rotating:true}),null);
});
test('compact EMOM notation and explicit fixed timing are preserved for admin',()=>{
 const draft=parseWodImport('Haldning\nE1MOM9\n20/40\n20 sec Plank\n20 sec Dead Hang\n20 sec Wall Sit',[{name:'Plank'},{name:'Dead Hang'},{name:'Wall Sit'}]);
 assert.equal(draft.format,'E1MOM');assert.equal(draft.minutes,9);assert.equal(draft.items.length,3);
 assert.deepEqual(draft.fixedTiming,{workSeconds:20,restSeconds:40});assert.equal(importIntervalAdvice(draft,3).totalIntervals,9);
 assert.equal(readFixedTiming('21-15-9\n10 squats'),null);
 const odd=parseWodImport('E2MOM35\n5 Push-ups');assert.equal(odd.minutes,35);assert.equal(odd.format,'E2MOM');
});
test('fixed interval import distinguishes full cycles from individual work slots',()=>{
 const draft=parseWodImport('Intervall 20/40\n9 arbeidsintervall\n5 Push-ups\n5 Air squats\n5 Sit-ups');
 assert.equal(draft.rounds,3);assert.equal(draft.items.length,3);assert.deepEqual(draft.fixedTiming,{workSeconds:20,restSeconds:40});
 assert.equal(fixedIntervalSummary({workSeconds:20,restSeconds:40,rounds:9,exerciseCount:1}).totalIntervals,9);
});


test('bare timed interval movements do not invent ten reps',()=>{
 const draft=parseWodImport('Intervall 20/40\n3 rundar\nAir squat\nPull-up',[{name:'Air squat'},{name:'Pull-up'}]);
 assert.deepEqual(draft.items.map(x=>x.reps),['','']);
 assert.equal(draft.rounds,3);
});
