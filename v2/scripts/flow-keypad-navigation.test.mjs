import assert from 'node:assert/strict'
import {flowKeyValue,flowStepValue,flowAcceptValue,flowNavigationIndex} from '../src/lib/flowKeypad.js'
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
