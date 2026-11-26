# OPERATION KLARHEIT – gjeldande miljøkontrakt

## Produksjon
- App: eksisterande delte GitHub Pages-adresse. Ingen endring av URL, PWA-scope, manifest, prosjekt-ID eller innloggingsbinding.
- Supabase prosjektref: `izwzwvlexqxqewzijhhd`. Visingsnamnet i Supabase er førebels `garasjegym-2-test`. Ønskt visingsnamn: `GarasjeGym-PROD`; endre berre visingsnamnet i prosjektinnstillingane, aldri opprett nytt prosjekt.
- GitHub produksjonsgrein: `garasjegym-2.0-sturm­kopf` (inneheld historisk mjuk bindestrek U+00AD; ikkje endre greinnamnet i denne operasjonen).
- GitHub Pages-miljø: `github-pages`.
- Publisering: `Deploy`-jobben krev manuell `publish_production=true` på nøyaktig produksjonsgrein. Vanleg push byggjer og testar, men publiserer ikkje. Ingen historiske commit-frasar kan utløyse deploy.
- Standardgreina `main` er eldre kode, ikkje produksjonskjelda for SturmKopf. For at manuell workflow skal vera tilgjengeleg frå GitHub, trengst ei minimal inngang på standardgreina med same filnamn og input. Inngangen skal nekte å publisera frå main. Vel alltid produksjonsgreina i Run workflow.

## Utvikling og test
Utvikling skjer på kandidatgreiner/PR-ar. Bruk lokale syntetiske data og isolerte nettlesartestar; ingen testskriving mot produksjon. Det gamle prosjektet `kultdmklwmilhoytrrig` er legacy, ikkje ein godkjend testdatabase. Ingen ny betalt Supabase-instans blir oppretta. Faktisk isolert testdatabase kan etablerast seinare dersom det finst kostnadsfri løysing.

## Releasekontroll
1. Bestått automatisert test og relevant nettlesarrevisjon for kandidaten.
2. Integrer i produksjonsgreina; kontroller prosjektref og release-artifakt.
3. Manuell publiseringsgodkjenning på korrekt grein.
4. Verifiser vellykka Pages-deploy og faktisk live-versjon; ikkje erklær live frå byggjestatus aleine.
5. Bevar eksisterande brukarar, økter, PR og treningshistorikk. Ingen nullstilling eller flytting.

Status ved oppretting: 234 aktive øvingar i gjeldande produksjonsdatabase. Pages-kjeldeinnstillinga og fysisk installert app kan ikkje lesast direkte gjennom noverande tilkopling. Historiske rapportar med TEST/preview-terminologi er arkiv, ikkje gjeldande miljøkontrakt.
