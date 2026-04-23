# examdesign

Examinationsdesigner enligt ramverket produkt–process–agens. Webbapp som hjälper lärare att konstruera välgrundade examinationsförslag med stöd i operationaliserad bedömningslogik.

Detta är ett privat forskningsprojekt under utveckling. Inte en officiell tjänst från något lärosäte. Används under eget ansvar.

## Stack

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind), statisk export
- **Backend:** Firebase Cloud Functions v2, Node.js 22, TypeScript, region `europe-west1`
- **Hosting:** Firebase Hosting
- **Databas:** Firestore (region `eur3`)
- **Autentisering:** Firebase Auth (Google)
- **LLM:** OpenAI Responses API, default-modell `gpt-5.4`
- **Secrets:** Google Cloud Secret Manager via `defineSecret`

## Struktur

```
/web                 Next.js-app (frontend)
/functions           Cloud Functions (backend)
/prompts             Kunskapsbas — bundlas med functions
  /core              Obligatorisk, läses alltid vid kall-start
  /examples          Valfri, tom initialt
  /references        Valfri, tom initialt
/firestore.rules     Säkerhetsregler för Firestore
/firebase.json       Firebase-konfiguration
```

## Kom igång (utveckling lokalt)

```powershell
# Installera beroenden
cd functions; npm install; cd ..
cd web; npm install; cd ..

# Kör emulatorer
firebase emulators:start

# Frontend separat i en annan terminal
cd web; npm run dev
```

## Deploy

```powershell
# Sätt secrets första gången
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set OPENAI_MODEL   # valfri, default gpt-5.4

# Bygg frontend
cd web; npm run build; cd ..

# Deploya allt
firebase deploy

# Alternativt deloy-delar
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

## Kostnadsövervakning

- Firebase Budget Alert: 50 kr/månad (GCP billing)
- OpenAI usage limit: 20 USD hard, 15 USD soft (platform.openai.com)

## Licens och upphovsrätt

Ramverket produkt–process–agens och tillhörande operationalisering: © upphovsmannen. Kod: se LICENSE-fil.
