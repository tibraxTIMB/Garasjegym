
import { useState } from 'react'
import {
  Activity,
  CalendarDays,
  Coffee,
  Dumbbell,
  LayoutDashboard,
  Users,
  Settings,
  Wrench,
} from 'lucide-react'

const sections = [
  {
    id: 'oversikt',
    label: 'Oversikt',
    icon: LayoutDashboard,
    note: 'Dashboard og treningsstatus',
  },
  {
    id: 'trening',
    label: 'Trening',
    icon: Dumbbell,
    note: 'WOD, fri trening, logg og PR',
  },
  {
    id: 'booking',
    label: 'Booking',
    icon: CalendarDays,
    note: 'Gruppetimar og PT',
  },
  {
    id: 'fellesskap',
    label: 'Fellesskap',
    icon: Users,
    note: 'Garasjeprat og utfordringar',
  },
  {
    id: 'kaffi',
    label: 'Barista',
    icon: Coffee,
    note: 'Meny og bestillingar',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    note: 'Medlemmer og drift',
  },
]

export default function App() {
  const [active, setActive] = useState('oversikt')
  const current = sections.find((item) => item.id === active)
  const Icon = current.icon

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Wrench size={22} />
          </div>
          <div>
            <strong>GARASJEGYM</strong>
            <span>STURMKOPF · 2.0</span>
          </div>
        </div>

        <div className="side-label">HOVUDMENY</div>

        <nav aria-label="Hovudmeny">
          {sections.map(({ id, label, icon: ItemIcon }) => (
            <button
              key={id}
              className={
                active === id
                  ? 'nav-item selected'
                  : 'nav-item'
              }
              onClick={() => setActive(id)}
            >
              <ItemIcon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="status-dot" />
          NY PLATTFORM · KLAR FOR UTVIKLING
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            GARASJEGYM <span>2.0</span>
          </div>
          <div className="top-meta">
            <span className="status-dot" />
            PARALLELL UTVIKLING
          </div>
        </header>

        <section className="welcome">
          <div className="eyebrow">
            <Activity size={14} />
            GARASJEGYM · NY GENERASJON
          </div>

          <h1>
            Bygd for å <em>prestera.</em>
          </h1>

          <p>
            Ein felles plattform for trening, booking og fellesskap.
          </p>
        </section>

        <section className="content-card">
          <div className="section-icon">
            <Icon size={22} />
          </div>

          <div className="section-kicker">
            MODUL · {active.toUpperCase()}
          </div>

          <h2>{current.label}</h2>
          <p>{current.note}</p>

          <div className="notice">
            <strong>Grunnmuren er på plass.</strong>
            <span>
              Denne modulen er førebels ein struktur- og
              designprototype. Eksisterande data og funksjonar
              frå 1.8.16 er ikkje kopla inn enno.
            </span>
          </div>
        </section>

        <footer>
          GARASJEGYM 2.0 · STURMKOPF
          <span>UTVIKLINGSVERSJON</span>
        </footer>
      </main>
    </div>
  )
}
