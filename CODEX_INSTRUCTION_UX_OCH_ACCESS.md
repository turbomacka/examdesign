# CODEX_INSTRUCTION_UX_OCH_ACCESS.md

**Till Codex:** Fem sammanhängande åtgärder. Gör dem i ordningen nedan. Pausa och fråga vid märkt checkpoint.

---

## Del 1: Tooltip-renderingsbug

**Problem:** Tooltips fadas bort eller hamnar bakom andra lager så de blir delvis oläsbara.

**Orsak:** Klassiskt stacking context-problem — tooltips renderas inom parent-element vars `overflow`, `position` eller `transform` skapar begränsande kontext.

**Lösning:** Rendera tooltips via React portal till `document.body`, inte inline i parent-trädet. Använd Radix UI Popover eller Floating UI om något redan är installerat; annars installera `@radix-ui/react-popover` och använd det.

**Krav:**
- Tooltipen ska alltid ligga över allt annat innehåll oavsett parent-element
- Z-index ska sättas globalt (via portal), inte relativt parent
- Animationer (fade in/out) är okej men ska inte skapa perioder av halvläsbarhet — använd `opacity: 0 → 1` på fulla 100%, inte 70%
- Tooltipen ska vara tangentbordsåtkomlig (focus-trigger, Esc stänger)
- Skugga/border tillräckligt för att tydligt avgränsa tooltipen från bakgrunden

Säkerställ att lösningen tillämpas **överallt** där tooltips finns — i `DesignForm.tsx`, `ResultView.tsx` och eventuellt andra ställen.

---

## Del 2: Formulering av feedbackfråga

**Problem:** Frågan *"Bär den föreslagna evidensen det som ska bedömas?"* är för abstrakt och svårbegriplig för användare utan pedagogisk utbildning.

**Ändring:** Ersätt frågan med: *"Räcker underlagen för att göra den bedömning som föreslås?"*

**Platser:** Samtliga tre dimensioner (produkt, process, agens) i feedbackformuläret.

**Tooltip på frågan** (ny `(?)`-ikon):

> Exempel: Om förslaget säger att studentens agens ska bedömas — finns det faktiskt något i de föreslagna underlagen som visar studentens val och motiveringar? Eller bedömer underlagen egentligen något annat?

**Backend-typdefinition:** Fältet heter fortsatt `inferenceBears` i `DimensionFeedback`-typen. Ändra inte fältnamnet — bara UI-texten. Detta så att tidigare insamlad data fortsatt är kompatibel.

---

## Del 3: Förklaringar till fallgroparna

**Problem:** "Identifierade fallgropar"-checkboxarna har etiketter som kräver förkunskap för att förstå.

**Lösning:** Lägg till en kort förklaring för varje fallgrop. Placera som **hjälptext under checkbox-etiketten** (mindre font, något mjukare färg, t.ex. `text-sm text-gray-600`). Detta är mer självförklarande än en tooltip — användaren ska inte behöva klicka för att förstå grundläggande begrepp.

**Texter (kopiera ordagrant):**

### Pseudo-agens
**Etikett:** Pseudo-agens
**Hjälptext:** Uppgiften ber studenten reflektera men kräver inga verkliga val. "Reflektera över ditt lärande" bedömer inte agens om det inte finns genuina alternativ att välja mellan eller prioriteringar att motivera.

### Dokumentationsfetisch
**Etikett:** Dokumentationsfetisch
**Hjälptext:** Uppgiften mäter mängd istället för kvalitet. Antal utkast eller mängd kommentarer säger inget om hur väl studenten faktiskt utvecklat sitt arbete.

### Värderingsglidning
**Etikett:** Värderingsglidning
**Hjälptext:** Kriterierna bedömer personliga egenskaper istället för kunnande. "Visar engagemang" eller "är ansvarstagande" beskriver karaktär, inte prestationer.

### Taxonomi-dominans
**Etikett:** Taxonomi-dominans
**Hjälptext:** Bloom och SOLO används där de inte hör hemma. Taxonomierna är bra för produktdimensionen men fångar inte processens kvalitetspraktiker eller agensens handlingsutrymme.

### Pseudo-autenticitet
**Etikett:** Pseudo-autenticitet
**Hjälptext:** Uppgiften är "verklig" men bedömningen är inte. En fallstudie eller autentisk uppdragsform förlorar sin pedagogiska poäng om bara den färdiga produkten bedöms, utan krav på val och omarbetning under osäkerhet.

### Triptyk-tvång
**Etikett:** Triptyk-tvång
**Hjälptext:** Alla tre dimensioner pressas in i samma uppgift. Ramverket fungerar ofta bäst när olika examinationer i en kurs bär olika dimensioner — inte när varje uppgift ska bära allt.

### Annan
**Etikett:** Annan
**Hjälptext:** Något annat problem som inte fångas av kategorierna ovan. Beskriv i fritextfältet nedan.

Layoutmässigt bör varje checkbox-rad se ut ungefär så här:

```
☐ Pseudo-agens
  Uppgiften ber studenten reflektera men kräver inga verkliga val...
```

med checkbox, etikett (normal vikt, kanske semi-bold) och hjälptext (mindre, mjukare).

### 🛑 CHECKPOINT efter Del 1–3

Pausa här. Rapportera till användaren att tooltip-bugen, formuleringen och fallgropsförklaringarna är klara. Be om verifiering innan du går vidare till Del 4.

---

## Del 4: Accesskontroll via allowlist

**Problem:** Just nu kan vem som helst med Google-konto logga in och använda appen. Det behövs en mekanism för att begränsa access till inbjudna användare.

**Lösning:** Email-allowlist i Firestore + enkel invite-code-mekanism för flexibilitet.

### 4.1 Datamodell

Skapa kollektion `/accessControl`:

```
/accessControl/allowedEmails/{emailDocId}
  email: string (lowercase)
  addedAt: Timestamp
  addedBy: string (uid eller "admin")
  note: string (valfri anteckning)

/accessControl/inviteCodes/{codeId}
  code: string (unik)
  createdAt: Timestamp
  usedAt: Timestamp | null
  usedBy: string | null (uid)
  maxUses: number (default 1)
  useCount: number (default 0)
  expiresAt: Timestamp | null
  note: string (valfri)
```

`emailDocId` är email-adressen lowercase med `@` ersatt av `_at_` och `.` ersatt av `_` (så att email-strängen kan användas som dokument-ID). Eller: använd Firestore auto-ID och indexera `email`-fältet. Välj det som blir renast — dokumentera valet i kod.

### 4.2 Callable function: `checkAccess`

Skapa `functions/src/access.ts` och en callable `checkAccess`:

```ts
export const checkAccess = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      return { allowed: false, reason: "not_authenticated" };
    }

    const email = request.auth.token.email?.toLowerCase();
    if (!email) {
      return { allowed: false, reason: "no_email" };
    }

    // Kolla allowlist
    const allowlistQuery = await db
      .collection("accessControl")
      .doc("allowedEmails")
      .collection("emails")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!allowlistQuery.empty) {
      return { allowed: true };
    }

    return { allowed: false, reason: "not_on_allowlist" };
  }
);
```

### 4.3 Callable function: `redeemInviteCode`

```ts
export const redeemInviteCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login krävs");
    }

    const { code } = request.data;
    if (!code || typeof code !== "string") {
      throw new HttpsError("invalid-argument", "Kod saknas");
    }

    const email = request.auth.token.email?.toLowerCase();
    if (!email) {
      throw new HttpsError("failed-precondition", "Email saknas i token");
    }

    return await db.runTransaction(async (tx) => {
      const codeQuery = await tx.get(
        db.collection("accessControl").doc("inviteCodes")
          .collection("codes").where("code", "==", code).limit(1)
      );

      if (codeQuery.empty) {
        throw new HttpsError("not-found", "Ogiltig kod");
      }

      const codeDoc = codeQuery.docs[0];
      const data = codeDoc.data();

      // Kontroller
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        throw new HttpsError("failed-precondition", "Koden har gått ut");
      }
      if (data.useCount >= data.maxUses) {
        throw new HttpsError("failed-precondition", "Koden är förbrukad");
      }

      // Lägg till email i allowlist
      const emailDoc = db
        .collection("accessControl").doc("allowedEmails")
        .collection("emails").doc();
      tx.set(emailDoc, {
        email,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: request.auth.uid,
        note: `Via invite-kod ${code.substring(0, 4)}...`,
      });

      // Uppdatera code-dokument
      tx.update(codeDoc.ref, {
        useCount: data.useCount + 1,
        usedAt: FieldValue.serverTimestamp(),
        usedBy: request.auth.uid,
      });

      return { success: true };
    });
  }
);
```

### 4.4 Server-side kontroll i befintliga funktioner

I `generateExamDesign` och `submitFeedback`: efter auth-kontroll och *före* samtyckeskontroll, lägg in:

```ts
async function verifyAccess(email: string | undefined): Promise<void> {
  if (!email) throw new HttpsError("permission-denied", "Ingen access");

  const query = await db.collection("accessControl")
    .doc("allowedEmails").collection("emails")
    .where("email", "==", email.toLowerCase())
    .limit(1).get();

  if (query.empty) {
    throw new HttpsError("permission-denied", "Inte på allowlist");
  }
}
```

Och anropa `await verifyAccess(context.auth.token.email)` i båda funktioner.

### 4.5 Frontend-flöde

**Ny sida:** `web/app/access/page.tsx`

Visas när en inloggad användare inte är på allowlist. Innehåll:

> **Begränsad testfas**
>
> Verktyget är en prototyp under utveckling och är i begränsad testfas. För att få tillgång behöver du antingen vara tillagd av projektansvarig eller ha fått en inbjudningskod.
>
> Har du en inbjudningskod? Ange den nedan.
>
> [ textfält för kod ]
> [ knapp: "Lös in kod" ]
>
> Saknar du kod? Kontakta projektansvarig för inbjudan.
>
> [ knapp: "Logga ut" ]

Inloggning med Google fungerar som vanligt. Efter lyckad inloggning görs `checkAccess`-anrop:
- Om `allowed: true` → fortsätt till samtyckessidan (om inte redan samtyckt) eller huvudsidan
- Om `allowed: false` → redirect till `/access`

Flödet blir alltså: **Login → Access-check → Samtycke → Appen**.

Vid lyckad inlösning av kod: återkalla `checkAccess`, vid `allowed: true` fortsätt till samtyckessidan.

### 4.6 Uppdatera `ExamDesignApp.tsx`

Lägg till access-check efter login, före consent-check. Ordningen blir:

```
isLoggedIn?
  no  → visa login
  yes → checkAccess
    allowed?
      no  → redirect /access
      yes → hasConsent?
              no  → redirect /samtycke
              yes → visa app
```

### 4.7 Firestore-regler

Lägg till:

```
match /accessControl/{docId}/{subcol}/{subdoc} {
  allow read, write: if false;   // Hanteras bara via Cloud Functions
}
```

### 4.8 Seeda första allowlist-entry

Skapa ett litet admin-script som användaren kan köra en gång: `functions/scripts/seedAccess.ts`:

```ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Body som skriver en email till allowlist
async function seed(email: string) {
  const app = initializeApp();
  const db = getFirestore();
  await db.collection("accessControl")
    .doc("allowedEmails").collection("emails").add({
      email: email.toLowerCase(),
      addedAt: FieldValue.serverTimestamp(),
      addedBy: "seed",
      note: "Initial seed",
    });
  console.log(`Lade till ${email} i allowlist`);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: ts-node seedAccess.ts <email>");
  process.exit(1);
}
seed(email).then(() => process.exit(0));
```

**Alternativ till script:** Dokumentera i briefens rapport att användaren kan lägga till sig själv via Firebase Console manuellt. Det är mindre elegant men fungerar perfekt för första gången.

### 4.9 Invite-koder: administration

För första versionen: användaren lägger till koder manuellt i Firebase Console. Fältformat:

```
{
  code: "PROTO-2026-ABC123",
  createdAt: <timestamp nu>,
  usedAt: null,
  usedBy: null,
  maxUses: 1,
  useCount: 0,
  expiresAt: null,
  note: "Till kollega X"
}
```

Dokumentera detta i rapporten. En framtida admin-vy kan hantera koder via UI, men det är inte nödvändigt nu.

### 🛑 CHECKPOINT efter Del 4

Pausa. Rapportera:
- Vad som byggts
- Påminn användaren att antingen köra seed-scriptet eller lägga till sin egen email manuellt i Firestore via Console
- Be användaren verifiera att access-flödet fungerar end-to-end innan Del 5

---

## Del 5: Ta bort institutionsreferenser från allt

**Mål:** Inga explicita institutionsreferenser någonstans i kodbas, användargränssnitt eller metadata.

**Sökning:** Kör grep på hela projektet för tidigare institutionsnamn, vanliga stavningsvarianter och förkortningar.

Gör detta case-insensitivt över hela repot, inklusive:
- Alla `.ts`, `.tsx`, `.md`, `.json`, `.html`, `.css`-filer
- README-filer
- package.json (t.ex. `author`-fält)
- Kommentarer i kod
- Markdown-filer i `/prompts/` (core, examples, references, README)
- Innehåll i `about.md` och `uiMicrotexts.ts`

**Ersättningsstrategi:** Neutral — inga institutionsnamn, inga personnamn. Använd ord som:
- "prototyp"
- "verktyg under utveckling"
- "privat forskningsprojekt"
- "experimentell prototyp"

**Specifika texter att uppdatera:**

### about.md — Inledning i "Vad verktyget gör"

Ursprunglig text nämner ingen institution direkt här — kontrollera ändå.

### about.md — Sektion "Forskningskontext"

Ersätt nuvarande text med följande ordagrant:

> Verktyget utvecklas som ett privat forskningsprojekt om hur pedagogisk expertis kan översättas till AI-verktyg som stödjer — snarare än ersätter — lärarens omdöme. Verktyget är inte en officiell tjänst från något lärosäte.
>
> Återkoppling från användare bidrar både till verktygets kalibrering och till empiriskt underlag för projektets frågor om hur sådana verktyg behöver konstrueras för att vara pedagogiskt användbara.

### about.md — Sektion "Begränsningar"

Kolla att inga institutionsreferenser finns. Om raden om "lärosätesspecifika förhållanden" nämner en specifik institution - behåll poängen men ta bort institutionsnamnet. Neutralt språk räcker.

### about.md — slutkommentar

Ersätt nuvarande författarrad med:

> *Senast uppdaterad: [DATUM]*

(alltså: ta bort hela författarraden — den tillför inget viktigt i en neutral prototyp)

### uiMicrotexts.ts — samtyckestextens inledning

Ersätt eventuell institutionsbunden inledning med:

> "Verktyget är en prototyp under utveckling."

### Footer-text

Ersätt den befintliga footer-texten med:

> Examdesign är en prototyp under utveckling. [Om verktyget](/om) · [Datahantering](/samtycke)

(Inga institutionsnamn, ingen kontakt-email — det ligger redan i om-sidan om användaren vill nå projektet.)

### package.json

Uppdatera `author`-fält (om det finns) till tomt eller generiskt. Ta bort eventuell `organization`-referens.

### README-filer

Ta bort alla institutionsnamn. Om README.md i projektroten har en sektion "Licens och upphovsrätt" som nämner en institution - ersätt med:

> Ramverket produkt–process–agens och tillhörande operationalisering: © upphovsmannen. Kod: se LICENSE-fil.

### Markdown-filer i /prompts/

Kolla framförallt:
- `prompts/README.md`
- `prompts/examples/README.md`
- `prompts/references/README.md`
- Eventuella frontmatter-block i core-filerna

Ta bort institutionsreferenser. Promptens kärninnehåll påverkas inte — det handlar om metadata och README-kommentarer.

### Eventuell ny text om prototyp-status

Om projekt-root-README har ingress: lägg till kort statustext:

> Detta är ett privat forskningsprojekt under utveckling. Inte en officiell tjänst från något lärosäte. Används under eget ansvar.

### Sökgenomgång — rapport

Efter att alla ersättningar är gjorda, kör om grep en sista gång och rapportera:
- Antal träffar före
- Antal träffar efter (ska vara 0)
- Lista över alla filer som modifierats

Om någon träff kvarstår: identifiera varför (är det i en genererad fil? en commit-hash? dokumenterat citat från en referens?) och rapportera hur det hanterades.

### 🛑 Viktigt undantag

I promptfilerna `/prompts/core/*.md` finns referenser till akademisk litteratur som Biesta, Biggs, O'Donovan m.fl. Dessa ska INTE tas bort — det är citerade forskningsreferenser, inte institutionstillhörighet. Kolla extra noga så inte grep missuppfattar.

---

## Slutkontroller

Efter alla fem delar:

1. Kör `npm run build` i både `/web` och `/functions` — inga fel.
2. Kör `firebase emulators:start` och testa hela flödet: inloggning → access-check → samtycke → formulär → resultat → feedback.
3. Verifiera att tooltips renderas korrekt överallt.
4. Verifiera att inga institutionsreferenser syns i UI eller kod.

## När du är klar

Rapportera:
- URL till deployad app
- Sammanställning per del (gjort / delvis / problem)
- Antal filer modifierade totalt
- Eventuella avvikelser och varför
- Påminn användaren om att:
  1. Lägga till sin egen email i allowlist om inte gjort
  2. Skapa invite-koder i Firestore Console för de första testanvändarna
  3. Uppdatera datumstämpeln i `about.md`
  4. Verifiera att det inte finns några institutionsreferenser kvar i delar hen kan se

Kör igång.
