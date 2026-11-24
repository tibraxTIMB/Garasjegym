# GarasjeGym 1.2 STURMKOPF GAZELLE – PT-resultat og tilbakemelding

Produksjonsoppdatering 24. november 2026. Eksisterande app og Supabase-data blir bevarte.

## Dette er lagt til
- PT-kundar → vald kunde → WOD-ar → Sjå resultat.
- Kun resultata frå ei konkret fullført PT-WOD-tildeling / fullført WOD i PT-plan.
- AMRAP-rundetider, tempoindikasjon med varsam ordlyd, doseringsmål vs registrert dosering.
- Skår og rundar per format, resultat for samansette økter og markering av nådd tidsgrense.
- PT-vurdering «passande / lettare / tyngre / disponering / snakk om det» og personleg melding.
- Feedback blir lagra på den aktuelle tildelinga og samtidig vist i kunden sin eksisterande PT-dialog.

## Tryggleik
- Ingen full treningshistorikk blir henta av PT-skjermen.
- To verifiserte databasefunksjonar og RLS for feedback, berre for autoriserte PT-ar og kunderoller.
- Separate sikkerheitsrettingar kontrollerer at kunde-ID i PT-program svarar til feedback-rada.
- Ingen eksisterande data er sletta, overskrivne eller migrerte.
- Automatiske app- og produksjonsbygg er godkjende.

Eingongsoppdatering av den eksisterande GitHub Pages-appen, inga endring av adresse.
