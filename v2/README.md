# GarasjeGym 2.0 – STURMKOPF

Dette er ei separat utviklingsutgåve. GarasjeGym 1.8.16 og produksjonsdata skal vera urørte fram til 2.0 er testa og uttrykkeleg godkjend.

## Teknologi
- React 18
- Vite 6
- Supabase JS
- Lucide-ikon

## Lokal utvikling
Krev Node.js 20 eller nyare. På Windows kan du dobbeltklikka `START-GARASJEGYM-2.0.bat`; sjå `TESTE-LOKALT.md` for trygg oppstart mot eit eige testprosjekt. Ikkje bruk produksjonsprosjektet som testdatabase.

```bash
cd v2
npm install
cp .env.example .env.local
npm run dev
```

Fyll inn VITE_SUPABASE_URL (Project URL) og VITE_SUPABASE_PUBLISHABLE_KEY (publishable key som byrjar med sb_publishable_).
Bruk aldri service_role eller ein secret key i nettlesarkode. Ikkje legg .env.local i Git.

## Funksjonar som er bygde i klienten
- E-post/passord-innlogging, registrering og passordlenkje.
- Medlemsprofil og rollebasert navigasjon.
- Oversikt med treningsaktivitet, Garasjekadett-rangering og styrkeprosentar.
- Felles treningsmotor for fri økt og WOD: øvingsliste, favorittar, sett, reps, kg, tid, notat og historikk.
- Timer for EMOM, AMRAP, For Time, Tabata, intervall, stoppeklokke og nedteljing.
- Registrering og vising av personlege rekordar.
- Gruppetimar med oppretting for staff og på-/avmelding for medlem.
- PT-studio med publiserte timar, booking via database-RPC og førespurnad.
- Garasjeprat med innlegg, kommentarar, bilete, reaksjonar og sletting av eigne innlegg/kommentarar.
- Utfordringar med påmelding, mål og individuell framgang.
- Kaffibar med produkt, handlekorg, bestilling og ordrestatus for staff.
- Admin med medlemsroller/aktiv status, WOD-studio og øvingsbibliotek med redigering.
- Kaffibaradministrasjon med oppretting, redigering og publisering/skjuling av menyprodukt.

## Database-migreringar
SQL-filene ligg i supabase/migrations/. Dei er staged i GitHub. I eit separat Supabase Free-testprosjekt er ein tom baseline utan produksjonsdata og migreringane 001–013 installerte. Supabase sin aktive migreringslogg må kontrollerast før kvar utrulling. Prosjektbudsjettet er 0 kroner: ikkje opprett betalte databasegreiner, oppgrader abonnement eller utløyse andre kostnader. Ingen migrering skal køyrast mot produksjon utan trygg gjennomgang og uttrykkeleg godkjenning.

1. 202611160001_save_workout_atomic.sql – atomisk lagring av økt, øvingar og sett.
2. 202611160002_coffee_bar.sql – kaffiprodukt, ordre, ordrelinjer, RLS og bestillings-RPC.
3. 202611160003_exercise_favorites.sql – medlemsfavorittar for øvingar.
4. 202611160004_lock_class_capacity.sql – transaksjonslås ved kapasitetssjekk, trigger og unik indeks mot doble aktive påmeldingar.
5. 202611160005_class_live_sessions.sql – delt live-tilstand for gruppetimar.
6. 202611160006_wod_timer_settings.sql – timerinnstillingar på WOD.
7. 202611160007_group_session_wod_timer.sql – delt WOD- og timeroppsett for gruppetime.
8. 202611160008_class_workout_results.sql – kopling av personlege treningsresultat til live gruppetime og oppdatert atomisk lagrings-RPC.
9. 202611160009_social_reactions.sql – atomisk reaksjonshandtering for Garasjeprat med kontrollert reaksjonsliste.
10. 202611160010_challenges.sql – utfordringar, deltaking, mål og individuell framgang med RLS.
11. 202611160011_harden_rpc_grants.sql – avgrensar EXECUTE-rettar for sensitive SECURITY DEFINER-hjelpefunksjonar og PT-booking til authenticated.
12. 202611160012_restrict_trigger_rpc.sql – stengjer direkte RPC-kall til triggerfunksjonar.
13. 202611160013_test_seed_data.sql – demoøvingar, WOD, kaffiprodukt og gruppetime for isolert testprosjekt; skal ikkje brukast i produksjon.
14. 202611160014_index_foreign_keys.sql – legg til manglande FK-indeksar og fjernar duplikat indeks for gruppetimepåmelding.

Migrering 008 byggjer vidare på 001 og krev at 005 har oppretta `class_live_sessions`. Migrering 009 er uavhengig av dei andre funksjonsmigreringane. Kontroller heile SQL-pakken og funksjonstryggleiken før installasjon. Ikkje køyr migreringane direkte mot produksjonsdatabasen utan backup, gjennomgang og uttrykkeleg godkjenning. Klientfunksjonar som nyttar nye tabellar, kolonnar eller RPC-ar vil ikkje fungera før tilhøyrande migrering er installert. Treningsklienten har fallback dersom `wods.timer_settings` enno ikkje finst, slik at WOD-biblioteket framleis kan lastast.

## Kjende avgrensingar / vidare arbeid
- Timerlogikken må testast på faktiske telefonar, særleg når skjermen går i dvale eller nettlesaren blir minimert.
- Live gruppetime og felles WOD-timer krev migreringane 005–008. Klienten har fallback for perioden før timerutvidinga er installert.
- PT-planar, meldingar og klientnotat har første klientversjon, men må gjennom funksjons- og tilgangstestar.
- Favorittfunksjonen krev at favorittmigreringa er installert i databasen.
- Kaffibar-geofence, lyd/varsel og eventuelle betalingar er ikkje implementerte.
- Sosiale bilete, sletting og reaksjonar er implementerte i klienten; reaksjonar krev migrering 009. Utfordringar og varsling står att.
- Admin manglar full drift for booking, PT, kaffibar, varsling og innstillingar.
- Jamleg oppfrisking er lagt til for sentrale moduldata. Full ende-til-ende-testing med medlem, manager, admin og fleire einingar er ikkje utført.

## Kvalitetssikring
Testplanen ligg i QA-2.0.md. GitHub Actions køyrer òg `npm run check:migrations`, som kontrollerer migreringsfilnamn og balanserte dollar-quote-delimiterar, før Vite-bygginga. Han skil mellom planlagde testar og testar som faktisk er stadfesta køyrde.

## Tryggleik og lansering
- Supabase RLS er den endelege tilgangskontrollen.
- Rollene admin og manager blir lesne frå profiles; dei kan ikkje veljast i registreringsskjemaet.
- Nye Auth-brukarar skal få medlemsprofil gjennom handle_new_auth_user.
- Ingen produksjonssetting eller endring av 1.8.16 er godkjend. Testprosjektet `garasjegym-2-test` er separat og skal berre brukast med testkontoar og testdata.

### Nye staged migreringar (ikkje køyrde)

- `202611160005_class_live_sessions.sql` opprettar delt tilstand for aktive gruppetimar, med RLS for instruktørar og påmelde deltakarar. Migreringa er berre lagra i utviklingsgreina og er ikkje køyrd mot Supabase.

- Booking-klienten viser no delt live-status for gruppetimar og gir stab start/pause/gjenoppta/avslutt. Krev `202611160005_class_live_sessions.sql` før funksjonen kan brukast.


### Kostnads- og utviklingsramme

- Budsjett: **0 kroner**. Ingen betalte Supabase-greiner eller abonnementstillegg er tillatne.
- Utvikling skjer berre på `garasjegym-2.0-sturm­kopf` i GitHub.
- Produksjonsversjon 1.8.16 og aktiv Supabase-database skal ikkje endrast som del av denne utviklingsøkta.
- Bygg og funksjonstestar må stadfestast før ein kan rekna funksjonane som ferdige.
\n\n### Gruppetime-resultat – 18.11.2026\n- Instruktøren avsluttar gruppetimen og publiserer automatisk WOD-ane til alle stadfesta påmelde via GarasjeGym sitt interne varslingssenter.\n- Medlem finn uteståande WOD-ar på Mi side. Oppvarming blir kvittert som gjennomført utan poengføring; hovud-WOD blir opna direkte i treningsmotoren for resultatregistrering.\n- Medlem vel RX, Scaled eller Foundation i treningsmotoren og kan registrera kvar hovud-WOD separat.\n- Instruktøren får ei deltakaroversikt med tal WOD-ar registrert per medlem.\n- Migrering 015 er installert og kontrollert i det isolerte testprosjektet `garasjegym-2-test`. Dette er intern varsling i appen, ikkje operativsystem-/nettlesar-push.\n