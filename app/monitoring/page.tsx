
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Permintaan = {
  id: string;
  nomor_surat: string;
  tanggal_surat: string;
  nama_unit: string;
  nama_pengadaan: string;
  jumlah_item: number;
  status: string;
};

type Ringkasan = {
  total: number;
  permintaanDiterima: number;
  prosesReferensiHarga: number;
  referensiHargaSelesai: number;
  penawaranDisetujui: number;
  prosesBelanja: number;
  pengadaanSiapDikirim: number;
};

type StatusDashboard =
  | "Permintaan Sudah Diinput"
  | "Referensi Harga Sudah Diinput"
  | "Penawaran Dibuat"
  | "Penawaran Dikirim"
  | "Penawaran Disetujui"
  | "Proses Belanja Barang/Jasa"
  | "Pengadaan Siap Dikirim";

const ringkasanAwal: Ringkasan = {
  total: 0,
  permintaanDiterima: 0,
  prosesReferensiHarga: 0,
  referensiHargaSelesai: 0,
  penawaranDisetujui: 0,
  prosesBelanja: 0,
  pengadaanSiapDikirim: 0,
};

function statusDashboard(status: string): StatusDashboard {
  switch (status) {
    case "Permintaan Diterima":
    case "Permintaan Sudah Diinput":
      return "Permintaan Sudah Diinput";

    case "Proses Referensi Harga":
    case "Referensi Harga Selesai":
    case "Referensi Harga Sudah Diinput":
      return "Referensi Harga Sudah Diinput";

    case "Penawaran Dibuat":
    case "Penawaran Harga Dibuat":
      return "Penawaran Dibuat";

    case "Surat Terkirim":
    case "Penawaran Dikirim":
      return "Penawaran Dikirim";

    case "Penawaran Disetujui":
      return "Penawaran Disetujui";

    case "Proses Belanja Barang/Jasa":
      return "Proses Belanja Barang/Jasa";

    case "Pengadaan Siap Dikirim":
      return "Pengadaan Siap Dikirim";

    default:
      return "Permintaan Sudah Diinput";
  }
}

function warnaStatus(status: StatusDashboard) {
  switch (status) {
    case "Permintaan Sudah Diinput":
      return "bg-blue-100 text-blue-700";

    case "Referensi Harga Sudah Diinput":
      return "bg-amber-100 text-amber-700";

    case "Penawaran Dibuat":
      return "bg-green-100 text-green-700";

    case "Penawaran Dikirim":
      return "bg-purple-100 text-purple-700";

    case "Penawaran Disetujui":
      return "bg-emerald-100 text-emerald-700";

    case "Proses Belanja Barang/Jasa":
      return "bg-orange-100 text-orange-700";

    case "Pengadaan Siap Dikirim":
      return "bg-teal-100 text-teal-700";
  }
}

function prosesSelanjutnya(status: StatusDashboard) {
  switch (status) {
    case "Permintaan Sudah Diinput":
      return "Input referensi harga";

    case "Referensi Harga Sudah Diinput":
      return "Buat surat penawaran";

    case "Penawaran Dibuat":
      return "Kirim penawaran ke PLN";

    case "Penawaran Dikirim":
      return "Menunggu persetujuan PLN";

    case "Penawaran Disetujui":
      return "Siap belanja barang/jasa";

    case "Proses Belanja Barang/Jasa":
      return "Selesaikan checklist belanja barang/jasa";

    case "Pengadaan Siap Dikirim":
      return "Siap dikirim ke PLN";
  }
}

export default function MonitoringPage() {
  const [data, setData] = useState<Permintaan[]>([]);
  const [ringkasan, setRingkasan] =
    useState<Ringkasan>(ringkasanAwal);

  const [pencarian, setPencarian] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const ambilData = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil data monitoring"
        );
      }

      setData(result.data ?? []);

      setRingkasan({
        ...ringkasanAwal,
        ...(result.ringkasan ?? {}),
      });

      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ambilData();
  }, [ambilData]);

  async function ubahStatus(
    item: Permintaan,
    statusBaru: "Penawaran Dikirim" | "Penawaran Disetujui"
  ) {
    const pesan =
      statusBaru === "Penawaran Dikirim"
        ? "Apakah surat penawaran benar-benar sudah dikirim kepada PLN?"
        : "Apakah penawaran sudah disetujui oleh PLN?";

    if (!window.confirm(pesan)) return;

    try {
      setProcessingId(item.id);
      setError("");

      const response = await fetch(
        `/api/permintaan/${item.id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusBaru,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengubah status pengadaan."
        );
      }

      await ambilData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengubah status."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const dataTersaring = useMemo(() => {
    const kataKunci = pencarian.toLowerCase().trim();

    return data.filter((item) => {
      const cocokPencarian =
        item.nomor_surat.toLowerCase().includes(kataKunci) ||
        item.nama_pengadaan.toLowerCase().includes(kataKunci) ||
        item.nama_unit.toLowerCase().includes(kataKunci);

      const status = statusDashboard(item.status);

      const cocokStatus =
        filterStatus === "Semua" || status === filterStatus;

      return cocokPencarian && cocokStatus;
    });
  }, [data, pencarian, filterStatus]);

  function formatTanggal(tanggal: string) {
    if (!tanggal) return "-";

    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Judul dan tombol kembali */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">
              Dashboard Monitoring Pengadaan
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Pantau seluruh tahapan proses permintaan pengadaan.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            ← Dashboard Utama
          </Link>
        </div>

        {/* Ringkasan */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Permintaan</p>
            <p className="mt-2 text-3xl font-bold text-gray-800">
              {ringkasan.total}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Permintaan Diterima</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {ringkasan.permintaanDiterima}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Proses Referensi Harga</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {ringkasan.prosesReferensiHarga}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Referensi Harga Selesai</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {ringkasan.referensiHargaSelesai}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Penawaran Disetujui</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {ringkasan.penawaranDisetujui}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Proses Belanja</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {ringkasan.prosesBelanja}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pengadaan Siap Dikirim</p>
            <p className="mt-2 text-3xl font-bold text-teal-600">
              {ringkasan.pengadaanSiapDikirim}
            </p>
          </div>

        </div>

        {/* Daftar permintaan */}
        <section className="rounded-xl border bg-white shadow-sm">

          <div className="border-b p-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Daftar Permintaan Pengadaan
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Daftar seluruh permintaan yang tercatat dalam sistem.
            </p>
          </div>

          {/* Pencarian dan filter */}
          <div className="flex flex-col gap-3 p-5 md:flex-row">
            <input
              type="text"
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              placeholder="Cari nomor surat, nama pengadaan, atau unit..."
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500 md:w-64"
            >
              <option value="Semua">Semua Status</option>

              <option value="Permintaan Sudah Diinput">
                Permintaan Sudah Diinput
              </option>

              <option value="Referensi Harga Sudah Diinput">
                Referensi Harga Sudah Diinput
              </option>

              <option value="Penawaran Dibuat">
                Penawaran Dibuat
              </option>

              <option value="Penawaran Dikirim">
                Penawaran Dikirim
              </option>

              <option value="Penawaran Disetujui">
                Penawaran Disetujui
              </option>

              <option value="Proses Belanja Barang/Jasa">
                Proses Belanja Barang/Jasa
              </option>

              <option value="Pengadaan Siap Dikirim">
                Pengadaan Siap Dikirim
              </option>
            </select>
          </div>

          {/* Pesan error */}
          {error && (
            <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Tabel data */}
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Memuat data monitoring...
            </div>
          ) : dataTersaring.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Tidak ada data permintaan yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">

                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-5 py-4">No.</th>
                    <th className="px-5 py-4">Nomor Surat</th>
                    <th className="px-5 py-4">Tanggal Surat</th>
                    <th className="px-5 py-4">Unit PLN</th>
                    <th className="px-5 py-4">Nama Pengadaan</th>
                    <th className="px-5 py-4 text-center">Jumlah Item</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Proses Selanjutnya</th>
                    <th className="px-5 py-4">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {dataTersaring.map((item, index) => {
                    const status = statusDashboard(item.status);
                    const sedangDiproses = processingId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">

                        <td className="px-5 py-4">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4 font-medium text-gray-800">
                          {item.nomor_surat}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {formatTanggal(item.tanggal_surat)}
                        </td>

                        <td className="px-5 py-4">
                          {item.nama_unit}
                        </td>

                        <td className="px-5 py-4">
                          {item.nama_pengadaan}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {item.jumlah_item}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${warnaStatus(status)}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {prosesSelanjutnya(status)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-2">

                            {status === "Permintaan Sudah Diinput" && (
                              <Link
                                href={`/monitoring/${item.id}/referensi-harga`}
                                className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                Input Referensi Harga
                              </Link>
                            )}

                            {status === "Referensi Harga Sudah Diinput" && (
                              <Link
                                href={`/monitoring/${item.id}/surat-penawaran`}
                                className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                Buat Surat Penawaran
                              </Link>
                            )}

                            {(
                              status === "Penawaran Dibuat" ||
                              status === "Penawaran Dikirim" ||
                              status === "Penawaran Disetujui"
                            ) && (
                              <Link
                                href={`/monitoring/${item.id}/surat-penawaran`}
                                className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                              >
                                Lihat Surat Penawaran
                              </Link>
                            )}

                            {status === "Penawaran Dibuat" && (
                              <button
                                type="button"
                                onClick={() =>
                                  ubahStatus(item, "Penawaran Dikirim")
                                }
                                disabled={sedangDiproses}
                                className="whitespace-nowrap rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                              >
                                {sedangDiproses
                                  ? "Memproses..."
                                  : "Penawaran Dikirim"}
                              </button>
                            )}

                            {status === "Penawaran Dikirim" && (
                              <button
                                type="button"
                                onClick={() =>
                                  ubahStatus(item, "Penawaran Disetujui")
                                }
                                disabled={sedangDiproses}
                                className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {sedangDiproses
                                  ? "Memproses..."
                                  : "Penawaran Disetujui"}
                              </button>
                            )}

                            {(
                              status === "Penawaran Disetujui" ||
                              status === "Proses Belanja Barang/Jasa"
                            ) && (
                              <Link
                                href={`/monitoring/${item.id}/belanja`}
                                className="whitespace-nowrap rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                              >
                                Belanja Barang/Jasa
                              </Link>
                            )}

                            {status === "Pengadaan Siap Dikirim" && (
                              <Link
                                href={`/monitoring/${item.id}/belanja`}
                                className="whitespace-nowrap rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                              >
                                Lihat Checklist Belanja
                              </Link>
                            )}

                            <Link
                              href={`/permintaan/${item.id}`}
                              className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                            >
                              Lihat Detail
                            </Link>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && (
            <div className="border-t px-5 py-4 text-sm text-gray-500">
              Menampilkan {dataTersaring.length} dari {data.length} permintaan.
            </div>
          )}

        </section>
      </div>
    </main>
  );
}
