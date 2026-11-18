import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405)

  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Du må vera innlogga." }, 401)

    const url = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const token = authorization.slice(7)

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token)
    if (callerError || !callerData.user) return reply({ error: "Innlogginga er ugyldig eller utløpt." }, 401)

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles").select("role,active").eq("id", callerData.user.id).single()
    if (profileError || callerProfile?.role !== "admin" || callerProfile?.active !== true) {
      return reply({ error: "Berre aktive administratorar kan sletta brukarar." }, 403)
    }

    const payload = await req.json()
    const userId = String(payload.user_id ?? "").trim()
    if (!userId) return reply({ error: "Manglar brukar-ID." }, 400)
    if (userId === callerData.user.id) return reply({ error: "Du kan ikkje sletta din eigen konto." }, 400)

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: target, error: targetError } = await adminClient
      .from("profiles").select("id,role").eq("id", userId).maybeSingle()
    if (targetError) return reply({ error: "Kunne ikkje kontrollera brukaren." }, 500)
    if (!target) return reply({ error: "Brukaren finst ikkje." }, 404)
    if (target.role === "admin") return reply({ error: "Admin-kontoar kan ikkje slettast frå medlemsregisteret." }, 403)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error("admin-delete-user delete failed", deleteError)
      return reply({ error: "Supabase kunne ikkje sletta brukaren: " + deleteError.message }, 409)
    }

    return reply({ success: true, deleted_user_id: userId })
  } catch (error) {
    console.error("admin-delete-user failed", error)
    return reply({ error: "Kunne ikkje sletta brukaren. Prøv igjen eller kontroller Supabase-loggen." }, 500)
  }
})
