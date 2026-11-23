# Gazelle 1.2 – PT-kundeoppfølging
Dato: 24. november 2026.

Éingongspublisering etter eksplisitt førespurnad om å byggja den nye PT-opplevinga inn i Gazelle.

Endringar:
- Drift → PT-kundar: enkel, direkte inngang til kundeoppfølging.
- Kundekort med namn, diskret GarasjeGym-rangtittel og opptente stjerner.
- Kompakt horisontal meny: Oversikt, WOD-ar, Timar, Plan, Dialog, Meir.
- PT-tildelte WOD-ar med tildelt / pågår / fullført, basert på pt_wod_assignments og eigen RLS.
- Program-WOD-ar i eiga gruppe, utan å ta status frå private treningsloggar.
- Direkte WOD-tildeling frå kundesida.
- Snarveg frå PT-timar til vald kunde; kartlegging og programmalbibliotek bevarte under Meir/Plan.

Eksisterande brukarar, WOD-ar, PT-relasjonar, tildelingar, økter, PR-ar og treningsloggar skal bevarast. Frontend deploy aleine: ingen databaseendringar eller nullstillingar.
