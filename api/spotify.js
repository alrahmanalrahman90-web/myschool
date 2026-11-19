/* MySchool - /api/spotify
   Proxy server-side ke IROHA API (Spotify): menghindari CORS, memvalidasi input, dan menormalkan respons.
   GET /api/spotify?action=search&q=judul        -> { status:true, items:[{title,artist,album,duration,dur,cover,spotify}] }
   GET /api/spotify?action=download&url=<track>  -> { status:true, data:{title,artist,album,duration,dur,cover,spotify,download} }
   Kompatibel Vercel (Node 18+, fetch bawaan). Tanpa API key. */

const BASE = 'https://api.iroha-api.web.id/v1/spotify';
const TRACK = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{10,32})(?:[?#].*)?$/;
const str = v => (v == null ? '' : String(v).trim());
const secs = v => {
  if (typeof v === 'number') return Math.round(v > 3600 * 10 ? v / 1000 : v) || 0;
  const p = str(v).split(':').map(Number);
  return p.length && !p.some(isNaN) ? p.reduce((a, b) => a * 60 + b, 0) : 0;
};
const https = u => { u = str(u); return /^http:\/\//i.test(u) ? 'https://' + u.slice(7) : u; };

async function upstream(qs, ms) {
  try { return await upstream1(qs, ms); }
  catch (e) { if (e.code === 504 || e.code === 502) return await upstream1(qs, Math.min(ms, 12000)); throw e; }
}
async function upstream1(qs, ms) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(BASE + '?' + qs, { signal: c.signal, headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' } });
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j || j.status === false) {
      const m = j && (j.message || j.error);
      throw Object.assign(new Error(typeof m === 'string' && m ? m : 'Layanan Spotify mengembalikan galat (HTTP ' + r.status + ').'), { code: 502 });
    }
    return j;
  } catch (e) {
    if (e.code) throw e;
    throw Object.assign(new Error(e && e.name === 'AbortError' ? 'Layanan Spotify terlalu lama merespons.' : 'Layanan Spotify tidak bisa dihubungi.'), { code: 504 });
  } finally { clearTimeout(t); }
}

/* cari URL audio di berbagai kemungkinan nama field */
function pickAudio(d) {
  const keys = ['download', 'downloadUrl', 'download_url', 'audio', 'audioUrl', 'url', 'link', 'mp3', 'stream'];
  const val = v => {
    if (typeof v === 'string') return /^https?:\/\//i.test(v) ? v : '';
    if (Array.isArray(v)) { for (const x of v) { const r = val(x); if (r) return r; } return ''; }
    if (v && typeof v === 'object') return val(v.url || v.link || v.download);
    return '';
  };
  for (const k of keys) { const r = val(d && d[k]); if (r) return https(r); }
  for (const k of ['downloads', 'medias', 'formats']) { const r = val(d && d[k]); if (r) return https(r); }
  return '';
}

function norm(x) {
  x = x || {};
  const du = x.duration != null ? x.duration : x.dur;
  return {
    title: str(x.title || x.name),
    artist: Array.isArray(x.artists) ? x.artists.map(a => str(a && a.name || a)).join(', ') : str(x.artist),
    album: str(x.album),
    duration: str(typeof du === 'number' ? '' : du),
    dur: secs(du),
    cover: https(x.cover || x.image || x.thumbnail),
    spotify: str(x.spotifyUrl || x.spotify || x.url)
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ status: false, message: 'Metode tidak didukung.' });
  const { action, q, url } = req.query || {};
  try {
    if (action === 'search') {
      const query = str(q).slice(0, 200);
      if (!query) return res.status(400).json({ status: false, message: 'Kata kunci pencarian kosong.' });
      const j = await upstream('action=search&q=' + encodeURIComponent(query), 12000);
      const d = j.data || {};
      const list = d.results || d.items || d.tracks || (Array.isArray(d) ? d : []);
      const items = (Array.isArray(list) ? list : []).map(norm).filter(x => x.title && TRACK.test(x.spotify));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ status: true, items });
    }
    if (action === 'download') {
      const m = str(url).match(TRACK);
      if (!m) return res.status(400).json({ status: false, message: 'Tautan harus berupa lagu Spotify (open.spotify.com/track/…).' });
      const canon = 'https://open.spotify.com/track/' + m[1];
      const j = await upstream('action=download&url=' + encodeURIComponent(canon), 14000);
      const d = j.data || {};
      const out = norm(d);
      out.spotify = out.spotify && TRACK.test(out.spotify) ? out.spotify : canon;
      out.download = pickAudio(d);
      if (!out.download) return res.status(502).json({ status: false, message: 'API tidak mengembalikan tautan audio untuk lagu ini.' });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ status: true, data: out });
    }
    return res.status(400).json({ status: false, message: 'Parameter action harus "search" atau "download".' });
  } catch (e) {
    return res.status(e.code || 500).json({ status: false, message: e.message || 'Terjadi kesalahan.' });
  }
};
