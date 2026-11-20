import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return reply({ error: "Du må vere logga inn." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const soundtrackToken = Deno.env.get("SOUNDTRACK_API_TOKEN");
  const soundZone = Deno.env.get("SOUNDTRACK_SOUND_ZONE_ID");
  if (!supabaseUrl || !serviceKey) return reply({ error: "Supabase-funksjonen manglar serveroppsett." }, 503);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${jwt}` },
  });
  if (!userResponse.ok) return reply({ error: "Innlogginga er ikkje gyldig." }, 401);
  const user = await userResponse.json();

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,active,membership_status`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!profileResponse.ok) return reply({ error: "Klarte ikkje kontrollere medlemsrolla." }, 503);
  const profiles = await profileResponse.json();
  const profile = profiles?.[0];
  if (!profile?.active || profile.membership_status !== "approved") return reply({ error: "Godkjent og aktivt medlemskap er nødvendig." }, 403);

  const staff = profile.role === "admin" || profile.role === "manager";
  if (!soundtrackToken || !soundZone) {
    return reply({
      configured: false,
      staff,
      message: "Soundtrack er ikkje kopla til enno. Legg inn bedrifts-API-token og lydsone i Supabase Secrets.",
    });
  }

  const query = `query { nowPlaying(soundZone: ${JSON.stringify(soundZone)}) {
    track {
      name
      artists { name }
      album { name image { url } }
    }
  } }`;
  const response = await fetch("https://api.soundtrackyourbrand.com/v2", {
    method: "POST",
    headers: {
      Authorization: `Basic ${soundtrackToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) {
    return reply({ error: "Soundtrack kunne ikkje hente avspelingsstatus.", details: result.errors?.[0]?.message || undefined }, 502);
  }
  const track = result.data?.nowPlaying?.track;
  return reply({
    configured: true,
    staff,
    track: track ? {
      name: track.name,
      artists: (track.artists || []).map((artist: { name: string }) => artist.name),
      album: track.album?.name || "",
      imageUrl: track.album?.image?.url || "",
    } : null,
    updatedAt: new Date().toISOString(),
  });
});
