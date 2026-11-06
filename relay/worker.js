// Cloudflare Worker für die Fahrgemeinschaft.
// Liest und schreibt data.json im privaten Repo fbw159/fahrgemeinschaft-daten.
// Jede Änderung im Dashboard wird dort ein Commit (= vollständiger Verlauf).
//
// Einziges Secret (im Cloudflare-Dashboard setzen, nie ins Repo):
//   GITHUB_TOKEN  Token mit Schreibrecht (Contents) auf das Daten-Repo
// Der Zugangscode aus dem Einladungslink (#k=...) steht hier nur als SHA-256-Hash.

const REPO = 'fbw159/fahrgemeinschaft-daten';
const PFAD = 'data.json';
const MAX_BYTES = 900000;
const SCHLUESSEL_SHA256 = '253f891a80c997a7dc9f68bd37af029e32ef1af3fe9aff339a33866d80927dc8';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-key',
  'Access-Control-Max-Age': '86400'
};

function antwort(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function gleich(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function sha256(text) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function nachBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function ausBase64(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function gueltig(d) {
  return d && typeof d === 'object' && !Array.isArray(d) &&
    Array.isArray(d.personen) && Array.isArray(d.fahrten) && Array.isArray(d.zahlungen);
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);
    if (url.pathname !== '/daten') return antwort({ fehler: 'unbekannt' }, 404);
    if (!gleich(await sha256(req.headers.get('x-key') || ''), SCHLUESSEL_SHA256)) return antwort({ fehler: 'schluessel' }, 401);
    if (!env.GITHUB_TOKEN) return antwort({ fehler: 'nicht eingerichtet' }, 500);

    const gh = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fahrgemeinschaft-worker'
    };
    const api = `https://api.github.com/repos/${REPO}/contents/${PFAD}`;

    if (req.method === 'GET') {
      const r = await fetch(`${api}?ref=main`, { headers: gh, cache: 'no-store' });
      if (r.status === 404) return antwort({ data: null, sha: null });
      if (!r.ok) return antwort({ fehler: 'github', status: r.status }, 502);
      const j = await r.json();
      let data;
      try { data = JSON.parse(ausBase64(j.content || '')); } catch { return antwort({ fehler: 'datei kaputt' }, 502); }
      return antwort({ data, sha: j.sha });
    }

    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return antwort({ fehler: 'zu gross' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return antwort({ fehler: 'json' }, 400); }
      if (!gueltig(body.data)) return antwort({ fehler: 'format' }, 400);

      const nachricht = String(body.nachricht || 'Daten aktualisiert').replace(/[\r\n]+/g, ' ').slice(0, 120);
      const inhalt = {
        message: nachricht,
        content: nachBase64(JSON.stringify(body.data, null, 2) + '\n'),
        branch: 'main'
      };
      if (body.sha) inhalt.sha = String(body.sha);

      const r = await fetch(api, {
        method: 'PUT',
        headers: { ...gh, 'content-type': 'application/json' },
        body: JSON.stringify(inhalt)
      });
      // 409 = Datei wurde inzwischen geändert, 422 = sha fehlt/passt nicht -> Dashboard lädt neu und versucht es erneut
      if (r.status === 409 || r.status === 422) return antwort({ fehler: 'konflikt' }, 409);
      if (!r.ok) return antwort({ fehler: 'github', status: r.status }, 502);
      const j = await r.json();
      return antwort({ sha: j.content && j.content.sha });
    }

    return antwort({ fehler: 'methode' }, 405);
  }
};
