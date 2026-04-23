# CODEX_INSTRUCTION_FORSKNINGSLAGER.md

**Till Codex:** Detta är en kompletterande brief till den befintliga appen. Den nuvarande appen har frontend-ramverket på plats men saknar hela datalagret för forskningskalibrering: samtycke, telemetri, återkoppling, admin-vy och kostnadsberäkning. Den här briefen lägger till det.

Läs hela innan du börjar. Pausa bara om du behöver beslut från användaren eller en hemlighet du inte har.

---

## Översikt

Fem sammanhängande funktioner ska byggas. De hör ihop logiskt och refererar varandra:

1. **Samtycke** — sida `/samtycke`, datamodell `/users/{uid}/consent/current`, kontroll i frontend och backend
2. **Telemetri** — skrivning till `/telemetry/{autoId}`, hashning, kostnadsberäkning
3. **Återkoppling** — formulär på resultatsidan, callable function `submitFeedback`, datamodell `/feedback/{autoId}`
4. **Admin-vy** — sida `/admin`, callable function `exportFeedback`, OWNER_UID-secret
5. **Estimated cost** — uträkning per anrop, lagrat på telemetri-poster

Bygg dem i den ordning som listas. Samtycke först, eftersom resten beror på det.

## Nya secrets som krävs

Tre nya secrets behöver definieras med `defineSecret` från `firebase-functions/params`:

- `TELEMETRY_SALT` — slumpmässig sträng för hashning av UID. Pausa och be användaren generera ett GUID och köra `firebase functions:secrets:set TELEMETRY_SALT`.
- `OWNER_UID` — Firebase UID för projektägaren. Användaren behöver logga in först, hämta sitt UID från Firebase Console → Authentication → Users, och köra `firebase functions:secrets:set OWNER_UID`. Pausa och vänta.

Båda är *obligatoriska* för funktionalitet. Bind dem till relevanta funktioner via `secrets`-arrayen i funktionsdefinitionen.

---

## Del 1: Samtycke

### 1.1 Datamodell

Lägg till en `ConsentState`-typ i `web/lib/types.ts`:

```ts
export type ConsentState = {
  telemetryAccepted: boolean;
  feedbackInformedAccepted: boolean;
  contactAccepted: boolean;
  acceptedAt: Timestamp;
  consentVersion: number;
};

export const CURRENT_CONSENT_VERSION = 1;
```

Spara i Firestore på path `/users/{uid}/consent/current` (dokument-ID är alltid `current` så det är lätt att hämta).

### 1.2 Samtyckessida

Skapa `web/app/samtycke/page.tsx`. Sidan ska:

- Vara tillgänglig endast för inloggade användare. Om ej inloggad: redirect till inloggningssidan.
- Om användaren redan har giltigt samtycke (rätt version): redirect till `/ny`.
- Visa följande text **ordagrant** (skriv om eventuell befintlig text i `uiMicrotexts.ts` så den matchar denna):

> **Om datainsamling i detta verktyg**
>
> Verktyget är en prototyp under utveckling. För att förbättra kvaliteten behöver vi samla in viss information om hur verktyget används.
>
> **Alltid:** Vi loggar tekniska uppgifter som modellnamn, svarstid och uppskattad kostnad. Inga personuppgifter, inga kursdata, inga designförslag loggas i denna kategori. Din identitet är pseudonymiserad.
>
> **Frivilligt:** Om du väljer att ge återkoppling via formulären i appen sparas dina kursmål, designförslag och kommentarer tillsammans med din återkoppling. Syftet är att kalibrera verktyget. Din identitet är pseudonymiserad. Om du senare vill kontaktas för uppföljning (intervju, enkät) kan du ge separat samtycke till detta.
>
> **Tillgång:** Bara projektägaren har åtkomst till insamlad återkoppling.
>
> **Radering:** Du kan när som helst begära att få dina data raderade genom att kontakta projektägaren.
>
> **Om data senare används i forskning:** Om datan skulle bli aktuell för forskningssammanhang kontaktas du först om du har gett samtycke till uppföljningskontakt. Annars används bara anonymiserade aggregat.

Under texten: en länk *"Vill du veta mer om vad verktyget bygger på och hur förslag konstrueras innan du ger samtycke? [Läs om verktyget](/om) (öppnas i ny flik)"*

Sedan kryssrutorna:

- [ ] Jag förstår att tekniska uppgifter alltid loggas. **(Obligatorisk)**
- [ ] Jag förstår att jag själv väljer om jag ger återkoppling, och vad det innebär. **(Obligatorisk)**
- [ ] Jag godkänner att projektägaren får kontakta mig vid uppföljande frågor. **(Valfri)**

Knapp: *"Godkänn och fortsätt"*. Aktiveras endast när båda obligatoriska är ikryssade.

Vid klick: skriv `ConsentState` till Firestore med rätt värden, redirect till `/ny`.

### 1.3 Kontroll i frontend

Uppdatera `web/components/ExamDesignApp.tsx` så att inloggad användare:

1. Kollas mot `/users/{uid}/consent/current` direkt efter login
2. Om dokument saknas eller `consentVersion < CURRENT_CONSENT_VERSION`: redirect till `/samtycke`
3. Om dokument finns och version är aktuell: visa formuläret/historiken som vanligt

Den existerande footer-länken `[Återkoppling](mailto:KONTAKT)` ändras till `[Datahantering](/samtycke)` för inloggade användare så de kan se sina samtyckesval i framtiden (för version 1 räcker att redirect sker — användarens nuvarande val visas på samtyckessidan om den besöks medan version stämmer).

### 1.4 Server-side kontroll

I `functions/src/index.ts`, lägg till en hjälpfunktion:

```ts
async function verifyConsent(uid: string): Promise<void> {
  const doc = await db.doc(`users/${uid}/consent/current`).get();
  if (!doc.exists) {
    throw new HttpsError("failed-precondition", "Samtycke krävs");
  }
  const data = doc.data() as ConsentState;
  if (!data.telemetryAccepted || !data.feedbackInformedAccepted) {
    throw new HttpsError("failed-precondition", "Samtycke krävs");
  }
  if (data.consentVersion < CURRENT_CONSENT_VERSION) {
    throw new HttpsError("failed-precondition", "Förnyat samtycke krävs");
  }
}
```

Anropa `verifyConsent(context.auth.uid)` i början av `generateExamDesign` (efter auth-kontrollen, före input-validering). Anropa även i `submitFeedback` när den byggs.

### 1.5 Firestore-regler

Uppdatera `firestore.rules` så consent-subkollektionen täcks:

```
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;

  match /designs/{designId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }

  match /consent/{consentId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

---

## Del 2: Telemetri

### 2.1 Datamodell

Lägg till en `telemetry`-toppkollektion. Varje post:

```ts
{
  timestamp: Timestamp,
  uidHash: string,           // SHA-256(uid + TELEMETRY_SALT), första 16 tecken
  function: "generateExamDesign" | "submitFeedback",
  model: string,
  latencyMs: number,
  tokensInput: number,
  tokensOutput: number,
  estimatedCostUsd: number,
  schemaValidationPassed: boolean,
  httpStatus: number,
  errorType: string | null
}
```

### 2.2 Hjälpmodul

Skapa `functions/src/telemetry.ts`:

```ts
import { createHash } from "crypto";
import { defineSecret } from "firebase-functions/params";

const TELEMETRY_SALT = defineSecret("TELEMETRY_SALT");

export function hashUid(uid: string): string {
  const salt = TELEMETRY_SALT.value();
  if (!salt) throw new Error("TELEMETRY_SALT inte satt");
  return createHash("sha256").update(uid + salt).digest("hex").slice(0, 16);
}

// Priser per miljon tokens, april 2026
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 2.50, output: 15.00 },
  "gpt-5.4-mini": { input: 0.25, output: 2.00 },
  "gpt-5.4-nano": { input: 0.05, output: 0.40 },
  // Lägg till fler vid behov
};

export function estimateCostUsd(model: string, tokensInput: number, tokensOutput: number): number {
  const prices = MODEL_PRICES[model];
  if (!prices) return 0;
  const cost = (tokensInput / 1_000_000) * prices.input + (tokensOutput / 1_000_000) * prices.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export type TelemetryRecord = {
  timestamp: FirebaseFirestore.FieldValue;
  uidHash: string;
  function: "generateExamDesign" | "submitFeedback";
  model: string;
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostUsd: number;
  schemaValidationPassed: boolean;
  httpStatus: number;
  errorType: string | null;
};

export async function writeTelemetry(
  db: FirebaseFirestore.Firestore,
  record: Omit<TelemetryRecord, "timestamp">
): Promise<void> {
  await db.collection("telemetry").add({
    ...record,
    timestamp: FieldValue.serverTimestamp(),
  });
}
```

### 2.3 Integrera i `generateExamDesign`

Mät `Date.now()` före och efter OpenAI-anropet. Vid lyckat anrop:

```ts
await writeTelemetry(db, {
  uidHash: hashUid(context.auth.uid),
  function: "generateExamDesign",
  model: modelUsed,
  latencyMs: Date.now() - startTime,
  tokensInput: response.usage.input_tokens,
  tokensOutput: response.usage.output_tokens,
  estimatedCostUsd: estimateCostUsd(modelUsed, response.usage.input_tokens, response.usage.output_tokens),
  schemaValidationPassed: true,
  httpStatus: 200,
  errorType: null,
});
```

Vid fel: skriv telemetri ändå, med `httpStatus` från felet (400/500/etc) och `errorType` med kort kategori (`validation_error`, `openai_error`, `schema_mismatch`, `consent_missing`, etc). **Logga aldrig input eller output.**

Bind `TELEMETRY_SALT` till funktionen via `secrets`-arrayen.

### 2.4 Firestore-regler

Telemetri ska aldrig läsas av klienter:

```
match /telemetry/{doc} {
  allow read, write: if false;
}
```

Cloud Functions skriver via Admin SDK som kringgår reglerna.

---

## Del 3: Återkoppling

### 3.1 Callable function `submitFeedback`

Skapa `functions/src/feedback.ts`. Funktionen tar:

```ts
{
  designId: string;
  overall: {
    usefulness: 1 | 2 | 3 | 4 | 5;
    freetext: string;  // max 2000 tecken
  };
  dimensions: {
    product: DimensionFeedback | null;
    process: DimensionFeedback | null;
    agency: DimensionFeedback | null;
  };
  pitfallsIdentified: Array<
    "pseudo_agens" | "dokumentationsfetisch" | "vardering" |
    "taxonomi_dominans" | "pseudo_autenticitet" | "triptyk_tvang" | "annan"
  >;
  pitfallsOther: string;        // max 500 tecken
  editsBeforeUse: string;        // max 2000 tecken
  wouldUseAs: "som_ar" | "mindre_just" | "stora_just" | "nej";
  contactConsent: boolean;
}

type DimensionFeedback = {
  levelReasonable: boolean | null;
  inferenceBears: boolean | null;
  comment: string;  // max 1000 tecken
};
```

Logik:
1. Verifiera auth.
2. Verifiera samtycke via `verifyConsent`.
3. Validera input med Zod (samma scheman som ovan).
4. Hämta `/users/{uid}/designs/{designId}` — verifiera att den tillhör användaren. Om inte: kasta `permission-denied`.
5. Spara till `/feedback/{autoId}`:

```ts
{
  timestamp: FieldValue.serverTimestamp(),
  uidHash: hashUid(context.auth.uid),
  designId,
  designSnapshot: <hela design-dokumentet — input + output>,
  feedback: <hela inputen ovan>,
  contactUid: contactConsent ? context.auth.uid : null,
}
```

`contactUid` används bara om användaren explicit gett kontaktsamtycke — annars `null`. Detta är vad som möjliggör pseudonymisering med opt-in återidentifiering.

6. Skriv telemetri (function: `"submitFeedback"`, model: `"n/a"`, tokens: 0, cost: 0).

Exportera funktionen från `index.ts`. Bind `TELEMETRY_SALT` till den.

### 3.2 Frontend-formulär

På `web/components/ResultView.tsx` (där designförslagen visas):

- Lägg till en knapp *"Ge återkoppling"* synlig hela tiden, väl placerad (t.ex. längst ned eller fixed nere till höger).
- Efter 3 minuter på sidan: visa en diskret påminnelse *"Vill du hjälpa till att förbättra verktyget? Ge kort återkoppling."* (t.ex. som en toast eller en mjuk banner).
- Klick öppnar formulär — antingen inline-expandering eller modal.

Formuläret har dessa fält:

**Helhet**
- Stjärnvärdering 1–5: *"Är detta designförslag användbart i din kurs?"*
- Textarea: *"Kommentar (valfritt)"*

**Per inkluderad dimension** (visa bara dimensioner som faktiskt finns i designen):
- För process och agens: *"Är föreslagen nivå rimlig?"* — Ja / Nej / Vet ej
- *"Bär den föreslagna evidensen det som ska bedömas?"* — Ja / Nej / Vet ej
- Textarea: *"Kommentar"*

**Identifierade fallgropar** (multi-select-checkboxar):
- Pseudo-agens (reflektion utan val)
- Dokumentationsfetisch (mängd istället för kvalitet)
- Värderingsglidning (bedömer person, inte handling)
- Taxonomi-dominans (Bloom/SOLO används där det inte hör hemma)
- Pseudo-autenticitet (autentisk uppgift utan autentiskt bedömningsfokus)
- Triptyk-tvång (alla tre dimensioner pressas in onödigt)
- Annan (öppnar textfält)

**Användning**
- *"Vad skulle du ändra innan du gav uppgiften till studenter?"* — textarea
- *"Skulle du använda förslaget?"* — radio: som det är / med mindre justeringar / med stora justeringar / nej

**Forskning**
- Checkbox: *"Får vi kontakta dig för uppföljningsintervju?"* (bara synlig om användaren *inte* redan gett kontaktsamtycke)

Submit-knapp anropar `submitFeedback`. Visa bekräftelse vid lyckat svar. Visa felmeddelande vid fel.

### 3.3 Firestore-regler

Feedback skrivs via Cloud Functions, läses bara av admin via callable:

```
match /feedback/{doc} {
  allow read, write: if false;
}
```

---

## Del 4: Admin-vy

### 4.1 Callable function `exportFeedback`

Skapa `functions/src/admin.ts`:

```ts
export const exportFeedback = onCall(
  { region: "europe-west1", secrets: [OWNER_UID] },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login krävs");
    if (request.auth.uid !== OWNER_UID.value()) {
      throw new HttpsError("permission-denied", "Endast ägare");
    }

    const { format = "json", filters = {} } = request.data;

    let query = db.collection("feedback") as FirebaseFirestore.Query;

    // Tillämpa filter
    if (filters.fromDate) query = query.where("timestamp", ">=", new Date(filters.fromDate));
    if (filters.toDate) query = query.where("timestamp", "<=", new Date(filters.toDate));
    if (filters.minUsefulness) query = query.where("feedback.overall.usefulness", ">=", filters.minUsefulness);

    const snapshot = await query.get();
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Klient-side filter för det som inte går att indexera lätt
    let filtered = records;
    if (filters.pitfall) {
      filtered = filtered.filter((r: any) =>
        r.feedback?.pitfallsIdentified?.includes(filters.pitfall)
      );
    }
    if (filters.wouldUseAs) {
      filtered = filtered.filter((r: any) =>
        r.feedback?.wouldUseAs === filters.wouldUseAs
      );
    }

    if (format === "csv") {
      return { format: "csv", content: toCsv(filtered) };
    }
    return { format: "json", content: JSON.stringify(filtered, null, 2) };
  }
);
```

Bind `OWNER_UID` till funktionen.

### 4.2 Admin-sida

Skapa `web/app/admin/page.tsx`. Sidan ska:

- Kontrollera client-side att inloggad användares UID matchar (lägg en publik konfig eller hårdkoda inte — kalla en separat callable `isAdmin` som returnerar boolean baserat på OWNER_UID-jämförelse server-side).
- Om ej admin: redirect till `/ny`.
- Hämta aggregat från Firestore (kan göras direkt via Firestore SDK om reglerna tillåter ägaren — alternativt en callable `getAdminStats`).

Layout:

**Dashboard-panel** (fyra kort):
- Totalt antal designs (count från `/users/*/designs/*` — kan kräva en counter eller en samlad query)
- Totalt antal feedback-poster (count från `/feedback`)
- Senaste 7 dagarnas aktivitet (graf eller bara siffra)
- Snitt-betyg på `usefulness`

**Aggregerad fördelning** (två stapeldiagram eller listor):
- Fördelning över betyg 1–5
- Fördelning över identifierade fallgropar (vilka är vanligast?)

**Feedback-lista** (tabell):
- Kolumner: timestamp, designId (klickbar), usefulness, wouldUseAs, fallgropar (taggar), kort utdrag från `editsBeforeUse`
- Sortering: per kolumn
- Filter: per fallgrop, per `wouldUseAs`, per usefulness-intervall, per datumintervall

**Detaljvy**: klick på rad öppnar modal eller separat sida med hela `designSnapshot` + hela återkopplingen.

**Exportknapp**: anropar `exportFeedback` med aktiva filter, returnerar fil för nedladdning. Knappar för JSON och CSV separat.

### 4.3 Behövs en admin-länk i navigationen?

Ja — för OWNER_UID. Lägg till länken `/admin` i den inloggade navigationen *endast* om användaren är admin. Använd resultatet från `isAdmin`-anropet.

För andra användare ska länken inte synas (säkerhet vilar inte på UI-döljning, men det är ren UX).

### 4.4 Firestore-regler

Inga ändringar — feedback läses bara via Cloud Functions, telemetri likaså.

---

## Del 5: Estimated cost

Hanterad i Del 2 (Telemetri). Inga separata steg.

---

## Sammanfattning av filer

**Nya filer:**

- `web/app/samtycke/page.tsx`
- `web/app/admin/page.tsx`
- `web/components/ConsentForm.tsx`
- `web/components/FeedbackForm.tsx`
- `web/components/AdminDashboard.tsx`
- `functions/src/telemetry.ts`
- `functions/src/feedback.ts`
- `functions/src/admin.ts`

**Modifierade filer:**

- `web/lib/types.ts` (lägg till ConsentState, CURRENT_CONSENT_VERSION, FeedbackInput)
- `web/lib/uiMicrotexts.ts` (uppdatera samtyckestexten ordagrant enligt 1.2)
- `web/components/ExamDesignApp.tsx` (lägg till samtyckes- och admin-kontroller, lägg till villkorlig admin-länk)
- `web/components/ResultView.tsx` (lägg till feedback-knapp och 3-min-påminnelse)
- `web/app/layout.tsx` (uppdatera footer-länken)
- `functions/src/index.ts` (importera och anropa verifyConsent, exportera nya callables, bind nya secrets)
- `firestore.rules` (lägg till consent-regel, telemetri-regel, feedback-regel)

## Checkpoints — pausa och rapportera

Pausa och fråga användaren mellan dessa steg, för validering:

1. **Efter Del 1** (samtycke fungerar) — be användaren testa flödet i emulator, sätta TELEMETRY_SALT, deploya.
2. **Efter Del 2** (telemetri skrivs) — be användaren verifiera i Firestore Console att telemetri-poster dyker upp.
3. **Efter Del 3** (feedback fungerar) — be användaren testa hela feedbackflödet end-to-end.
4. **Efter Del 4** (admin fungerar) — be användaren sätta OWNER_UID och testa admin-vyn.

## Saker du INTE ska göra

- Inte ändra något i `/prompts/core/`.
- Inte logga input eller output i telemetri.
- Inte spara `contactUid` om `contactConsent` är false.
- Inte exponera OWNER_UID i frontend-koden.
- Inte glömma att bind:a TELEMETRY_SALT till alla funktioner som anropar `hashUid()`.
- Inte hoppa över Zod-validering på någon nytillagd input.
- Inte lägga till tredjepartsanalytics av något slag (Sentry, GA, Plausible, etc) utan att fråga.

## När du är klar

Rapportera:
- URL till deploy:ad app
- Lista över committade filer (kort)
- Vilka secrets som behövde sättas och om alla är på plats
- Eventuella avvikelser från briefen och varför
- Påminn användaren om:
  1. Att sätta TELEMETRY_SALT (om inte gjort)
  2. Att hämta sitt UID från Firebase Console och sätta OWNER_UID (om inte gjort)
  3. Att gå igenom samtyckesflödet själv för sin egen användare
  4. Att besöka `/admin` när feedback börjat komma in

Kör igång.
