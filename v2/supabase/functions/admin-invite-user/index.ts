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

// Invitations must originate from a logged-in, approved administrator.
// The service key is available only in this Edge Function, never in the app.
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return reply({ error: "Metoden er ikkje tillaten." }, 405)

  try {
    const authorization = request.headers.get("Authorization")
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Du må vera innlogga." }, 401)
    const url = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!url || !anonKey || !serviceKey) return reply({ error: "Invitasjonstenesta er ikkje konfigurert." }, 503)

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: caller, error: callerError } = await callerClient.auth.getUser(authorization.slice(7))
    if (callerError || !caller.user) return reply({ error: "Innlogginga er ugyldig eller utløpt." }, 401)
    const { data: profile, error: profileError } = await callerClient
      .from("profiles").select("role,active,membership_status").eq("id", caller.user.id).single()
    if (profileError || profile?.role !== "admin" || !profile.active || profile.membership_status !== "approved") {
      return reply({ error: "Berre aktive administratorar kan invitera medlemmar." }, 403)
    }

    const input = await request.json().catch(() => ({}))
    const email = String(input.email ?? "").trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ error: "Skriv inn ei gyldig e-postadresse." }, 400)
    }
    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: existing, error: existingError } = await adminClient
      .from("profiles").select("id,role").ilike("email", email).limit(1)
    if (existingError) return reply({ error: "Kunne ikkje kontrollera medlemsregisteret." }, 500)
    if (existing?.length) return reply({ error: "Denne e-postadressa har allereie ein konto.", existing: true }, 409)

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      // Query hint stays on the branded landing page after GoTrue consumes
      // its one-time auth token, so the member can choose their password.
      redirectTo: "https://tibraxtimb.github.io/Garasjegym/?welcome=invite",
    })
    if (inviteError) {
      console.error("admin-invite-user failed to invite", inviteError)
      return reply({ error: "Invitasjonen kunne ikkje sendast. Kontroller adressa og e-postinnstillingane i Supabase." }, 409)
    }
    if (!invited?.user?.id) return reply({ error: "Supabase stadfesta ikkje at kontoen vart oppretta." }, 502)

    // The Auth trigger creates an inactive, pending profile. Since an approved
    // administrator explicitly invited this address, activate this member
    // immediately without granting manager/admin rights.
    const { data: approved, error: approvalError } = await adminClient
      .from("profiles")
      .update({ role: "member", active: true, membership_status: "approved" })
      .eq("id", invited.user.id)
      .eq("role", "member")
      .select("id")
      .maybeSingle()
    if (approvalError || !approved) {
      console.error("admin-invite-user profile approval failed", approvalError)
      return reply({
        invited: true,
        approved: false,
        error: "Invitasjonen er send, men profilen vart ikkje aktivert. Godkjenn medlemmet i medlemsregisteret.",
      }, 207)
    }
    return reply({ success: true, invited: true, approved: true, email })
  } catch (error) {
    console.error("admin-invite-user request failed", error)
    return reply({ error: "Kunne ikkje senda invitasjonen. Prøv igjen." }, 500)
  }
})
