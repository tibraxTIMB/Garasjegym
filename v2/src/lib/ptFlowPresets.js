export const PT_FLOW_PRESETS = [
  {
    "id": "strength",
    "label": "Grunnstyrke · 4 veker",
    "type": "training_plan",
    "weeks": 4,
    "frequency": 2,
    "focus": [
      "Styrke",
      "Teknikk"
    ],
    "description": "To heilskroppsøkter per veke. Tilpass belastning og øvingar til kunden. Start kontrollert, med om lag 2–3 repetisjonar i reserve.",
    "titles": [
      "A – Grunnstyrke: knebøy, press og trekk",
      "B – Hoftehengsel, utfall og kjerne",
      "A – Gjenta teknikk og dosering",
      "B – Kontroller belastning og rørsle",
      "A – Gradvis progresjon",
      "B – Gradvis progresjon",
      "A – Konsolider styrke og teknikk",
      "TEST: Evaluering og neste plan"
    ]
  },
  {
    "id": "functional",
    "label": "Funksjonell fitness · 4 veker",
    "type": "training_plan",
    "weeks": 4,
    "frequency": 2,
    "focus": [
      "Styrke",
      "Kondisjon",
      "Teknikk"
    ],
    "description": "To økter per veke med styrke, teknikk og skalerbar kondisjonsdel. PT vel WOD frå eksisterande bibliotek og tilpassar RX/Intermediate/Scaled.",
    "titles": [
      "Grunnrørsler og kort AMRAP",
      "Teknikk og roleg EMOM",
      "Heilskropp og moderat intervall",
      "Teknikk og kontrollert For Time",
      "Styrke og AMRAP",
      "Teknikk og EMOM",
      "Kombinert styrke og kondisjon",
      "TEST: Gjenta referanseøkt og evaluer"
    ]
  },
  {
    "id": "endurance",
    "label": "Kondisjon · 4 veker",
    "type": "training_plan",
    "weeks": 4,
    "frequency": 2,
    "focus": [
      "Kondisjon",
      "Uthald"
    ],
    "description": "Tilpass roing, sykkel eller gange/løp til kunden. Rolige økter i snakketempo; intervall utan maksimal innsats. Evaluer toleranse før progresjon.",
    "titles": [
      "Rolig uthald – finn eigna intensitet",
      "Korte moderate intervall",
      "Rolig uthald – litt lengre ved god toleranse",
      "Moderate intervall med god pause",
      "Rolig uthald",
      "Intervall – jamn fart",
      "Rolig uthald og teknikk",
      "TEST: Samanlikn ei submaksimal referanseøkt"
    ]
  },
  {
    "id": "mobility",
    "label": "Mobilitet og stabilitet · 3 veker",
    "type": "training_plan",
    "weeks": 3,
    "frequency": 2,
    "focus": [
      "Mobilitet",
      "Kjernestabilitet",
      "Teknikk"
    ],
    "description": "Kontrollerte, individuelt tilpassa rørsler i tolerert rørsleutslag. Ikkje ein medisinsk behandlingsplan.",
    "titles": [
      "Kartlegg rørsle og kontroll",
      "Hofte og ankel",
      "Skulder og brystrygg",
      "Kjernestabilitet og balanse",
      "Integrer rørsler i heilskroppsøkt",
      "TEST: Evaluer rørslekvalitet og vidare behov"
    ]
  },
  {
    "id": "return",
    "label": "Tilbake i trening · 4 veker",
    "type": "training_plan",
    "weeks": 4,
    "frequency": 2,
    "focus": [
      "Aktivitetsoppbygging",
      "Generell helse",
      "Styrke"
    ],
    "description": "For tilbakekomst etter treningspause, ikkje behandling av skade. Tilpass mengd, intensitet og pausar. Auk berre ved god toleranse.",
    "titles": [
      "Kartlegg treningsnivå og lett heilskropp",
      "Lett uthald og mobilitet",
      "Heilskropp – gjenta gode rørsler",
      "Rolig kondisjon og stabilitet",
      "Heilskropp – forsiktig progresjon",
      "Kondisjon – jamn innsats",
      "Kombinert økt med god reserve",
      "TEST: Evaluer toleranse og vidare treningsplan"
    ]
  },
  {
    "id": "clean",
    "label": "Power clean · 6 steg",
    "type": "progression",
    "weeks": 6,
    "frequency": 1,
    "focus": [
      "Teknikk",
      "Eksplosivitet",
      "Styrke"
    ],
    "description": "Teknikkprogresjon med lett belastning og PT-vurdering før auke. Kriterium er faglege sjekkpunkt, ikkje automatisk godkjenning.",
    "steps": [
      [
        "Startposisjon og hoftehengsel",
        "Kontroller startposisjon og spenn.",
        "Dowel hip hinge\nClean deadlift",
        "Stabil startposisjon og kontrollert trekk."
      ],
      [
        "Trekk frå heng",
        "Øv koordinasjon og full strekk.",
        "Hang clean pull",
        "Jamn balanse og tett stangbane."
      ],
      [
        "Mottak og front rack",
        "Øv mottak med lett belastning.",
        "Front squat\nTall clean drill",
        "Stabil mottaksposisjon utan ubehag."
      ],
      [
        "Hang power clean",
        "Set saman trekk og mottak.",
        "Hang power clean",
        "Kontrollerte repetisjonar med stabilt mottak."
      ],
      [
        "Power clean frå golvet",
        "Tilpass start og trekk.",
        "Power clean",
        "Repeterbar teknikk med god reserve."
      ],
      [
        "Teknikkvurdering",
        "PT vurderer vidare treningsbelastning.",
        "Power clean",
        "Godkjend rørslekvalitet; ingen krav om maksløft."
      ]
    ]
  },
  {
    "id": "wall-handstand",
    "label": "Første handstand mot vegg · 6 steg",
    "type": "progression",
    "weeks": 6,
    "frequency": 1,
    "focus": [
      "Teknikk",
      "Styrke",
      "Kjernestabilitet",
      "Mobilitet"
    ],
    "description": "Mål: ein kontrollert handstand mot vegg i 10–20 sekund, med trygg veg ned. Seks nivå, ikkje seks obligatoriske veker. PT tilpassar belastning og godkjenner teknikk før neste steg. Øv med rydda golv, stabil vegg, kontrollert nedgang og PT til stades ved nye inverterte steg. Stopp ved smerte, svimmelheit eller tap av kontroll. Ingen spark opp eller makshald er nødvendig.",
    "steps": [
      [
        "Handledd, skuldrer og grunnspenn",
        "Rolig oppvarming. Gradvis vekt på hendene og øv aktiv skulderposisjon.",
        "Wrist rocks – 2 × 8 rolege repetisjonar\nPlanke – 3 × 15–20 sekund\nSkulderbladspush-up – 2 × 8",
        "Tolererer øvingane utan smerte eller svimmelheit, med kontrollert skulder- og kjernestabilitet."
      ],
      [
        "Pike-hald på golv",
        "Flytt meir vekt over hendene frå pike-posisjon. Korte hald og god pause.",
        "Pike hold – 3 × 10–15 sekund\nPike shoulder shrugs – 2 × 6",
        "Tre kontrollerte hald med aktiv skulderposisjon og trygg retur til ståande."
      ],
      [
        "Pike med føtene på låg boks",
        "Bruk stabil, sklisikker boks. PT tilpassar høgd og hjelper med inn- og utgang.",
        "Box pike hold – 3 × 10–15 sekund\nBox pike weight shifts – 2 × 5 rolege forskyvingar",
        "Stabil støtte over hendene, kontrollert pust og sikker nedgang med PT."
      ],
      [
        "Delvis wall walk",
        "Start lågt. Gå berre så langt opp veggen at kunden sjølv kan reversera rørsla. PT sikrar området.",
        "Partial wall walk – 3 × 1\nDelvis vegghald – 3 × 5–10 sekund",
        "Kontrollert opp- og nedgang utan kollaps i skuldrer eller ubehag. PT godkjenner før høgare nivå."
      ],
      [
        "Handstand mot vegg med støtte",
        "Gradvis nærare loddrett med brystet mot veggen, berre innanfor trygg kontroll. PT står klar til å hjelpa ned.",
        "Wall walk til tilpassa høgd – 3 × 1\nWall-supported handstand hold – 3 × 5–10 sekund",
        "Kontrollert hald, jamn pust, aktiv skulderstøtte og trygg sjølvstendig reversering under tilsyn."
      ],
      [
        "Første kontrollerte handstand",
        "PT vurderer teknikk, hald og nedgang. Avslutt før utmatting. Ingen krav om frittståande handstand.",
        "Wall-supported handstand – opptil 3 × 10–20 sekund\nKontrollert wall walk ned",
        "Minst eitt kontrollert 10-sekundars hald mot vegg med trygg nedgang og PT-godkjenning. Gjenta nivået ved behov."
      ]
    ]
  }
]

export function getPtFlowPreset(id) {
 const p = PT_FLOW_PRESETS.find(row => row.id === id)
 if (!p) return null
 return { draft: { title:p.label.split(' · ')[0], description:p.description, template_type:p.type, weeks:String(p.weeks), sessions_per_week:String(p.frequency), focus_areas:[...p.focus], session_titles:(p.titles||[]).join('\n') }, steps:p.steps?.map(([title,description,exercises,criteria])=>({title,description,exercises,criteria,wod_id:''}))||null }
}
