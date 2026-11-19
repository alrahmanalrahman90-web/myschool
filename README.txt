MySchool - Paket Hosting Vercel

ISI PAKET
- index.html : aplikasi MySchool
- api/spotify.js : fungsi Vercel, proxy ke IROHA API (Spotify): pencarian lagu + tautan audio
- api/lyrics.js : fungsi Vercel untuk lirik (LRCLIB dkk.)
- vercel.json : konfigurasi Vercel

CARA DEPLOY
1. Ekstrak ZIP ini dan unggah isinya ke Vercel (Framework Preset: Other, tanpa Build Command, Output Directory: ./).
2. Buka URL HTTPS yang diberikan Vercel. Tanpa API key / environment variable.

MUSIK (SPOTIFY)
- Sumber musik sekarang Spotify lewat IROHA API (https://api.iroha-api.web.id/docs). Semua permintaan lewat /api/spotify (menghindari CORS, memvalidasi input, menormalkan respons).
- Cari musik: action=search. Hasil dipisah Original / DJ / Remix / Cover, tanpa duplikat; judul persis dan nama artis diprioritaskan. Judul, artis, album, durasi, dan sampul diambil dari Spotify.
- Putar: action=download mengembalikan URL audio, diputar lewat <audio> sebagai audio penuh (tanpa video). Jika URL tidak bisa dimuat/diputar browser, atau audio hanya cuplikan (<60% durasi lagu), otomatis dipakai pemutar Spotify resmi (embed) + tombol "Buka di Spotify". Lirik hanya untuk pemutaran audio langsung.
- Tambah lagu (menu Tambah dari Spotify): tempel tautan lagu/album/playlist Spotify, atau ketik judul. Playlist/album dibaca dari halaman embed Spotify (lewat proxy CORS publik, bisa diganti di "Lanjutan").
- Data lama aman: lagu, playlist, favorit, dan pengaturan yang sudah tersimpan tidak dihapus. Lagu lama (dari YouTube) dicocokkan otomatis ke Spotify di latar belakang (judul + artis + versi + durasi harus cocok; jika tidak ketemu tampil pesan dan lagu tidak diganti lagu lain). Judul, artis, favorit, dan playlist tetap; sampul diganti sampul Spotify.
- YouTube IFrame API, pencarian YouTube, server Piped, dan mode Video sudah dihapus. File /api/search dan /api/video tidak dipakai lagi.
- Batasan: URL audio berasal dari layanan pihak ketiga (IROHA API); ketersediaan dan masa berlaku URL tidak dijamin. Periksa syarat layanan Spotify/IROHA bila dipakai komersial. File MP3/M4A dari HP tetap diputar lokal.

LIRIK TERSINKRON
- Di layar pemutar, geser sampul album ke samping untuk membuka lirik; geser lagi untuk kembali ke sampul. Saat pemutar dibuka, yang tampil selalu sampul.
- Lirik bertimestamp (format LRC) diambil dari LRCLIB (lrclib.net, gratis, tanpa API key) lewat /api/lyrics (fungsi Vercel), dengan cadangan langsung ke LRCLIB. Judul, artis, dan durasi dicocokkan; bila tidak cocok atau tidak ada, tampil "Lirik belum tersedia". Tidak ada lirik yang dikarang.
- Baris aktif ikut posisi lagu (au.currentTime), jadi tetap sinkron saat maju/mundur. Ketuk satu baris untuk melompat ke bagian itu. Geser lirik naik/turun secara manual memunculkan tombol "Sinkron ulang".
- Lagu dari Spotify embed tidak mendukung lirik (tidak ada posisi waktu).

VIDEO MUSIK & SAMPUL PER LAGU
- /api/video (fungsi Vercel) mencari video YouTube di sisi server, lalu aplikasi memilih video musik asli berdasarkan judul + artis + durasi (kanal Topic/Topik, lirik, audio, remix, live dibuang) dan memeriksa video boleh disematkan. Jika video musik asli tidak ada, mode Video menampilkan pesan "Video musik asli tidak ditemukan", bukan gambar.
- Sampul tiap lagu diambil dari video lagu itu sendiri sehingga berbeda per lagu. Seluruh koleksi dicocokkan ulang otomatis di latar belakang sekali setelah update ini.

LIRIK (lanjutan)
- Lirik, urutan sumber: (1) LRCLIB bertimestamp, (2) LRCLIB lirik biasa, (3) lyrics.ovh lirik biasa (lewat /api/lyrics?e=ovh). Lirik biasa ditampilkan apa adanya dengan keterangan "tanpa sinkronisasi waktu"; tidak ada sinkronisasi palsu. Judul harus persis sama, artis harus cocok, durasi dicek; lagu versi DJ/remix/cover/live tidak memakai lirik biasa dari versi lain.
- Better Lyrics (sumber lirik TERAKHIR, bertimestamp): lewat /api/lyrics?e=bl ke lyrics-api.boidu.dev (GET /getLyrics?s=&a=&d=), respons TTML diurai di aplikasi (lyTtml). Terjemahan/transliterasi/vokal latar dibuang. API ini tidak mengirim judul/artis, jadi hasilnya diterima hanya bila durasi lirik masuk akal terhadap durasi lagu (>=35% dan <= durasi+3 dtk) dan minimal 4 baris; versi DJ/remix/cover tidak memakainya. Label "Sumber: Better Lyrics" tampil kecil di pojok kiri bawah lirik.
  PERHATIAN: skema respons Better Lyrics belum bisa diuji dari sandbox (parser menerima TTML mentah atau JSON yang memuat string TTML). Layanan ini dibuat untuk ekstensi Better Lyrics; pembuatnya menyatakan sebagian endpoint sengaja dibatasi agar tidak disalahgunakan, dan sumber datanya diduga berformat Apple Music TTML, sehingga lisensi lirik tidak jelas. API ber-lisensi GPL v3 (atribusi: Better Lyrics / Boidushya, github.com/better-lyrics/api). Gunakan atas tanggung jawab sendiri, terutama bila aplikasi dipakai komersial. Untuk mematikan: hapus blok "cadangan TERAKHIR" di lyFind() (index.html).
