import { Activity, BookOpen, CalendarCheck2, ChevronRight, ClipboardList, Coffee, Dumbbell, History, MessageSquareText, Users } from 'lucide-react'
import './customer-journey.css'

export default function SimpleCustomerHome({ onPlan, onFree, onWod, onManual, onSchedule, onHistory, onCoffee, onContactPT, onHelp = () => {}, newPtWodCount = 0, coach = false }) {
  return <div className="simple-home customer-home">
    <div className="customer-home-intro"><h2>Kva vil du gjera?</h2></div>
    <button type="button" className="customer-plan-hero" onClick={onPlan}>
      <span className="customer-plan-hero-icon"><CalendarCheck2 size={29} /></span>
      <span className="customer-plan-hero-copy"><strong>Min treningsplan</strong><small>Neste økt · program · PT</small></span>
      {newPtWodCount > 0 ? <span className="customer-plan-new">{newPtWodCount} ny{newPtWodCount === 1 ? '' : 'e'}</span> : <ChevronRight size={22} />}
    </button>
    <div className="simple-home-grid customer-home-grid">
      <button type="button" className="simple-home-action" onClick={onFree}><Dumbbell /><span><strong>Fri trening</strong><small>Start klokka</small></span></button>
      <button type="button" className="simple-home-action" onClick={onWod}><Activity /><span><strong>Vel ein WOD</strong><small>Vel økt og start</small></span></button>
      <button type="button" className="simple-home-action" onClick={onSchedule}><Users /><span><strong>Gruppetimar</strong><small>Sjå timar og meld deg på</small></span></button>
      <button type="button" className="simple-home-action" onClick={onHistory}><History /><span><strong>Treningslogg</strong><small>Øktene du har gjort</small></span></button>
    </div>
    {!coach&&<button type="button" className="customer-pt-invite" onClick={onContactPT}><MessageSquareText size={23}/><span><strong>Mi PT-oversikt</strong><small>Førespurnader og oppfølging</small></span><ChevronRight size={20}/></button>}
    <div className="customer-home-quick-actions">
      <button type="button" onClick={onManual}><ClipboardList size={17} /> Etterregistrer</button>
      <button type="button" onClick={onCoffee}><Coffee size={17} /> Bestill kaffi</button>
      <button type="button" onClick={onHelp}><BookOpen size={17} /> Hjelp</button>

    </div>
  </div>
}
