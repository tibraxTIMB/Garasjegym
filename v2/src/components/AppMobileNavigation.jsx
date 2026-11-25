import {useEffect,useRef} from 'react'
import { Settings2, UsersRound } from 'lucide-react'

// Seks faste, tydelege inngangar. Siste posisjon er rollebasert
// og opnar ei faktisk arbeidsflate i staden for ei duplisert «Meir»-liste.
const PRIMARY_IDS = ['oversikt', 'wod', 'trening', 'timeplan', 'mi-side']

function labelFor(id) {
  if (id === 'oversikt') return 'Heim'
  if (id === 'trening') return 'ØKT'
  if (id === 'timeplan') return 'Timeplan'
  if (id === 'mi-side') return 'Mi side'
  if (id === 'pt-studio') return 'PT'
  if (id === 'admin') return 'Drift'
  return 'WOD'
}

export default function AppMobileNavigation({ items = [], active, staff = false, coach = false, admin = false, onNavigate,onQuickMenu }) {
  const press=useRef(null),long=useRef(false),start=useRef(null)
  const cancel=()=>{clearTimeout(press.current);press.current=null;start.current=null}
  useEffect(()=>()=>clearTimeout(press.current),[])
  const primary = PRIMARY_IDS.map(id => items.find(item => item.id === id)).filter(Boolean)
  const destination = staff ? 'admin' : 'pt-studio'
  const baseDestination = items.find(item => item.id === destination)
  const last = baseDestination ? {
    ...baseDestination,
    label: staff ? (admin ? 'Drift' : 'Admin') : (coach ? 'PT Studio' : 'PT'),
    icon: staff ? Settings2 : UsersRound,
  } : null
  const destinations = last ? [...primary, last] : primary

  return (
    <nav className="app-mobile-nav" aria-label="Hovudnavigasjon">
      {destinations.map(item => {
        const Icon = item.icon
        const selected = active === item.id || (item.id === 'mi-side' && ['mi-historikk', 'pr-senter'].includes(active))
        const title = item.id === 'admin' ? item.label : item.id === 'pt-studio' ? item.label : labelFor(item.id)
        return (
          <button
            key={item.id}
            type="button"
            className={'app-mobile-nav-item' + (item.id === 'trening' ? ' app-mobile-nav-item--start' : '') + (selected ? ' is-active' : '')}
            aria-label={title}
            aria-current={selected ? 'page' : undefined}
            onPointerDown={item.id==='oversikt'&&onQuickMenu?e=>{if(e.button!==0)return;cancel();long.current=false;start.current=[e.clientX,e.clientY];press.current=setTimeout(()=>{long.current=true;onQuickMenu()},550)}:undefined}
            onPointerMove={item.id==='oversikt'?e=>{if(start.current&&Math.hypot(e.clientX-start.current[0],e.clientY-start.current[1])>12)cancel()}:undefined}
            onPointerUp={cancel}
            onPointerCancel={()=>{cancel();long.current=false}}
            onPointerLeave={cancel}
            onContextMenu={item.id==='oversikt'&&onQuickMenu?e=>e.preventDefault():undefined}
            onClick={() => {if(item.id==='oversikt'&&long.current){long.current=false;return}onNavigate?.(item.id)}}
          >
            <Icon size={20} strokeWidth={selected ? 2.4 : 1.9} aria-hidden="true" />
            <span>{title}</span>
          </button>
        )
      })}
    </nav>
  )
}
