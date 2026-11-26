# GarasjeGym – historisk prototype (arkiv)

**Dette er ikkje dagens GarasjeGym.** Aktiv produksjonskode ligg i [STURMKOPF GAZELLE](https://github.com/tibraxTIMB/Garasjegym/tree/garasjegym-2.0-sturm%C2%ADkopf) under `v2/`. Ikkje merge produksjonsgreina inn i main eller publiser denne prototypen.

- [GarasjeGym – live](https://tibraxtimb.github.io/Garasjegym/)
- [WERKSTATT – PC](https://tibraxtimb.github.io/Garasjegym/?office=1)
- [Driftsregister](https://github.com/tibraxTIMB/Garasjegym/tree/garasjegym-2.0-sturm%C2%ADkopf/docs/OPERATIONS.md)

---

## Original dokumentasjon (historisk)

Opne `index.html` i ein moderne nettlesar.

Dette er ein lokal prototype som demonstrerer:
- WOD-oppretting og publisering
- Oppretting av gruppetimar og PT-timar
- Enkel påmelding/avmelding
- Kalenderoversikt
- Øvingsbibliotek med garasjeutstyret
- PR-registrering, inkludert Concept2-testar
- Treningslogg

Viktig avgrensing:
Data blir lagra lokalt i nettlesaren (`localStorage`). Det er ikkje fleirbrukarsynkronisering, sikker innlogging, sky-database, varsling eller offentleg publisering. For å bruke appen saman på kvar dykkar mobil må neste steg vere å kople på autentisering og ei delt database, til dømes Supabase, og publisere appen på ein hostingteneste.
