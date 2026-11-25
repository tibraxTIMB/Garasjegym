// Private recording harness: renders genuine GarasjeGym components with an
// isolated, in-memory Supabase replacement. Not included in the Pages build.
import {useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Activity,CalendarDays,Coffee,Dumbbell,LayoutDashboard,Settings,Trophy,UserRound,Users} from 'lucide-react'
import SimpleCustomerHome from './components/SimpleCustomerHome.jsx'
import HelpCenter from './components/HelpCenter.jsx'
import WodLibrary from './components/WodLibrary.jsx'
import Training from './components/Training.jsx'
import PTInquiry from './components/PTInquiry.jsx'
import Booking from './components/Booking.jsx'
import GarageMaintenance from './components/GarageMaintenance.jsx'
import MyPage from './components/MyPage.jsx'
import AppMobileNavigation from './components/AppMobileNavigation.jsx'
import {MusicProvider} from './components/Music.jsx'
import './styles.css'
import './app-shell-mobile.css'
import './video-demo.css'

const scenario=new URLSearchParams(location.search).get('scenario')||'home'
const admin=scenario==='maintenance'
const profile={id:admin?'demo-admin':'demo-member',display_name:admin?'Demo-eigar':'Demo-medlem',role:admin?'admin':'member',active:true}
const nav=[
  {id:'oversikt',label:'Heim',icon:LayoutDashboard},
  {id:'wod',label:'WOD',icon:Dumbbell},
  {id:'trening',label:'ØKT',icon:Activity},
  {id:'timeplan',label:'Timeplan',icon:CalendarDays},
  {id:'mi-side',label:'Mi side',icon:UserRound},
  {id:'pt-studio',label:'PT Studio',icon:Users},
  {id:'kaffi',label:'Kaffibar',icon:Coffee},
  {id:'pr-senter',label:'PR-senter',icon:Trophy},
  {id:'admin',label:'Drift',icon:Settings},
]

function Demo() {
  const [screen,setScreen]=useState(scenario==='maintenance'?'maintenance':scenario==='pt'?'pt':'home')
  const [caption,setCaption]=useState('')
  const [helpTopic,setHelpTopic]=useState('navigation')
  const [timerKey,setTimerKey]=useState(0)
  const [simpleMode,setSimpleMode]=useState(true)
  const [quickStart,setQuickStart]=useState(false)
  const [launchWodId,setLaunchWodId]=useState(null)
  useEffect(()=>{
    window.__ggVideo={setCaption,setScreen,openHelp:id=>{setHelpTopic(id);setScreen('help')}}
    return()=>{delete window.__ggVideo}
  },[])
  function goTo(next) {setCaption('');setScreen(next)}
  function showHelp(id='navigation') {setHelpTopic(id);goTo('help')}
  function startWod() {setLaunchWodId('demo-wod');setTimerKey(k=>k+1);goTo('wod-timer')}
  function startFree() {setQuickStart(true);setTimerKey(k=>k+1);goTo('free-training')}
  const active=screen==='home'?'oversikt':screen==='wod'?'wod':screen==='free-training'||screen==='wod-timer'||screen==='review'?'trening':screen==='group'?'timeplan':screen==='pt'?'pt-studio':screen==='maintenance'?'admin':'mi-side'
  return <MusicProvider memberId={profile.id}><div className="app-shell simple-app-shell gg-video-demo">
    <main className="main simple-app-main">
      <header className="topbar"><div className="mobile-brand">GARASJEGYM <span>FEUER 1.1</span></div><div className="top-meta"><span className="member-name">{profile.display_name}</span></div></header>
      <div className="gg-video-demo-content">
        {screen==='home'&&<section className="content-card training-content"><SimpleCustomerHome
          onPlan={()=>showHelp('assigned-training')} onFree={startFree} onWod={()=>goTo('wod')}
          onManual={()=>showHelp('manual-log')} onSchedule={()=>goTo('group')}
          onHistory={()=>showHelp('history')} onCoffee={()=>showHelp('coffee-order')}
          onContactPT={()=>goTo('pt')} onHelp={()=>showHelp('navigation')}/></section>}
        {screen==='wod'&&<section className="content-card training-content"><WodLibrary staff={new URLSearchParams(location.search).get('scenario')==='audit-folders'} simpleMode={new URLSearchParams(location.search).get('scenario')!=='audit-folders'} onLaunchWod={startWod}/></section>}
        {screen==='free-training'&&<Training key={timerKey} memberId={profile.id} quickStart={quickStart} onQuickStartConsumed={()=>setQuickStart(false)} simpleMode={true} onSaved={()=>goTo('home')} onDiscard={()=>goTo('home')}/>}
        {screen==='wod-timer'&&<Training key={timerKey} memberId={profile.id} launchWodId={launchWodId} onLaunchConsumed={()=>setLaunchWodId(null)} simpleMode={true} onSaved={()=>goTo('home')} onDiscard={()=>goTo('home')}/>}
        {screen==='pt'&&<section className="content-card training-content"><PTInquiry profile={profile} onGroupSchedule={()=>goTo('group')}/></section>}
        {screen==='my-page'&&<section className="content-card training-content"><MyPage profile={profile} email="demo@example.invalid" simpleMode={simpleMode} onSimpleModeChange={setSimpleMode} onHelpNavigate={target=>target==='pt'?goTo('pt'):target==='group'?goTo('group'):target==='wod'?goTo('wod'):target==='free'?startFree():showHelp(target)}/></section>}
        {screen==='group'&&<section className="content-card training-content"><Booking profile={profile} onOpenWod={startWod}/></section>}
        {screen==='maintenance'&&<section className="content-card training-content"><GarageMaintenance profile={profile}/></section>}
        {screen==='help'&&<section className="content-card training-content"><HelpCenter key={helpTopic} profile={profile} initialTopic={helpTopic} onClose={()=>goTo('home')} onNavigate={target=>target==='free'?startFree():target==='wod'?goTo('wod'):target==='pt'?goTo('pt'):target==='group'?goTo('group'):target==='maintenance'?goTo('maintenance'):goTo('home')}/></section>}
      </div>
    </main>
    <AppMobileNavigation items={nav} active={active} staff={admin} onNavigate={id=>id==='oversikt'?goTo('home'):id==='trening'?startFree():id==='wod'?goTo('wod'):id==='timeplan'?goTo('group'):id==='mi-side'?goTo('my-page'):id==='admin'?goTo('maintenance'):id==='pt-studio'?goTo('pt'):showHelp('navigation')}/>
    <aside className={'gg-video-caption'+(!caption?' is-hidden':'')} aria-live="polite"><span>GARASJEGYM · SLIK GJER DU DET</span><p>{caption}</p></aside>
  </div></MusicProvider>
}

createRoot(document.getElementById('root')).render(<Demo/>)
