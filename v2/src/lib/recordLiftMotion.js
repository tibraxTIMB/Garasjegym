// Side-view joint coordinates: hip, knee, ankle, shoulder, elbow, hand, head.
const p=(...joints)=>joints
const stand=p([100,108],[104,143],[100,177],[106,55],[119,83],[120,111],[110,34])
const floor=p([72,114],[115,144],[100,177],[125,92],[130,129],[130,158],[141,72])
const pull=p([83,106],[108,138],[100,177],[120,76],[126,108],[130,136],[132,54])
const front=p([100,108],[105,143],[100,177],[106,55],[141,65],[115,49],[110,34])
const frontLow=p([80,143],[129,146],[100,177],[101,92],[138,101],[110,86],[109,71])
const back=p([100,108],[104,143],[100,177],[106,55],[81,76],[96,49],[110,34])
const backLow=p([69,143],[126,147],[100,177],[98,93],[73,113],[89,87],[107,72])
const high=p([100,108],[104,143],[100,177],[106,55],[107,35],[106,15],[110,34])
const highLow=p([80,143],[129,146],[100,177],[101,92],[104,61],[106,32],[109,71])
const turn=p([100,108],[104,143],[100,177],[106,55],[142,65],[132,80],[110,34])
const snTurn=p([100,108],[104,143],[100,177],[106,55],[138,50],[129,42],[110,34])
const dip=p([96,122],[119,150],[100,177],[105,69],[138,79],[114,63],[110,48])
const split=p([100,122],[132,148],[146,177],[106,69],[106,40],[106,16],[110,48])
const bench=p([83,122],[119,145],[119,177],[52,115],[56,83],[59,51],[32,114])
const benchLow=p([83,122],[119,145],[119,177],[52,115],[32,144],[61,101],[32,114])
const spec=(duration,frames,bench=false)=>({duration,frames,bench})
export const RECORD_LIFT_POSES={
 'Deadlift':spec(6.4,[[0,floor],[.12,floor],[.34,pull],[.55,stand],[.68,stand],[.85,pull],[1,floor]]),
 'Back squat':spec(6.4,[[0,back],[.12,back],[.43,backLow],[.53,backLow],[.85,back],[1,back]]),
 'Front squat':spec(6.4,[[0,front],[.12,front],[.43,frontLow],[.53,frontLow],[.85,front],[1,front]]),
 'Bench press':spec(6.4,[[0,bench],[.12,bench],[.45,benchLow],[.55,benchLow],[.87,bench],[1,bench]],true),
 'Squat Clean':spec(8,[[0,floor],[.12,floor],[.28,pull],[.38,turn],[.48,frontLow],[.57,frontLow],[.77,front],[.85,front],[1,floor]]),
 'Snatch':spec(8,[[0,floor],[.12,floor],[.28,pull],[.38,snTurn],[.48,highLow],[.57,highLow],[.77,high],[.85,high],[1,floor]]),
 'Clean and Jerk':spec(10,[[0,floor],[.10,floor],[.20,pull],[.28,turn],[.36,frontLow],[.49,front],[.60,dip],[.67,split],[.80,high],[.88,high],[1,floor]])
}
export function sampleRecordPose(name,t){const s=RECORD_LIFT_POSES[name];if(!s)return null;const x=Math.max(0,Math.min(1,t)),i=s.frames.findIndex(([a])=>a>=x);if(i<=0)return s.frames[0][1];const [a,l]=s.frames[i-1],[b,r]=s.frames[i],u=(x-a)/(b-a),q=u*u*(3-2*u);return l.map((v,j)=>v.map((n,k)=>n+(r[j][k]-n)*q))}
