import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('fullscreen WOD exercise picker exposes a visible step-three action and a way back', () => {
  const wod = source('../src/components/WodBuilder.jsx')
  const libraryHead = wod.match(/className="wod-library-fullscreen-head"[^]*?className="engine-section-title"/)?.[0] || ''
  assert.match(libraryHead, /className="wod-library-ok-top"[^>]*disabled=\{!selected\.length\}/)
  assert.match(libraryHead, /setLibraryOpen\(false\);goToStep\(3\)/)
  assert.match(libraryHead, /aria-label="Tilbake til WOD-byggjaren"/)
})

test('fullscreen timer targets its own DOM node and restores scrolling on exit', () => {
  const timer = source('../src/components/Training.jsx')
  assert.match(timer, /timerContainerRef\.current\?\.requestFullscreen\?\.\(\)/)
  assert.match(timer, /ref=\{timerContainerRef\}/)
  assert.doesNotMatch(timer, /document\.documentElement\.requestFullscreen/)
  assert.match(timer, /document\.body\.style\.overflow = previousOverflow/)
  const viewport = source('../src/components/timer-viewport.css')
  assert.match(viewport, /\.engine-timer\.timer-focused\s*\{/)
  assert.match(viewport, /height:\s*100dvh\s*!important/)
  assert.match(viewport, /\.timer-panel-clock/)
})

test('class builder and PT Studio use dark, readable field and selected-item surfaces', () => {
  assert.match(source('../src/components/Booking.jsx'), /import '\.\/builder-form-contrast\.css'/)
  assert.match(source('../src/components/PTStudio.jsx'), /import '\.\/builder-form-contrast\.css'/)
  const styles = source('../src/components/builder-form-contrast.css')
  for (const key of ['.class-wizard', '.pt2', '.pt2-modal', '.wod-picker-option.selected', '.pt2-workspace-switch button.selected']) {
    assert.ok(styles.includes(key), `Missing readable ${key} style`)
  }
  assert.match(styles, /color:\s*#f6fafb\s*!important/)
})
