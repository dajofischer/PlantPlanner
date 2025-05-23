# PlantPlanner – Interaktiver Bepflanzungsplaner

Dieses Repository enthält eine moderne, interaktive Pflanzenplanungs-App auf Basis von React/Next.js. Die Anwendung ermöglicht es, Pflanzen aus einer umfangreichen Datenbank per Drag & Drop auf ein Beet zu platzieren, deren Durchmesser anzupassen, zu löschen und alle Metadaten live einzusehen. Die App bietet eine pixelgenaue SVG-Feldansicht mit Hintergrund (soil.jpg), eine bildgestützte, filterbare Pflanzenauswahl, Autosave, CSV-Import/Export und eine moderne, reaktionsschnelle Benutzeroberfläche.

## Hauptfunktionen
- **SVG-Beet mit Hintergrund**: Pflanzen werden als Bilder auf einem 1280x200px großen Feld mit soil.jpg-Hintergrund platziert.
- **Pflanzenauswahl**: Suchbare Dropdown-Liste mit Bildern und Metadaten aus CSV.
- **Durchmesser**: Automatische Übernahme aus CSV, manuell anpassbar.
- **Platzierung & Löschen**: Einzelne Pflanzen platzieren, Durchmesser ändern, per Command+Klick löschen.
- **Tabelle**: Live-Tabelle aller gesetzten Pflanzen mit allen CSV-Metadaten, interaktive Hervorhebung.
- **Autosave, Laden/Speichern**: Automatisches Speichern im Browser, CSV-Import/Export, "Beet leeren"-Funktion.
- **Robuste Bildbehandlung**: Platzhalter für fehlende Bilder, performantes Rendering.

## Eingabedateien
- **/public/data/pflanzen.csv**: Enthält die Metadaten aller verfügbaren Pflanzen. Wichtige Spalten sind z.B. `pflanzenname`, `bildname`, `durchmesser`, `hoehe`, `bluetezeit`, `standort`, u.v.m. Jede Zeile beschreibt eine Pflanze.
- **/public/plants/**: Enthält die Pflanzenbilder im PNG-Format. Die Bildnamen müssen mit der Spalte `bildname` (in .png) aus der CSV übereinstimmen. Fehlende Bilder werden automatisch durch einen Platzhalter ersetzt.
- **/public/data/pflanzen_status_sabrina.csv**: Beispiel für einen gespeicherten/geladenen Beet-Status (Export/Import-Format).

## Nutzung
1. Starte den lokalen Entwicklungsserver mit `npm run dev`.
2. Öffne [http://localhost:3000](http://localhost:3000) im Browser.
3. Wähle Pflanzen aus, platziere sie auf dem Beet, passe Durchmesser an, speichere oder lade deinen Plan als CSV.

Weitere Details siehe Quellcode und UI.

---

Die App wurde als moderne Alternative zu einer R Shiny-Lösung entwickelt und bietet eine performante, intuitive und visuell ansprechende Umgebung für die Beetplanung.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
