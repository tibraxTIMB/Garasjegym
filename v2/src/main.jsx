
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import MobileNativeControls from './components/MobileNativeControls.jsx'
import './styles.css'
import './app-shell-mobile.css'
import { startupDelay } from './lib/startupIntro.js'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Garasjegym/sw.js', { scope: '/Garasjegym/', updateViaCache: 'none' }).catch(() => {})
  })
}

// Mount the application immediately behind the one-time splash. Auth and data
// requests proceed normally; the intro never delays React startup.
function StartupIntro() {
  useEffect(()=>{
    const splash=document.getElementById('gg-startup'),root=document.getElementById('root')
    if(!splash){root?.removeAttribute('inert');return}
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false
    const duration=startupDelay(performance.now(),reduced)
    let exitTimer
    const timer=window.setTimeout(()=>{
      splash.dataset.exit='true'
      exitTimer=window.setTimeout(()=>{splash.remove();root?.removeAttribute('inert')},reduced?0:240)
    },duration)
    return()=>{window.clearTimeout(timer);window.clearTimeout(exitTimer)}
  },[])
  return null
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StartupIntro />
    <MobileNativeControls />
    <App />
  </React.StrictMode>,
)
