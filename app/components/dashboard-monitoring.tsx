
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ItemPengadaan = {
  id: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: string;
  sudah_dibeli: boolean;
  tanggal_pembelian: string | null;
};

type Permintaan = {
  id: string;
  nomor_surat: string;
  tanggal_surat: string;
  nama_unit: string;
  nama_pengadaan: string;
  jumlah_item: number;
  status: string;
  items: ItemPengadaan[];
  tanggal_pengiriman?: string | null;
};

type StatusDashboard =
  | "Permintaan Sudah Diinput"
  | "Referensi Harga Sudah Diinput"
  | "Penawaran Dibuat"
  | "Penawaran Dikirim"
  | "Penawaran Disetujui"
  | "Proses Belanja Barang/Jasa"
  | "Pengadaan Siap Dikirim"
  | "Pengadaan Telah Selesai";


function statusDashboard(status: string): StatusDashboard {
  switch (status) {
    case "Permintaan Diterima":
    case "Permintaan Sudah Diinput":
      return "Permintaan Sudah Diinput";

    case "Proses Referensi Harga":
      return "Permintaan Sudah Diinput";

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

    case "Pengadaan Telah Selesai":
      return "Pengadaan Telah Selesai";

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

    case "Pengadaan Telah Selesai":
      return "bg-green-100 text-green-800";

    default:
      return "bg-gray-100 text-gray-700";
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
      return "Mulai belanja barang/jasa";

    case "Proses Belanja Barang/Jasa":
      return "Selesaikan checklist belanja";

    case "Pengadaan Siap Dikirim":
      return "Kirim barang/jasa ke PLN";

    case "Pengadaan Telah Selesai":
      return "Pengadaan telah selesai";

    default:
      return "-";
  }
}

function formatTanggal(tanggal: string) {
  if (!tanggal) return "-";

  const date = new Date(tanggal);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTanggalWaktu(tanggal: string) {
  if (!tanggal) return "-";

  const date = new Date(tanggal);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardMonitoring() {
  const [data, setData] = useState<Permintaan[]>([]);
  const [pencarian, setPencarian] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pesan, setPesan] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [pengirimanItem, setPengirimanItem] =
    useState<Permintaan | null>(null);

  const ambilData = useCallback(async () => {
    try {
      const response = await fetch("/api/monitoring", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil data monitoring."
        );
      }

      setData(result.data ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
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
    const pesanKonfirmasi =
      statusBaru === "Penawaran Dikirim"
        ? "Apakah surat penawaran benar-benar sudah dikirim kepada PLN?"
        : "Apakah penawaran sudah disetujui oleh PLN?";

    if (!window.confirm(pesanKonfirmasi)) return;

    try {
      setProcessingId(item.id);
      setError("");
      setPesan("");

      const response = await fetch(
        `/api/permintaan/${item.id}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: statusBaru }),
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

  async function kirimBarangJasa(item: Permintaan) {
    const semuaItemSelesai =
      item.items.length > 0 &&
      item.items.every(
        (detail) =>
          detail.sudah_dibeli === true &&
          Boolean(detail.tanggal_pembelian)
      );

    if (!semuaItemSelesai) {
      setError(
        "Semua item harus selesai dan memiliki tanggal pembelian sebelum dikirim."
      );
      setPengirimanItem(null);
      return;
    }

    try {
      setProcessingId(item.id);
      setError("");
      setPesan("");

      const response = await fetch(
        `/api/permintaan/${item.id}/kirim`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengirim barang/jasa."
        );
      }

      setPengirimanItem(null);

      setPesan(
        `Pengadaan ${item.nomor_surat} berhasil dikirim dan telah selesai.`
      );

      await ambilData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim barang/jasa."
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

      const cocokStatus =
        filterStatus === "Semua" ||
        statusDashboard(item.status) === filterStatus;

      return cocokPencarian && cocokStatus;
    });
  }, [data, pencarian, filterStatus]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_3px_15px_rgba(15,45,90,0.04)]">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-extrabold text-[#102b50]">
              Monitoring Status Pengadaan
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Pantau tahapan setiap permintaan pengadaan secara otomatis.
            </p>
          </div>

          <Link
            href="/monitoring"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Lihat Monitoring Lengkap →
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={pencarian}
            onChange={(e) => setPencarian(e.target.value)}
            placeholder="Cari nomor surat, pengadaan, atau unit PLN..."
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 md:w-64"
          >
            <option value="Semua">Semua Status</option>
            <option value="Permintaan Sudah Diinput">
              Permintaan Sudah Diinput
            </option>
            <option value="Referensi Harga Sudah Diinput">
              Referensi Harga Sudah Diinput
            </option>
            <option value="Penawaran Dibuat">Penawaran Dibuat</option>
            <option value="Penawaran Dikirim">Penawaran Dikirim</option>
            <option value="Penawaran Disetujui">
              Penawaran Disetujui
            </option>
            <option value="Proses Belanja Barang/Jasa">
              Proses Belanja Barang/Jasa
            </option>
            <option value="Pengadaan Siap Dikirim">
              Pengadaan Siap Dikirim
            </option>
            <option value="Pengadaan Telah Selesai">
              Pengadaan Telah Selesai
            </option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {pesan && (
        <div className="mx-5 mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {pesan}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Memuat data monitoring...
        </div>
      ) : error && data.length === 0 ? (
        <div className="p-10 text-center text-sm text-red-600">
          Gagal memuat data monitoring.
        </div>
      ) : dataTersaring.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Tidak ada data permintaan yang ditemukan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Nomor Surat Permintaan</th>
                <th className="px-5 py-4">Tanggal Permintaan</th>
                <th className="px-5 py-4">Nama Pengadaan</th>
                <th className="px-5 py-4">Unit PLN</th>
                <th className="px-5 py-4 text-center">Jumlah Item</th>
                <th className="px-5 py-4">Status Saat Ini</th>
                <th className="px-5 py-4">Proses Selanjutnya</th>
                <th className="px-5 py-4">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {dataTersaring.map((item, index) => {
                const status = statusDashboard(item.status);
                const sedangDiproses = processingId === item.id;

                return (
                  <tr
                    key={item.id}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4 text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-4 font-semibold text-[#102b50]">
                      {item.nomor_surat}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatTanggal(item.tanggal_surat)}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      {item.nama_pengadaan}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.nama_unit}
                    </td>

                    <td className="px-5 py-4 text-center font-semibold">
                      {item.jumlah_item}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${warnaStatus(status)}`}
                      >
                        {item.status}
                      </span>

                      {item.status === "Pengadaan Telah Selesai" &&
                        item.tanggal_pengiriman && (
                          <p className="mt-2 whitespace-nowrap text-xs text-green-700">
                            Dikirim:{" "}
                            {formatTanggalWaktu(item.tanggal_pengiriman)}
                          </p>
                        )}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {prosesSelanjutnya(status)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-2">
                        {status === "Permintaan Sudah Diinput" && (
                          <Link
                            href={`/monitoring/${item.id}/referensi-harga`}
                            className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Input Referensi Harga
                          </Link>
                        )}

                        {status === "Referensi Harga Sudah Diinput" && (
                          <Link
                            href={`/monitoring/${item.id}/surat-penawaran`}
                            className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Buat Surat Penawaran
                          </Link>
                        )}

                        {(status === "Penawaran Dibuat" ||
                          status === "Penawaran Dikirim" ||
                          status === "Penawaran Disetujui") && (
                          <Link
                            href={`/monitoring/${item.id}/surat-penawaran`}
                            className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
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
                            className="whitespace-nowrap rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
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
                            className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {sedangDiproses
                              ? "Memproses..."
                              : "Penawaran Disetujui"}
                          </button>
                        )}

                        {(status === "Penawaran Disetujui" ||
                          status === "Proses Belanja Barang/Jasa") && (
                          <Link
                            href={`/monitoring/${item.id}/belanja`}
                            className="whitespace-nowrap rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                          >
                            {status === "Penawaran Disetujui"
                              ? "Mulai Belanja Barang/Jasa"
                              : "Lanjutkan Belanja"}
                          </Link>
                        )}

                        {status === "Pengadaan Siap Dikirim" && (
                          <>
                            <Link
                              href={`/monitoring/${item.id}/belanja`}
                              className="whitespace-nowrap rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                            >
                              Lihat Checklist Belanja
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setError("");
                                setPesan("");
                                setPengirimanItem(item);
                              }}
                              disabled={sedangDiproses}
                              className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Kirim Barang/Jasa
                            </button>
                          </>
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
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Menampilkan {dataTersaring.length} dari {data.length} permintaan.
        </div>
      )}

      {pengirimanItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">
              Konfirmasi Pengiriman Barang/Jasa
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Periksa ringkasan item berikut sebelum mengonfirmasi
              pengiriman ke PLN.
            </p>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p>
                <strong>Nomor Surat:</strong>{" "}
                {pengirimanItem.nomor_surat}
              </p>
              <p className="mt-1">
                <strong>Nama Pengadaan:</strong>{" "}
                {pengirimanItem.nama_pengadaan}
              </p>
              <p className="mt-1">
                <strong>Unit PLN:</strong>{" "}
                {pengirimanItem.nama_unit}
              </p>
            </div>

            <h3 className="mt-5 font-semibold text-slate-800">
              Ringkasan Item Pengadaan
            </h3>

            {pengirimanItem.items.length === 0 ? (
              <p className="mt-3 text-sm text-red-600">
                Tidak ada item pengadaan.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {pengirimanItem.items.map((detail, index) => (
                  <div
                    key={detail.id}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p className="font-semibold text-slate-800">
                      {index + 1}. {detail.nama_item}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Spesifikasi: {detail.spesifikasi_item}
                    </p>

                    <p className="text-slate-600">
                      Jumlah: {detail.jumlah_permintaan} | Jenis:{" "}
                      {detail.jenis_item}
                    </p>

                    <p
                      className={`mt-1 ${
                        detail.sudah_dibeli &&
                        detail.tanggal_pembelian
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {detail.sudah_dibeli &&
                      detail.tanggal_pembelian
                        ? `Selesai — ${formatTanggal(detail.tanggal_pembelian)}`
                        : "Belum lengkap"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Setelah dikonfirmasi, status akan berubah menjadi
              Pengadaan Telah Selesai. Tanggal dan waktu pengiriman
              dicatat otomatis oleh server.
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setPengirimanItem(null)}
                disabled={processingId === pengirimanItem.id}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => kirimBarangJasa(pengirimanItem)}
                disabled={
                  processingId === pengirimanItem.id ||
                  pengirimanItem.items.length === 0 ||
                  !pengirimanItem.items.every(
                    (detail) =>
                      detail.sudah_dibeli &&
                      Boolean(detail.tanggal_pembelian)
                  )
                }
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId === pengirimanItem.id
                  ? "Memproses..."
                  : "Konfirmasi Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
