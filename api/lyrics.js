/* MySchool - /api/lyrics
   Proxy tipis untuk sumber lirik (tanpa API key). Hanya meneruskan pencarian; pencocokan judul/artis/versi/durasi dilakukan di aplikasi.
   - e=get | e=search : LRCLIB (https://lrclib.net) -> lirik bertimestamp (syncedLyrics) dan lirik biasa (plainLyrics)
   - e=ovh            : lyrics.ovh -> lirik biasa saja (tanpa timestamp, tidak pernah disinkronkan palsu)
   - e=bl             : Better Lyrics API (lyrics-api.boidu.dev, GPL v3, cantumkan atribusi) -> TTML bertimestamp; cadangan terakhir. Skema respons belum diverifikasi dari sandbox; parser menerima TTML mentah atau JSON yang memuat string TTML
   Tidak ada lirik yang dikarang. Mengembalikan null (status 200) bila tidak ditemukan. Hak cipta lirik tetap milik pemegang hak; MySchool hanya menampilkan, tidak menyimpan/menjual. Kompatibel Vercel (Node 18+). */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const e = String((req.query && req.query.e) || '');
  if (e !== 'get' && e !== 'search' && e !== 'ovh' && e !== 'bl') { res.status(400).json({ error: 'e tidak valid' }); return; }
  const q = k => String((req.query && req.query[k]) || '').slice(0, 200);
  let url;
  if (e === 'bl') {
    const a = q('artist_name').trim(), t = q('track_name').trim(), d = parseInt(q('duration'), 10) || 0;
    if (!a || !t) { res.status(400).json({ error: 'parameter kosong' }); return; }
    url = 'https://lyrics-api.boidu.dev/getLyrics?s=' + encodeURIComponent(t) + '&a=' + encodeURIComponent(a) + (d > 0 ? '&d=' + d : '');
  } else if (e === 'ovh') {
    const a = q('artist_name').trim(), t = q('track_name').trim();
    if (!a || !t) { res.status(400).json({ error: 'parameter kosong' }); return; }
    url = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(a) + '/' + encodeURIComponent(t);
  } else {
    const p = new URLSearchParams();
    ['track_name', 'artist_name', 'album_name', 'duration', 'q'].forEach(k => { const v = q(k); if (v) p.set(k, v); });
    if (![...p.keys()].length) { res.status(400).json({ error: 'parameter kosong' }); return; }
    url = 'https://lrclib.net/api/' + e + '?' + p.toString();
  }
  const c = new AbortController(), tm = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'MySchool/1.0', 'Lrclib-Client': 'MySchool', Accept: 'application/json' } });
    if (r.status === 404) { res.setHeader('Cache-Control', 'public, s-maxage=3600'); res.status(200).json(null); return; }
    if (!r.ok) throw new Error('http ' + r.status);
    if (e === 'bl') {
      /* Better Lyrics: respons TTML (XML) mentah atau JSON yang memuat string TTML; dikembalikan sebagai {ttml} */
      const raw = await r.text(); let ttml = '';
      const find = o => { if (ttml || o == null) return; if (typeof o === 'string') { if (/<tt[\s>]/.test(o)) ttml = o; return; } if (typeof o === 'object') for (const k in o) find(o[k]); };
      try { find(JSON.parse(raw)); } catch (_) { if (/<tt[\s>]/.test(raw)) ttml = raw; }
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      res.status(200).json(ttml ? { ttml } : null); return;
    }
    const j = await r.json();
    if (e === 'ovh' && (!j || !j.lyrics)) { res.setHeader('Cache-Control', 'public, s-maxage=3600'); res.status(200).json(null); return; }
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(j);
  } catch (err) {
    res.status(502).json({ error: 'sumber lirik tidak tersedia' });
  } finally { clearTimeout(tm); }
};
