import {useEffect,useId,useState} from 'react'
import {RECORD_LIFT_POSES,sampleRecordPose} from '../lib/recordLiftMotion.js'
const path=(...p)=>'M'+p.map(v=>v.join(' ')).join(' L')
export default function RekordLift({name,label}){
 const s=RECORD_LIFT_POSES[name],id=useId().replace(/:/g,''),[t,setT]=useState(0)
 useEffect(()=>{if(!s)return;const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');let raf,start,last=0;const tick=now=>{start??=now;if(now-last>=1000/30){last=now;setT(((now-start)/1000%s.duration)/s.duration)}raf=requestAnimationFrame(tick)};const sync=()=>{cancelAnimationFrame(raf);start=undefined;last=0;if(reduce.matches)setT(.48);else{setT(0);raf=requestAnimationFrame(tick)}};sync();reduce.addEventListener?.('change',sync);return()=>{cancelAnimationFrame(raf);reduce.removeEventListener?.('change',sync)}},[s])
 if(!s)return null
 const [hip,knee,ankle,shoulder,elbow,hand,head]=sampleRecordPose(name,t)
 const logo=import.meta.env.BASE_URL+'garasjegym-49-512.png',fur='url(#'+id+'f)',metal='url(#'+id+'m)'
 const chest=hip.map((v,i)=>(v+shoulder[i])/2),angle=Math.atan2(shoulder[0]-hip[0],hip[1]-shoulder[1])*180/Math.PI
 const farAnkle=[100-(ankle[0]-100)*.8-7,177],farKnee=[knee[0]-(ankle[0]-100)*1.25-5,knee[1]+3]
 return <figure className="gg-lift-figure"><svg viewBox="0 0 200 198" role="img" aria-label={label+' – illustrert løft med GarasjeGym-gorillaen'}>
 <defs><linearGradient id={id+'f'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#77736f"/><stop offset=".4" stopColor="#454444"/><stop offset="1" stopColor="#171a1c"/></linearGradient><linearGradient id={id+'m'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#737779"/><stop offset=".4" stopColor="#272a2c"/><stop offset="1" stopColor="#121416"/></linearGradient></defs>
 <rect width="200" height="198" rx="9" fill="#2a241d"/><path d="M0 17H200" stroke="#b89154" strokeWidth="3"/><path d="M18 21V183M183 21V183" stroke="#15191a" strokeWidth="7"/>{[40,80,120].map(y=><g key={y}><circle cx="174" cy={y} r="15" fill="#1b1e1f" stroke="#555654"/><circle cx="174" cy={y} r="2" fill="#92928b"/></g>)}<path d="M0 183H200V198H0Z" fill="#6d5539"/><path d="M9 183H191" stroke="#d9b98a" strokeWidth="2"/><ellipse cx="100" cy="183" rx="62" ry="5" fill="#090a0a" opacity=".65"/>
 {s.bench&&<g stroke="#55595a" strokeWidth="5"><path d="M29 133H100" stroke="#908270" strokeWidth="10" strokeLinecap="round"/><path d="M42 138V181M87 138V181"/></g>}
 <path d={path(hip,farKnee,farAnkle)} stroke="#252628" strokeWidth="17" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d={path(farAnkle,[farAnkle[0]+12,180])} stroke="#101214" strokeWidth="9" strokeLinecap="round"/>
 <path d={path(hip,knee,ankle)} stroke={fur} strokeWidth="19" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d={path(ankle,[ankle[0]+15,180])} stroke="#101214" strokeWidth="11" strokeLinecap="round"/>
 <path d={path(hip,shoulder)} stroke="#131617" strokeWidth="37" strokeLinecap="round"/><path d={path(hip,shoulder)} stroke={fur} strokeWidth="32" strokeLinecap="round"/>
 <g transform={'translate('+chest.join(' ')+') rotate('+angle+')'}><path d="M-15 -23Q0 -12 15 -23L17 22H-17Z" fill="#111518" stroke="#d9a748" strokeWidth="2"/><image href={logo} x="-12" y="-8" width="24" height="24"/></g>
 <path d={path(shoulder,elbow,hand)} stroke="#1d2021" strokeWidth="19" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d={path(shoulder,elbow,hand)} stroke={fur} strokeWidth="15" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
 <g transform={'translate('+head.join(' ')+')'}><ellipse cx="-2" cy="0" rx="17" ry="20" fill={fur}/><ellipse cx="5" cy="7" rx="13" ry="10" fill="#8a796c"/><ellipse cx="8" cy="1" rx="7" ry="4" fill="#3b3432"/><path d="M-12 -10Q0-15 13-10" fill="none" stroke="#d8ad50" strokeWidth="4"/><path d="M4 8Q11 11 16 7" stroke="#2e2825" fill="none" strokeWidth="1.5"/><ellipse cx="6" cy="-4" rx="2.2" ry="1.6" fill="#ffebc1"/></g>
 <g transform={'translate('+hand.join(' ')+')'}><path d="M-22 9L20-8" stroke="#b9bec1" strokeWidth="6" strokeLinecap="round"/><ellipse cx="-20" cy="8" rx="9" ry="15" fill={metal} stroke="#7c8384"/><ellipse cx="18" cy="-7" rx="11" ry="16" fill={metal} stroke="#9a9b93"/><ellipse cx="18" cy="-7" rx="4" ry="6" fill="#a6a7a4"/><circle r="5.7" fill="#827268" stroke="#202020"/></g>
 </svg><figcaption>{label} · animert løft</figcaption></figure>
}
