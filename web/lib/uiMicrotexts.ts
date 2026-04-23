export const formIngress = {
  beforeLink:
    "Verktyget hjälper dig konstruera examinationer som synliggör tre dimensioner av kunnande — produkt, process och agens. Förslagen genereras mot en kvalitetsgranskad pedagogisk kunskapsbas. Du behåller alltid det pedagogiska omdömet. ",
  linkText: "Läs mer om verktyget",
};

export const formTooltips = {
  learningOutcomes:
    "Klistra in det eller de lärandemål som examinationen ska adressera. Skriv så som de står i kursplanen. Verktyget hanterar både enstaka mål och flera mål samtidigt.",
  level:
    "Avser utbildningsnivå enligt examensordningen — grundnivå, avancerad nivå eller forskarnivå. Påverkar verktygets val av nivå inom process- och agensdimensionen.",
  subject:
    "Kort beskrivning av kursens ämnesområde, t.ex. \"specialpedagogik\", \"industriell ekonomi\" eller \"biokemi\". Behöver inte vara den exakta kursbenämningen.",
  courseContext: [
    "Kort beskrivning som hjälper verktyget ge bättre förslag. T.ex. kursens tema, centrala teoretiska verk eller metoder, studenternas tidigare erfarenhet, ämnesspecifika krav.",
    "Exempel: \"Andra terminen på specialpedagogprogrammet. Kursen behandlar inkluderande undervisning med fokus på neuropsykiatriska funktionsvariationer. Studenterna har gjort VFU och arbetar med egna fallstudier.\"",
  ],
  existingExamination:
    "Klistra in beskrivning av en befintlig examination om du vill att verktyget ska föreslå hur den kan utvecklas. Lämna tomt om du designar från grunden.",
  constraints:
    "Praktiska begränsningar som påverkar designen, t.ex. tillgänglig tid, antal studenter, tekniska förutsättningar, examinationsformat som krävs av program eller kursplan.",
};

export const resultTooltips = {
  inferenceCheck:
    "Verktyget granskar sitt eget förslag mot frågan: bär den föreslagna evidensen faktiskt den slutsats läraren vill kunna dra? Om kedjan från kriterium till evidens inte håller, revideras förslaget innan det levereras.",
  programmaticSuggestions:
    "När en dimension inte hör hemma i den aktuella examinationen föreslår verktyget hur den kan realiseras i andra delar av kursen eller programmet. Hela ramverket realiseras ofta bäst programmatiskt över tid, inte inom en enskild uppgift.",
  pitfallsAvoided:
    "Verktyget kontrollerar aktivt mot återkommande feltyper i schematisk examinationsdesign — som pseudo-agens, dokumentationsfetisch och värderingsglidning. Listan visar vilka spärrar som tillämpats i detta förslag.",
  openQuestions:
    "När verktyget bedömer att informationen i din input inte räcker för ett välgrundat förslag formulerar det öppna frågor istället för att gissa. Svara på dessa och generera om för bättre resultat.",
};

export const courseContextExample =
  "Exempel: \"Andra terminen på specialpedagogprogrammet. Kursen behandlar inkluderande undervisning med fokus på neuropsykiatriska funktionsvariationer. Studenterna har gjort VFU och arbetar med egna fallstudier.\"";

export const consentPageLink = {
  beforeLink:
    "Vill du veta mer om vad verktyget bygger på och hur förslag konstrueras innan du ger samtycke? ",
  linkText: "Läs om verktyget",
  afterLink: " (öppnas i ny flik)",
};

export const consentCopy = {
  title: "Om datainsamling i detta verktyg",
  paragraphs: [
    "Verktyget är en prototyp under utveckling. För att förbättra kvaliteten behöver vi samla in viss information om hur verktyget används.",
    "Alltid: Vi loggar tekniska uppgifter som modellnamn, svarstid och uppskattad kostnad. Inga personuppgifter, inga kursdata, inga designförslag loggas i denna kategori. Din identitet är pseudonymiserad.",
    "Frivilligt: Om du väljer att ge återkoppling via formulären i appen sparas dina kursmål, designförslag och kommentarer tillsammans med din återkoppling. Syftet är att kalibrera verktyget. Din identitet är pseudonymiserad. Om du senare vill kontaktas för uppföljning (intervju, enkät) kan du ge separat samtycke till detta.",
    "Tillgång: Bara projektägaren har åtkomst till insamlad återkoppling.",
    "Radering: Du kan när som helst begära att få dina data raderade genom att kontakta projektägaren.",
    "Om data senare används i forskning: Om datan skulle bli aktuell för forskningssammanhang kontaktas du först om du har gett samtycke till uppföljningskontakt. Annars används bara anonymiserade aggregat.",
  ],
};
