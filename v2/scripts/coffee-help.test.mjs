import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  addCoffeeCartItem,
  availableCoffeeCartItems,
  changeCoffeeCartItem,
  coffeeCartTotal,
  selectedCoffeeOptions,
} from '../src/lib/coffeeCart.js'
import { HELP_TOPICS, HELP_GLOSSARY, searchHelpTopics, visibleHelpTopics } from '../src/lib/helpContent.js'

const src = file => readFileSync(new URL(file, import.meta.url), 'utf8')
const cappuccino = {
  id: 'coffee-cappuccino', name:'Cappuccino', price:25, is_active:true,
  option_groups:[{ name:'Mjølk', required:true, choices:['Vanleg mjølk','Havremjølk'] }],
}
const espresso = {id:'coffee-espresso',name:'Espresso',price:20,is_active:true,option_groups:[]}

test('required milk choice must be made and must match the current menu', () => {
  assert.throws(() => selectedCoffeeOptions(cappuccino), /Vel eit alternativ for Mjølk/)
  assert.throws(() => selectedCoffeeOptions(cappuccino,{Mjølk:'Hasselnøtt'}), /Ugyldig val/)
  assert.deepEqual(selectedCoffeeOptions(cappuccino,{Mjølk:'Havremjølk'}),[{group:'Mjølk',choice:'Havremjølk'}])
})

test('two variants of the same drink remain distinct but repeat selections aggregate', () => {
  let cart = addCoffeeCartItem([],cappuccino,{Mjølk:'Vanleg mjølk'})
  cart = addCoffeeCartItem(cart,cappuccino,{Mjølk:'Havremjølk'})
  cart = addCoffeeCartItem(cart,cappuccino,{Mjølk:'Vanleg mjølk'})
  cart = addCoffeeCartItem(cart,espresso)
  assert.equal(cart.length,3)
  assert.deepEqual(cart.map(item=>item.quantity),[2,1,1])
  assert.equal(coffeeCartTotal(cart,[cappuccino,espresso]),95)
  assert.notEqual(cart[0].key,cart[1].key)
  assert.equal(changeCoffeeCartItem(cart,cart[0].key,-2).length,2)
})

test('removed products are excluded from the order payload', () => {
  const cart = addCoffeeCartItem(addCoffeeCartItem([],espresso),cappuccino,{Mjølk:'Havremjølk'})
  assert.deepEqual(availableCoffeeCartItems(cart,[espresso,{...cappuccino,is_active:false}]).map(item=>item.product_id),[espresso.id])
  assert.deepEqual(availableCoffeeCartItems(cart,[espresso,{...cappuccino,option_groups:[{name:'Mjølk',required:true,choices:['Vanleg mjølk']}]}]).map(item=>item.product_id),[espresso.id])
  assert.equal(availableCoffeeCartItems(cart,[]).length,0)
})

test('cart respects the same line and quantity limits as the existing order RPC', () => {
  let cart = []
  for(let i=0;i<20;i++) cart=addCoffeeCartItem(cart,{...espresso,id:'p'+i})
  assert.throws(()=>addCoffeeCartItem(cart,{...espresso,id:'p20'}),/maks 20 ulike/)
  let quantity=[]
  for(let i=0;i<20;i++) quantity=addCoffeeCartItem(quantity,espresso)
  assert.equal(quantity[0].quantity,20)
  assert.throws(()=>addCoffeeCartItem(quantity,espresso),/maks 20/)
})

test('member help stays private from admin guides, while manager has staff topics', () => {
  const member=visibleHelpTopics({role:'member'})
  const coach=visibleHelpTopics({role:'member'},true)
  const manager=visibleHelpTopics({role:'manager'})
  const admin=visibleHelpTopics({role:'admin'})
  assert.ok(member.length>=25)
  assert.ok(member.every(item=>!item.audience))
  assert.ok(coach.some(item=>item.id==='coach-studio'))
  assert.ok(!coach.some(item=>item.id==='staff-coffee'))
  assert.ok(manager.some(item=>item.id==='staff-coffee'))
  assert.ok(!manager.some(item=>item.id==='staff-members'))
  assert.ok(admin.some(item=>item.id==='staff-members'))
})

test('manual searches all steps and includes relevant workflow links', () => {
  assert.equal(searchHelpTopics(HELP_TOPICS,'avbestilla')[0]?.category,'coffee')
  assert.ok(searchHelpTopics(HELP_TOPICS,'Snatch').some(topic=>topic.id==='exercise-details'))
  assert.ok(HELP_GLOSSARY.some(([term])=>term==='EMOM'))
  assert.ok(['navigation','free-workout','pt-contact','coffee-order'].every(id=>HELP_TOPICS.some(topic=>topic.id===id&&topic.steps.length>=3&&topic.action)))
})

test('help is reachable from Mi side, simple home and the coffee menu', () => {
  const app=src('../src/App.jsx')
  const profile=src('../src/components/MyPage.jsx')
  const coffee=src('../src/components/CoffeeBar.jsx')
  assert.match(profile,/Hjelp og rettleiing/)
  assert.match(app,/function openFromHelp\(target\)/)
  assert.match(app,/onHelp=\{openHelp\}/)
  assert.match(coffee,/onHelp\('coffee-order'\)/)
  assert.match(coffee,/optionSelections\[product\.id\]/)
  assert.match(coffee,/cancelOwnOrder/)
  assert.match(src('../../supabase/migrations/20261122105513_coffee_menu_and_member_cancellation.sql'),/coffee_orders_member_cancel_guard/)
})
