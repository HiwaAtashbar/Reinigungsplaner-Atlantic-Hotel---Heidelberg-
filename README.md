# Reinigungsplaner – Grafische Auswertungen (01.08.2026, Version 7)

## Neue Funktion: Diagramme in allen Berichten

Es wurden grafische Diagramme zu den Berichten Tag, Monat und Jahr hinzugefügt – ganz ohne externe Bibliothek aus dem Internet, sondern mit eigens programmierten, leichten SVG-Diagrammen. Dadurch funktionieren die Diagramme auch offline, ohne zusätzliche Downloads und ohne dass die App-Größe spürbar wächst.

### Tagesbericht
- Donut-Diagramm "Reinigungszeit nach Farbe": zeigt den Anteil von Blau/Rot/Gelb an der Gesamtzahl der Zimmer.
- Donut-Diagramm "Verdienst nach Zimmertyp": zeigt den Anteil des Verdiensts aus normalen Zimmern vs. Suiten.
- Balkendiagramm "Anwesenheit vs. Reinigungszeit": zeigt visuell, wie viel der Anwesenheitszeit tatsächlich mit Reinigung verbracht wurde und wie viel Leerlauf/Pause war.

### Monatsbericht
- Die gleichen zwei Donut-Diagramme (Farbe / Verdienst), aber für den gesamten Monat.
- Liniendiagramm "Täglicher Verdienst": zeigt den Verdienst-Verlauf Tag für Tag im Monat.
- Liniendiagramm "Gereinigte Zimmer pro Tag": zeigt die Auslastung im Zeitverlauf.

### Jahresbericht
- Die gleichen zwei Donut-Diagramme (Farbe / Verdienst), aber für das gesamte Jahr.
- Liniendiagramm "Monatlicher Verdienst": zeigt den Verdienst-Trend über alle 12 Monate.
- Liniendiagramm "Gereinigte Zimmer pro Monat": zeigt saisonale Muster der Auslastung.

## Welche Analysen lassen sich daraus ableiten?

- **Effizienz**: Wie viel der Anwesenheitszeit im Hotel wird tatsächlich für Reinigung genutzt (Tagesbericht-Balken)?
- **Einkommensverteilung**: Wie viel des Verdiensts stammt von Suiten (höherer Lohn) im Vergleich zu normalen Zimmern?
- **Trends**: Steigt oder sinkt der Verdienst bzw. die Anzahl gereinigter Zimmer im Laufe des Monats/Jahres?
- **Farbverteilung**: Überwiegen Abreise-Zimmer (Blau/Rot) oder Aufenthalts-Zimmer (Gelb) – das beeinflusst Arbeitsaufwand und Planung.
- **Saisonale Muster**: Im Jahresbericht lässt sich erkennen, in welchen Monaten die Auslastung (und damit der Verdienst) am höchsten ist.

## Bereits enthaltene frühere Änderungen

- Kritischer Bug behoben, durch den zuvor alle Buttons (Bearbeiten, Einstellungen, Berichte) nicht funktionierten.
- Alle Daten jederzeit editierbar, auch an gesperrten Tagen.
- Start-/Endzeit der Reinigung und Kommen-/Gehen-Zeit manuell editierbar.
- Feld "Zweite Zimmernummer der Suite" entfernt.
- WW-Zimmer haben keine eigene Zeile in den Farb-Tabellen mehr (zählen zur jeweiligen Farbe).
- Getrennte Tabelle "Verdienst nach Zimmertyp" (Normal 5,00 € / Suite 6,50 €).
- Klickbare Zeilen in Monats-/Jahresbericht zur direkten Navigation und Bearbeitung.

## Installation

1. Alle Dateien in Ihr GitHub-Repository hochladen (bestehende Dateien vollständig überschreiben, am besten alte zuerst löschen).
2. 1–2 Minuten warten, bis GitHub Pages neu gebaut hat.
3. App auf dem Handy: Cache leeren bzw. PWA neu installieren, damit der Service Worker die neue Version lädt.

## Dateistruktur

- index.html, app.js, styles.css, manifest.json, sw.js, icon-192.png, icon-512.png, README.md
