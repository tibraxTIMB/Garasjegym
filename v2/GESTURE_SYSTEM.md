# STURMKOPF – gestsystem

## Prinsipp

Gestar skal vere eit supplement til synlege kontrollar, ikkje ein skjultaste måte å utføre viktige handlingar på. Gestar skal aldri konkurrere med vanleg vertikal scrolling, horisontal tabell-/fanelisting eller redigering av skjema.

## Gestar som er aktive

| Område | Gest | Resultat | Alternativ |
|---|---|---|---|
| Mobilmenyen «Meir» – gripefeltet | Sveip opp | Utvid menyarket | Knappen «Utvid» |
| Mobilmenyen «Meir» – gripefeltet | Sveip ned medan utvida | Trekk menyarket saman | Knappen «Trekk saman» |
| Mobilmenyen «Meir» – gripefeltet | Sveip ned medan samantrekt | Lukk menyarket | Lukkeknapp, Escape eller trykk på bakteppet |

Gesten er avgrensa til gripefeltet. Innhaldet i menyarket skal framleis kunne scrollast normalt.

## Navigasjon utan gest

- Botnmenyen navigerer ved trykk.
- «Meir»-knappen opnar sekundærnavigasjonen.
- Sidemenyen på større skjermar navigerer ved trykk.
- Topplinja sine kontrollar er vanlege knappar.
- Horisontale faner og tabellar brukar vanleg horisontal scrolling.

## Gestar som medvite ikkje skal brukast

- Ingen global sveip venstre/høgre for å byte modul. Dette ville kollidere med horisontale lister, tabellar og skjema.
- Ingen sveip for å slette brukarar, meldingar, WOD-ar, bookingar eller treningsresultat. Destruktive handlingar krev synleg kontroll og stadfesting.
- Ingen global sveip opp/ned på innhaldssida. Det ville kollidere med vanleg scrolling.
- Ingen gestar på inputfelt, knappar, lenkjer eller element merkte `data-gesture-ignore`.

## Teknisk kontrakt

- Berre primær peikar vert handsama; sekundære touch-peikarar vert ignorerte.
- Retning må vere eintydig og passere terskelverdien.
- Avbrotne peikarrørsler nullstiller gesttilstanden.
- Gripefeltet har avgrensa touch-handtering; sjølve arket held på normal scrolling.
- Redusert rørsle vert respektert via `prefers-reduced-motion`.
- Alle gestar som endrar vising har ein synleg alternativ kontroll.

## Test og avgrensing

Klassifisering av retning, terskel og akseratio vert testa i `npm run test:gestures`, og denne testen køyrer no i STURMKOPF-verifiseringa. CI-testen dokumenterer logikken, men erstattar ikkje fysisk testing på Android/iOS, særleg testing av peikaravbrot, scrolling, tastatur/fokus og nettbrett i begge retningar.
