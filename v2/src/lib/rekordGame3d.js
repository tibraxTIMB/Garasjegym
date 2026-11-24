import * as T from 'three'
import {RECORD_LIFT_POSES,sampleRecordPose} from './recordLiftMotion.js'
const Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1)
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z)
const mix=(a,b,t)=>a+(b-a)*t
const ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t)}
export function victoryMotion(seconds){
 const t=Math.max(0,Math.min(10,seconds))
 const up=ease((t-.7)/2.4)*(1-ease((t-6.2)/2.8))
 const breathe=Math.sin(t*1.8)*.018
 return {up,breathe,head:up*-.15,grin:.28+up*.46,pump:Math.sin(t*3.4)*.08*up}
}
function woodTexture(){
 const c=document.createElement('canvas');c.width=c.height=512
 const ctx=c.getContext('2d');ctx.fillStyle='#a98556';ctx.fillRect(0,0,512,512)
 let n=973;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)
 for(let i=0;i<3700;i++){const x=random()*512,y=random()*512,angle=random()*Math.PI,shade=Math.floor(95+random()*90);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='rgba('+shade+','+Math.floor(shade*.78)+','+Math.floor(shade*.53)+',.45)';ctx.fillRect(0,0,4+random()*24,1+random()*5);ctx.restore()}
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(3,2);return texture
}
export function mountRekordGame(host,{mode='victory',name,logo,onReady,onError}){
 const lift=mode==='lift',spec=RECORD_LIFT_POSES[name]
 if(lift&&!spec)throw Error('Unknown lift')
 let renderer,observer,raf,disposed=false,logoTex,ready=false
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(lift?39:37,1,.1,80)
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)')
 const resources=new Set()
 const track=x=>(resources.add(x),x)
 const mat=(color,roughness=.68,metalness=0,extra={})=>track(new T.MeshStandardMaterial({color,roughness,metalness,...extra}))
 const fur=mat(0x343333,.88),furDark=mat(0x202222,.9),skin=mat(0x75635b,.85),skinLight=mat(0x9c8271,.88),black=mat(0x15191b,.9),gold=mat(0xe7ac42,.48,.35),rubber=mat(0x222728,.87),steel=mat(0x969da0,.35,.7),eyes=mat(0xffefd0,.48),pupil=mat(0x131514,.4),mouth=mat(0x291918,.85),tooth=mat(0xffead6,.45)
 const sphere=track(new T.SphereGeometry(1,24,16)),box=track(new T.BoxGeometry(1,1,1)),cylinder=track(new T.CylinderGeometry(1,1,1,32)),ring=track(new T.TorusGeometry(1,.085,8,36))
 function mesh(geometry,material,parent,position,scale,shadow=true){const m=new T.Mesh(geometry,material);m.position.copy(position);m.scale.copy(scale);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m}
 const ell=(parent,material,x,y,z,sx,sy,sz)=>mesh(sphere,material,parent,v(x,y,z),v(sx,sy,sz))
 const cube=(parent,material,x,y,z,sx,sy,sz,shadow=true)=>mesh(box,material,parent,v(x,y,z),v(sx,sy,sz),shadow)
 const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g}
 function segment(parent,material,radius,depth=radius){const m=ell(parent,material,0,0,0,radius,1,depth);return (a,b)=>{const d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=Math.max(.01,d.length()*.5+radius*.5);m.quaternion.setFromUnitVectors(Y,d.normalize());return m}}
 try{
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,lift?1.35:1.65));renderer.outputColorSpace=T.SRGBColorSpace
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement)
  scene.background=new T.Color(0x1c1c1a);scene.fog=new T.Fog(0x24221e,15,30)
  const hemi=new T.HemisphereLight(0xffe6bd,0x3e4851,2.0);scene.add(hemi)
  const key=new T.DirectionalLight(0xffe5c5,3.0);key.position.set(-4,6,5);key.castShadow=true;key.shadow.mapSize.set(lift?512:1024,lift?512:1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-3;key.shadow.bias=-.0003;key.shadow.normalBias=.03;scene.add(key)
  const rim=new T.DirectionalLight(0xffbb6b,2.1);rim.position.set(4,4,-3);scene.add(rim)
  const fill=new T.DirectionalLight(0xb7d7ff,.9);fill.position.set(3,2,5);scene.add(fill)
  // Garasjen: OSB-plater, svarte vektskiver på vegg, rack, LED-striper,
  // gummigolv, lys løfteplattform og EZ-stang. Reconstructed, no photo uploaded.
  const wood=mat(0xffffff,.9,0,{map:track(woodTexture())}),timber=mat(0xb68d57,.83),floor=mat(0x212727,.92),led=mat(0xffd38a,.45,0,{emissive:0xffbd65,emissiveIntensity:2.8})
  cube(scene,wood,0,2.15,-2.6,10,4.3,.18,false)
  cube(scene,wood,-5,2.15,0,.18,4.3,5,false)
  cube(scene,floor,0,-.11,0,12,.22,10,false)
  cube(scene,timber,0,.025,.4,3.5,.05,3.1,false)
  cube(scene,black,-2.3,.025,.4,1.1,.05,3.1,false);cube(scene,black,2.3,.025,.4,1.1,.05,3.1,false)
  for(const y of [.19,3.84]){cube(scene,timber,0,y,-2.47,10,.15,.13,false);cube(scene,led,0,y+.06,-2.37,9.8,.035,.03,false)}
  for(const [x,y,r] of [[-3.6,2.9,.53],[-2.4,2.3,.45],[-3.7,1.55,.48],[-2.5,.85,.4],[2.5,3.0,.56],[3.6,2.3,.47],[2.5,1.65,.45],[3.6,.95,.43],[1.55,1.12,.28]]){
   const plate=mesh(cylinder,rubber,scene,v(x,y,-2.34),v(r,.13,r));plate.rotation.x=Math.PI/2
   mesh(ring,black,scene,v(x,y,-2.26),v(r*.75,r*.75,.12));const hub=mesh(cylinder,steel,scene,v(x,y,-2.24),v(.08,.06,.08));hub.rotation.x=Math.PI/2
  }
  for(const x of [-2.03,2.03])for(const z of [-1.6,.65]){cube(scene,black,x,1.55,z,.14,3.1,.14);for(let y=.4;y<2.9;y+=.22){const hole=mesh(cylinder,steel,scene,v(x,y,z+.076),v(.025,.007,.025),false);hole.rotation.x=Math.PI/2}}
  for(const z of [-1.6,.65])cube(scene,black,0,3.1,z,4.2,.13,.14)
  const ez=[[-.82,.12],[-.38,.12],[-.18,-.03],[.18,-.03],[.38,.12],[.82,.12]].map(([x,y])=>v(x+1.1,2.7+y,-2.31))
  for(let i=1;i<ez.length;i++)segment(scene,steel,.035)(ez[i-1],ez[i])
  // Stylised original character: rounded sculptural meshes, separate articulated
  // arms, legs and facial details. Not a licensed animation/rig or photoreal scan.
  const actor=group(scene)
  const torso=group(actor),head=group(actor)
  ell(torso,fur,0,.27,0,.65,.65,.37);ell(torso,furDark,0,-.18,0,.48,.49,.32)
  ell(torso,black,0,.20,.11,.57,.69,.33);ell(torso,black,0,-.26,.10,.43,.38,.26)
  // Singlet trim follows shoulders and neckline.
  for(const side of [-1,1]){const strap=ell(torso,gold,side*.36,.59,.17,.065,.21,.26);strap.rotation.z=side*.20}
  const neckTrim=mesh(ring,gold,torso,v(0,.61,.23),v(.33,.15,.45));neckTrim.rotation.x=-.32
  const logoMaterial=mat(0xffffff,.84,0,{transparent:true,depthWrite:false,opacity:0})
  const logoGeometry=track(new T.PlaneGeometry(.55,.55))
  mesh(logoGeometry,logoMaterial,torso,v(0,.19,.447),v(1,1,1),false)
  new T.TextureLoader().load(logo,t=>{if(disposed){t.dispose();return}logoTex=t;t.colorSpace=T.SRGBColorSpace;logoMaterial.map=t;logoMaterial.opacity=1;logoMaterial.needsUpdate=true;if(reduced.matches&&!disposed)renderer.render(scene,camera)},undefined,()=>{})
  ell(head,fur,0,.03,0,.40,.45,.35);ell(head,furDark,0,.25,-.02,.31,.31,.29)
  ell(head,skin,0,-.085,.268,.31,.29,.19)
  ell(head,skinLight,0,-.16,.37,.26,.15,.12);ell(head,skin,0,-.01,.37,.19,.115,.12)
  ell(head,furDark,0,-.025,.46,.115,.065,.06)
  for(const side of [-1,1]){
   ell(head,skin,side*.345,.00,.01,.095,.12,.07)
   ell(head,furDark,side*.145,.12,.29,.17,.11,.095)
   ell(head,eyes,side*.13,.09,.365,.075,.052,.035)
   ell(head,pupil,side*.12,.09,.396,.03,.036,.017)
   const brow=ell(head,furDark,side*.145,.16,.36,.15,.049,.073);brow.rotation.z=side*.18
   ell(head,furDark,side*.052,-.026,.509,.028,.018,.012)
  }
  const smile=ell(head,mouth,0,-.181,.452,.20,.068,.045)
  const teeth=ell(head,tooth,0,-.153,.483,.154,.028,.022)
  const band=mesh(ring,gold,head,v(0,.28,0),v(.36,.30,.35));band.rotation.x=Math.PI/2
  for(let i=0;i<5;i++){const tuft=ell(head,furDark,(i-2)*.10,.38+(.06*(1-Math.abs(i-2)/2)),-.035,.10,.16,.17);tuft.rotation.z=-.3+(i-2)*.12}
  const limbs=[-1,1].map(side=>{
   const shoulder=ell(actor,fur,0,0,0,.30,.30,.29),elbow=ell(actor,furDark,0,0,0,.22,.23,.22),knee=ell(actor,furDark,0,0,0,.19,.19,.19)
   const upper=segment(actor,fur,.29,.25),lower=segment(actor,fur,.235,.24),thigh=segment(actor,furDark,.22,.24),shin=segment(actor,fur,.17,.19)
   const fist=group(actor);ell(fist,skin,0,0,0,.19,.22,.17);for(let i=0;i<4;i++)ell(fist,skinLight,(i-1.5)*.075,.095,.10,.055,.09,.065);ell(fist,skin,-side*.15,-.03,.06,.08,.10,.095);ell(fist,gold,0,-.18,0,.18,.055,.17)
   const foot=ell(actor,black,0,0,0,.21,.10,.33)
   return {side,shoulder,elbow,knee,upper,lower,thigh,shin,fist,foot}
  })
  const bar=group(scene);const shaft=mesh(cylinder,steel,bar,v(),v(.035,2.75,.035));shaft.rotation.z=Math.PI/2
  for(const side of [-1,1]){for(let i=0;i<2;i++){const plate=mesh(cylinder,rubber,bar,v(side*(1.01+i*.12),0,0),v(.33,.115,.33));plate.rotation.z=Math.PI/2}const sleeve=mesh(cylinder,steel,bar,v(side*1.29,0,0),v(.055,.22,.055));sleeve.rotation.z=Math.PI/2}
  bar.visible=lift
  if(lift&&spec.bench){cube(scene,black,0,.66,.13,.82,.15,1.8);for(const z of [-.62,.76])cube(scene,steel,0,.3,z,.10,.62,.12)}
  function poseCharacter(hip,shoulder,headPosition,points,smileAmount=.3){
   const d=shoulder.clone().sub(hip);torso.position.copy(hip).add(shoulder).multiplyScalar(.5);torso.quaternion.setFromUnitVectors(Y,d.normalize())
   head.position.copy(headPosition);head.quaternion.copy(torso.quaternion);smile.scale.y=.055+smileAmount*.09;teeth.position.y=-.153+smileAmount*.012
   for(const b of limbs){const {s,e,h,k,a}=points(b.side),hp=hip.clone().add(v(b.side*.24,0,0));b.shoulder.position.copy(s);b.elbow.position.copy(e);b.knee.position.copy(k);b.upper(s,e);b.lower(e,h);b.thigh(hp,k);b.shin(k,a);b.fist.position.copy(h);b.fist.quaternion.setFromUnitVectors(Y,h.clone().sub(e).normalize());b.foot.position.copy(a).add(v(0,-.025,.10))}
  }
  function frameVictory(time){
   const m=victoryMotion(time),u=m.up,b=m.breathe
   const hip=v(0,1.02+b,0),shoulder=v(0,2.14+b,0),headP=v(0,2.77+b,.07)
   poseCharacter(hip,shoulder,headP,side=>({s:v(side*.61,2.16+b,0),e:v(side*mix(.89,1.08,u),mix(1.50,2.24,u)+b,.12),h:v(side*mix(.68,1.16,u),mix(1.43,2.96,u)+b+m.pump,.37),k:v(side*.33,.55,0),a:v(side*.36,.13,.03)}),m.grin)
   head.rotation.x=m.head;head.rotation.z=Math.sin(time*.9)*.022
  }
  function frameLift(time){
   const phase=reduced.matches?.5:(time%spec.duration)/spec.duration
   const [hp,kn,an,sh,el,ha,he]=sampleRecordPose(name,phase)
   const point=(p,x=0)=>v(x,(177-p[1])*.018+.17,(p[0]-100)*.018)
   const hip=point(hp),shoulder=point(sh),headP=point(he)
   poseCharacter(hip,shoulder,headP,side=>({s:point(sh,side*.53),e:point(el,side*.56),h:point(ha,side*.65),k:point(kn,side*.29),a:point(an,side*.31)}),.12)
   bar.position.copy(point(ha));if(name==='Snatch'){bar.scale.x=1.12}else bar.scale.x=1
  }
  function resize(){
   if(disposed)return
   const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight)
   renderer.setSize(w,h,false);camera.aspect=w/h
   const target=lift?v(0,1.7,0):v(0,1.72,0)
   // Adapt camera framing to tall portrait or wide landscape without cropping.
   const distance=Math.max(lift?6.3:5.6,(lift?6.1:5.3)/Math.min(1,camera.aspect))
   camera.position.copy(lift?v(distance*.77,2.55,distance*.70):v(distance*.15,2.28,distance))
   camera.lookAt(target);camera.updateProjectionMatrix()
   if(reduced.matches&&ready)renderer.render(scene,camera)
  }
  let start=null,last=0
  const tick=now=>{
   if(disposed)return
   start??=now;const t=(now-start)/1000
   if(now-last>=1000/30||!ready){last=now;lift?frameLift(t):frameVictory(t);renderer.render(scene,camera);if(!ready){ready=true;onReady?.()}}
   if(!reduced.matches)raf=requestAnimationFrame(tick)
  }
  const sync=()=>{cancelAnimationFrame(raf);start=null;last=0;if(reduced.matches){lift?frameLift(0):frameVictory(4);renderer.render(scene,camera);if(!ready){ready=true;onReady?.()}}else raf=requestAnimationFrame(tick)}
  const lost=e=>{e.preventDefault();cleanup();onError?.()}
  const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',resize);reduced.removeEventListener?.('change',sync);renderer.domElement.removeEventListener('webglcontextlost',lost);for(const r of resources)r.dispose();logoTex?.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove()}
  renderer.domElement.addEventListener('webglcontextlost',lost)
  observer=new ResizeObserver(resize);observer.observe(host);window.addEventListener('resize',resize);reduced.addEventListener?.('change',sync)
  resize();sync();return cleanup
 }catch(e){disposed=true;cancelAnimationFrame(raf);observer?.disconnect();for(const r of resources)r.dispose();logoTex?.dispose();renderer?.dispose();renderer?.domElement.remove();throw e}
}
