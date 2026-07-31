# Reinigungsplaner – Update (31.07.2026, Version 5)

## Neue Änderungen in diesem Update

1. **Direkte Bearbeitung aus dem Jahresbericht**
   Im Tab "Jahr" ist die Tabelle "Monatliche Übersicht" jetzt klickbar. Tippen Sie z. B. auf die Zeile "Jul" (Juli), um automatisch zum Monatsbericht für Juli zu wechseln.

2. **Direkte Bearbeitung aus dem Monatsbericht**
   Im Tab "Monat" (auch nach dem Wechsel von "Jahr") ist die Tabelle "Tägliche Übersicht" jetzt klickbar. Tippen Sie auf einen bestimmten Tag, um automatisch zum Tab "Zimmer" für genau diesen Tag zu springen – dort können Sie jedes Zimmer, jede Zeit oder die Arbeitszeit direkt bearbeiten, genau wie gewohnt.

3. **Durchgängige Konsistenz aller Berichte**
   Da alle Berichte (Tag/Monat/Jahr) direkt aus denselben gespeicherten Zimmer- und Arbeitszeit-Daten berechnet werden, wirkt sich jede Korrektur, die Sie über den Tab "Zimmer" vornehmen, automatisch auf den Tagesbericht, den Monatsbericht UND den Jahresbericht aus – es gibt keine getrennten Datensätze, die manuell synchronisiert werden müssten.

   Beispiel: Wählen Sie im Jahresbericht "Jul" → Sie sehen den Monatsbericht Juli mit der täglichen Aufschlüsselung → Sie tippen auf "15.07." → Sie landen im Tab "Zimmer" am 15. Juli → Sie korrigieren dort ein Zimmer → Die Korrektur ist sofort in Tag-, Monats- und Jahresbericht sichtbar.

4. **Keine separate WW-Zeile in den Berichten (bereits enthalten, hier nochmals bestätigt)**
   Die Tabelle "Reinigungszeit nach Farbe" enthält weiterhin nur drei Zeilen: Blau, Rot, Gelb. WW-Zimmer werden automatisch mit ihrer Farbe (in der Regel Gelb) zusammengezählt und erscheinen dort in keiner eigenen Zeile. Der WW-Badge bleibt weiterhin auf der einzelnen Zimmerkarte im Tab "Zimmer" sichtbar.

## Bereits enthaltene frühere Änderungen

- Alle Daten (Zimmer, Zeiten, Kommen/Gehen) sind jederzeit editierbar, auch an gesperrten Tagen.
- Start-/Endzeit der Reinigung manuell im Bearbeiten-Fenster editierbar.
- Kommen-/Gehen-Zeit über "Bearbeiten"-Link in der Arbeitszeit-Karte editierbar.
- Feld "Zweite Zimmernummer der Suite" wurde vollständig entfernt.
- Getrennte Tabelle "Verdienst nach Zimmertyp" (Normale Zimmer 5,00 € vs. Suiten 6,50 €) in allen drei Berichten.
- Tagesbericht zeigt zusätzlich Anwesenheitszeit im Hotel, reine Reinigungszeit und automatisch berechnete Leerlauf-/Pausenzeit.

## Installation

1. Alle Dateien in Ihr GitHub-Repository hochladen (bestehende Dateien überschreiben).
2. GitHub Pages aktualisiert sich automatisch nach ein bis zwei Minuten.
3. App auf dem Handy schließen und neu öffnen. Falls Änderungen nicht sofort sichtbar sind, Browser-/App-Cache leeren (Service Worker cached die Dateien).

## Dateistruktur

- index.html, app.js, styles.css, manifest.json, sw.js, icon-192.png, icon-512.png, README.md
