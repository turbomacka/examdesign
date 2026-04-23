# References

Kortfattade, operativa utdrag ur styrdokument, taxonomier och teoretiska ramverk som modellen kan hämta vid behov. **Tom initialt** — fylls på efterhand.

Varje referens är en egen fil enligt strukturen i `_TEMPLATE.md`.

## Rekommenderade referenser att prioritera

### Juridik och styrdokument (SE)

- `hogskolelag.md` — 1 kap. 8–9 §§ om självständiga och kritiska bedömningar, förmåga att urskilja, formulera och lösa problem, beredskap att möta förändringar i arbetslivet. Särskilt relevant för agens.
- `examensordning.md` — de tre måltyperna (kunskap och förståelse, färdighet och förmåga, värderingsförmåga och förhållningssätt). Relevant för alla tre dimensioner — mappa mot produkt, process, agens.
- `hogskoleforordning_6kap.md` — bestämmelser om examination, betyg, rättsläge kring omprövning och rättning.

### Taxonomier (produkt)

- `bloom_revised.md` — Anderson & Krathwohl 2001. Kunskapsdimensioner × kognitiva processer. För kriterier om kunskap och förståelse.
- `solo_taxonomy.md` — Biggs & Collis 1982. Nivåer av strukturell komplexitet i svar: prestrukturell, unistrukturell, multistrukturell, relationell, utvidgad abstrakt.
- `krathwohl_affective.md` — Affektiva domänen, för mål om förhållningssätt där det är relevant.
- `fink.md` — Fink's taxonomy of significant learning, inkl. Human Dimension och Caring.

### Teoretiska ramverk (process och agens)

- `feedback_literacy.md` — Carless & Boud 2018. För återkopplingspraktisk nivå av process och relationell nivå av agens.
- `evaluative_judgement.md` — Tai m.fl. 2018. För kvalitetsomdöme som bedömningsobjekt.
- `assessment_standards.md` — O'Donovan m.fl. 2004, 2008. För disciplinär nivå av process.
- `academic_literacies.md` — Lea & Street 2006. För socialiserande dimensioner av kvalitetspraktiker.
- `student_agency.md` — Jääskelä m.fl. 2017, Klemenčič 2015, Nieminen & Ketonen 2024. För agensdimensionens teoretiska grund.

## Bidragsprocess

1. Kopiera `_TEMPLATE.md` till en ny fil med beskrivande namn.
2. Skriv imperativt och kort — målet är att modellen ska kunna använda referensen, inte att läsaren ska bli mättad på stoff.
3. Kvalitetsgranska mot primärkällan.
4. Sätt `status: godkänt` först efter sakkunnig granskning.

## Hämtningslogik (när appen har implementerat den)

Modellen hämtar referenser baserat på tags och dimensions. Typiska tags:

- Dimension: `produkt`, `process`, `agens`
- Typ: `juridik`, `taxonomi`, `styrdokument`, `teoretiskt_ramverk`
- Nivå: `grund`, `avancerad`, `forskar`, `alla`
- Användningsområde: `kriterieformulering`, `malformulering`, `design_interrogativ`, `rattsakerhet`

Minst en tag för `dimension` och en för `type` krävs per referens.
