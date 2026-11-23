# GG-011, GG-025, GG-026, GG-029, GG-031 og GG-032

Status oppdatert 23. november 2026. Avgrensa til desse seks tidlegare identifiserte GG-funna.

GG-026 er utført i Supabase (194/193 øvingar). GG-011 er publisert via GitHub Pages og aktivert i tilknytt database etter verifisert utrulling. Full innlogga ende-til-ende-gruppetime med faktisk deltakar er ikkje testa.

| GG | Status | Kontroll / tiltak |
| --- | --- | --- |
| GG-011 | Ferdig – kode og database publisert | GitHub Pages-deploy blei stadfesta som vellukka i [Actions-køyring 45183316622](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45183316622). Migreringa `20261123125000_group_result_notification_deep_link.sql` er aktiv og kontrollert: `publish_class_session_results(uuid)` sender `group-class:<id>`. Manuell medlemsbrukartest med reell avslutta gruppetime står att. |
| GG-025 | Lukka – allereie handtert | Mobilmenyen har rollebaserte inngangar til «Drift» og PT Studio i `AppMobileNavigation.jsx`. Ingen ny meny er innført. |
| GG-026 | Ferdig – 4 dublettar fjerna | «Kettlebell Deadlift / Markløft», «Bent-over row», «Dumbbell row» og «Incline Dumbbell Press» vart fjerna etter verifisert null bruk i WOD, treningslogg, PR og favorittar. «Kettlebell markløft» er aktiv med eksisterande WOD-ID intakt; særskilde variantar er bevarte. Biblioteket inneheld 194 registrerte / 193 aktive øvingar. SQL i `20261123135500_gg026_deduplicate_exercise_names.sql`. |
| GG-029 | Lukka – allereie handtert | `ExercisePRCenter.jsx` har `RECORD_CATEGORIES`, øvingskategoriar og manuell PR-registrering. |
| GG-031 | Avslutta utan dataendring | Kravet om heilt blank oppstartsdatabase er ikkje grunnlag for nullstilling av ein app i drift. Ingen brukar-, WOD-, PT-, kaffe- eller historikkdata skal slettast utan eige uttrykkeleg oppdrag. |
| GG-032 | Vurdert – ingen trygg, gratis generell retting | Supabase-varsling: 25 `SECURITY DEFINER`-funksjonar køyrbare for innlogga brukarar, vern mot kjende kompromitterte passord er deaktivert; ytingsråd: 31 ubruka indeksar og to grupper med overlappande permissive UPDATE-policyar. I tillegg er alle 51 SECURITY DEFINER-funksjonane kontrollerte mot anonym rolle: 0 er køyrbare som `anon`. Dette er ikkje påviste sikkerheitsbrot. Lekkja-passord-vern krev Supabase Pro ifølgje leverandøren, og 0 kr-budsjettet tillet ikkje oppgradering. Funksjonsrettar, RLS og indeksar blir ikkje endra ukritisk. |

## GG-011: godkjend utrulling

- Godkjend kode blei bygd og publisert til GitHub Pages i køyring `45183316622`.
- Migreringa for `group-class:<id>` vart køyrd etter publisering og stadfesta aktiv ved SQL.
- Den mellombelse engongspubliseringsvegen er fjerna. Vidare deploy krev manuell `workflow_dispatch` med `publish_preview=true`.
- **Ikkje verifisert manuelt:** Medlem klikkar resultatvarsel frå ei reelt avslutta gruppetime og registrerer resultat. Dette må testast ved neste faktiske gruppetime.

## Supabase-råd (GG-032)

- Sikkerheitsråda er ikkje dokumentasjon på at dei 25 funksjonane er utrygge; fleire er tilsikta RPC-ar med intern autentisering.
- [Supabase-dokumentasjon om SECURITY DEFINER-åtvåringar](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase-dokumentasjon om lekkja passord](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Supabase-dokumentasjon om ubruka indeksar](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [Supabase-dokumentasjon om overlappande permissive policyar](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)

Ikkje endra funksjonsrettar, RLS, indekser eller Auth-innstillingar utan verifisert trygg metode og kontroll av eksisterande medlems-, PT-, trenings- og gruppeflytar. Eventuelt vern mot kjende kompromitterte passord må avklarast i Auth-innstillingane og mot tilgjengeleg plan.
