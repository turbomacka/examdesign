# AGENT_BRIEF.md

**Till Codex:** Detta är din fullständiga brief. Läs hela innan du börjar. Arbeta agentiskt. Kör kommandon självständigt. Pausa bara när du behöver en hemlighet eller ett beslut som bara användaren kan fatta.

---

## 1. Uppdrag

Bygg en webbapp som hjälper lärare konstruera examinationer enligt ramverket produkt–process–agens.

Användaren matar in: kursmål, nivå, ämne, eventuell befintlig examination, eventuella begränsningar.

Appen returnerar: ett strukturerat designförslag med artefaktval, bedömningsfokus per dimension (med nivåval), kompletterande triangulerande underlag och en inferens-kontroll.

Kunskapsbasen ligger redan i `/prompts/`. Den är den viktigaste komponenten. Förändra aldrig innehållet i `/prompts/core/` utan uttrycklig instruktion.

## 2. Stack och miljö

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind). Statisk export (`output: "export"`). Ingen src/-mapp.
- **Backend:** Firebase Cloud Functions v2, Node.js 22, TypeScript. Region `europe-west1`.
- **Hosting:** Firebase Hosting. Public-mapp: `web/out`.
- **Databas:** Firestore, region `eur3` (europe-west).
- **Auth:** Firebase Auth med Google som enda provider.
- **LLM-provider:** OpenAI Responses API.
- **Modell:** Default `gpt-5.4`. Konfigurerbart via secret `OPENAI_MODEL`.
- **Secrets:** Hanteras uteslutande via `defineSecret` från `firebase-functions/params`. Aldrig i kod, aldrig i `.env` som committas.

## 3. Arkitektur

### 3.1 Frontend (`/web`)

- Startsida: inloggning med Google om ej inloggad, annars formulär.
- Formulärsida: fält för kursmål (textarea), nivå (radio: grund/avancerad/forskar), ämne (textfält), kunskapsform (textfält, valfritt), befintlig examination (textarea, valfritt), begränsningar (textarea, valfritt). Skicka-knapp kallar Cloud Function.
- Resultatsida: renderar JSON-svaret i läsbar form med tydliga sektioner (Sammanfattning, Kontext, Artefakt, Produkt, Process, Agens, Kompletterande underlag, Inferens-kontroll, Programmatiska förslag, Fallgropar undvikna, Öppna frågor). Spara-knapp och Exportera till Word-knapp (docx via t.ex. `docx`-biblioteket client-side).
- Historiksida: lista över tidigare designförslag från Firestore. Klick öppnar samma resultatsvy.

### 3.2 Backend (`/functions`)

En enda callable-funktion: `generateExamDesign`.

**Inparametrar:**
```ts
{
  learningOutcomes: string;
  level: "grund" | "avancerad" | "forskar";
  subject: string;
  knowledgeForm?: string;
  existingExamination?: string;
  constraints?: string;
}
```

**Logik:**
1. Verifiera att `context.auth` finns. Om inte: kasta `unauthenticated`.
2. Validera input (längdgränser: 10–5000 tecken per fält).
3. Ladda systemprompt från `/prompts/core/` (cachas i minnet per instans — läs bara vid kall-start).
4. Hämta relevanta exempel och referenser från `/prompts/examples/` och `/prompts/references/` via tag-matching (se 3.3).
5. Konstruera full prompt och anropa OpenAI Responses API:
   - `model`: från secret `OPENAI_MODEL` eller `gpt-5.4` default
   - `response_format`: `{ type: "json_schema", json_schema: <schema från 20_output_schema.md> }`
   - `max_output_tokens`: 4000
   - `temperature`: 0.3
6. Validera modellens output mot schemat. Om ogiltig: kasta `internal` med tydligt felmeddelande.
7. Spara i Firestore: `users/{uid}/designs/{autoId}` med `createdAt`, input, output, model-info.
8. Returnera `{ designId, result }`.

**Secrets:**
- `OPENAI_API_KEY` (obligatorisk)
- `OPENAI_MODEL` (valfri)

### 3.3 Retrieval-logik

Vid kall-start:
1. Läs alla filer i `/prompts/core/` i filnamnsordning, konkatenera som `coreSystemPrompt`.
2. Scanna `/prompts/examples/` och `/prompts/references/` (utom filer som börjar med `_` eller `README`):
   - Parsa YAML-frontmatter.
   - Bygg ett in-memory-index: `{ filename, tags, dimensions, body }`.

Vid varje anrop:
1. Extrahera tags från användarens input (simpel heuristik): nivå → tag, ämnesord → dimensions eller tags.
2. Rangordna examples/references efter tag-överlapp.
3. Ta upp till 3 top-referenser och upp till 2 top-exempel.
4. Lägg till i systempromptet under rubrikerna `## Tillämpliga referenser` resp. `## Orienterande exempel`.
5. Om båda mapparna är tomma — skippa sektionerna tyst.

Retrievalen ska vara **deterministisk**, inte embedding-baserad. Dokumentera i kod att detta kan bytas ut mot vektorsökning senare.

### 3.4 Firestore-modell

```
/users/{uid}
  email: string
  displayName: string
  createdAt: timestamp
  lastActive: timestamp

/users/{uid}/designs/{designId}
  createdAt: timestamp
  input: { learningOutcomes, level, subject, knowledgeForm?, existingExamination?, constraints? }
  output: <hela JSON-svaret från modellen>
  model: string
  tokensUsed: { input: number, output: number }
```

### 3.5 Säkerhetsregler (Firestore)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /designs/{designId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

## 4. Arbetsordning

**Pausa och fråga användaren om:**
- OpenAI API-nyckel (sätts via `firebase functions:secrets:set OPENAI_API_KEY`)
- Firebase Project ID om det inte redan framgår av `.firebaserc`
- Några val där flera rimliga vägar finns (föreslå och motivera ett val, pausa för godkännande)

**Arbetsordning:**

1. **Initiera Firebase-projektet.** Kör `firebase init` interaktivt. Välj Functions (TypeScript, ESLint), Hosting, Firestore, Emulators. Använd existerande Firebase-projekt (användaren har redan skapat det).
2. **Skapa frontend.** `npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes`. Konfigurera för statisk export.
3. **Konfigurera `firebase.json`** så Hosting pekar på `web/out`, med rewrites som hanterar SPA-fallback.
4. **Implementera backend.** Skriv `functions/src/index.ts`, `functions/src/prompts.ts` (retrieval-logik), `functions/src/openai.ts` (API-wrapper), `functions/src/schema.ts` (JSON-schema parsat från `20_output_schema.md`).
5. **Implementera frontend.** Komponenter: `LoginPage`, `DesignForm`, `ResultView`, `HistoryPage`. Använd `react-firebase-hooks` eller motsvarande för auth-state.
6. **Firestore-regler.** Skriv `firestore.rules` enligt 3.5.
7. **Testning.** Sätt upp en minimal test med `firebase emulators:start`. Verifiera att formuläret når funktionen och att svaret renderas.
8. **Pausa och be användaren sätta secrets** (`OPENAI_API_KEY`).
9. **Deploy.** `firebase deploy`. Rapportera URL:en.

## 5. Kvalitetskrav

- **TypeScript strict mode** i både frontend och backend.
- **Ingen hemlighet i klientkod.** Frontend anropar bara Cloud Function, aldrig OpenAI direkt.
- **Input valideras server-side** med Zod eller motsvarande.
- **Alla svenska UI-strängar.**
- **Felmeddelanden är användarvänliga.** Teknisk stack-trace loggas bara server-side.
- **Loggning:** använd Cloud Functions logger. Logga aldrig hela systempromptet eller hela användarinput — bara metadata (uid, timestamps, modell, token-räkning).
- **Commits:** små, fokuserade, tydliga meddelanden på svenska eller engelska (konsekvent). Ingen hemlighet i git-historien.

## 6. Vad Codex INTE ska göra

- Inte ändra något i `/prompts/core/` utan explicit instruktion.
- Inte lägga till embeddings eller vektordatabas i denna version.
- Inte bygga en admin-vy för att redigera `/prompts/` i appen — det kommer senare.
- Inte implementera betalningsflöden, teamsupport eller multi-tenant i denna version.
- Inte använda tredjepartsbibliotek som skickar data vidare (analytics, sentry, etc.) utan att fråga först.

## 7. När du är klar

Rapportera:
- URL till den deploy:ade appen.
- Lista över committade filer (översiktligt).
- Lista över kända begränsningar eller kompromisser.
- Nästa rimliga steg för användaren.

Kör igång.
