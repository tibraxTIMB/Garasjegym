# GarasjeGym 2.0 – STURMKOPF GAZELLE

GarasjeGym er i produksjon. Dette er den aktive produksjonsgreina; appkoden ligg i `v2/`. Rotkoden og `main` er eldre historiske prototypar, ikkje kjelda til dagens app.

- [Opna GarasjeGym](https://tibraxtimb.github.io/Garasjegym/)
- [Opna WERKSTATT på PC](https://tibraxtimb.github.io/Garasjegym/?office=1)
- [Driftsregister / STAMMORDNUNG 49](docs/OPERATIONS.md)
- [Miljø- og releasekontrakt](v2/OPERATION_KLARHEIT.md)
- [Utviklardokumentasjon](v2/README.md)

## Lokal utvikling
```sh
cd v2
npm ci
npm test
npm run build
```

Bruk isolert demo/testdata til nettlesartestar. Ikkje bruk produksjonsbasen til testskriving. Ingen passord, service-role-nøklar, databasedumpar eller persondata i GitHub.

## Publisering
Vanleg push testar, men publiserer ikkje. Bruk KLARHEIT med eksplisitt eigargodkjend releaseordre mot kontrollert produksjons-SHA. Bevar produksjonsdata. Gjeldande release er den siste verifiserte vellykka Pages-deployen, ikkje nødvendigvis siste commit.
