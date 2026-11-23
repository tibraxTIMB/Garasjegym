# PT Studio – tydeleg kundearbeid og oppstartskartlegging

Oppdatert 23. november 2026. Eigar si skjermtest viste at vald kunde ikkje hadde ein tydeleg arbeidsflyt til eksisterande kartlegging, og at administrative val pressa faglege oppgåver langt ned på mobil.

- Viser vald kunde tydeleg i PT Studio, og prioriterer send kartlegging, sjå svar, treningsplan.
- Gøymer rangredigering og sekundære administrasjonsval i utvidbare felt.
- PT/administrator kan sende førespurnad om det eksisterande `pt_intakes`-skjemaet til vald kunde gjennom sikra `request_pt_intake`-RPC.
- Medlem får varsel som opnar skjemaet. Oppstartskartlegging vert ikkje sendt automatisk ved publisering.
- Når medlemmet svarar, kjem svaret til PT Studio og den tilhøyrande oppstartsvarslinga vert løyst.
- `get_pt_intake_request_state` viser om svar er mottatt eller venta på.
- Supabase-funksjonar har eksplisitt kontroll av aktiv brukar og tilgang via administratortilgang eller eksisterande aktivt PT-kundeforhold.
- Ingen eksisterande PT-program, WOD-ar, treningsloggar eller medlemsdata vert endra av migreringa.

Godkjenningsgrunnlag: aktiv utvikling og brukarretting av eigartest i chatten. Ein avgrensa eingongspublisering vert utført, deretter blir manuell publiseringslås sett tilbake. Full innlogga kundetest skal utførast på ein eigarstyrt brukar og medlem utan å senda reelle førespurnader som del av CI.

## Fokusera PT-kundearbeid

- Heim har direkte inngang til PT Studio for PT og eigar.
- Drift skil no mellom PT-kundearbeid og PT-register/førespurnader.
- Når ingen kunde er vald, opnar eksisterande kundeveljar direkte.
- Oppstartskartlegging opnar ei full førehandsvising av dei eksisterande spørsmåla og mottakarnamn før ei eventuell utsending. Tidlegare utsendt skjema kan lesast utan ny utsending.
- Rang blir vist frå eksisterande registrerte treningsøkter via Garasjekadett-rangstigen, ikkje fritekst.
- Bygg, regresjonskontrollar og isolert migreringstest er beståtte før publisering.
- Ingen automatisk utsending til PT-kundar eller databaseendringar følgjer denne UI-retten.
