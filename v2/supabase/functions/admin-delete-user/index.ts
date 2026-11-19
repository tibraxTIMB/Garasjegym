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

    // Some historical rows must remain linked to their author/customer.
    // Check these relationships before attempting the irreversible Auth deletion.
    const blockingReferences = [
      { table: "pt_sessions", column: "created_by", label: "PT-timar oppretta" },
      { table: "pt_messages", column: "sender_id", label: "PT-meldingar sende" },
      { table: "pt_client_notes", column: "coach_id", label: "PT-kundenotat" },
      { table: "classes", column: "created_by", label: "Gruppetimar oppretta" },
      { table: "coffee_orders", column: "member_id", label: "Kaffebestillingar" },
      { table: "class_live_sessions", column: "started_by", label: "Gjennomførte gruppetimar starta" },
      { table: "challenges", column: "created_by", label: "Utfordringar oppretta" },
      { table: "pt_programs", column: "created_by", label: "PT-program oppretta" },
      { table: "calendar_events", column: "created_by", label: "Kalenderhendingar oppretta" },
      { table: "pt_wod_assignments", column: "assigned_by", label: "WOD-tildelingar utførte" },
      { table: "training_sessions", column: "created_by", label: "Treningsøkter oppretta" },
      { table: "training_sessions", column: "member_id", label: "Treningsøkter eigde" },
      { table: "pt_client_goals", column: "created_by", label: "PT-mål oppretta" },
      { table: "pt_program_templates", column: "created_by", label: "PT-programmalar oppretta" },
      { table: "pt_checkins", column: "created_by", label: "PT-statuskontrollar oppretta" },
      { table: "pt_coaches", column: "created_by", label: "PT-coachar registrerte" },
      { table: "pt_client_assignments", column: "coach_user_id", label: "PT-kundar tildelte" },
      { table: "pt_client_assignments", column: "assigned_by", label: "PT-kundetildelingar utførte" },
      { table: "pt_services", column: "created_by", label: "PT-tenester oppretta" },
      { table: "pt_service_requests", column: "assigned_coach_id", label: "PT-førespurnader tildelte" },
      { table: "pt_service_requests", column: "handled_by", label: "PT-førespurnader behandla" },
      { table: "coffee_settings", column: "updated_by", label: "Kaffebarinnstillingar endra" },
      { table: "coffee_product_reviews", column: "member_id", label: "Kaffevurderingar" },
    ]

    const referenceChecks = await Promise.all(blockingReferences.map(async reference => {
      const { count, error } = await adminClient
        .from(reference.table)
        .select("id", { count: "exact", head: true })
        .eq(reference.column, userId)
      if (error) return { ...reference, error: true }
      return { ...reference, count: count ?? 0 }
    }))

    if (referenceChecks.some(reference => reference.error)) {
      return reply({ error: "Kunne ikkje kontrollera all historikk. Ingen konto er sletta." }, 500)
    }

    const linkedHistory = referenceChecks
      .filter(reference => (reference.count ?? 0) > 0)
      .map(reference => ({ area: reference.label, count: reference.count }))

    if (linkedHistory.length) {
      return reply({
        error: "Brukaren har historikk eller ansvarlege oppføringar som må bevarast. Kontoen kan ikkje slettast permanent. Deaktiver kontoen i medlemsregisteret i staden.",
        linked_history: linkedHistory,
      }, 409)
    }

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
