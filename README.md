# Reinigungsplaner - Zentrales Google Drive fuer alle Mitarbeiter (04.08.2026, Version 9)

## Wichtige Aenderung gegenueber der letzten Version

In der vorherigen Version wurde jeder Zimmerbericht in das Google Drive DES JEWEILIGEN MITARBEITERS gesendet (da Google aus Sicherheitsgruenden keinen direkten Zugriff auf das Drive einer anderen Person erlaubt). Das entspricht nicht Ihrem Ziel, alle Berichte zentral im EIGENEN Drive (Manager) zu sammeln.

Die neue Loesung verwendet daher ein "Google Apps Script Webhook", das NUR EINMAL vom Manager eingerichtet wird. Danach koennen beliebig viele Mitarbeiter ihre Berichte an eine feste Internetadresse senden, OHNE sich selbst bei Google anzumelden - und alle Daten landen automatisch im Google Drive des Managers.

## Einmalige Einrichtung durch den MANAGER

1. Gehen Sie zu https://script.google.com und erstellen Sie ein neues Projekt.
2. Kopieren Sie den gesamten Inhalt der Datei "AppsScript_fuer_Manager.gs.txt" (im ZIP enthalten) in den Skript-Editor.
3. Klicken Sie oben rechts auf "Bereitstellen" -> "Neue Bereitstellung".
4. Typ: "Web App" auswaehlen.
5. "Ausfuehren als": Ich (Ihr eigenes Konto) - WICHTIG, damit die Daten in Ihr Drive gehen.
6. "Wer hat Zugriff": Jeder (Anyone) - damit alle Mitarbeiter senden koennen, ohne sich anzumelden.
7. Auf "Bereitstellen" klicken und die Berechtigungen fuer Zugriff auf Ihr eigenes Drive bestaetigen.
8. Die angezeigte Web-App-URL (endet auf /exec) kopieren.

Diese URL ist Ihr "Webhook". Alle Berichte werden automatisch in einem Ordner "Reinigungsplaner-Berichte" in IHREM Google Drive gespeichert - sowohl als einzelne Textdatei pro Zimmer als auch gesammelt in einer zentralen Tabelle "Alle_Berichte.csv" mit Spalten fuer Mitarbeitername, E-Mail, Datum, Zimmer, Status, Zeiten und Lohn.

## Einrichtung fuer JEDEN MITARBEITER (in der App)

1. App oeffnen -> Einstellungen (Zahnrad-Symbol).
2. Im Bereich "Google Drive - Automatischer Upload":
   - Checkbox aktivieren.
   - Eigenen Namen eingeben (erscheint im Bericht, damit Sie als Manager sehen, wer welches Zimmer gereinigt hat).
   - Optional die eigene E-Mail-Adresse eingeben.
   - Die Webhook-URL eintragen, die Sie vom Manager erhalten haben.
3. Auf "Speichern" klicken, danach auf "Verbindung testen" klicken, um zu prüfen, ob alles funktioniert.

Ab sofort wird nach jedem Klick auf "Ende" bei einem Zimmer automatisch ein Bericht an den Manager gesendet - voellig ohne eigenes Google-Konto des Mitarbeiters.

## Warum diese Loesung fuer die Mitarbeiterverwaltung ideal ist

- Der Manager sieht ALLE Mitarbeiter zentral an einem Ort (eigenes Google Drive), unabhaengig davon, wie viele Reinigungskraefte die App nutzen.
- Jeder Bericht ist eindeutig einem Namen zugeordnet.
- Die zentrale CSV-Datei kann direkt in Google Sheets geoeffnet werden, um Leistung, Zeiten und Verdienst aller Mitarbeiter zu vergleichen.
- Mitarbeiter benoetigen kein eigenes Google-Konto und muessen sich nirgends anmelden - nur die Webhook-URL eintragen.

## Bereits enthaltene fruehere Aenderungen

- Grafische Diagramme (Donut/Linie) in allen drei Berichten (Tag/Monat/Jahr).
- Kritischer Bug behoben, durch den zuvor alle Buttons nicht funktionierten.
- Alle Daten jederzeit editierbar, auch an gesperrten Tagen.
- WW-Zimmer zaehlen zur jeweiligen Farbzeile, keine eigene Zeile mehr.
- Getrennte Tabelle "Verdienst nach Zimmertyp" (Normal 5,00 EUR / Suite 6,50 EUR).
- Klickbare Zeilen in Monats-/Jahresbericht zur direkten Navigation.

## Installation der App-Dateien

1. Alle Dateien (ausser der .gs.txt-Datei, die gehoert ins Apps-Script-Projekt) in Ihr GitHub-Repository hochladen.
2. 1-2 Minuten warten, bis GitHub Pages neu gebaut hat.
3. Apps Script wie oben beschrieben einrichten und Webhook-URL an alle Mitarbeiter verteilen.
4. App-Cache auf dem Handy leeren bzw. PWA neu installieren.

## Dateistruktur

- index.html, app.js, styles.css, manifest.json, sw.js, icon-192.png, icon-512.png, README.md
- AppsScript_fuer_Manager.gs.txt (nur fuer den Manager, wird in script.google.com eingefuegt)
