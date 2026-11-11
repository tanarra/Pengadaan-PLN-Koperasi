import { connection } from "next/server";
import prisma from "@/src/lib/prisma";
import Link from "next/link";
import DashboardMonitoring from "@/app/components/dashboard-monitoring";

const activities = [
  {
    title: "Sistem berhasil diinisialisasi",
    description: "Database pengadaan PLN – Koperasi",
    time: "Hari ini",
    color: "blue",
  },
  {
    title: "Data unit PLN ditambahkan",
    description: "6 unit dan divisi telah terdaftar",
    time: "Hari ini",
    color: "green",
  },
  {
    title: "Permintaan pengadaan dibuat",
    description: "Pengadaan Peralatan Komputer",
    time: "Hari ini",
    color: "orange",
  },
];


type StatItem = {
  title: string;
  value: string;
  note: string;
  icon: string;
  color: string;
};


function Sidebar() {
  const linkClass =
    "flex items-center gap-3 rounded-lg px-4 py-3 text-[13px] font-semibold text-blue-100 transition hover:bg-white/10";

  const sectionClass =
    "mb-2 mt-6 px-4 text-[11px] font-bold uppercase tracking-wider text-blue-300";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[255px] flex-col overflow-y-auto bg-[#063574] text-white lg:flex">
      <div className="border-b border-white/10 px-7 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#ffdf00] text-3xl font-black text-[#0754a5] shadow-lg">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-wider">PLN</h1>
            <p className="text-sm font-medium text-blue-100">Koperasi</p>
          </div>
        </div>

        <p className="mt-7 text-[10px] font-semibold tracking-[3px] text-blue-200">
          SISTEM INFORMASI
        </p>
        <p className="mt-1 text-sm font-semibold">
          Pengadaan Barang &amp; Jasa
        </p>
      </div>

      <nav className="flex-1 px-4 py-5">
        <Link href="/" className={linkClass}>
          <span className="w-5 text-center text-lg">▦</span>
          Dashboard
        </Link>

        <p className={sectionClass}>Permintaan</p>

        <Link href="/permintaan/tambah" className={linkClass}>
          <span className="w-5 text-center text-lg">▤</span>
          Permintaan Pengadaan PLN
        </Link>

        <Link href="/permintaan" className={linkClass}>
          <span className="w-5 text-center text-lg">▤</span>
          Daftar Permintaan
        </Link>

        <p className={sectionClass}>Pengajuan Permohonan</p>

        <Link href="/monitoring" className={linkClass}>
          <span className="w-5 text-center text-lg">💰</span>
          Referensi Harga
        </Link>

        <p className={sectionClass}>Master</p>

        <Link href="/units" className={linkClass}>
          <span className="w-5 text-center text-lg">▥</span>
          Divisi
        </Link>

        <p className={sectionClass}>Lainnya</p>

        <Link href="/dokumen" className={linkClass}>
          <span className="w-5 text-center text-lg">▧</span>
          Dokumen
        </Link>

        <Link href="/laporan" className={linkClass}>
          <span className="w-5 text-center text-lg">▥</span>
          Laporan
        </Link>

        <Link href="/pengaturan" className={linkClass}>
          <span className="w-5 text-center text-lg">⚙</span>
          Pengaturan
        </Link>
      </nav>

      <div className="border-t border-white/10 px-6 py-5">
        <p className="text-xs font-semibold">
          Pengadaan PLN – Koperasi
        </p>
        <p className="mt-1 text-[11px] text-blue-200">
          Versi 1.0.0
        </p>
      </div>
    </aside>
  );
}


function StatCard({ item }: { item: StatItem }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    teal: "bg-teal-100 text-teal-600",
    orange: "bg-orange-100 text-orange-500",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_3px_15px_rgba(15,45,90,0.04)] transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${colors[item.color]}`}
        >
          {item.icon}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">
            {item.title}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-[#102b50]">
            {item.value}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {item.note}
          </p>
        </div>
      </div>

      <div className="absolute -bottom-9 -right-5 h-24 w-24 rounded-full bg-slate-50/80" />
    </div>
  );
}

function ProcurementChart() {
  return (
    <div className="mt-7">
      <div className="mb-5 flex flex-wrap items-center justify-end gap-5 text-xs">
        <span className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Permintaan
        </span>

        <span className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Disetujui
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 650 225"
          className="h-auto w-full"
          role="img"
          aria-label="Grafik contoh statistik pengadaan"
        >
          {[30, 70, 110, 150, 190].map((y) => (
            <line
              key={y}
              x1="45"
              y1={y}
              x2="635"
              y2={y}
              stroke="#e8edf4"
              strokeWidth="1"
            />
          ))}

          {[45, 163, 281, 399, 517, 635].map((x) => (
            <line
              key={x}
              x1={x}
              y1="25"
              x2={x}
              y2="190"
              stroke="#edf1f6"
              strokeWidth="1"
            />
          ))}

          <path
            d="M45 145 L163 110 L281 110 L399 88 L517 48 L635 92"
            fill="none"
            stroke="#0875d1"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M45 165 L163 143 L281 143 L399 132 L517 105 L635 137"
            fill="none"
            stroke="#f5ae19"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {[
            [45, 145],
            [163, 110],
            [281, 110],
            [399, 88],
            [517, 48],
            [635, 92],
          ].map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="4.5"
              fill="#0875d1"
            />
          ))}

          {[
            [45, 165],
            [163, 143],
            [281, 143],
            [399, 132],
            [517, 105],
            [635, 137],
          ].map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="4.5"
              fill="#f5ae19"
            />
          ))}
        </svg>

        <div className="mt-1 flex justify-between pl-8 text-[10px] text-slate-500 sm:text-xs">
          {["Mei", "Jun", "Jul", "Agu", "Sep", "Okt"].map((month) => (
            <span key={month}>{month} 2026</span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[10px] text-slate-400">
        Ilustrasi grafik statistik. Data aktual akan dihubungkan kemudian.
      </p>
    </div>
  );
}

export default async function Home() {
  await connection();

  // Mengambil jumlah data langsung dari PostgreSQL
  const [
    totalPermintaan,
    totalUnit,
    totalDokumen,
    totalBarang,
  ] = await Promise.all([
    prisma.permintaan_pengadaan.count(),
    prisma.unit_pln.count(),
    prisma.dokumen_permintaan.count(),
    prisma.permintaan_pengadaan.count({
      where: {
        jenis_pengadaan: "Barang",
      },
    }),
  ]);

  // Data statistik dashboard
  const stats: StatItem[] = [
    {
      title: "Total Permintaan",
      value: totalPermintaan.toString(),
      note: "Seluruh permintaan tercatat",
      icon: "▤",
      color: "blue",
    },
    {
      title: "Unit PLN",
      value: totalUnit.toString(),
      note: "Unit dan divisi terdaftar",
      icon: "▦",
      color: "teal",
    },
    {
      title: "Permintaan Barang",
      value: totalBarang.toString(),
      note: "Permintaan jenis barang",
      icon: "✓",
      color: "orange",
    },
    {
      title: "Dokumen",
      value: totalDokumen.toString(),
      note: "Dokumen tersimpan",
      icon: "▧",
      color: "purple",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f7fc] text-[#102b50]">
      <Sidebar />

      <main className="min-h-screen lg:ml-[255px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-100 bg-white/95 px-5 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-4">
            <div className="hidden h-9 w-1 rounded-full bg-[#ffdf00] sm:block" />
            <div>
              <h2 className="text-base font-extrabold text-[#102b50] sm:text-lg">
                Sistem Pengadaan Barang dan Jasa
              </h2>
              <p className="text-xs text-slate-500">
                PLN – Koperasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              aria-label="Notifikasi"
              className="relative rounded-full p-2 text-xl text-[#063574] hover:bg-blue-50"
            >
              ♧
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-lg">
                👤
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-bold">Admin Koperasi</p>
                <p className="text-[10px] text-slate-400">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-7 p-5 sm:p-8">
          {/* Banner Selamat Datang */}
          <section className="relative min-h-[205px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#d9edff] via-[#a9d7ff] to-[#4c9ee5] shadow-sm">
            <div className="absolute -right-10 -top-28 h-80 w-80 rounded-full border-[35px] border-white/15" />
            <div className="absolute right-28 top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#0754a5]/30 to-transparent" />

            <div className="relative z-10 flex min-h-[205px] items-center px-7 py-8 sm:px-10">
              <div className="max-w-2xl border-l-[6px] border-[#ffdf00] pl-5 sm:pl-7">
                <p className="text-sm font-medium text-[#164a83] sm:text-base">
                  Selamat Datang di
                </p>

                <h1 className="mt-1 text-2xl font-extrabold leading-tight text-[#073574] sm:text-3xl">
                  Sistem Pengadaan Barang dan Jasa
                  <br />
                  PLN – Koperasi
                </h1>

                <p className="mt-3 text-sm font-medium italic text-[#164a83]">
                  Transparan, Akuntabel, dan Profesional
                </p>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 hidden h-full w-[35%] items-end justify-center overflow-hidden md:flex">
              <div className="mb-0 flex h-[85%] w-[75%] items-center justify-center rounded-t-2xl border border-white/40 bg-gradient-to-br from-[#0754a5]/80 to-[#063574] shadow-2xl">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[#ffdf00] text-4xl text-[#0754a5] shadow-lg">
                    ⚡
                  </div>

                  <p className="mt-3 text-2xl font-black tracking-widest text-white">
                    PLN
                  </p>
                  <p className="text-xs text-blue-100">Koperasi</p>
                </div>
              </div>
            </div>
          </section>

          {/* Ringkasan Pengadaan */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">
                  Ringkasan Pengadaan
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Gambaran umum sistem pengadaan
                </p>
              </div>

              <span className="rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm">
                November 2026
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <StatCard key={item.title} item={item} />
              ))}
            </div>
          </section>

          {/* Monitoring Status Pengadaan */}
          <DashboardMonitoring />

          {/* Statistik dan Aktivitas */}
          <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_3px_15px_rgba(15,45,90,0.04)] sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl text-blue-600">▥</span>
                  <h3 className="font-extrabold">
                    Statistik Pengadaan
                  </h3>
                </div>

                <span className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] text-slate-500">
                  6 Bulan Terakhir⌄
                </span>
              </div>

              <ProcurementChart />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_3px_15px_rgba(15,45,90,0.04)] sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl text-blue-600">◷</span>
                  <h3 className="font-extrabold">
                    Aktivitas Terbaru
                  </h3>
                </div>

                <span className="text-xs font-semibold text-blue-600">
                  Riwayat
                </span>
              </div>

              <div className="space-y-6">
  {activities.map((activity) => (
    <div key={activity.title} className="flex gap-3">
      <div
        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
          activity.color === "green"
            ? "bg-green-500"
            : activity.color === "orange"
              ? "bg-amber-400"
              : "bg-blue-600"
        }`}
      />

      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
        <p className="text-xs font-bold">
          {activity.title}
        </p>

        <p className="mt-1 text-[11px] text-slate-500">
          {activity.description}
        </p>

        <p className="mt-2 text-[10px] text-slate-400">
          {activity.time}
        </p>
      </div>
    </div>
    ))}
      </div>
            </div>
          </section>

          {/* Akses Cepat */}
          <section>
            <div className="mb-4">
              <h3 className="text-base font-extrabold">
                Akses Cepat
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Pilih menu untuk melanjutkan pekerjaan
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Link
                href="/permintaan"
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-600">
                  ▤
                </div>
                <h4 className="mt-4 font-bold group-hover:text-blue-600">
                  Permintaan Pengadaan
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Kelola data permintaan pengadaan barang dan jasa.
                </p>
              </Link>

              <Link
                href="/monitoring"
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-2xl text-teal-600">
                  📊
                </div>
                <h4 className="mt-4 font-bold group-hover:text-blue-600">
                  Monitoring Pengadaan
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Pantau status permintaan dan proses referensi harga.
                </p>
              </Link>

              <Link
                href="/dokumen"
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl text-purple-600">
                  ▧
                </div>
                <h4 className="mt-4 font-bold group-hover:text-blue-600">
                  Dokumen
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Lihat dan kelola dokumen permintaan pengadaan.
                </p>
              </Link>
            </div>
          </section>

          <footer className="border-t border-slate-200 py-5 text-center text-[10px] text-slate-400">
            © 2026 Sistem Pengadaan Barang dan Jasa PLN – Koperasi
          </footer>
        </div>
      </main>
    </div>
  );
}