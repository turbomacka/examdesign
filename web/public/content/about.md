# Om verktyget

## Vad verktyget gör

Verktyget hjälper dig konstruera examinationer enligt ett ramverk som skiljer mellan tre bedömningsdimensioner: produkt, process och agens. Du anger lärandemål, nivå och ämne. Verktyget genererar ett strukturerat designförslag som omfattar en huvudartefakt, bedömningsfokus per dimension, kompletterande underlag och en inferens-kontroll som granskar om förslaget faktiskt bär de slutsatser läraren vill kunna dra.

Förslagen genereras av en språkmodell (OpenAI GPT-5.4) som arbetar mot en kvalitetsgranskad kunskapsbas. Kunskapsbasen är skriven av människor och består av definitioner, designregler, spärrar mot vanliga feltyper och ett strukturerat svarsschema som modellen måste följa.

## Vad verktyget inte gör

Verktyget ersätter inte pedagogiskt omdöme. Det levererar förslag, inte facit. Examinatorns ansvar för att bedöma rättssäkerhet, examensmål, lokala förutsättningar och studenternas situation kvarstår oförändrat.

Verktyget genererar inte rubriker, betygskriterier för en specifik kurs eller färdiga uppgiftstexter att ge till studenter. Det levererar designprinciper och bedömningslogik som du själv måste översätta till lokala formuleringar.

Verktyget tolkar inte juridik. Hänvisningar till högskoleförordningen och högskolelagen förekommer som orientering, inte som rättsutlåtanden. Frågor om gällande rätt vid examination behöver hanteras av lärosätets jurister och examinatorer.

Verktyget är under utveckling. Funktionalitet, kunskapsbas och designregler revideras kontinuerligt baserat på återkoppling från användare.

## Ramverket i korthet

Examination kan analyseras i tre dimensioner — produkt, process och agens — som motsvarar tre olika sätt att bedöma kunnande. Distinktionen är central:

**Produkt** avser kvaliteten i studentens svar, lösning eller prestation. Här ligger fokus på det resultat studenten åstadkommer i relation till uppgiftens krav. Etablerade redskap som Bloom-taxonomin och SOLO-taxonomin är välanpassade för denna dimension.

**Process** avser studentens deltagande i de praktiker där kvalitet prövas, utvecklas och görs begriplig genom återkoppling, jämförelse, omprövning och användning av bedömningsstandarder. Process är inte samma sak som arbete över tid eller dokumenterad arbetsgång. Det centrala är hur studenten deltar i sådana praktiker där kvalitetsomdömen används och successivt blir begripliga i handling.

**Agens** avser hur studenten använder sitt handlingsutrymme för att göra val, motivera ställningstaganden, hantera osäkerhet och påverka arbetets riktning i relation till kunskap och bedömning. Agens är inte samma sak som allmän självständighet eller förmåga att reflektera. Det centrala är observerbara uttryck för omdöme och ansvar.

En kritisk distinktion i ramverket är att produkt, process och agens är *bedömningsdimensioner* — inte uppgiftstyper eller underlagstyper. Samma underlag kan bära olika dimensioner beroende på vad bedömningen riktas mot. En portfölj kan synliggöra produkt, process eller agens. Det avgörande är inte vilken form examinationen tar, utan vad bedömningen fokuserar och vilka observationer som görs inom ramen för den.

## Teoretisk förankring

Ramverket bygger på fyra parallella diskussioner inom forskning om bedömning och högre utbildning.

**Utbildningens syften.** Gert Biestas distinktion mellan kvalificering, socialisering och subjektifiering ger en teoretisk referenspunkt för att förstå examination som en praktik som realiserar flera utbildningssyften samtidigt. Produkt motsvarar kvalificering, process motsvarar socialisering, agens motsvarar subjektifiering.

**Konstruktiv länkning och kunskapstaxonomier.** Biggs arbete om konstruktiv länkning mellan mål, undervisning och examination ger en grund för produktdimensionen, kompletterad av Anderson och Krathwohls reviderade Bloom-taxonomi och Biggs och Collis SOLO-taxonomi.

**Återkoppling, evaluative judgement och feedback literacy.** Carless och Bouds arbete om feedback literacy, Tai med fleras arbete om evaluative judgement, samt O'Donovan med fleras arbete om bedömningsstandarder ger teoretiska resurser för processdimensionen — särskilt för dess återkopplings- och bedömningspraktiska nivå.

**Studentagens och epistemisk agens.** Jääskelä med fleras arbete om studentagens som resursberoende och relationell, Klemenčičs förståelse av agens som intentionell och självreflexiv handling, samt Nieminen och Ketonens arbete om epistemisk agens i bedömning ger den teoretiska grunden för agensdimensionen.

Ramverkets nyhet ligger inte i de enskilda komponenterna utan i sammanförandet av dem till en sammanhållen designlogik för examination.

## Juridisk och normativ förankring

Den svenska examensordningen uttrycker mål i tre återkommande kategorier: kunskap och förståelse, färdighet och förmåga samt värderingsförmåga och förhållningssätt. Högskolelagen anger att utbildning på grundnivå ska utveckla studenternas förmåga att göra självständiga och kritiska bedömningar, självständigt urskilja, formulera och lösa problem samt utveckla beredskap att möta förändringar i arbetslivet.

Dessa formuleringar ger en normativ grund för en examinationsmodell som uppmärksammar fler dimensioner än produkten. Ramverket fungerar som ett verktyg för att stärka överensstämmelsen mellan examensmålens bredd och examinationens konstruktion.

## Hur ett förslag konstrueras

För varje förslag arbetar verktyget i fem led:

1. **Tolkning av input.** Lärandemål, nivå, ämne och eventuell kontext analyseras. Om information saknas ställer verktyget följdfrågor istället för att gissa.

2. **Val av artefakt.** Verktyget bestämmer det konkreta uttryck där studentens kunnande först blir tolkningsbart — rapport, prototyp, undervisningsplan, muntlig framställning eller praktisk handling. Artefakten är bryggan mellan kunnande och bedömning, varken dimension eller bara underlag.

3. **Bedömningsfokus per dimension.** För varje dimension avgörs om den är relevant. När den är det formuleras kriterium, indikatorer och evidens. För process väljs nivå (operativ, återkopplings- eller disciplinär). För agens väljs nivå (individuell, relationell eller epistemisk). När en dimension inte hör hemma i den aktuella examinationen flaggas det och förslag ges på hur den kan realiseras programmatiskt i en annan del av kursen.

4. **Triangulering med kompletterande underlag.** Riktade triangulerande underlag läggs till för dimensioner artefakten inte kan bära ensam — så få som möjligt, så riktade som möjligt.

5. **Inferens-kontroll.** Förslaget granskas mot frågan: bär den föreslagna evidensen faktiskt den slutsats läraren vill kunna dra? Om kedjan inte håller revideras designen innan den levereras.

## Inbyggda spärrar mot vanliga feltyper

Verktyget är konstruerat för att aktivt undvika återkommande problem i schematisk examinationsdesign. Spärrarna är formulerade som regler i kunskapsbasen och tillämpas vid varje generering.

**Pseudo-agens.** Reflektionsuppgifter utan krav på val, motivering eller hantering av osäkerhet räknas inte som agens. Verktyget kräver alltid observerbara uttryck för omdöme.

**Dokumentationsfetisch.** Antalet utkast eller mängden kommentarer säger inget om kvalitet. Processdimensionen kräver alltid att det är *kvaliteten i omarbetningen eller deltagandet i kvalitetspraktiker* som specificeras, inte mängden insamlat material.

**Triptyk-tvång.** Verktyget pressar inte in alla tre dimensioner i varje examination. Om en dimension inte hör hemma här flaggas det, och förslag ges på var den kan realiseras istället.

**Taxonomi-dominans.** Bloom och SOLO används för produktdimensionen där de hör hemma, inte som styrsystem för process eller agens.

**Värderingsglidning.** Kriterier som glider från att bedöma kunnande och handling till att bedöma personliga egenskaper, mognad eller social följsamhet flaggas och formuleras om.

**Pseudo-autenticitet.** Uppgifter som är formulerade som autentiska men bedöms helt på den färdiga produkten — utan krav på de dimensioner som gör autentiska uppdrag pedagogiskt värdefulla — flaggas som problematiska.

## Datahantering

**Tekniska uppgifter loggas alltid** för drift- och kostnadskoll. Det handlar om modellnamn, svarstid, token-räkning och uppskattad kostnad. Inga personuppgifter, inga kursdata och inga designförslag loggas i denna kategori. Användarens identitet är pseudonymiserad genom kryptografisk hashning.

**Återkoppling loggas frivilligt.** När en användare väljer att ge återkoppling via formuläret i appen sparas kursmål, designförslag och kommentarer tillsammans med återkopplingen. Syftet är kalibrering av verktyget. Användarens identitet är pseudonymiserad. Endast om användaren uttryckligen ger samtycke till uppföljningskontakt sparas identifierande uppgifter separat.

**Tillgång.** Endast projektägaren har tillgång till insamlad återkoppling.

**Radering.** En användare kan när som helst begära att få sina data raderade.

**Forskningskontext.** Om återkopplingsdata senare används i forskningssammanhang kontaktas användare som har gett samtycke till uppföljning för utökat samtycke. Övriga data används endast som anonymiserade aggregat.

## Begränsningar

Verktyget speglar kunskapsbasens innehåll. När kunskapsbasen är ofullständig eller felformulerad blir förslagen sämre. Detta gäller särskilt för:

- Disciplinspecifika kvalitetspraktiker. Den disciplinära nivån av processdimensionen kräver kännedom om hur kvalitet utvecklas och bedöms i ett specifikt ämne. Verktyget har generell teoretisk förankring men kan inte ersätta ämneskompetens.
- Lärosätesspecifika förhållanden. Kursplaner, lokala riktlinjer och pedagogiska traditioner varierar mellan lärosäten och program. Verktyget arbetar generellt och behöver kalibreras lokalt.
- Forskningens utveckling. Kunskapsbasen är versionerad men inte automatiskt uppdaterad mot ny forskning. Verktyget speglar forskningsläget vid den tidpunkt kunskapsbasen senast reviderades.

Verktyget kan också producera felaktiga eller schematiska förslag i enskilda fall. Det är därför inferens-kontrollen, designkommentarerna och fält för öppna frågor finns med i varje förslag. Den kritiska läsningen av förslaget är central, inte valfri.

## Forskningskontext

Återkoppling från användare bidrar både till verktygets kalibrering och till empiriskt underlag för förståelsen av hur pedagogisk expertis översätts till AI-verktyg som kan stödja, snarare än ersätta, lärarens omdöme.

## Kontakt och feedback

Frågor, synpunkter och förslag på förbättringar tas emot via marcus.s.hjarne@gmail.com Återkoppling via formuläret i appen läses regelbundet och påverkar utvecklingen direkt.

## Referenser

Anderson, L. W., & Krathwohl, D. R. (Eds.). (2001). *A taxonomy for learning, teaching, and assessing: A revision of Bloom's taxonomy of educational objectives.* Longman.

Bandura, A. (1989). Human agency in social cognitive theory. *American Psychologist, 44*(9), 1175–1184.

Biesta, G. (2009). Good education in an age of measurement: On the need to reconnect with the question of purpose in education. *Educational Assessment, Evaluation and Accountability, 21*(1), 33–46.

Biesta, G. (2020). Risking ourselves in education: Qualification, socialization, and subjectification revisited. *Educational Theory, 70*(1), 89–104.

Biggs, J. B. (1996). Enhancing teaching through constructive alignment. *Higher Education, 32*(3), 347–364.

Biggs, J. B., & Collis, K. F. (1982). *Evaluating the quality of learning: The SOLO taxonomy.* Academic Press.

Boud, D. (2000). Sustainable assessment: Rethinking assessment for the learning society. *Studies in Continuing Education, 22*(2), 151–167.

Carless, D., & Boud, D. (2018). The development of student feedback literacy: Enabling uptake of feedback. *Assessment & Evaluation in Higher Education, 43*(8), 1315–1325.

Holmes, B. (2021). Can we actually assess learner autonomy? *Education Sciences, 11*(2), 1–14.

Jääskelä, P., Postareff, L., Pöysä-Tarhonen, J., Saarinen, T., & Ojala, M. (2017). Assessing agency of university students: Validation of the AUS Scale. *Studies in Higher Education, 42*(11), 2061–2079.

Klemenčič, M. (2015). What is student agency? An ontological exploration in the context of research on student engagement. I Klemenčič, Bergan, & Primožič (Red.), *Student engagement in Europe: Society, higher education and student governance* (s. 11–29). Council of Europe Publishing.

Lea, M. R., & Street, B. V. (2006). The "academic literacies" model: Theory and applications. *Theory Into Practice, 45*(4), 368–377.

Nieminen, J. H., & Ketonen, L. (2024). Epistemic agency: A link between assessment, knowledge and society. *Higher Education, 88*(2), 777–794.

Nieminen, J. H., Tai, J. H. M., Boud, D., & Henderson, M. (2022). Student agency in feedback: Beyond the individual. *Assessment & Evaluation in Higher Education, 47*(1), 95–108.

O'Donovan, B., Price, M., & Rust, C. (2008). Developing student understanding of assessment standards: A nested hierarchy of approaches. *Teaching in Higher Education, 13*(2), 205–217.

Tai, J., Ajjawi, R., Boud, D., Dawson, P., & Panadero, E. (2018). Developing evaluative judgement: Enabling students to make decisions about the quality of work. *Higher Education, 76*(3), 467–481.

## Fördjupning

För den som vill läsa de underliggande arbetsdokumenten:

- *Produkt–process–agens som designramverk för examination* (Hjärne, 2026) — det teoretiska huvuddokumentet
- *Operationalisering av produkt–process–agens i examination* (Hjärne, 2026) — det operativa kompletterande dokumentet

Kontakta marcus.s.hjarne@gmail.com för att ta del av dokumenten

## Versionsinformation

Verktyget är under utveckling. Större ändringar i kunskapsbasen och designreglerna dokumenteras i versionsloggen.

[V 1.0]

---

*Texten på denna sida är skriven av Claude Opus 4.7 och verifierad/editerad av Marcus S Hjärne. Senast uppdaterad: [2026-04-23]*
