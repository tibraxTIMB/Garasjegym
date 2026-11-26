# GarasjeGym 49 – STURMKOPF GAZELLE 1.2

Gjeldande produksjonsapp. Sjå [OPERATION KLARHEIT](OPERATION_KLARHEIT.md) for bindande miljøkontrakt. Historiske utviklingsrapportar frå før produksjonssetting er arkiv, ikkje gjeldande driftsinstruks.

## Miljø

| Miljø | Bruk |
|---|---|
| Produksjon | https://tibraxtimb.github.io/Garasjegym/ · Supabase prosjektref `izwzwvlexqxqewzijhhd` (historisk visingsnamn `garasjegym-2-test`) |
| Utvikling | GitHub kandidatgreiner og pull requests |
| Test | Lokale syntetiske data, isolerte CI- og nettlesarprøver; ikkje produksjonsdata |
| Legacy | `main` inneheld eldre appkode; `kultdmklwmilhoytrrig` er eldre Supabase-prosjekt, ikkje målet for nye produksjonsbygg |

Produksjonsgreina er `garasjegym-2.0-sturm­kopf`. Adressa og databasebindinga er uendra. Ei ny Pages-utrulling erstattar appinnhaldet på eksisterande adresse. Ein godkjend build er ikkje det same som ei gjennomført deploy.

## Lokal utvikling

React 18, Vite 6, Supabase JS og Lucide. Node.js 22 i CI.

```bash
cd v2
npm ci
npm test
npm run help:demo
```

Demoen brukar syntetiske data. Bruk berre godkjend separat testbinding ved behov for reell databaseintegrasjon. Ikkje kopier produksjonsnøklar til ei utviklingsøkt. Aldri service_role/secret key i klientkode, og aldri `.env.local` i Git.

## Produksjonspublisering

1. Full automatisert test og relevante nettlesarkontrollar på kandidaten.
2. Integrer godkjend kandidat i produksjonsgreina. Push byggjer og testar, men publiserer ikkje.
3. I GitHub Actions, vel GarasjeGym · Production release, korrekt produksjonsgrein, og `publish_production=true`.
4. Kontroller vellukka deploy-jobb og faktisk live-versjon.

Ikkje køyr ein automatisk eller historisk eingongs-commit som publiseringssignal. Standardgreina er ikkje produksjonskjelda. Manuell produksjonspublisering frå standardgreina er blokkert.

## Database og tryggleik

- Eksisterande brukarar, økter, WOD-ar, PR og historikk skal bevarast. Ingen nullstilling.
- Migreringar og preflight ligg i `supabase/`. Kontroller faktisk migreringslogg og backup før godkjende schemaendringar. Ikkje køyr demo-seed eller historiske clean-start-skript i produksjon.
- RLS og server-side kontrollar er tilgangsgrensa; klientrollar er ikkje nok.
- Budsjett 0 kroner. Ikkje opprett betalte databasegreiner eller nye abonnement.
- Bevar `BASE_URL` og PWA-scope, slik at innlogging og installert app held fram på same adresse.

## Kvalitetssikring

`npm test`, `npm run check:migrations`, `npm run build` og `npm run check:release-artifact`. Nettlesarrevisjon: `scripts/responsive-audit.py` mot lokal demo. Fysisk mobil-/nettbrettest, reell drift og databasekapasitet må kontrollerast separat.
