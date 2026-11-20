import { useEffect, useRef, useState } from 'react'
import { useSwipeGesture } from '../hooks/useSwipeGesture.js'
import { ChevronDown, ChevronUp, MoreHorizontal, X } from 'lucide-react'

const MEMBER_PRIMARY = ['oversikt', 'trening', 'wod', 'timeplan']
const STAFF_PRIMARY = ['oversikt', 'trening', 'pt-studio', 'wod']

function shortLabel(item) {
  if (item.id === 'oversikt') return 'Heim'
  if (item.id === 'timeplan') return 'Timeplan'
  if (item.id === 'pt-studio') return 'PT Studio'
  if (item.id === 'fellesskap') return 'Fellesskap'
  if (item.id === 'kaffi') return 'Kaffi'
  if (item.id === 'musikk') return 'Musikk'
  if (item.id === 'mi-side') return 'Mi side'
  if (item.id === 'admin') return 'Drift'
  return item.label
}

export default function AppMobileNavigation({ items = [], active, staff = false, onNavigate }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreExpanded, setMoreExpanded] = useState(false)
  const moreButtonRef = useRef(null)
  const moreSheetRef = useRef(null)
  const preferred = staff ? STAFF_PRIMARY : MEMBER_PRIMARY
  const primary = preferred.map(id => items.find(item => item.id === id)).filter(Boolean).slice(0, 4)
  const primaryIds = new Set(primary.map(item => item.id))
  const secondary = items.filter(item => !primaryIds.has(item.id))
  const activeInMore = secondary.some(item => item.id === active)
  const sheetGesture = useSwipeGesture({
    axis: 'y', threshold: 55, onSwipe: direction => {
      if (direction === 'up') setMoreExpanded(true)
      if (direction === 'down') {
        if (moreExpanded) setMoreExpanded(false)
        else setMoreOpen(false)
      }
    },
  })

  useEffect(() => {
    if (!moreOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => [...(moreSheetRef.current?.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [])]
    requestAnimationFrame(() => focusable()[0]?.focus())
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMoreOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const controls = focusable()
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (moreButtonRef.current?.isConnected) moreButtonRef.current.focus()
    }
  }, [moreOpen])

  function choose(item) {
    setMoreOpen(false)
    setMoreExpanded(false)
    onNavigate?.(item.id)
  }

  return (
    <>
      <nav className="app-mobile-nav" aria-label="Hovudnavigasjon">
        {primary.map(item => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={selected ? 'app-mobile-nav-item is-active' : 'app-mobile-nav-item'}
              aria-current={selected ? 'page' : undefined}
              onClick={() => choose(item)}
            >
              <Icon size={20} strokeWidth={selected ? 2.4 : 1.9} aria-hidden="true" />
              <span>{shortLabel(item)}</span>
            </button>
          )
        })}
        <button
          ref={moreButtonRef}
          type="button"
          className={moreOpen || activeInMore ? 'app-mobile-nav-item is-active' : 'app-mobile-nav-item'}
          aria-label="Opne fleire område"
          aria-expanded={moreOpen}
          aria-controls="app-mobile-more"
          onClick={() => setMoreOpen(value => !value)}
        >
          {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span>Meir</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="app-more-backdrop" onClick={() => setMoreOpen(false)}>
          <section
            ref={moreSheetRef}
            id="app-mobile-more"
            className={moreExpanded ? 'app-more-sheet is-expanded' : 'app-more-sheet'}
            role="dialog"
            aria-modal="true"
            aria-label="Fleire område"
            onClick={event => event.stopPropagation()}
          >
            <div
              className="app-more-sheet-grabber"
              aria-hidden="true"
              {...sheetGesture}
            ><span /></div>
            <div className="app-more-sheet-head">
              <div>
                <span className="app-shell-eyebrow">GARASJEGYM</span>
                <h2>Fleire område</h2>
              </div>
              <div className="app-more-head-actions">
                <button
                  type="button"
                  className="app-more-expand"
                  aria-expanded={moreExpanded}
                  aria-controls="app-mobile-more-grid"
                  onClick={() => setMoreExpanded(value => !value)}
                >
                  {moreExpanded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronUp size={17} aria-hidden="true" />}
                  <span>{moreExpanded ? 'Trekk saman' : 'Utvid'}</span>
                </button>
                <button type="button" className="app-more-close" onClick={() => setMoreOpen(false)} aria-label="Lukk meny">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="app-more-grid" id="app-mobile-more-grid">
              {secondary.map(item => {
                const Icon = item.icon
                const selected = active === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={selected ? 'app-more-link is-active' : 'app-more-link'}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => choose(item)}
                  >
                    <span className="app-more-icon"><Icon size={19} /></span>
                    <span>{shortLabel(item)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
