# /prompts

Kunskapsbasen som Cloud Function laddar vid kall-start. Struktur och syften:

## /core — obligatorisk, bundlas med funktionen

Kärnramverket. Läses alltid, i filnamnsordning, och konkateneras till systempromptet. Ändras sällan, versionshanteras noggrant, granskas via pull requests.

```
00_instructions.md         Rollen, arbetsgången, obligatoriska spärrar, outputregler
10_framework.md            Produkt–process–agens: definitioner och distinktioner
11_operationalization.md   Kedjan dimension → kriterium → indikator → evidens → inferens
12_levels_process.md       Processdimensionens tre analytiska nivåer
13_levels_agency.md        Agensdimensionens tre analytiska nivåer
14_artefact_logic.md       Artefakten som brygga mellan kunnande och bedömning
15_pitfalls.md             Återkommande feltyper och hur modellen ska undvika dem
20_output_schema.md        JSON-schema för modellens svar
```

Total längd: hållen medvetet kort för att passa som systemprompt. Om ytterligare filer behövs, överväg om de hör hemma i `/references` istället.

## /examples — valfri, selektivt hämtad

Konkreta, kvalitetsgranskade exempel på goda examinationsdesigner. Tom initialt. Varje exempel är en egen fil enligt `examples/_TEMPLATE.md`. Se `examples/README.md` för bidragsprocess och hämtningslogik.

## /references — valfri, selektivt hämtad

Juridik, styrdokument, taxonomier och teoretiska ramverk som modellen kan luta sig mot när det är relevant. Tom initialt. Varje referens är en egen fil enligt `references/_TEMPLATE.md`. Se `references/README.md` för rekommenderad påfyllnad och hämtningslogik.

## Hämtningslogik i Cloud Function

Vid kall-start:

1. Läs alla filer i `/core` i alfabetisk ordning, konkatenera till `systemPrompt`.
2. Läs metadata (frontmatter) från samtliga filer i `/examples` och `/references` till ett index i minnet.

Vid varje anrop:

1. Tolka användarinput och avgör vilka tags som matchar.
2. Hämta upp till N (default 3) relevanta referenser och upp till M (default 2) relevanta exempel baserat på tag-överlapp.
3. Lägg dem i systempromptet under rubrikerna `## Tillämpliga referenser` och `## Orienterande exempel`.
4. Anropa modellen.

Denna hämtning är deterministisk (tag-baserad), inte embedding-baserad. Om behovet uppstår senare kan en vektorsökning läggas till utan att ändra grundstrukturen.

## Viktigt för utveckling

- Ändringar i `/core` kräver deploy av Cloud Function.
- Ändringar i `/examples` och `/references` kräver också deploy (de bundlas med funktionen) — men om Firestore-admin läggs till senare kan de flyttas dit för att kunna uppdateras utan deploy.
- Språk: svenska i alla filer. Ämnestermer får vara på engelska när etablerat.
