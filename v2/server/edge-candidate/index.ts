// REVIEW CANDIDATE ONLY. Outside supabase/functions; no automatic deployment.
import postgres from 'npm:postgres@3.4.7'
import {createClient} from 'npm:@supabase/supabase-js@2.119.2'
import {createSynchronEdgeCandidate} from '../synchronEdgeCandidate.js'
const handler=createSynchronEdgeCandidate({env:(name:string)=>Deno.env.get(name),postgres,createClient})
Deno.serve(handler)
