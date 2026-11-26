# OPERASJON VOLKSMASCHINE – REIBUNGSLOS

Mandat: stabil og samanhengande arbeidsflyt i eksisterande GarasjeGym 49. Ingen ny app, ingen nullstilling av data. Den simulerte tre månaders brukartesten er ei hypotese, ikkje empirisk dokumentasjon.

## Biblioteket – to faglege roller
- Bibliotekar 1 (fag og innhald): dekkjer rørslemønster, utstyr, treningsdisiplinar, teknikk, dosering, progresjon og regresjon. Foreslår berre fagleg relevante nye øvingar.
- Bibliotekar 2 (katalogintegritet og integrasjon): uavhengig kontroll av ID-ar, namn/alias, utstyr, kroppsregion, anatomiprofil, sideval, resultatmåling, PR-relevans, WOD-byggjar, import, PT-plan og timer. Kontrollerer katalogkandidatar og regresjonstestar før publisering. Desse er arbeidsroller, ikkje faktiske tilsette.
- Begge brukar same kanoniske katalog; ingen automatisk samanslåing, sletting, universell belastning eller oppdikta videolenker. Bevar historiske ID-ar. Fagleg innhald og integrasjon må begge vera godkjende før release.

## Prioritering
P0: varig, eksplisitt godkjend lagringsintensjon ved nettutfall og omlasting; ingen automatisk innsending etter endra resultat. P0: individuelle resultat og PR krev verifisert grunnlag. P1: tidlegare resultat, progresjon, PT-kundearbeidsflate, utstyr og trygge alternativ; gjenbruk eksisterande modular. P2: korte demonstrasjonar, betre katalogmetadata og enklare språk. Kommersiell fleirsenterdrift krev eiga arkitektur- og kapasitetstest; ikkje ein del av dette bygget.

## Første leveranse
Lagringsintensjon er separat frå innsendingkvittering, knytt til same medlem, token og eksakte resultatfingeravtrykk. Ho kan gjenopprettast etter lukking av appen; endra resultat eller feil token får aldri automatisk retry. Kode og testar i denne greina; full CI, nettutfallstest på fysisk eining og verifisering av serverside-idempotens før produksjonspublisering.
