import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {nameAdjectives,nameNouns,nameNumbers,nameWords,nameThemes,nameSuffixes,NAME_NUMBER_CHANCE,randomWodName,uniqueWodName} from '../src/lib/wodNaming.js'
test('all legacy entries retained; split old multiword entries only for new generated names',()=>{
 assert.equal(nameAdjectives.length,32)
 assert.equal(nameNouns.length,39)
 assert.deepEqual(nameNumbers,['1942','1939','69'])
 for(const word of [...nameAdjectives,...nameNouns.flatMap(v=>v.split(/\s+/).filter(w=>!/^\d+$/.test(w))),...Object.values(nameThemes).flat()])assert.ok(nameWords.includes(word))
 assert.ok(nameNouns.includes('Inferno 808'))
 assert.ok(nameSuffixes.includes('808'))
 assert.equal(new Set(nameWords.map(w=>w.toLowerCase())).size,nameWords.length)
})
test('two distinct words, occasional single trailing number',()=>{
 let seed=42;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
 let numbered=0
 for(let i=0;i<10000;i++){const parts=randomWodName(rng).split(' ');assert.ok(parts.length===2||parts.length===3);assert.notEqual(parts[0].toLowerCase(),parts[1].toLowerCase());assert.ok(nameWords.includes(parts[0]));assert.ok(nameWords.includes(parts[1]));if(parts.length===3){numbered++;assert.ok(nameSuffixes.includes(parts[2]))}}
 assert.equal(NAME_NUMBER_CHANCE,.08);assert.ok(numbered>650&&numbered<950)
})
test('uniqueness fallback does not append timestamps or duplicate existing WODs',()=>{
 const rng=()=>.5;const current=randomWodName(rng);const next=uniqueWodName([{name:current.toUpperCase()}],current,rng);assert.notEqual(next.toLowerCase(),current.toLowerCase());assert.equal(next.split(' ').length,2)
})
test('same naming module used by desktop and mobile builder',()=>{const builder=readFileSync(new URL('../src/components/WodBuilder.jsx',import.meta.url),'utf8');assert.match(builder,/import \{randomWodName,uniqueWodName\} from '..\/lib\/wodNaming\.js'/);assert.match(builder,/return uniqueWodName\(libraryWods,name\)/);assert.doesNotMatch(builder,/const nameAdjectives=/)})
