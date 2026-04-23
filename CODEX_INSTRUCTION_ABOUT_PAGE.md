# CODEX_INSTRUCTION_ABOUT_PAGE.md

**Till Codex:** Detta är ett tillägg till den befintliga appen. Läs hela briefen innan du börjar. Pausa bara om du behöver beslut från användaren.

---

## Uppdrag

Lägg till en publik "Om verktyget"-sida (`/om`) i den befintliga appen, integrera tooltips för formulärfält och resultatsektioner, samt lägg till länkar i navigation, footer och samtyckessida.

Texterna är skrivna och ligger som markdown-filer i `/about-content/`:
- `/about-content/about.md` — huvudtexten för `/om`-sidan
- `/about-content/ui_microtexts.md` — tooltips och mikrotexter

**Kopiera texterna ordagrant.** Tonen är medvetet vald — formulera inte om dem, även om en formulering känns lång eller akademisk. Om du måste göra typografiska anpassningar (radbrytningar, listor) — gör det varsamt och behåll sakinnehållet.

## Implementering

### 1. Skapa sidan `/om`

**Fil:** `web/app/om/page.tsx`

**Krav:**
- Publik sida — ingen auth krävs.
- Renderar innehållet i `/about-content/about.md` som läsbar långform.
- Använd `react-markdown` eller motsvarande för rendering. Om biblioteket inte redan finns i projektet — installera `react-markdown` och `remark-gfm`.
- Lägg `about.md` i `web/public/content/about.md` så att den kan fetchas client-side, **eller** bättre: importera den som modul med Next.js `?raw`-import om byggmiljön stödjer det.
- Sidans bredd: max 720px (läsbar lägd), centrerad, generös radhöjd och marginaler.
- **Innehållsförteckning** högst upp som länkar till varje `<h2>`-rubrik. Generera automatiskt från rubrikerna.
- Sticky innehållsförteckning på desktop (sidebar till vänster), inline på mobil.
- Typografi: använd Tailwind `prose`-klassen som grund, anpassa font-storlek till god läsbarhet (text-base eller text-lg).

**Layout-struktur:**
```
- Header (samma som övriga sidor)
- Sidans titel: "Om verktyget"
- Innehållsförteckning (sticky desktop / inline mobil)
- Markdown-renderat innehåll
- Footer (samma som övriga sidor)
```

### 2. Integrera tooltips i formuläret

**Fil:** `web/app/ny/page.tsx` (eller motsvarande befintliga formulärsida)

**För varje formulärfält** ska det finnas en `(?)`-ikon bredvid fältnamnet. Klick öppnar en tooltip eller liten popover med texten från `ui_microtexts.md`.

Använd en lättviktig komponent — Radix UI Popover om det redan finns, annars en enkel egen `<Tooltip>`-komponent baserad på state. Ingen tung tooltip-bibliotek behöver installeras.

Texterna ligger under rubriken "Tooltips per formulärfält" i `ui_microtexts.md`.

**Glöm inte:** kurskontext-fältet behöver tooltipen *plus* exempeltexten i fältets placeholder eller helper-text under fältet (markeras med kursiv `Exempel: ...`).

### 3. Integrera tooltips på resultatsidan

**Fil:** `web/app/resultat/[designId]/page.tsx` (eller motsvarande)

För varje av följande sektionsrubriker ska det finnas en `(?)`-ikon bredvid rubriken med tooltip från `ui_microtexts.md`:

- Inferens-kontroll
- Programmatiska förslag
- Fallgropar undvikna
- Öppna frågor

### 4. Ingress på formulärsidan

Lägg till ingressen från `ui_microtexts.md` (sektionen "Ingress på formulärsidan") högst upp på `/ny`-sidan, ovanför formuläret. Länken `[Läs mer om verktyget]` pekar på `/om`.

Stilmässigt: max 720px bredd, lite mindre framträdande än formuläret men tydligt synlig. Inte i en låda — som ren brödtext.

### 5. Footer

**Fil:** `web/app/layout.tsx` eller motsvarande layoutfil

Lägg till en footer som syns på alla sidor (inklusive publika). Innehåll:

> Examdesign är en prototyp under utveckling. [Om verktyget](/om) · [Datahantering](/samtycke)

Länken till datahantering går till `/samtycke`.

Footer ska vara diskret men läsbar. Liten text, ljusgrå färg, separerad från huvudinnehållet.

### 6. Huvudnavigation

**Fil:** befintlig navigationskomponent

Lägg till en länk "Om verktyget" som pekar på `/om`. Länken ska synas:
- När användaren är inloggad (i den vanliga navigationen)
- När användaren *inte* är inloggad (på inloggnings- och samtyckessidan)
- På `/om`-sidan själv (markera som aktiv)

### 7. Länk på samtyckessidan

**Fil:** `web/app/samtycke/page.tsx`

Lägg till länken från `ui_microtexts.md` (sektionen "På samtyckessidan") ovanför kryssrutorna men under den befintliga samtyckestexten.

Länken öppnar `/om` i ny flik (`target="_blank" rel="noopener noreferrer"`).

## Backend — inga ändringar krävs

`/om`-sidan är ren frontend och kräver inga backend-ändringar. Cloud Functions, Firestore-regler och secrets är oförändrade.

## Versionering

Ingen versions- eller datumlogik i koden. Datumstämpeln längst ned i `about.md` ("Senast uppdaterad: [DATUM]") fyller användaren i manuellt vid framtida uppdateringar — det är ett medvetet val för att hålla det enkelt.

## Tillgänglighet

- Alla `(?)`-ikoner ska ha aria-label, t.ex. `aria-label="Förklaring till fältet Kursmål"`.
- Tooltips/popovers ska vara tangentbordsåtkomliga (Tab-fokus, Esc stänger).
- Innehållsförteckningen på `/om` ska vara semantiskt korrekt (`<nav>`, `<ul>`, ankarlänkar).
- Tillräcklig kontrast i texter (uppfyll WCAG AA).

## Test

Innan deploy:

1. Verifiera att `/om` renderas korrekt utan inloggning (öppna i incognito).
2. Verifiera att alla tooltips öppnas och stängs (mus + tangentbord).
3. Verifiera att innehållsförteckningen fungerar (klick scrollar till rätt sektion).
4. Verifiera att mobil-layouten är läsbar (DevTools → mobil viewport).
5. Lighthouse-test på `/om` — accessibility-poäng minst 95.

## Deploy

Standard-flödet:

```powershell
cd web
npm run build
cd ..
firebase deploy --only hosting
```

Inga secrets eller backend-ändringar — bara hosting-deploy.

## När du är klar

Rapportera:
- URL till `/om` på den deployade appen
- Bekräfta att alla 6 integrationspunkter (sida, formulär-tooltips, resultat-tooltips, ingress, footer, navigation, samtyckessida) är på plats
- Eventuella avvikelser från instruktionerna och varför
- Påminn användaren att fylla i: KONTAKT (footer + om-sidan), datumstämpel (om-sidan), eventuella länkar till PDF-dokument (om-sidan)

Kör igång.
