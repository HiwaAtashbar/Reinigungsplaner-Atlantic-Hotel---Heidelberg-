# Reinigungsplaner - E-Mail-Versand an beliebige Adresse (Version 10)

## Neu in dieser Version
Im Bereich "Automatischer Versand nach jeder Zimmerreinigung" (Einstellungen) gibt es das Feld
"Empfänger-E-Mail-Adresse(n) - beliebig, mit Komma getrennt". Nach jeder abgeschlossenen
Zimmerreinigung wird automatisch eine Datei im Drive des Managers gespeichert UND eine E-Mail
an die eingetragene(n) Adresse(n) verschickt.

## Schritt fuer den Manager
Die Datei AppsScript_fuer_Manager.gs.txt muss im bestehenden Apps-Script-Projekt des Managers
ersetzt und neu bereitgestellt werden (Webhook-URL bleibt gleich).

## Einrichtung fuer Mitarbeiter
Einstellungen -> Checkbox aktivieren -> Name eingeben -> Email(s) eingeben -> Webhook-URL
eingeben -> Speichern -> Verbindung testen.

## Dateistruktur
index.html, app.js, styles.css, manifest.json, sw.js, icon-192.png, icon-512.png, README.md,
AppsScript_fuer_Manager.gs.txt (nur fuer den Manager)
