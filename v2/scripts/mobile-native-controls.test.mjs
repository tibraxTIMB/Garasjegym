import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {nativeSelectOptions,nativeSelectTitle,chooseNativeSelectOption} from '../src/lib/nativeMobileControls.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

function option(value,label,{disabled=false,group=null}={}){
 return {value,label,disabled,closest:()=>group}
}

test('choice sheet reads native option labels, optgroups and disabled states',()=>{
 const group={label:'Utstyr',disabled:false}
 const opts=[option('','Vel …',{disabled:true}),option('row','Roing',{group}),option('bike','Sykkel',{group:{label:'Utstyr',disabled:true}})]
 assert.deepEqual(nativeSelectOptions({options:opts}),[
  {index:0,value:'',label:'Vel …',disabled:true,group:''},
  {index:1,value:'row',label:'Roing',disabled:false,group:'Utstyr'},
  {index:2,value:'bike',label:'Sykkel',disabled:true,group:'Utstyr'},
 ])
})

test('labels remain understandable without copying the entire option list',()=>{
 const custom={getAttribute:key=>key==='aria-label'?'Tildel PT':null,labels:[]}
 assert.equal(nativeSelectTitle(custom),'Tildel PT')
 const wrapped={getAttribute:()=>null,labels:[{querySelector:()=>null,childNodes:[{nodeType:3,textContent:'  Vel nivå  '}]}]}
 assert.equal(nativeSelectTitle(wrapped),'Vel nivå')
 assert.equal(nativeSelectTitle({getAttribute:()=>null,labels:[]}), 'Vel eit alternativ')
})

test('a choice updates the actual form select and fires the existing change flow',()=>{
 const calls=[]
 const options=[option('a','A'),option('b','B')]
 const select={options,selectedIndex:0,disabled:false,isConnected:true,dispatchEvent:event=>{calls.push(event.type);return true}}
 assert.equal(chooseNativeSelectOption(select,1),true)
 assert.equal(select.selectedIndex,1)
 assert.deepEqual(calls,['input','change'])
 assert.equal(chooseNativeSelectOption(select,1),true)
 assert.equal(calls.length,2,'the same option must not double-submit the form')
})

test('disabled or detached form fields are never changed',()=>{
 const options=[option('a','A'),option('b','B',{disabled:true})]
 const select={options,selectedIndex:0,disabled:false,isConnected:true,dispatchEvent:()=>{throw Error('Unexpected event')}}
 assert.equal(chooseNativeSelectOption(select,1),false)
 select.disabled=true
 assert.equal(chooseNativeSelectOption(select,0),false)
 select.disabled=false;select.isConnected=false
 assert.equal(chooseNativeSelectOption(select,0),false)
})

test('Android touch gets one branded sheet while keyboard keeps native semantics',()=>{
 const source=read('../src/components/MobileNativeControls.jsx')
 const css=read('../src/components/mobile-native-controls.css')
 const main=read('../src/main.jsx')
 assert.match(main,/<MobileNativeControls\s*\/>/)
 assert.match(source,/event\.pointerType!=='touch'&&event\.pointerType!=='pen'/)
 assert.match(source,/event\.preventDefault\(\)/)
 assert.match(source,/createPortal/)
 assert.match(source,/document\.fullscreenElement\|\|document\.body/)
 assert.match(source,/role="dialog" aria-modal="true"/)
 assert.match(source,/role="listbox"/)
 assert.match(source,/role="option"/)
 assert.match(source,/onKeyDown/)
 assert.match(css,/input\[type="checkbox"\]:not\(\[role="switch"\]\)/)
 assert.match(css,/appearance:none!important/)
 assert.match(css,/:checked/)
 assert.match(css,/:focus-visible/)
})
