// Production-managed transport: approved, server-only, no custom credential.
// Client publication remains separately release gated.
import {createClient} from 'npm:@supabase/supabase-js@2.119.2'
import {createSynchronManagedEdge} from '../synchronManagedQueries.js'
Deno.serve(createSynchronManagedEdge({env:(name:string)=>Deno.env.get(name),createClient,enabled:true,resultSavingEnabled:true}))
