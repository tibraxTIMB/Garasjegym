import {createAuthenticatedSynchronRuntime} from './synchronHttpClient.js'
import {getMembershipGate} from './membershipAccess.js'
const projectUrl='https://izwzwvlexqxqewzijhhd.supabase.co'
// Only explicit release-build configuration may create a live transport.
// No URL parameter, storage flag, browser-provided identity or alternate project.
export function createConfiguredSynchronRuntime({enabled,resultSavingEnabled,project,client,actorId,profile,profileReady,authReady,blocked,tabletLab}={}){
 if(enabled!=='true'||project!==projectUrl||tabletLab||blocked||authReady!==true||profileReady!==true||!actorId||profile?.id!==actorId||getMembershipGate(profile)!=='approved')return null
 return createAuthenticatedSynchronRuntime({enabled:true,actorId,auth:client?.auth,functions:client?.functions,resultSavingEnabled:resultSavingEnabled==='true'})
}
