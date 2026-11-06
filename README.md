# Fahrgemeinschaft

Fahrtkosten einer Fahrgemeinschaft eintragen, aufteilen und ausgleichen – fürs Handy gebaut.

- Seite: `index.html` (GitHub Pages)
- Daten: liegen nicht hier, sondern als `data.json` in einem privaten Repo. Jede Änderung im Dashboard ist dort ein Commit.
- Speichern läuft über einen Cloudflare Worker (`relay/worker.js`), der den Schreibzugriff hält. Zugang nur mit dem Einladungslink (`#k=…`).
- Der Code bleibt als `#k=…` in der Adresse, damit Lesezeichen, Home-Bildschirm-Symbole und kopierte Links ihn enthalten. Zusätzlich merkt ihn sich der Browser, dann reicht auch der kurze Link. Absichtlich kein Web-App-Manifest: sonst würde der Home-Bildschirm einen festen Start-Link ohne Code nehmen. Symbol: `icon.png` (apple-touch-icon).

## Rechenweg
- Kosten pro km = Verbrauch des Fahrer-Autos × Preis (Diesel/Benzin €/L, Strom €/kWh), optional plus Betriebskosten-Pauschale (gleicher ct/km-Satz für alle Autos).
- Eine Fahrt besteht aus Hin- und Rückweg (je km/2). Jede Strecke wird gleichmäßig auf alle im Auto verteilt, Fahrer eingeschlossen. Wer nur eine Strecke dabei war, zahlt nur dafür.
- Preise und Pauschale werden bei jeder Fahrt festgehalten; spätere Änderungen wirken nur auf neue Fahrten.
- „Wer zahlt wem“ sucht die kleinstmögliche Zahl an Überweisungen. „bezahlt“ trägt die Zahlung ein und setzt die Salden entsprechend zurück.
