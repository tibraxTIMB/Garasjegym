import {createContext,useContext,useEffect,useId,useRef,useState} from 'react'
import {Check} from 'lucide-react'
import {flowKeyValue,flowStepValue,flowAcceptValue,flowNavigationIndex,flowHaptic} from '../lib/flowKeypad.js'
import './flow-entry.css'
import {DnaKeyMatrix,DnaWeightSteps} from './DesignDNA.jsx'
const FlowContext=createContext(null)
export function FlowEntryProvider({children}){
 const [active,setActive]=useState(null)
 const registry=useRef(new WeakMap()),fresh=useRef(false),panel=useRef(null)
 function open(node){if(!node||node.disabled||!node.isConnected)return;fresh.current=true;setActive(node);requestAnimationFrame(()=>{if(node.isConnected&&document.activeElement===node)node.select()})}
 function close(){if(active===document.activeElement)active.blur();setActive(null)}
 function fields(){return Array.from(panel.current?.querySelectorAll('input[data-flow-number]')||[]).filter(el=>!el.disabled&&el.getClientRects().length>0)}
 function move(delta,sameField=false){
  const all=fields(),index=flowNavigationIndex(all,active,delta,sameField)
  const next=index===null?null:all[index]
  if(next){next.focus({preventScroll:true});open(next);next.scrollIntoView({block:'nearest',inline:'nearest'});return}
  if(!sameField&&delta>0)close()
 }
 useEffect(()=>{if(active&&(!active.isConnected||active.disabled))setActive(null)})
 useEffect(()=>{if(!active)return;const frame=requestAnimationFrame(()=>{if(active.isConnected)active.scrollIntoView({block:'nearest',inline:'nearest'})});return()=>cancelAnimationFrame(frame)},[active])
 return <FlowContext.Provider value={{active,registry,fresh,open,close,move,fields}}><div className="gg-flow-entry-host" ref={panel}>{children}</div></FlowContext.Provider>
}
export function FlowNumberInput({type,inputMode,min,max,step,value,onChange,kind,field,...props}){
 const ctx=useContext(FlowContext),node=useRef(null),meta=useRef(null)
 const time=kind==='time',decimal=!time&&(inputMode==='decimal'||step==='any'||(step!=null&&Number(step)%1!==0)),negative=Number(min)<0
 const key=field||props['data-result-field']||''
 meta.current={decimal,negative,time,min:min??0,max:max??Infinity,key,change:v=>onChange?.({target:{value:v}})}
 useEffect(()=>{const el=node.current;if(el&&ctx)ctx.registry.current.set(el,meta);return()=>{if(el&&ctx)ctx.registry.current.delete(el)}},[ctx?.registry])
 return <input {...props} ref={node} type="text" inputMode={ctx?'none':time?'text':decimal?'decimal':'numeric'} autoComplete="off" spellCheck={false} data-flow-number="" data-flow-field={key} data-flow-active={ctx?.active===node.current&&node.current?'true':undefined} value={value??''} onFocus={e=>ctx?.open(e.currentTarget)} onClick={e=>{if(ctx?.active!==e.currentTarget)ctx?.open(e.currentTarget)}} onChange={e=>{const v=flowAcceptValue(e.target.value,meta.current);if(v!==null){if(ctx)ctx.fresh.current=false;onChange?.({target:{value:v}})}}} onKeyDown={e=>{if(ctx&&e.key==='Enter'){e.preventDefault();ctx.move(1)}else if(ctx&&e.key==='Escape'){e.preventDefault();ctx.close()}}}/>
}
export function FlowKeypad(){
 const ctx=useContext(FlowContext),active=ctx?.active
 const [feedback,setFeedback]=useState(null),flash=useRef(null)
 useEffect(()=>()=>clearTimeout(flash.current),[])
 useEffect(()=>{setFeedback(null)},[active])
 function respond(key,kind='tap'){flowHaptic(kind);clearTimeout(flash.current);setFeedback({key,kind});flash.current=setTimeout(()=>setFeedback(null),170)}
 const meta=active&&ctx.registry.current.get(active)?.current
 if(!active||!meta||!active.isConnected)return null
 const available=ctx.fields()
 const previous=flowNavigationIndex(available,active,-1),same=flowNavigationIndex(available,active,1,true)
 const label=active.getAttribute('aria-label')||active.closest('label')?.textContent?.trim()||'Resultat'
 function press(key){if(active.disabled||!active.isConnected)return;const v=flowKeyValue(active.value,key,{...meta,fresh:ctx.fresh.current});if((key===','||key===':'||key==='.')&&v===active.value){respond(key,'reject');return}ctx.fresh.current=false;meta.change(v);respond(key)}
 function adjust(delta){if(active.disabled||!active.isConnected)return;const v=flowStepValue(active.value,delta,meta.min,meta.max);if(v===active.value){respond(delta,'reject');return}ctx.fresh.current=false;meta.change(v);respond(delta)}
 return <aside className="gg-flow-keypad" aria-label="Garasjegym taltastatur">
  <header><strong>{label}</strong><output className="gg-keypad-value" aria-live="off">{String(active.value).replace('.',',')||'–'}</output><button type="button" aria-label="Lukk taltastatur" onClick={()=>{respond('done','done');ctx.close()}}><Check size={18}/> Ferdig</button></header>
  {meta.key==='load_kg'&&<DnaWeightSteps onStep={adjust} feedback={feedback}/>} 
  <DnaKeyMatrix onKey={press} onPrevious={()=>{respond('previous','next');ctx.move(-1)}} onNext={()=>{respond('next','next');ctx.move(1)}} onSame={same===null?undefined:()=>{respond('same','next');ctx.move(1,true)}} previousDisabled={previous===null} decimal={meta.decimal} time={meta.time} negative={meta.negative} feedback={feedback} preventFocus/>
 </aside>
}
export function useFlowConfirm(){
 const [dialog,setDialog]=useState(null),pending=useRef(null)
 useEffect(()=>()=>{pending.current?.resolve(false);pending.current=null},[])
 function ask({title,message,confirmLabel='Stadfest',cancelLabel='Avbryt',danger=false}){
  if(pending.current)return Promise.resolve(false)
  return new Promise(resolve=>{pending.current={resolve,previous:document.activeElement};setDialog({title,message,confirmLabel,cancelLabel,danger})})
 }
 function finish(value){const p=pending.current;pending.current=null;setDialog(null);if(p?.previous?.isConnected)p.previous.focus({preventScroll:true});p?.resolve(value)}
 return {ask,dialog,finish}
}
export function FlowConfirmDialog({dialog,onClose}){
 const cancel=useRef(null),yes=useRef(null),id=useId()
 useEffect(()=>{if(dialog)cancel.current?.focus()},[dialog])
 if(!dialog)return null
 return <div className="gg-flow-confirm-backdrop" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onClose(false)}else if(e.key==='Tab'){e.preventDefault();(document.activeElement===cancel.current?yes:cancel).current?.focus()}}}><section className="gg-flow-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={id} aria-describedby={id+'-desc'}><h3 id={id}>{dialog.title}</h3><p id={id+'-desc'}>{dialog.message}</p><div><button ref={cancel} type="button" className="secondary-button" onClick={()=>onClose(false)}>{dialog.cancelLabel}</button><button ref={yes} type="button" className={'primary-button'+(dialog.danger?' gg-flow-confirm-danger':'')} onClick={()=>onClose(true)}>{dialog.confirmLabel}</button></div></section></div>
}
