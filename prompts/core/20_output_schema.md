# Output-schema

All output ska returneras som JSON enligt nedanstående schema. Fri text utanför JSON är inte tillåten. Använd svenska i alla textfält.

## Schema

```json
{
  "summary": "string — 2–4 meningar: vad förslaget går ut på och vilken övergripande designlogik som styrt det",

  "context": {
    "subject": "string — ämne/kurs",
    "level": "grund | avancerad | forskar",
    "learningOutcomes": ["string — de lärandemål som adresseras"],
    "courseContext": "string — kort sammanfattning av relevant kurskontext, eller 'Inte angiven' om fältet saknas",
    "constraints": ["string — ev. begränsningar som påverkat designen"]
  },

  "artefact": {
    "name": "string — den konkreta artefakt som bär examinationen",
    "description": "string — vad studenten producerar, hur och i vilken form",
    "rationale": "string — varför just denna artefakt är rätt vald i relation till lärandemål, ämne och kurskontext"
  },

  "productDimension": {
    "included": "boolean",
    "rationale": "string — varför dimensionen ingår (eller inte, om false)",
    "criterion": "string | null",
    "indicators": ["string"],
    "evidence": ["string — vilka spår i artefakten eller kompletterande underlag som ger evidens"],
    "taxonomySupport": "string | null — ev. stöd från Bloom/SOLO, kort"
  },

  "processDimension": {
    "included": "boolean",
    "rationale": "string",
    "level": "operativ | återkopplings | disciplinär | null",
    "criterion": "string | null",
    "indicators": ["string"],
    "evidence": ["string"]
  },

  "agencyDimension": {
    "included": "boolean",
    "rationale": "string",
    "level": "individuell | relationell | epistemisk | null",
    "criterion": "string | null",
    "indicators": ["string"],
    "evidence": ["string"],
    "interrogativeElement": "string | null — om uppgiften har ett interrogativt moment, beskriv det"
  },

  "complementaryEvidence": [
    {
      "type": "string — t.ex. beslutslogg, muntligt försvar, revisionsspår, peer review",
      "purpose": "string — vilken dimension och inferens den bär",
      "specification": "string — konkret hur den ska utformas och bedömas"
    }
  ],

  "inferenceCheck": {
    "passes": "boolean",
    "reasoning": "string — argument för att den föreslagna evidensen faktiskt bär de föreslagna inferenserna",
    "revisions": "string | null — om något reviderats under inferens-kontrollen, beskriv vad och varför"
  },

  "programmaticSuggestions": "string | null — konkret programmatisk förstärkning eller nästa steg. Använd fältet både när dimensioner inte ingår och när förslaget skulle vinna på en tydlig koppling till andra delar av kursen eller programmet",

  "pitfallsAvoided": ["string — 1–3 selektivt valda fallgropar som är särskilt relevanta här och som designen aktivt motverkar, t.ex. 'pseudo-agens', 'dokumentationsfetisch'"],

  "openQuestions": ["string | null — eventuella frågor till läraren där inputen var otillräcklig eller där designen behöver kalibreras mot lokala förhållanden"]
}
```

## Regler

- Om en dimension inte är inkluderad (`included: false`), sätt nivå, kriterium och indikatorer till `null` eller tom array, och förklara i `rationale` varför den inte passar här. Flytta förslag till `programmaticSuggestions`.
- `programmaticSuggestions` får också användas när alla dimensioner är inkluderade, om förslaget bör kompletteras eller fördelas vidare i kursen eller programmet. Undvik generiska fraser; skriv bara när det finns ett konkret mervärde.
- `pitfallsAvoided` ska normalt vara kort och selektiv. Lista bara fallgropar som är reellt relevanta i detta fall och som den föreslagna designen faktiskt har byggts för att undvika.
- I `complementaryEvidence` ska formen väljas efter vilken inferens som behöver bäras. Undvik bias mot text om muntlig, praktisk eller observerbar evidens är mer träffsäker.
- `interrogativeElement` ska fyllas i när agens är inkluderad och uppgiften har ett moment utan givet svar. Annars `null`.
- `inferenceCheck.passes` får bara vara `true` om varje inkluderad dimensions evidens bär sin inferens. Om inte: revidera designen innan output, och dokumentera revideringen i `revisions`.
- `openQuestions` används när modellen behöver lärarens klargörande för att ge ett bra förslag. Hellre fråga i detta fält än att gissa.
