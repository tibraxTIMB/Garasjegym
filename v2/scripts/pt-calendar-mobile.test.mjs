import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const pt=readFileSync(new URL('../src/components/PT.jsx',import.meta.url),'utf8')
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8')

test('PT calendar distinguishes local today from the selected date',()=>{
 assert.match(pt,/const todayKey=today\.getFullYear\(\)/)
 assert.match(pt,/isToday=date===todayKey,isSelected=date===selected/)
 assert.match(pt,/isToday\?'is-today':'',isSelected\?'selected':''/)
 assert.match(pt,/aria-current=\{isToday\?'date':undefined\}/)
 assert.match(pt,/aria-pressed=\{isSelected\}/)
 assert.match(styles,/\.pt-calendar-grid>button\.is-today\s*\{[^}]*background:\s*#1d5137/s)
 assert.match(styles,/\.pt-calendar-grid>button\.selected\.is-today\s*\{/)
})

test('PT calendar dates stay on a single line at mobile widths',()=>{
 assert.match(styles,/\.pt-calendar-grid\s*\{[^}]*grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/s)
 assert.match(styles,/\.pt-calendar-grid>button\s*\{[^}]*white-space:nowrap;overflow-wrap:normal;word-break:normal;/s)
 assert.match(styles,/\.pt-calendar-toggle \.pt-calendar-toggle-action\s*\{[^}]*white-space:nowrap/s)
 assert.match(pt,/className="pt-calendar-toggle-date"/)
 assert.match(pt,/className="pt-calendar-today-jump"/)
})
