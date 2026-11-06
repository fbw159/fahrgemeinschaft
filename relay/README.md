# Worker „fahrgemeinschaft“

`https://fahrgemeinschaft.fbw159.workers.dev/daten` (GET/PUT) liest und schreibt `data.json` im privaten Repo `fbw159/fahrgemeinschaft-daten`. Jede Änderung wird dort ein Commit.

- Code: `worker.js` (ES-Modul, `compatibility_date` 2026-10-01).
- Einziges Secret: `GITHUB_TOKEN` (Schreibrecht Contents auf das Daten-Repo). Ohne Secret antwortet der Worker mit 500 „nicht eingerichtet“.
- Zugang: Header `x-key` mit dem Code aus dem Einladungslink; im Code steht nur dessen SHA-256-Hash. Der Link liegt im privaten Daten-Repo (`einladungslink.txt`).
- Prüfen: `GET /daten` ohne Header → 401; mit gültigem `x-key` → `{"data":{…},"sha":"…"}`.
