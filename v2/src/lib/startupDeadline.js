// Bounded UI wait only; does not cancel authentication or clear local storage.
export function startupDeadline(operation,{ms=10000,schedule=setTimeout,cancel=clearTimeout}={}){
 return new Promise((resolve,reject)=>{
  let settled=false
  const finish=(callback,value)=>{if(settled)return;settled=true;cancel(timeout);callback(value)}
  const timeout=schedule(()=>finish(reject,new Error('GarasjeGym svarar ikkje. Kontroller nettet og prøv igjen.')),ms)
  Promise.resolve().then(operation).then(value=>finish(resolve,value),error=>finish(reject,error))
 })
}
