# SETUP.md

Steg-för-steg-instruktioner för att sätta upp Firebase-backend. Följ i ordning. Punkter markerade **[KONSOL]** kräver webbläsare — resten kan Codex göra.

---

## Steg 1: Firebase-projekt **[KONSOL]**

1. Gå till https://console.firebase.google.com
2. Klicka *Lägg till projekt* / *Add project*
3. Projektnamn: `examdesign` (eller motsvarande)
4. **Stäng av Google Analytics** — inte relevant för denna app
5. Vänta tills projektet skapas
6. **Notera Project ID** (visas under projektnamnet, t.ex. `examdesign-a1b2c`)

## Steg 2: Uppgradera till Blaze-plan **[KONSOL]**

Cloud Functions v2 kräver Blaze-plan (pay-as-you-go). Förväntad månadskostnad för detta projekt: under 50 kr om du inte delar appen brett.

1. Nere till vänster i Firebase Console: klicka på plan-indikatorn (`Spark`)
2. Klicka *Upgrade to Blaze*
3. Välj/skapa Cloud Billing-konto (kort krävs)
4. Sätt budget-alert:
   - I samma flöde eller senare via https://console.cloud.google.com/billing
   - Belopp: `50 SEK`
   - Alerts vid 50%, 90%, 100% av budget

## Steg 3: Aktivera Firebase-tjänster **[KONSOL]**

I Firebase Console, välj ditt projekt:

### 3a. Firestore
1. Vänstermeny → *Build* → *Firestore Database*
2. Klicka *Create database*
3. Location: **`eur3 (europe-west)`** — detta går inte att ändra efteråt
4. Välj *Production mode* (vi lägger till regler via deploy senare)

### 3b. Authentication
1. Vänstermeny → *Build* → *Authentication*
2. Klicka *Get started*
3. Under *Sign-in method*: aktivera **Google**
4. Sätt project support email (din egen)

### 3c. Cloud Functions
1. Vänstermeny → *Build* → *Functions*
2. Klicka *Get started* (aktiverar Cloud Functions API)

## Steg 4: Aktivera Secret Manager API **[KONSOL]**

Detta är separat och måste göras via Google Cloud Console:

1. Gå till https://console.cloud.google.com/apis/library/secretmanager.googleapis.com
2. Välj ditt projekt uppe till vänster (samma projekt-ID som Firebase)
3. Klicka *Enable*
4. Vänta tills aktiveringen är klar (30–60 sekunder)

## Steg 5: Skaffa OpenAI-nyckel **[KONSOL]**

1. Gå till https://platform.openai.com/api-keys
2. *Create new secret key*
   - Name: `examdesign`
   - Permissions: välj *Restricted* och tillåt enbart `/v1/responses` och `/v1/chat/completions`
3. **Kopiera nyckeln direkt** (visas bara en gång)
4. Spara temporärt någonstans säkert — du matar in den i steg 8
5. Sätt usage limits: https://platform.openai.com/account/limits
   - Soft limit: 15 USD
   - Hard limit: 20 USD (höj vid behov)

## Steg 6: Installera Firebase CLI **[POWERSHELL]**

Kör i VS Code-terminalen (PowerShell):

```powershell
# Kontrollera Node-version (ska vara 20+)
node --version

# Om Node saknas eller är för gammal:
winget install OpenJS.NodeJS.LTS

# Installera Firebase CLI globalt
npm install -g firebase-tools

# Verifiera installation
firebase --version
```

## Steg 7: Logga in **[POWERSHELL]**

```powershell
# Logga in — öppnar webbläsaren
firebase login

# Verifiera att ditt projekt syns
firebase projects:list

# Gå in i projektmappen (om du inte redan är där)
cd D:\projekt\examdesign
```

Projektkopplingen (`.firebaserc`) skapas senare av Codex som del av `firebase init`. Du behöver inte köra `firebase use` manuellt.

## Steg 8: Låt Codex ta över

Öppna Codex i VS Code (pekad på `D:\projekt\examdesign`) och ge den `AGENT_BRIEF.md` som uppdrag.

Codex kommer pausa och be om:
- **OpenAI API-nyckel** när den kör `firebase functions:secrets:set OPENAI_API_KEY` — klistra in nyckeln från steg 5.
- **TELEMETRY_SALT** — generera ett GUID i PowerShell:
  ```powershell
  [System.Guid]::NewGuid().ToString()
  ```
  Klistra in när Codex kör `firebase functions:secrets:set TELEMETRY_SALT`. Spara också värdet privat — om du byter det senare blir tidigare hashad telemetri omöjlig att korrelera.
- Eventuella designbeslut den vill ha godkända innan implementation.

## Steg 9: Första deploy + aktivera admin-vyn

Efter första deploy — innan admin-vyn fungerar:

1. Besök appens URL och logga in med Google första gången.
2. Gå till Firebase Console → *Authentication* → *Users*.
3. Hitta din egen rad och kopiera *User UID* (lång sträng).
4. Sätt det som secret:
   ```powershell
   firebase functions:secrets:set OWNER_UID
   # klistra in UID:t när prompten kommer
   ```
5. Deploya om funktionerna:
   ```powershell
   firebase deploy --only functions
   ```
6. Nu ska `/admin` vara tillgänglig när du är inloggad.

## Steg 10: Verifiera deploy

När Codex meddelar att deploy är klar:

1. Besök URL:en (t.ex. `https://DITT-PROJECT-ID.web.app`)
2. Logga in med Google
3. Fyll i ett testformulär med ett verkligt lärandemål
4. Verifiera att ett designförslag returneras
5. Verifiera att det syns under Historik

## Felsökning

### "Secret Manager API has not been used..."
Steg 4 är inte gjort eller inte aktiverat för rätt projekt. Kontrollera projekt-ID.

### "Permission denied on Firestore"
Reglerna i `firestore.rules` är inte deployade. Kör:
```powershell
firebase deploy --only firestore:rules
```

### "Function failed with INTERNAL"
Kontrollera funktionsloggar:
```powershell
firebase functions:log
```
Vanligaste orsaken: OpenAI-nyckel inte satt eller inte bundlad till funktionen.

### Cold start tar 10+ sekunder
Normalt för första anropet efter inaktivitet (Cloud Functions v2 = Cloud Run bakom kulisserna). Inget att oroa sig för om det inte är ett användningsproblem. Kan lösas med `minInstances: 1` men det kostar pengar.

### Cost spiking
Kolla OpenAI usage först (https://platform.openai.com/usage), sedan Firebase billing. Cloud Functions kostar nästan inget; OpenAI kan kosta om någon abuseloopar anrop. Lägg till rate limiting i funktionen om det blir ett problem.
