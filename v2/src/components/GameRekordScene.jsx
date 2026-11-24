import {useEffect,useRef,useState} from 'react'
// Three.js is fetched as a local build chunk only when a PR is displayed.
// Keep the previous vector render as a fallback for unsupported WebGL devices.
export default function GameRekordScene({mode,name,label,fallback}){
 const mount=useRef(null),[ready,setReady]=useState(false)
 useEffect(()=>{
  let alive=true,dispose
  setReady(false)
  import('../lib/rekordGame3d.js').then(({mountRekordGame})=>{
   if(!alive||!mount.current)return
   dispose=mountRekordGame(mount.current,{mode,name,logo:import.meta.env.BASE_URL+'garasjegym-49-512.png',onReady:()=>{if(alive)setReady(true)},onError:()=>{if(alive)setReady(false)}})
  }).catch(()=>{if(alive)setReady(false)})
  return()=>{alive=false;dispose?.()}
 },[mode,name])
 return <div className={'gg-game-scene gg-game-'+mode} data-ready={ready?'yes':'no'}><div ref={mount} className="gg-game-canvas" role="img" aria-label={mode==='lift'?label+' · animert 3D-løft':'GarasjeGym-gorillaen feirar i den modellerte garasjen'}/>{!ready&&<div className="gg-game-fallback">{fallback}</div>}{mode==='lift'&&ready&&<span className="gg-game-lift-label">{label} · 3D</span>}</div>
}
