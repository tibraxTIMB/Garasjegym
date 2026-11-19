import { useEffect, useState } from 'react'
import { MoreHorizontal, X } from 'lucide-react'

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
  const preferred = staff ? STAFF_PRIMARY : MEMBER_PRIMARY
  const primary = preferred.map(id => items.find(item => item.id === id)).filter(Boolean).slice(0, 4)
  const primaryIds = new Set(primary.map(item => item.id))
  const secondary = items.filter(item => !primaryIds.has(item.id))
  const activeInMore = secondary.some(item => item.id === active)

  useEffect(() => {
    if (!moreOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [moreOpen])

  function choose(item) {
    setMoreOpen(false)
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
          type="button"
          className={moreOpen || activeInMore ? 'app-mobile-nav-item is-active' : 'app-mobile-nav-item'}
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
            id="app-mobile-more"
            className="app-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Fleire område"
            onClick={event => event.stopPropagation()}
          >
            <div className="app-more-sheet-head">
              <div>
                <span className="app-shell-eyebrow">GARASJEGYM</span>
                <h2>Fleire område</h2>
              </div>
              <button type="button" className="app-more-close" onClick={() => setMoreOpen(false)} aria-label="Lukk meny">
                <X size={20} />
              </button>
            </div>
            <div className="app-more-grid">
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
