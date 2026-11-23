# GG-011, GG-025, GG-026, GG-029, GG-031 og GG-032

Status oppdatert 23. november 2026. Avgrensa til desse seks tidlegare identifiserte GG-funna.

GG-026 er utført og verifisert i tilknytt Supabase-database. GG-011 må framleis samordnast med godkjend webpublisering. Dette dokumentet er ikkje ein publiseringsgodkjenning.

| GG | Status | Kontroll / tiltak |
| --- | --- | --- |
| GG-011 | Kode ferdig, produksjonsmigrering utsett til samordna publisering | `20261123125000_group_result_notification_deep_link.sql` er kontrollert og lagra på arbeidsgrena. Aktiv DB-funksjon peikar framleis til `mi-trening`. Brukarappen må vera publisert med støtte for `group-class:<id>` før funksjonen blir oppdatert. |
| GG-025 | Lukka – allereie handtert | Mobilmenyen har rollebaserte inngangar til «Drift» og PT Studio i `AppMobileNavigation.jsx`. Ingen ny meny er innført. |
| GG-026 | Ferdig – 4 dublettar fjerna | «Kettlebell Deadlift / Markløft», «Bent-over row», «Dumbbell row» og «Incline Dumbbell Press» vart fjerna etter verifisert null bruk i WOD, treningslogg, PR og favorittar. «Kettlebell markløft» er aktiv med eksisterande WOD-ID intakt; særskilde variantar er bevarte. Biblioteket inneheld 194 registrerte / 193 aktive øvingar. SQL i `20261123135500_gg026_deduplicate_exercise_names.sql`. |
| GG-029 | Lukka – allereie handtert | `ExercisePRCenter.jsx` har `RECORD_CATEGORIES`, øvingskategoriar og manuell PR-registrering. |
| GG-031 | Avslutta utan dataendring | Kravet om heilt blank oppstartsdatabase er ikkje grunnlag for nullstilling av ein app i drift. Ingen brukar-, WOD-, PT-, kaffe- eller historikkdata skal slettast utan eige uttrykkeleg oppdrag. |
| GG-032 | Vurdert – ingen trygg, gratis generell retting | Supabase-varsling: 25 `SECURITY DEFINER`-funksjonar køyrbare for innlogga brukarar, vern mot kjende kompromitterte passord er deaktivert; ytingsråd: 31 ubruka indeksar og to grupper med overlappande permissive UPDATE-policyar. Dette er ikkje påviste sikkerheitsbrot. Lekkja-passord-vern krev Supabase Pro ifølgje leverandøren, og 0 kr-budsjettet tillet ikkje oppgradering. Funksjonsrettar, RLS og indeksar blir ikkje endra ukritisk. |

## Gjenståande produksjonstrinn for GG-011

1. Stadfest at den gjeldande webappen er oppdatert med `group-class:<id>`-navigasjon for vanlege medlem og at timen kan hentast ved direktelenkje.
2. Publiser godkjend appversjon ved eksplisitt manuell workflow-dispatch (GG-030), ikkje ved automatisk branch-push.
3. Køyr den **allereie kommitta** gruppetime-migreringa ein gong via godkjend databasemigrering, og kontroller at `public.publish_class_session_results(uuid)` har `group-class:`-lenkje.
4. Test resultatvarsel frå ei faktisk avslutta gruppetime med ein vanleg medlemsbrukar.

**Viktig:** Utfør aldri punkt 3 før punkt 1 og 2 er stadfesta.

## Supabase-råd (GG-032)

- Sikkerheitsråda er ikkje dokumentasjon på at dei 25 funksjonane er utrygge; fleire er tilsikta RPC-ar med intern autentisering.
- [Supabase-dokumentasjon om SECURITY DEFINER-åtvåringar](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase-dokumentasjon om lekkja passord](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Supabase-dokumentasjon om ubruka indeksar](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [Supabase-dokumentasjon om overlappande permissive policyar](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)

Ikkje endra funksjonsrettar, RLS, indekser eller Auth-innstillingar utan verifisert trygg metode og kontroll av eksisterande medlems-, PT-, trenings- og gruppeflytar. Eventuelt vern mot kjende kompromitterte passord må avklarast i Auth-innstillingane og mot tilgjengeleg plan.
