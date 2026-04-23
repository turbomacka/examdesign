# Mall: Exempel

En mall för att lägga in faktiska exempel på välgjorda examinationsdesigner senare. Varje exempel är en egen fil i `/prompts/examples/` med filnamn enligt mönstret `ÄMNE_NIVÅ_KORTBESKRIVNING.md`, t.ex. `pedagogik_avancerad_policyanalys.md`.

Modellen kan använda exemplen för att kalibrera sina förslag mot reella, kvalitetsgranskade designer. Exemplen ska *inte* kopieras rakt av utan fungera som orientering mot god praxis.

---

## Exempelmall

```yaml
---
id: UNIK_ID_HÄR
subject: ÄMNE
level: grund | avancerad | forskar
tags: [lista med taggar för hämtning, t.ex. "process", "agens", "professionsutbildning", "interrogativ"]
dimensions_included: [produkt, process, agens]
process_level: operativ | återkopplings | disciplinär | ej_tillämpligt
agency_level: individuell | relationell | epistemisk | ej_tillämpligt
created: ÅÅÅÅ-MM-DD
author: NAMN
status: utkast | granskat | godkänt
---
```

### Kontext

Kort beskrivning av kursen, lärandemålen och de lokala förhållanden som påverkat designen (studentgrupp, tidigare examinationer, särskilda utmaningar).

### Artefakt

Den huvudartefakt som bär examinationen. Varför just denna artefakt valts.

### Designval per dimension

**Produkt:** (om inkluderad) kriterium, indikatorer, evidens.

**Process:** (om inkluderad) nivå, kriterium, indikatorer, evidens.

**Agens:** (om inkluderad) nivå, ev. interrogativt moment, kriterium, indikatorer, evidens.

### Kompletterande underlag

Vilka triangulerande underlag som använts, och vilken dimension/inferens de bär.

### Inferens-kontroll

Hur kedjan kriterium → indikator → evidens → inferens verifierats.

### Erfarenheter från användning

Vad som fungerade. Vad som behövde justeras. Vad som är kvar att lösa.

### Kommentar för återanvändning

När detta exempel är lämpligt att använda som referens. När det *inte* är det.
