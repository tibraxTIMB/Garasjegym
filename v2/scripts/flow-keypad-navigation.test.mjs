import assert from 'node:assert/strict'
import {flowKeyValue,flowStepValue,flowAcceptValue,flowNavigationIndex,flowHaptic} from '../src/lib/flowKeypad.js'
const time={time:true}
assert.equal(flowAcceptValue('1:02:03',time),'1:02:03')
assert.equal(flowAcceptValue('1:02:',time),'1:02:')
assert.equal(flowAcceptValue('1::03',time),null)
assert.equal(flowAcceptValue('1:02:03:04',time),null)
assert.equal(flowKeyValue('1:02',':',time),'1:02:')
assert.equal(flowKeyValue('1:02:03','4',time),'1:02:03')
assert.equal(flowKeyValue('1:02:03',':',time),'1:02:03')
assert.equal(flowKeyValue('50','7',{fresh:true}),'7')
assert.equal(flowKeyValue('50','backspace',{fresh:true}),'')
assert.equal(flowKeyValue('12',',',{decimal:true}),'12.')
assert.equal(flowAcceptValue('12,5',{decimal:true}),'12.5')
assert.equal(flowAcceptValue('-1',{negative:true}),'-1')
assert.equal(flowAcceptValue('2.5',{}),null)
assert.equal(flowStepValue('2.5',-5), '0')
const a={dataset:{flowField:'reps'}},b={dataset:{flowField:'load'}},c={dataset:{flowField:'reps'}},d={dataset:{flowField:''}}
const fields=[a,b,c,d]
assert.equal(flowNavigationIndex(fields,a,1),1)
assert.equal(flowNavigationIndex(fields,a,1,true),2)
assert.equal(flowNavigationIndex(fields,c,-1,true),0)
assert.equal(flowNavigationIndex(fields,b,1,true),null)
assert.equal(flowNavigationIndex(fields,d,1),null)
assert.equal(flowNavigationIndex(fields,a,-1),null)
assert.equal(flowNavigationIndex(fields,{},1),null)
assert.equal(flowNavigationIndex(fields,d,-1,true),null)
assert.equal(flowNavigationIndex(fields,a,0),null)
console.log('23 keypad interaction checks passed')

// Haptics remain optional and cannot interfere with input on unsupported devices.
const patterns=[]
const device={vibrate(pattern){patterns.push(pattern);return true}}
assert.equal(flowHaptic('tap',device),true)
assert.equal(flowHaptic('next',device),true)
assert.equal(flowHaptic('done',device),true)
assert.equal(flowHaptic('reject',device),true)
assert.deepEqual(patterns,[9,18,24,[12,24,12]])
assert.equal(flowHaptic('tap',null),false)
assert.equal(flowHaptic('tap',{}),false)
assert.equal(flowHaptic('tap',{vibrate:()=>false}),false)
assert.equal(flowHaptic('tap',{vibrate(){throw Error('blocked')}}),false)
console.log('Optional keypad feedback checks passed')

import {DNA_NUMBER_KEYS,shouldDismissSheet} from '../src/lib/designDNA.js'
import dnaAssert from 'node:assert/strict'
dnaAssert.deepEqual(DNA_NUMBER_KEYS.filter(k=>/^\d$/.test(k)),['1','2','3','4','5','6','7','8','9','0'])
dnaAssert.equal(new Set(DNA_NUMBER_KEYS).size,16)
dnaAssert.equal(shouldDismissSheet(4,70),true)
dnaAssert.equal(shouldDismissSheet(80,70),false)
dnaAssert.equal(shouldDismissSheet(4,-70),false)
dnaAssert.equal(shouldDismissSheet(0,30),false)
