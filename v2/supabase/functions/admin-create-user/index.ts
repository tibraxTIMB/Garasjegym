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
      .from("profiles")
      .select("role,active")
      .eq("id", callerData.user.id)
      .single()
    if (profileError || callerProfile?.role !== "admin" || callerProfile?.active !== true) {
      return reply({ error: "Berre aktive administratorar kan oppretta brukarar." }, 403)
    }

    const payload = await req.json()
    const email = String(payload.email ?? "").trim().toLowerCase()
    const displayName = String(payload.display_name ?? "").trim()
    const password = String(payload.password ?? "")

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ error: "Skriv inn ei gyldig e-postadresse eller eit e-postliknande innloggingsnamn." }, 400)
    }
    if (!displayName || displayName.length > 60) return reply({ error: "Visingsnamnet må vera 1–60 teikn." }, 400)
    if (password.length < 8 || password.length > 128) return reply({ error: "Passordet må vera minst 8 teikn." }, 400)

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (createError) {
      const status = /already|registered|exists/i.test(createError.message) ? 409 : 400
      return reply({ error: createError.message }, status)
    }
    if (!created.user) return reply({ error: "Supabase oppretta ikkje brukaren." }, 500)

    const { error: approvalError } = await adminClient
      .from("profiles")
      .update({ active: true, membership_status: "approved", email })
      .eq("id", created.user.id)
    if (approvalError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return reply({ error: "Brukaren vart ikkje aktivert. Opprettinga vart rulla tilbake." }, 500)
    }

    return reply({
      success: true,
      user: { id: created.user.id, email: created.user.email, display_name: displayName, role: "member" },
    }, 201)
  } catch (error) {
    console.error("admin-create-user failed", error)
    return reply({ error: "Kunne ikkje oppretta brukarkontoen. Kontroller felta og prøv igjen." }, 500)
  }
})
