import {execFileSync} from 'node:child_process'
import {appendFileSync,readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
export const RELEASE_FILE='.github/production-release.json'
export const PRODUCTION_REF='refs/heads/garasjegym-2.0-sturm­kopf'
const sha=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s)&&!/^0+$/.test(s)
export function validateReleaseOrder({event,ref,head,parents,paths,order}){
 if(!paths.includes(RELEASE_FILE))return false
 if(ref!==PRODUCTION_REF||event.ref!==PRODUCTION_REF||event.forced!==false||event.deleted!==false||event.created!==false)throw Error('Release order is not a normal production push')
 if(!sha(head)||!sha(event.before)||event.after!==head||parents.length!==1||parents[0]!==event.before)throw Error('Release order must be one new commit on the exact current production head')
 if(paths.length!==1||paths[0]!==RELEASE_FILE)throw Error('A release order cannot change application code or workflows')
 if(!order||Object.keys(order).sort().join(',')!=='intent,target,version'||order.version!==1||order.intent!=='PUBLISH_PRODUCTION'||order.target!==event.before)throw Error('Invalid or stale release order')
 return true
}
function git(args){return execFileSync('git',args,{encoding:'utf8'}).trimEnd()}
export function main(){
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'))
 const head=process.env.GITHUB_SHA
 if(!sha(event.before)||!sha(head)){appendFileSync(process.env.GITHUB_OUTPUT,'approved=false\n');return}
 // Use Git rather than the event's potentially truncated commit file list.
 const paths=git(['diff','--name-only','--no-renames','-z',event.before,head]).split('\0').filter(Boolean)
 let approved=false
 if(paths.includes(RELEASE_FILE)){
  const parents=git(['rev-list','--parents','-n','1',head]).split(' ').slice(1)
  const order=JSON.parse(git(['show',head+':'+RELEASE_FILE]))
  approved=validateReleaseOrder({event,ref:process.env.GITHUB_REF,head,parents,paths,order})
 }
 appendFileSync(process.env.GITHUB_OUTPUT,'approved='+approved+'\n')
 console.log(approved?'Explicit release order verified for '+event.before:'Build/test only; no release order')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main()
