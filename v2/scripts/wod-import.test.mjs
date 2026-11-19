import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWodImport} from '../src/lib/wodImport.js';

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

test('marker format som uavklart når teksten ikkje gir grunnlag for val',()=>{
 const result=parseWodImport('Eigen økt\\n12 Air squats');
 assert.equal(result.format,null);
});

test('avvis tom tekst og tekst utan øvingar',()=>{
 assert.throws(()=>parseWodImport('  '),/Lim inn WOD-tekst/);
 assert.throws(()=>parseWodImport('AMRAP 20 min'),/Fann ingen sikre øvingslinjer/);
});
