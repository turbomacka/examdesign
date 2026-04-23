# KALIBRERING_V2.md

Denna kalibrering åtgärdar tre svagheter som identifierats efter testning av fem fall (matematik avancerad, byggnadsteknik grund, högskolepedagogik grund, design grund, omvårdnad grund):

1. **Programmatiska förslag används reaktivt, inte proaktivt** (3 av 5 fall lämnade fältet tomt när alla dimensioner inkluderades)
2. **Fallgropslistan är konsekvent för lång** (5 av 5 fall överlistade)
3. **Triangulerande underlag har bias mot text** (5 av 5 fall föreslog huvudsakligen dokumentartade kompletterande underlag)

Bekräftade styrkor som *inte* ska ändras: nivåkalibrering, inferens-kontroll, mod att utesluta dimensioner, adaptiv form på muntligt försvar. Kalibreringen är formulerad så att dessa styrkor inte rubbas.

## Filer som ändras

- `00_instructions.md` — får en kort ny sektion om kritisk självselektion vid output
- `14_artefact_logic.md` — får utbyggd sektion om triangulerande underlag med bredare repertoar
- `20_output_schema.md` — får tydligare fältbeskrivningar för `programmaticSuggestions` och `pitfallsAvoided`

## Filer som *inte* ändras

- `10_framework.md`, `11_operationalization.md`, `12_levels_process.md`, `13_levels_agency.md`, `15_pitfalls.md` — alla fungerar väl enligt testningen.

## Designprincip för kalibreringen

Kalibreringen följer två principer:

1. **Lägg till instruktioner som är *handlingsbara*, inte abstrakta.** Modellen följer skarpa, operationella regler bättre än uppmaningar att "tänka mer".

2. **Beskriv fältens *funktion*, inte bara deras *innehåll*.** Modellens missförstånd ligger i tolkningen av vad ett fält *gör*, inte i vad som passar att skriva i det.

## Hur ändringarna ska appliceras

Kopiera de tre filerna i denna mapp in i `/prompts/core/`. Commit:a med ett tydligt meddelande, t.ex. *"Kalibrering v2: proaktiv programmatisk reflektion, selektivitet i fallgropar, breddad triangulering"*. Deploya funktionerna.

Testa därefter mot minst två av de tidigare fem fallen — exempelvis byggnadsteknik (där alla dimensioner inkluderades och programmatiskt fält var tomt) och omvårdnad (där en dimension uteslöts). Verifiera att:

- Programmatiska förslag är ifyllt även för byggnadsteknik
- Fallgropslistan blivit kortare och mer selektiv i båda
- Kompletterande underlag innehåller minst ett icke-textuellt alternativ när det är relevant

## Reverteringsplan

Om kalibreringen försämrar något (t.ex. om modellen blir överkritisk mot sina egna förslag eller börjar avstå från att lista realistiska fallgropar): rulla tillbaka commiten med `git revert`. De nuvarande filerna i `/prompts/core/` är backup.
