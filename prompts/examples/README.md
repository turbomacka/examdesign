# Examples

Kvalitetsgranskade exempel på examinationsdesigner som modellen kan använda som orientering. **Tom initialt** — fylls på efterhand.

Varje exempel är en egen fil enligt mönstret `ÄMNE_NIVÅ_KORTBESKRIVNING.md` och följer strukturen i `_TEMPLATE.md`.

## Bidragsprocess

1. Kopiera `_TEMPLATE.md` till en ny fil med beskrivande namn.
2. Fyll i samtliga fält. Lämna aldrig fält tomma.
3. Sätt `status: utkast` tills exemplet granskats av minst en annan lärare.
4. Granska indikatorer mot `../core/15_pitfalls.md` innan status sätts till `godkänt`.

## Hämtningslogik (när appen har implementerat den)

Modellen hämtar exempel baserat på tags i frontmatter. Typiska tags:

- Dimension: `produkt`, `process`, `agens`
- Nivå: `grund`, `avancerad`, `forskar`
- Kontext: `professionsutbildning`, `generell_högskoleutbildning`, `forskarutbildning`
- Metodologi: `interrogativ`, `triangulerat`, `artefakt_plus_forsvar`
- Ämnesområde: `pedagogik`, `teknik`, `vård`, `samhällsvetenskap`, `humaniora`, `naturvetenskap`

Minst ett ämnesområde och minst en dimension-tag krävs per exempel.
