import {useEffect,useMemo,useState} from 'react'
import {AlertTriangle,CalendarClock,Check,CheckCircle2,ChevronDown,ClipboardCheck,LoaderCircle,RefreshCcw,ShieldCheck,Wrench} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {GARAGE_MAINTENANCE_PLAN,maintenanceOverview} from '../lib/maintenancePlan.js'
import './garage-maintenance.css'

const formatDate=value=>value?new Date(value).toLocaleDateString('nn-NO',{day:'numeric',month:'short',year:'numeric'}):'–'
const formatDateTime=value=>value?new Date(value).toLocaleString('nn-NO',{dateStyle:'medium',timeStyle:'short'}):'–'

export default function GarageMaintenance({profile}) {
  const [start,setStart]=useState(null)
  const [logs,setLogs]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState('')
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const [openPeriod,setOpenPeriod]=useState(null)
  const [checks,setChecks]=useState({})
  const [note,setNote]=useState('')
  const [followUp,setFollowUp]=useState(false)
  const [resolutionNotes,setResolutionNotes]=useState({})
  const [historyOpen,setHistoryOpen]=useState(false)

  async function load() {
    const [settings,receipts]=await Promise.all([
      supabase.from('garage_maintenance_schedule').select('started_at').eq('id',true).single(),
      supabase.from('garage_maintenance_log').select('id,period,checks,note,needs_followup,completed_by,completed_name,completed_at,resolved_at,resolved_by,resolution_note')
        .order('completed_at',{ascending:false}).limit(500),
    ])
    if(settings.error||receipts.error)throw settings.error||receipts.error
    setStart(settings.data.started_at)
    setLogs(receipts.data||[])
  }

  useEffect(()=>{
    let live=true
    Promise.all([
      supabase.from('garage_maintenance_schedule').select('started_at').eq('id',true).single(),
      supabase.from('garage_maintenance_log').select('id,period,checks,note,needs_followup,completed_by,completed_name,completed_at,resolved_at,resolved_by,resolution_note')
        .order('completed_at',{ascending:false}).limit(500),
    ]).then(([settings,receipts])=>{
      if(!live)return
      if(settings.error||receipts.error)throw settings.error||receipts.error
      setStart(settings.data.started_at);setLogs(receipts.data||[])
    }).catch(e=>{if(live)setError('Kunne ikkje henta vedlikehaldsplanen: '+(e?.message||'Ukjend feil'))})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[])

  const overview=useMemo(()=>maintenanceOverview(logs,start),[logs,start])
  const selected=overview.periods.find(item=>item.id===openPeriod)
  const marked=selected?selected.items.filter(item=>checks[item.id]).length:0

  function openChecklist(period) {
    if(openPeriod===period){setOpenPeriod(null);return}
    setOpenPeriod(period);setChecks({});setNote('');setFollowUp(false);setError('');setFeedback('')
  }

  async function saveReceipt(event) {
    event.preventDefault()
    if(!selected||selected.items.some(item=>!checks[item.id]))return
    if(followUp&&note.trim().length<2){setError('Skriv kort kva som må følgjast opp.');return}
    setSaving(selected.id);setError('');setFeedback('')
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser()
      if(authError||!user||user.id!==profile.id)throw authError||new Error('Logg inn på nytt som admin.')
      const {error:saveError}=await supabase.from('garage_maintenance_log').insert({
        period:selected.id,checks:Object.fromEntries(selected.items.map(item=>[item.id,true])),
        completed_by:user.id,completed_name:(profile.display_name||'GarasjeGym-eigar').slice(0,80),
        note:note.trim(),needs_followup:followUp,
      })
      if(saveError)throw saveError
      await load()
      setFeedback(selected.title+' er kvittert og lagra.')
      setOpenPeriod(null);setChecks({});setNote('');setFollowUp(false)
      window.dispatchEvent(new Event('gg:maintenance-updated'))
    }catch(e){setError('Kunne ikkje lagra kvitteringa: '+(e?.message||'Ukjend feil'))}
    finally{setSaving('')}
  }

  async function resolveIssue(issue) {
    const text=(resolutionNotes[issue.id]||'').trim()
    if(text.length<2){setError('Skriv kva som vart retta før du kvitterer.');return}
    setSaving(issue.id);setError('');setFeedback('')
    try {
      const {error:saveError}=await supabase.from('garage_maintenance_log')
        .update({resolved_at:new Date().toISOString(),resolved_by:profile.id,resolution_note:text})
        .eq('id',issue.id).eq('needs_followup',true).is('resolved_at',null).select('id')
      if(saveError)throw saveError
      await load()
      setResolutionNotes(current=>({...current,[issue.id]:''}))
      setFeedback('Oppfølginga er kvittert som løyst.')
      window.dispatchEvent(new Event('gg:maintenance-updated'))
    }catch(e){setError('Kunne ikkje kvittera oppfølginga: '+(e?.message||'Ukjend feil'))}
    finally{setSaving('')}
  }

  if(loading)return <div className="training-state"><LoaderCircle className="spin" size={18}/> Hentar vedlikehaldsplan …</div>

  return <section className="gm-maintenance" aria-label="Reinhald og vedlikehald">
    <header className="gm-maintenance-heading">
      <div><span className="section-kicker">GARASJEN · ENKEL DRIFT</span><h4><ClipboardCheck size={22}/> Reinhald og vedlikehald</h4><p>Tre korte rundar. Kvitter når dei er gjorde – ingen dagleg rapportering.</p></div>
      <span className="gm-maintenance-estimate">Om lag 35 min/mnd</span>
    </header>

    {error&&<div className="auth-error" role="alert">{error}</div>}
    {feedback&&<div className="auth-message" role="status"><CheckCircle2 size={16}/>{feedback}</div>}

    <div className="gm-maintenance-status" aria-label="Status">
      <span><CalendarClock size={16}/><strong>{overview.due.length}</strong> sjekkar på tide</span>
      <span className={overview.issues.length?'attention':''}><AlertTriangle size={16}/><strong>{overview.issues.length}</strong> opne merknader</span>
      <button type="button" onClick={async()=>{setSaving('refresh');setError('');try{await load()}catch(e){setError(e.message)}finally{setSaving('')}}} disabled={Boolean(saving)}><RefreshCcw size={15}/> Oppdater</button>
    </div>

    <div className="gm-maintenance-plans">
      {overview.periods.map(period=><article className={'gm-maintenance-card'+(period.due?' is-due':'')} key={period.id}>
        <button className="gm-maintenance-trigger" type="button" aria-expanded={openPeriod===period.id} onClick={()=>openChecklist(period.id)}>
          <span className="gm-maintenance-period-icon">{period.id==='weekly'?<CheckCircle2 size={21}/>:period.id==='monthly'?<Wrench size={21}/>:<ShieldCheck size={21}/>}</span>
          <span className="gm-maintenance-period-label"><strong>{period.title}</strong><small>{period.type} · ca. {period.minutes} min</small></span>
          <span className={'gm-maintenance-due'+(period.due?' due':'')}>{period.status}</span><ChevronDown size={18} className={openPeriod===period.id?'open':''}/>
        </button>
        {openPeriod===period.id&&<form className="gm-maintenance-checklist" onSubmit={saveReceipt}>
          <p>{period.summary} {period.last?`Sist kvittert ${formatDate(period.last.completed_at)}.`:'Du kan ta den første sjekken når det passar.'}</p>
          <div className="gm-maintenance-checks">
            {period.items.map(item=><label key={item.id} className={checks[item.id]?'checked':''}><input type="checkbox" checked={Boolean(checks[item.id])} onChange={e=>setChecks(current=>({...current,[item.id]:e.target.checked}))}/><span>{item.label}</span>{checks[item.id]&&<Check size={17}/>}</label>)}
          </div>
          <div className="gm-maintenance-progress"><strong>{marked} av {period.items.length} punkt</strong><span>{marked===period.items.length?'Klart til kvittering':'Kryss av etter kvart'}</span></div>
          <label className="gm-maintenance-followup"><input type="checkbox" checked={followUp} onChange={e=>setFollowUp(e.target.checked)}/><span>Noko er skadd eller må følgjast opp</span></label>
          <label className="gm-maintenance-note">{followUp?'Kva må rettast?':'Merknad (valfritt)'}<textarea rows="2" maxLength="600" value={note} onChange={e=>setNote(e.target.value)} placeholder={followUp?'Skriv kva det gjeld …':'Til dømes utført i samband med rydding'}/></label>
          <button type="submit" className="primary-button gm-maintenance-save" disabled={marked!==period.items.length||Boolean(saving)||(followUp&&note.trim().length<2)}><ClipboardCheck size={17}/>{saving===period.id?'Lagrar …':'Kvitter og lagre'}</button>
        </form>}
      </article>)}
    </div>

    {!!overview.issues.length&&<section className="gm-maintenance-issues"><h5><AlertTriangle size={17}/> Må følgjast opp</h5>{overview.issues.map(issue=><article key={issue.id}><strong>{GARAGE_MAINTENANCE_PLAN.find(p=>p.id===issue.period)?.title} · {formatDate(issue.completed_at)}</strong><p>{issue.note}</p><label>Kva er gjort?<input maxLength="600" value={resolutionNotes[issue.id]||''} onChange={e=>setResolutionNotes(current=>({...current,[issue.id]:e.target.value}))} placeholder="Til dømes skifta strikk …"/></label><button type="button" className="secondary-button" disabled={Boolean(saving)||(resolutionNotes[issue.id]||'').trim().length<2} onClick={()=>resolveIssue(issue)}><Check size={15}/> Kvitter som løyst</button></article>)}</section>}

    <details className="gm-maintenance-history" open={historyOpen} onToggle={e=>setHistoryOpen(e.currentTarget.open)}>
      <summary><span><ClipboardCheck size={18}/> Kvitteringshistorikk <small>({logs.length})</small></span><ChevronDown size={18}/></summary>
      <div className="gm-maintenance-receipts">{logs.length?logs.slice(0,30).map(receipt=>{
        const plan=GARAGE_MAINTENANCE_PLAN.find(item=>item.id===receipt.period)
        return <details key={receipt.id}><summary><span><strong>{plan?.title||receipt.period}</strong><small>{formatDateTime(receipt.completed_at)} · {receipt.completed_name}</small></span>{receipt.needs_followup?<span className={receipt.resolved_at?'gm-receipt-resolved':'gm-receipt-issue'}>{receipt.resolved_at?'Løyst':'Merknad'}</span>:<CheckCircle2 size={17}/>}</summary><div><ul>{plan?.items.map(item=><li key={item.id}>{receipt.checks?.[item.id]?'✓':'–'} {item.label}</li>)}</ul>{receipt.note&&<p>Merknad: {receipt.note}</p>}{receipt.resolved_at&&<p>Løyst {formatDateTime(receipt.resolved_at)}: {receipt.resolution_note}</p>}</div></details>
      }):<p className="gm-maintenance-history-empty">Ingen kvitteringar enno. Historikken blir fylt når du fullfører den første runden.</p>}</div>
    </details>

    <p className="gm-maintenance-after-use">Etter bruk: Tørk vekk synleg sveitte og set utstyret på plass. Dette treng du ikkje kvittera.</p>
  </section>
}
