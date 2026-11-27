// Review-only managed alternative. No custom password, no deployment.
import {createClient} from 'npm:@supabase/supabase-js@2.119.2'
import {createSynchronManagedEdge} from '../synchronManagedQueries.js'
Deno.serve(createSynchronManagedEdge({env:(name:string)=>Deno.env.get(name),createClient,enabled:false,resultSavingEnabled:false}))
