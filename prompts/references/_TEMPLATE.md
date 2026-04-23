# Mall: Referens

En mall för att lägga in juridiska, normativa och teoretiska referenser som modellen ska kunna stödja sig på vid design. Varje referens är en egen fil i `/prompts/references/` med beskrivande filnamn, t.ex. `examensordning.md`, `hogskolelag.md`, `bloom_revised.md`, `solo_taxonomy.md`.

Referenser är kortfattade, imperativa och designade för hämtning vid behov. De är *inte* fullständiga sammanfattningar av källtexterna. De är operativa utdrag som modellen behöver för att göra ett välgrundat designval.

---

## Referensmall

```yaml
---
id: UNIK_ID_HÄR
type: juridik | styrdokument | taxonomi | teoretiskt_ramverk
tags: [lista med taggar för hämtning]
dimensions: [produkt, process, agens — en eller flera]
jurisdiction: SE | EU | internationell | ej_tillämpligt
source: "Fullständig källhänvisning"
source_url: "URL om offentlig"
status: utkast | granskat | godkänt
last_reviewed: ÅÅÅÅ-MM-DD
---
```

### Vad referensen säger (kort)

Två till fem meningar som sammanfattar det operativa innehållet. Inte en bred redogörelse.

### När referensen är relevant för examinationsdesign

Konkreta situationer där modellen bör hämta denna referens. T.ex.:
- "När agens ingår och examinationen rör grundnivå."
- "När produktdimensionens kriterier ska formuleras i termer av kognitiv komplexitet."
- "När en examination i kursen ska bedöma värderingsförmåga och förhållningssätt."

### Hur referensen ska användas

Imperativa instruktioner till modellen. T.ex.:
- "Koppla kriteriet explicit till examensordningens måltyp."
- "Använd SOLO:s nivåer (prestrukturell, unistrukturell, multistrukturell, relationell, utvidgad abstrakt) för att formulera progression i kvalitetskriterier."
- "Flagga för läraren om kursens kursplan inte innehåller motsvarande mål."

### Begränsningar

När referensen *inte* ska användas, eller vanliga feltolkningar att undvika.

### Juridiskt/normativt förbehåll (vid behov)

Om referensen är juridisk: påpeka att appen ger orientering, inte juridisk rådgivning, och att tolkning av gällande rätt kräver kvalificerad bedömning av lärosätets jurister och examinatorer.
