# GarasjeGym 2.0 – STURMKOPF

Dette er ein separat utviklingsversjon. GarasjeGym 1.8.16 og produksjonsdatabasen blir ikkje endra av arbeidet i denne mappa.

## Teknologi
- React 18
- Vite 6
- Supabase JS
- Lucide-ikon

## Lokal utvikling
Krev Node.js 20 eller nyare.

```bash
cd v2
npm install
cp .env.example .env.local
npm run dev
```

Fyll inn desse verdiane i `.env.local`:
- `VITE_SUPABASE_URL`: Project URL frå Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable key som byrjar med `sb_publishable_`.

Bruk aldri `service_role` eller ein secret key i nettlesarkode. Ikkje legg `.env.local` i Git.

## Innlogging og medlemsroller
- Medlemmer kan logga inn med e-post og passord.
- Registrering opprettar ein Auth-brukar. Databasetriggeren `handle_new_auth_user` opprettar medlemsprofil med rolla `member`.
- Rollene `admin` og `manager` blir lesne frå `profiles`; dei kan ikkje veljast i registreringsskjemaet.
- Inaktive profilar får ikkje tilgang til appen.
- Supabase RLS er framleis den endelege tilgangskontrollen; skjuling av menyval i klienten er ikkje tryggleik åleine.

## Status
Første funksjonelle grunnmur:
- Supabase-klient med vedvarande nettlesarsesjon
- Innlogging og registrering
- Henting av medlemsprofil og rolle
- Tilgangsstyrt adminmeny
- Responsivt mørkt STURMKOPF-design

Treningsmotor, booking, PT, sosialt, kaffibar, varsling og full datasynkronisering er ikkje implementerte enno.

## Migrering og tryggleik
- 1.8.16 skal liggja urørt fram til 2.0 er testa og godkjend.
- Ingen produksjonstabellar, RLS-policyar eller data skal endrast utan separat gjennomgang og godkjenning.
- Før vidare funksjonsmigrering skal alle eksisterande tabellar, policies, triggarar og funksjonar kartleggjast.
