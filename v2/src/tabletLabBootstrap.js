// This runs before ANY application modules. All local/session storage is transient
// and isolated from the actual installed GarasjeGym app, even on the same origin.
function memoryStorage(){
 const data=new Map()
 return {get length(){return data.size},key:i=>Array.from(data.keys())[i]??null,getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear()}
}
try{
 for(const name of ['localStorage','sessionStorage']){
  const memory=memoryStorage()
  Object.defineProperty(window,name,{value:memory,configurable:false,writable:false})
  if(window[name]!==memory)throw Error('Lagringsisolering feila.')
 }
 import('./tabletLabMain.jsx').catch(error=>{document.getElementById('root').textContent='Testlaboratoriet kunne ikkje starta: '+error.message})
}catch(error){document.getElementById('root').textContent='Testlaboratoriet er stengt: '+error.message}
