# GarasjeGym 2.0 – STURMKOPF

Dette er ein separat utviklingsgrunnmur for GarasjeGym 2.0. Han endrar ikkje 1.8.16 eller Supabase-databasen.

## Teknologi
- React
- Vite
- Supabase JS-klient (førebudd, ikkje kopla til)
- Lucide-ikon

## Køyr lokalt
Krev Node.js installert på maskina.

```bash
npm install
npm run dev
```

## Supabase
1. Kopier `.env.example` til `.env.local`.
2. Legg inn Supabase Project URL og publishable/anon key.
3. Bruk aldri `service_role`-nøkkel i nettlesarkode.

Supabase er ikkje aktivert i denne prototypen. Ingen tabellar, policies eller data blir endra.

## Viktig om migrering
GarasjeGym 1.8.16 skal liggja urørt. Før funksjonar blir flytta over må me kartleggja lokal lagring, databaseoperasjonar, RLS og datakjelder. Ikkje køyr migrerings-SQL mot produksjonsdatabasen før planen er gjennomgått og godkjend.

## Status
Dette er berre første tekniske og visuelle grunnmur. Innlogging, treningsmotor, booking, PT, sosialt, kaffibar og synkronisering er ikkje implementerte enno.
