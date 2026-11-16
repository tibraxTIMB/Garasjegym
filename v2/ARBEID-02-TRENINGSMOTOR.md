# Arbeidsfelt 2 – Felles treningsmotor

## Mål
Éin felles treningsmotor skal handtera:
1. Fri trening
2. Planlagd WOD
3. Gruppetime
4. PT-økt

Desse er ulike inngangar og rammer rundt økta. Dei skal ikkje ha kvar sin separate logikk for øvingsregistrering, sett, resultat og historikk.

## Status ved første kodegjennomgang

Den noverande `Training.jsx` er ein enkel WOD-visar:
- Hentar publiserte WOD-ar frå `wods`.
- Hentar aktive øvingar frå `exercises`.
- Let medlem velja ein WOD.
- Lagrar eit enkelt resultat i `workout_logs`.

Dette er ein fungerande start, men ikkje ein felles treningsmotor. Mellom anna manglar:
- Oppbygging av ei økt med fleire øvingar.
- Lagring av øvingsrader i `workout_exercises`.
- Lagring av sett i `workout_sets`.
- Fri trening utan ein førehandsdefinert WOD.
- Støtte for fleire resultattypar og timerformat.
- Historikk, PR-kopling og progresjonsvising.
- Trygg, samla lagring av økt og underliggjande øvingar/sett.

## Datamodell – eksisterande tabellar som utgangspunkt

| Tabell | Føreslått ansvar i motoren |
|---|---|
| `workout_logs` | Ei fullført eller lagra treningsøkt, eigar, dato, kjelde og overordna resultat |
| `workout_exercises` | Øvingane som høyrer til økta, med rekkjefølgje og namn slik dei var då økta blei utført |
| `workout_sets` | Sett/resultat per øving: repetisjonar, belastning og tid |
| `exercises` | Felles øvingsbibliotek |
| `wods` | Førehandsdefinerte økter og WOD-oppsett |
| `personal_records` | Personlege rekordar, etter kontroll av faktisk kolonnedefinisjon og reglar |

Tabellane og kolonnane må kontrollerast mot faktisk Supabase-skjema før motoren skriv meir treningsdata. Ikkje legg til eller endra kolonnar utan eigen gjennomgang.

## Felles øktflyt

1. Vel inngang: fri trening, WOD, gruppetime eller PT.
2. Opprett ei øktøkt i klienttilstand med kjelde, dato og øvingsliste.
3. Legg til, fjern eller flytt øvingar.
4. Registrer sett med reps, kg, tid eller annan relevant måling.
5. Køyr eventuell timer uavhengig av lagringslogikken.
6. Vis ei oppsummering før lagring.
7. Lagre økt, øvingar og sett samla – helst gjennom éin server-side transaksjon/RPC når datamodell og tryggleik er avklara.
8. Hent økta att frå treningsloggen og vis same resultat på andre einingar.

## Timerformat som skal støttast

- EMOM
- AMRAP
- For Time
- Tabata
- Intervall
- Stoppeklokke
- Nedteljing
- Tilpassa format

Timeren skal vera ein eigen komponent/teneste som kan brukast av alle inngangane. Timeren skal ikkje vera ansvarleg for å lagra treningsdata.

## Første implementeringsrekkjefølgje

1. Kontroller faktiske kolonnar, null-reglar, foreign keys, RLS og policies for dei seks tabellane over.
2. Definer felles øktmodell og validering i klienten.
3. Bygg øvingsredigering og settregistrering.
4. Bygg felles øktoppsummering.
5. Implementer samla lagring etter at trygg server-side strategi er bestemt.
6. Legg på timerformata.
7. Kople treningslogg og PR.
8. Kople WOD, gruppetime og PT som inngangar til same motor.

## Tryggleiks- og datakrav

- Medlem skal berre kunna oppretta og lesa eigne treningsresultat, med mindre ei eksplisitt rollebasert funksjon krev meir.
- Ein brukar skal ikkje kunna endra eigarskap på ei økt.
- Serveren/databasen må kontrollera eigarskap; klientkontroll åleine er ikkje nok.
- Feil ved lagring skal ikkje etterlata ei halv økt med manglande sett.
- Dato og tid skal handterast konsekvent med lokal treningsdato og lagra tidsstempel.
- PR skal ikkje reknast ut frå ufullstendige eller ugyldige resultat.

## Avgrensing

Dette dokumentet er ei teknisk arbeidsplan, ikkje godkjenning for databaseskjemaendringar. Første kodegjennomgang viser at noverande WOD-registrering berre lagrar overordna resultat. Neste steg er å verifisera faktisk skjema og tilgangsreglar før me implementerer skriving av øvingar og sett.
