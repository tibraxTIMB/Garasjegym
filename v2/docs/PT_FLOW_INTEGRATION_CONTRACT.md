# PT FLOW – integrasjonskontrakt (kandidat)
25. november 2026. Ikkje publisert; ingen databaseendring.

## Éin modell, to visingar
- Bruk eksisterande PTStudio (PT-kundar > Plan) og MyTraining (Min treningsplan). PTStudio si medlemsside skal bruka same statusfunksjon dersom ho framleis er tilgjengeleg. Ingen ny meny.
- pt_program_templates er malbiblioteket. Dei nye ptFlowPresets fyller berre eksisterande redigeringsskjema; ingen automatiske inserts eller tildelingar. Eksisterande malar blir bevarte.
- pt_programs og pt_program_sessions er plan og øktinstans. WOD-biblioteket er gjenbrukbar oppskrift, ikkje øktidentitet. pt_wod_assignments er frittståande tildelingar; ikkje opprett ein ny assignment for kvar planøkt.
- Resultat skal gå via eksisterande Training/FLOW og atomisk lagring med program_session_id. Ikkje lag nytt loggsystem.
- PTClientWods/eksisterande feedback skal brukast for vurdering av fullførte økter.
- Oppdaga i MyTraining: launchSession koplar assignment via wod_id, remainingAssignments/dailyWods blir filtrerte via wod_id. Det kan feilkopla eller skjula ei separat oppgåve når same WOD er gjenbrukt. Fjern implisitt kopling for nye planøkter; undersøk eksisterande eksplisitte relasjonar og historikk før eventuell retting. Eit sjølvstendig WOD-resultat skal ikkje automatisk fullføra ei låst planøkt. Ingen sletting av historikk.

## Tilgang og tilstand
- Eksisterande planar får open tilgang som bakoverkompatibelt utgangspunkt. Ny plan kan få open, sekvens eller dato. Vurder godkjenning per økt i sekvens, og eksplisitt PT-overstyring per økt. Ikkje bland dato og sekvens utan tydeleg regel.
- Sortering veke, dag, sequence_no, stabil ID ved behov. Kvile/infotime tel ikkje som treningsblokkering. Avtal eigen eventuell informasjonskvittering før framtidig funksjon.
- Låst, klar, gjennomført, ventar på PT. Fullført logg og PT-godkjenning er ulike fakta; ei godkjenning skal ikkje skriva ein ny treningslogg.
- Kunde kan sjå alle økter, men start/registrering for planøkt krev rett status. Open sjølvstendig trening av same bibliotek-WOD er framleis tillaten utan å fullføra låst planøkt.
- Datostyring: kalenderdato Europe/Oslo på server, økt utan dato er låst, PT får valideringsvarsel.
- PT-overstyring og godkjenning må kontrollerast server-side mot aktiv PT-kunderelasjon eller rett administrativ rolle; medlem kan aldri endra policy. Ikkje bruk klientstatus som tilgangsvern.
- Før lansering: identifiser alle launch- og save-ruter, inkludert MyTraining, PTStudio medlem, Training og alle RPC/direct update-vegar. Autoritativ validering ved lagring i same transaksjon, idempotens og samtidigheitskontroll. Ved stale plan må kunden få konkret melding utan å mista resultatdraft. Bevar eksisterande fullførte loggar.
- PT: neste oppgåve/godkjenning øvst, plannivå-val bak kompakt kontroll; utvid øktrad for dato/overstyring, eksisterande WOD-veljar og flytt.
- Kunde: neste tilgjengelege økt, kort årsak ved venting, fullført/att og kompakt rekkje. Ein startknapp og same FLOW-registrering. Dato/sekvens forklart i klartekst.

## Før produksjon
1. Les live schema og gjeldande RPC/triggerar read-only; test additive migreringar isolert; ingen produksjonsmigrering utan godkjenning.
2. Delt statuslogikk og begge visingar; verifiser launch/save og feedback.
3. Test: gjenteken WOD i plan, frittståande oppgåve med same WOD, arkiv, rest/infotime, gamal open plan, omrekkjefølgje, dato utan dato, lokal midnatt/DST, godkjenning, manuell opning, kundebytte, annan kunde/PT, avbroten/forkasta økt, dobbel lagring og konkurrerande rekkjefølgje-endring.
4. Reell mobil/nettbrett-test, bygg og test før eksplisitt publisering.
