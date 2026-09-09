'use client';

import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const L = dynamic(
  () => import('leaflet'),
  { ssr: false }
);

const CATEGORIES = ["Gangguan PERKA", "Pencurian", "Kamtib", "Pelecehan Seksual"];
const STATUSES = ["Baru", "Diproses", "Selesai"];
const SENSITIVE_CATEGORIES = ["Pelecehan Seksual"];
const DEFAULT_CENTER = { lat: -6.9147, lng: 107.6098 };

function generateId() {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function saveToStorage(reports: any) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem("sipk_reports", JSON.stringify(reports));
    }
  } catch (e) {
    console.warn("LocalStorage penuh atau tidak tersedia");
  }
}

function loadFromStorage() {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem("sipk_reports");
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {
    return [];
  }
}

function useReports(filters: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const reload = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    try {
      let data = loadFromStorage();
      
      if (filters?.status) {
        data = data.filter((r: any) => r.status === filters.status);
      }
      if (filters?.kategori) {
        data = data.filter((r: any) => r.kategori === filters.kategori);
      }
      
      setReports(data);
      setError("");
    } catch (e: any) {
      setError(e.message || "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters), refreshToken]);

  return { reports, loading, error, reload };
}

function timeAgo(iso: string) {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return `${Math.round(diffHour / 24)} hari lalu`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    Baru: "bg-signal-new/10 text-signal-new border-signal-new/30",
    Diproses: "bg-signal-progress/10 text-signal-progress border-signal-progress/30",
    Selesai: "bg-signal-done/10 text-signal-done border-signal-done/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status] || ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

function CategoryTag({ kategori }: { kategori: string }) {
  const isSensitive = SENSITIVE_CATEGORIES.includes(kategori);
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${isSensitive ? "bg-signal-urgent/10 text-signal-urgent" : "bg-ink-800/5 text-ink-800"}`}>
      {kategori}
    </span>
  );
}

function PhotoUpload({ onChange }: { onChange: any }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleFile(file: File | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("File harus berupa gambar."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Ukuran foto maksimal 4MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result as string); onChange(reader.result); };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-900">Foto bukti (opsional)</label>
      {!preview ? (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-slate-500 transition hover:border-ink-600 hover:text-ink-700">
          <span className="text-xl">📷</span>
          <span className="text-sm">Ketuk untuk ambil / unggah foto</span>
        </button>
      ) : (
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-200">
          <img src={preview} alt="Pratinjau foto laporan" className="h-48 w-full object-cover" />
          <button type="button" onClick={() => { setPreview(null); onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80">
            Hapus
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      {error && <p className="mt-1.5 text-xs text-signal-urgent">{error}</p>}
    </div>
  );
}

function LocationPicker({ value, onChange }: { value: any; onChange: any }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const point = value || DEFAULT_CENTER;

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    
    const initMap = async () => {
      const leaflet = await import('leaflet');
      const map = leaflet.default.map(mapRef.current!).setView([point.lat, point.lng], 14);
      leaflet.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      const marker = leaflet.default.marker([point.lat, point.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); onChange({ lat: p.lat, lng: p.lng }); });
      map.on("click", (e: any) => { marker.setLatLng(e.latlng); onChange({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      leafletMapRef.current = map;
      markerRef.current = marker;
    };
    
    initMap();
    return () => { if (leafletMapRef.current) leafletMapRef.current.remove(); leafletMapRef.current = null; };
  }, []);

  useEffect(() => {
    if (markerRef.current && leafletMapRef.current && value) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      leafletMapRef.current.setView([value.lat, value.lng]);
    }
  }, [value]);

  function detectGPS() {
    if (!navigator.geolocation) { setError("Perangkat tidak mendukung deteksi GPS."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setError("Gagal mengambil lokasi. Pilih titik langsung di peta."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-sm font-medium text-ink-900">Lokasi kejadian</label>
        <button type="button" onClick={detectGPS} disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-md bg-ink-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-700 disabled:opacity-50">
          {locating ? "Mendeteksi…" : "📍 Gunakan GPS saya"}
        </button>
      </div>
      <div ref={mapRef} className="h-56 w-full overflow-hidden rounded-lg border border-slate-200"></div>
      <p className="mt-1.5 text-xs text-slate-500">
        {point.lat.toFixed(5)}, {point.lng.toFixed(5)} — klik peta atau geser pin untuk memindahkan titik
      </p>
      {error && <p className="mt-1 text-xs text-signal-urgent">{error}</p>}
    </div>
  );
}

function ReportForm({ onSubmitted }: { onSubmitted: any }) {
  const emptyForm = { judul: "", kategori: "", deskripsi: "", pelapor: "" };
  const [form, setForm] = useState(emptyForm);
  const [foto, setFoto] = useState<string | null>(null);
  const [lokasi, setLokasi] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field: string, val: string) { setForm((f) => ({ ...f, [field]: val })); }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setError("");
    if (!form.judul || !form.kategori || !form.deskripsi) {
      setError("Judul, kategori, dan deskripsi wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newReport = {
        id: generateId(),
        judul: form.judul,
        kategori: form.kategori,
        deskripsi: form.deskripsi,
        pelapor: form.pelapor || "Anonim",
        fotoUrl: foto,
        lokasi: lokasi,
        status: "Baru",
        createdAt: new Date().toISOString(),
      };

      const existing = loadFromStorage();
      const updated = [newReport, ...existing];
      saveToStorage(updated);

      setSuccess(true);
      setForm(emptyForm);
      setFoto(null);
      setLokasi(null);
      onSubmitted && onSubmitted(newReport);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim laporan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-signal-done/30 bg-signal-done/5 px-6 py-10 text-center">
        <span className="text-3xl">✅</span>
        <h3 className="text-lg font-semibold text-ink-900">Laporan terkirim</h3>
        <p className="max-w-sm text-sm text-slate-600">
          Terima kasih. Laporan Anda telah tersimpan dan akan segera ditindaklanjuti oleh tim keamanan.
        </p>
        <button onClick={() => setSuccess(false)}
          className="mt-2 rounded-md border border-ink-800 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-800 hover:text-white">
          Buat laporan baru
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-900">Judul laporan</label>
        <input value={form.judul} onChange={(e) => update("judul", e.target.value)}
          placeholder="Contoh: Pencurian helm di area parkir"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-ink-600 focus:ring-2 focus:ring-ink-600/20" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-900">Kategori</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button type="button" key={c} onClick={() => update("kategori", c)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${form.kategori === c ? "border-ink-800 bg-ink-800 text-white" : "border-slate-300 text-slate-700 hover:border-ink-600"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-900">Deskripsi kejadian</label>
        <textarea value={form.deskripsi} onChange={(e) => update("deskripsi", e.target.value)} rows={4}
          placeholder="Jelaskan kronologi, waktu, dan kondisi di lokasi…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-ink-600 focus:ring-2 focus:ring-ink-600/20" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-900">Nama pelapor (opsional)</label>
        <input value={form.pelapor} onChange={(e) => update("pelapor", e.target.value)}
          placeholder="Kosongkan untuk melapor secara anonim"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-ink-600 focus:ring-2 focus:ring-ink-600/20" />
      </div>

      <PhotoUpload onChange={setFoto} />
      <LocationPicker value={lokasi} onChange={setLokasi} />

      {error && <p className="text-sm text-signal-urgent">{error}</p>}

      <button type="submit" disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-800 py-3 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50">
        {submitting ? "Mengirim…" : "Kirim laporan"}
      </button>
    </form>
  );
}

function ReportCard({ report }: { report: any }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {report.fotoUrl && <img src={report.fotoUrl} alt={report.judul} className="h-36 w-full object-cover" />}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <CategoryTag kategori={report.kategori} />
          <StatusBadge status={report.status} />
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-ink-900">{report.judul}</h3>
        <p className="line-clamp-2 text-xs text-slate-500">{report.deskripsi}</p>
        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-slate-400">
          <span>🕒 {timeAgo(report.createdAt)}</span>
          {report.lokasi && <span>📍 lokasi tersedia</span>}
        </div>
      </div>
    </div>
  );
}

function ReportsMap({ reports }: { reports: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const colors = { Baru: "#E0922B", Diproses: "#2F6FED", Selesai: "#1C9A6C" };

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    
    const initMap = async () => {
      const leaflet = await import('leaflet');
      const map = leaflet.default.map(mapRef.current!).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13);
      leaflet.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      markersLayerRef.current = leaflet.default.layerGroup().addTo(map);
      leafletMapRef.current = map;
    };
    
    initMap();
    return () => { if (leafletMapRef.current) leafletMapRef.current.remove(); leafletMapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    
    const initMarkers = async () => {
      const leaflet = await import('leaflet');
      const withLocation = reports.filter((r: any) => r.lokasi && r.lokasi.lat);
      withLocation.forEach((r: any) => {
        const icon = leaflet.default.divIcon({
          className: "",
          html: `<div style="background:${colors[r.status as keyof typeof colors] || "#334155"};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const marker = leaflet.default.marker([r.lokasi.lat, r.lokasi.lng], { icon }).addTo(markersLayerRef.current);
        marker.bindPopup(`<div style="font-family:Inter,sans-serif"><p style="font-weight:600;font-size:13px;margin:0 0 4px">${r.judul}</p><p style="font-size:11px;color:#64748b;margin:0">${r.kategori} · ${r.status}</p></div>`);
      });
    };
    
    initMarkers();
  }, [reports]);

  return <div ref={mapRef} className="h-[28rem] w-full overflow-hidden rounded-xl border border-slate-200"></div>;
}

function PublicPage() {
  const { reports: allReports, loading, error, reload } = useReports({});
  const [view, setView] = useState("map");
  const active = allReports.filter((r: any) => r.status !== "Selesai");

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[380px_1fr]">
      <section>
        <h2 className="mb-1 text-lg font-semibold text-ink-900">Laporkan kejadian</h2>
        <p className="mb-4 text-sm text-slate-500">Isi formulir berikut untuk melaporkan gangguan keamanan atau kejadian di lingkungan Anda.</p>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <ReportForm onSubmitted={reload} />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Laporan aktif</h2>
            <p className="text-sm text-slate-500">{loading ? "Memuat…" : `${active.length} laporan sedang berjalan`}</p>
          </div>
          <div className="flex rounded-lg border border-slate-300 bg-white p-1">
            <button onClick={() => setView("map")} className={`rounded-md px-3 py-1.5 text-sm ${view === "map" ? "bg-ink-800 text-white" : "text-slate-600"}`}>🗺️ Peta</button>
            <button onClick={() => setView("cards")} className={`rounded-md px-3 py-1.5 text-sm ${view === "cards" ? "bg-ink-800 text-white" : "text-slate-600"}`}>🗂️ Daftar</button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-signal-urgent">{error}</p>}

        {view === "map" ? (
          <ReportsMap reports={active} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {active.map((r: any) => <ReportCard key={r.id} report={r} />)}
            {!loading && active.length === 0 && <p className="col-span-2 text-sm text-slate-400">Belum ada laporan aktif.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function AdminPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const { reports, loading, error, reload } = useReports({ status: statusFilter, kategori: kategoriFilter });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const existing = loadFromStorage();
      const updated = existing.map((r: any) => r.id === id ? { ...r, status } : r);
      saveToStorage(updated);
      reload();
    } catch (e: any) {
      alert(e.message || "Gagal mengubah status");
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = STATUSES.reduce((acc: any, s: string) => {
    acc[s] = reports.filter((r: any) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-lg font-semibold text-ink-900">Dashboard admin</h2>
      <p className="mb-6 text-sm text-slate-500">Kelola dan tindak lanjuti laporan masuk.</p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{s}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">{counts[s] || 0}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Semua status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Semua kategori</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-signal-urgent">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Laporan</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Pelapor</th>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ubah status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((r: any) => (
              <tr key={r.id} className="align-top hover:bg-slate-50/60">
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium text-ink-900">{r.judul}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{r.deskripsi}</p>
                </td>
                <td className="px-4 py-3"><CategoryTag kategori={r.kategori} /></td>
                <td className="px-4 py-3 text-slate-600">{r.pelapor}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <select value={r.status} disabled={updatingId === r.id} onChange={(e) => handleStatusChange(r.id, e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs disabled:opacity-50">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && reports.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Tidak ada laporan yang cocok.</p>}
      </div>
    </div>
  );
}

function useHashRoute() {
  const [hash, setHash] = useState("#/");

  useEffect(() => {
    setHash(window.location.hash || "#/");
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return hash;
}

export default function Home() {
  const hash = useHashRoute();
  const isAdmin = hash.startsWith("#/admin");

  return (
    <>
      <Head>
        <title>SIPK — Sistem Informasi Pengamanan &amp; Kejadian</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-ink-900/10 bg-ink-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2 text-white">
              <span>🛡️</span>
              <span className="text-sm font-semibold tracking-tight">
                SIPK <span className="font-normal text-white/60">— Sistem Informasi Pengamanan &amp; Kejadian</span>
              </span>
            </div>
            <nav className="flex gap-1 rounded-lg bg-white/10 p-1">
              <a href="#/" className={`rounded-md px-3 py-1.5 text-sm transition ${!isAdmin ? "bg-white text-ink-900" : "text-white/70 hover:text-white"}`}>Publik</a>
              <a href="#/admin" className={`rounded-md px-3 py-1.5 text-sm transition ${isAdmin ? "bg-white text-ink-900" : "text-white/70 hover:text-white"}`}>Admin</a>
            </nav>
          </div>
        </header>
        {isAdmin ? <AdminPage /> : <PublicPage />}
      </div>
    </>
  );
}
