import { useEffect, useState } from 'react'
import { Activity, HeartPulse } from 'lucide-react'
import { getHeartRateSnapshot, subscribeHeartRate, connectHeartRateSensor, disconnectHeartRateSensor, isHeartRateBluetoothAvailable } from '../lib/heartRate.js'
import { supabase } from '../lib/supabase.js'
import './heart-rate.css'

export default function HeartRateTrainingPanel({compact=false,settings=false}={}) {
  const [sensor, setSensor] = useState(getHeartRateSnapshot())
  const [optedIn, setOptedIn] = useState(false)
  const [preferenceReady,setPreferenceReady]=useState(false)
  const [connectError,setConnectError]=useState('')
  const [, setClockNow] = useState(Date.now())
  useEffect(() => subscribeHeartRate(setSensor), [])
  useEffect(() => {
    if (sensor.status !== 'connected') return undefined
    const interval = setInterval(() => setClockNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [sensor.status])
  useEffect(() => {
    let live = true
    if (!supabase) return () => { live = false }
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data?.user) return
      const { data: preferences, error: preferenceError } = await supabase.from('member_preferences').select('hr_enabled').eq('user_id', data.user.id).maybeSingle()
      if (live && !preferenceError) {setOptedIn(Boolean(preferences?.hr_enabled));setPreferenceReady(true)}
    }).catch(() => {})
    return () => { live = false }
  }, [])
  const stale = !sensor.receivedAt || Date.now() - sensor.receivedAt > 10000
  if(settings)return <section className="gg-timer-audio-controls" aria-label="Pulssensor">
    <strong>Eigen pulssensor</strong>
    {!preferenceReady?<small>Kontrollerer pulsinnstillinga di …</small>:!optedIn?<small>Aktiver pulsmåling under Mi side før du koplar til.</small>:<>
      <small>{sensor.status==='connected'?(sensor.deviceName||'Tilkopla pulsbelte'):sensor.status==='connecting'?'Koplar til …':'Ikkje tilkopla'}</small>
      {sensor.status==='connected'?<><strong>{stale?'–':sensor.bpm??'–'} BPM</strong><button type="button" className="secondary-button" onClick={disconnectHeartRateSensor}>Kopla frå</button></>:<button type="button" className="secondary-button" disabled={sensor.status==='connecting'||!isHeartRateBluetoothAvailable()} onClick={async()=>{setConnectError('');try{await connectHeartRateSensor()}catch(e){setConnectError(e?.message||'Kunne ikkje kopla til')}}}>Kopla til Bluetooth-pulsbelte</button>}
      {!isHeartRateBluetoothAvailable()&&<small>Web Bluetooth krev ein støtta nettlesar, til dømes Chrome på Android.</small>}
      {(connectError||sensor.error)&&<small role="alert">{connectError||sensor.error}</small>}
    </>}
    <small>Pulsen blir vist lokalt. Ingen automatisk deling med PT eller gruppetime.</small>
  </section>
  if (!optedIn || sensor.status !== 'connected') return null
  if(compact)return <div className="gg-timer-hr-compact" aria-label="Eigen puls"><HeartPulse size={17}/><strong>{stale?'–':sensor.bpm??'–'}</strong><span>BPM</span>{stale&&<small>Vent på signal</small>}</div>
  return <section className="engine-section hr-training-panel" aria-live="polite">
    <div className="engine-section-title"><h4><HeartPulse size={17}/> Puls</h4><span><Activity size={13}/> {stale ? 'Vent på signal' : 'Live'}</span></div>
    <div className="hr-training-reading"><strong>{stale ? '–' : sensor.bpm ?? '–'}</strong><span>BPM</span></div>
    <div className="hr-training-foot"><span>{sensor.deviceName || 'Bluetooth-pulskjelde'}</span><span>{stale ? 'Ingen nye målingar' : 'Oppdaterer automatisk'}</span></div>
  </section>
}
