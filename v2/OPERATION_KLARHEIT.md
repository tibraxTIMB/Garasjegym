# OPERATION KLARHEIT – gjeldande miljøkontrakt

## Produksjon
- App: eksisterande delte GitHub Pages-adresse. Ingen endring av URL, PWA-scope, manifest, prosjekt-ID eller innloggingsbinding.
- Supabase prosjektref: `izwzwvlexqxqewzijhhd`. Visingsnamnet i Supabase er førebels `garasjegym-2-test`. Ønskt visingsnamn: `GarasjeGym-PROD`; endre berre visingsnamnet i prosjektinnstillingane, aldri opprett nytt prosjekt.
- GitHub produksjonsgrein: `garasjegym-2.0-sturm­kopf` (inneheld historisk mjuk bindestrek U+00AD; ikkje endre greinnamnet i denne operasjonen).
- GitHub Pages-miljø: `github-pages`.
- Publisering: `Deploy`-jobben krev anten manuell `publish_production=true` eller ein uttrykkeleg eigargodkjend releaseordre på nøyaktig produksjonsgrein. Vanleg push byggjer og testar, men publiserer ikkje. Ingen historiske commit-frasar kan utløyse deploy. Releaseordren er ein separat commit som berre endrar `.github/production-release.json`, med `version: 1`, `intent: PUBLISH_PRODUCTION`, `target: <eksakt føregåande produksjons-SHA>`. Ingen kodeendringar kan kombinerast med ordren. Full test, nettlesarrevisjon og artifaktkontroll må passera før deploy; eksisterande Pages-miljøvern gjeld.
- Standardgreina `main` er eldre kode, ikkje produksjonskjelda for SturmKopf. PR #7 om manuell inngang er arkivert; den SHA-bundne releaseordren er verifisert i vellykka produksjonsrun 45900808469. Ingen merge av produksjonsgreina inn i main er nødvendig.

## Utvikling og test
Utvikling skjer på kandidatgreiner/PR-ar. Bruk lokale syntetiske data og isolerte nettlesartestar; ingen testskriving mot produksjon. Det gamle prosjektet `kultdmklwmilhoytrrig` er legacy, ikkje ein godkjend testdatabase. Ingen ny betalt Supabase-instans blir oppretta. Faktisk isolert testdatabase kan etablerast seinare dersom det finst kostnadsfri løysing.

## Releasekontroll
1. Bestått automatisert test og relevant nettlesarrevisjon for kandidaten.
2. Integrer i produksjonsgreina; kontroller prosjektref og release-artifakt.
3. Eigargodkjend releaseordre eller manuell publiseringsgodkjenning på korrekt grein. Releaseordren må peika på kontrollert produksjons-SHA.
4. Verifiser vellykka Pages-deploy og faktisk live-versjon; ikkje erklær live frå byggjestatus aleine.
5. Bevar eksisterande brukarar, økter, PR og treningshistorikk. Ingen nullstilling eller flytting.

Siste stadfesta GitHub Pages-deploy: run 45900808469, releasecommit bff5abf9fc34ead22142fca1adae1c1dd98769cf. Direkte live-lesing er ikkje verifisert. Sjå driftsregisteret i `docs/OPERATIONS.md`. Historiske rapportar med TEST/preview-terminologi er arkiv, ikkje gjeldande miljøkontrakt.
