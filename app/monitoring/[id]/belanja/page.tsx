
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ItemBelanja = {
  id: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: string;
  sudah_dibeli: boolean;
  tanggal_pembelian: string | null;
};

type DataBelanja = {
  id: string;
  status: string;
  items: ItemBelanja[];
  progress: {
    selesai: number;
    total: number;
  };
};

export default function BelanjaPage() {
  const params = useParams();
  const id = String(params.id);

  const [data, setData] = useState<DataBelanja | null>(null);
  const [loading, setLoading] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [error, setError] = useState("");
  const [pesan, setPesan] = useState("");
  const [memfinalisasi, setMemfinalisasi] = useState(false);

  const bolehEdit =
    data?.status === "Penawaran Disetujui" ||
    data?.status === "Proses Belanja Barang/Jasa";

  const selesai = useMemo(
    () => data?.items.filter((item) => item.sudah_dibeli).length ?? 0,
    [data]
  );

  const total = data?.items.length ?? 0;

  const progress = total > 0 ? (selesai / total) * 100 : 0;

  const semuaItemSelesai =
    total > 0 &&
    data?.items.every(
        (item) =>
        item.sudah_dibeli &&
        Boolean(item.tanggal_pembelian)
    ) === true;

const bolehFinalisasi =
  data?.status === "Proses Belanja Barang/Jasa" &&
  semuaItemSelesai;

  async function ambilData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/permintaan/${id}/belanja`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data.");
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    ambilData();
  }, [id]);

  function ubahChecklist(itemId: string, checked: boolean) {
    if (!data) return;

    setData({
      ...data,
      items: data.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              sudah_dibeli: checked,
              tanggal_pembelian: checked
                ? item.tanggal_pembelian
                : null,
            }
          : item
      ),
    });
  }

  function ubahTanggal(itemId: string, tanggal: string) {
    if (!data) return;

    setData({
      ...data,
      items: data.items.map((item) =>
        item.id === itemId
          ? { ...item, tanggal_pembelian: tanggal || null }
          : item
      ),
    });
  }

  async function simpanChecklist() {
    if (!data) return;

    const itemBelumAdaTanggal = data.items.find(
      (item) => item.sudah_dibeli && !item.tanggal_pembelian
    );

    if (itemBelumAdaTanggal) {
      setError(
        `Tanggal pembelian/pengerjaan untuk "${itemBelumAdaTanggal.nama_item}" wajib diisi.`
      );
      return;
    }

    if (data.items.length === 0) {
      setError("Tidak ada item yang dapat disimpan.");
      return;
    }

    try {
      setMenyimpan(true);
      setError("");
      setPesan("");

      const response = await fetch(
        `/api/permintaan/${id}/belanja`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: data.items.map((item) => ({
              id: item.id,
              sudah_dibeli: item.sudah_dibeli,
              tanggal_pembelian: item.tanggal_pembelian,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal menyimpan checklist."
        );
      }

      setPesan("Checklist belanja berhasil disimpan.");

      await ambilData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan."
      );
    } finally {
      setMenyimpan(false);
    }
  }


async function finalisasiPengadaan() {
  if (!data) return;

  const semuaSelesai =
    data.items.length > 0 &&
    data.items.every(
      (item) =>
        item.sudah_dibeli &&
        Boolean(item.tanggal_pembelian)
    );

  if (!semuaSelesai) {
    setError(
      "Semua item harus selesai dan tanggal pembelian/pengerjaan harus diisi."
    );
    return;
  }

  const konfirmasi = window.confirm(
    "Apakah seluruh barang/jasa sudah selesai dibeli atau dikerjakan dan pengadaan siap dikirim ke PLN?"
  );

  if (!konfirmasi) return;

  try {
    setMemfinalisasi(true);
    setError("");
    setPesan("");

    const response = await fetch(
      `/api/permintaan/${id}/siap-dikirim`,
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
        result.message || "Gagal memfinalisasi pengadaan."
      );
    }

    setPesan(
      "Pengadaan berhasil difinalisasi dan siap dikirim ke PLN."
    );

    await ambilData();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat finalisasi."
    );
  } finally {
    setMemfinalisasi(false);
  }
}


  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-center">
        Memuat data checklist belanja...
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6">
          <p className="text-red-600">
            {error || "Data permintaan tidak ditemukan."}
          </p>

          <Link
            href="/monitoring"
            className="mt-4 inline-block text-blue-600"
          >
            Kembali ke Monitoring
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Belanja Barang/Jasa
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Checklist pembelian barang atau penyelesaian jasa
              berdasarkan item permintaan pengadaan.
            </p>

            <p className="mt-2 text-sm font-medium text-gray-600">
              ID Permintaan: {data.id}
            </p>
          </div>

          <Link
            href="/monitoring"
            className="w-fit rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Kembali
          </Link>
        </div>

        {/* Ringkasan progress */}
        <section className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Progress Belanja Barang/Jasa
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-800">
                {selesai} dari {total} item selesai
              </p>
            </div>

            <span className="text-lg font-bold text-blue-700">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Status: {data.status}
          </p>
         
          {data.status === "Pengadaan Siap Dikirim" && (
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <p className="font-semibold text-teal-800">
                Pengadaan Siap Dikirim
                </p>
                <p className="mt-1 text-sm text-teal-700">
                Seluruh barang/jasa telah selesai dan pengadaan siap
                dikirim ke PLN.
                </p>
            </div>
            )}
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {pesan && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {pesan}
          </div>
        )}

        {!bolehEdit && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Checklist belum dapat diubah karena status permintaan
            belum Penawaran Disetujui atau Proses Belanja Barang/Jasa.
          </div>
        )}

        {/* Daftar item */}
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Daftar Item Permintaan
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Item diambil otomatis dari data permintaan yang sudah ada.
              Tidak perlu membuat item baru.
            </p>
          </div>

          {data.items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Belum ada item permintaan.
            </div>
          ) : (
            <div className="divide-y">
              {data.items.map((item, index) => (
                <div key={item.id} className="p-5">
                  <div className="flex flex-col gap-4">

                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-800">
                          {item.nama_item}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          {item.spesifikasi_item}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                            Jumlah: {item.jumlah_permintaan}
                          </span>

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                            Jenis: {item.jenis_item}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.sudah_dibeli}
                          disabled={!bolehEdit}
                          onChange={(e) =>
                            ubahChecklist(item.id, e.target.checked)
                          }
                          className="h-5 w-5 rounded border-gray-300 text-blue-600"
                        />

                        <span className="text-sm font-semibold text-gray-800">
                          Sudah Dibeli/Dikerjakan
                        </span>
                      </label>

                      {item.sudah_dibeli && (
                        <div className="mt-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Tanggal Pembelian/Pengerjaan
                            <span className="ml-1 text-red-500">*</span>
                          </label>

                          <input
                            type="date"
                            value={item.tanggal_pembelian ?? ""}
                            disabled={!bolehEdit}
                            onChange={(e) =>
                              ubahTanggal(item.id, e.target.value)
                            }
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 sm:w-64"
                          />
                        </div>
                      )}

                      {!item.sudah_dibeli && (
                        <p className="mt-2 text-xs text-gray-500">
                          Item ini belum ditandai selesai.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          
        <div className="border-t p-5">
        <p className="mb-4 text-sm text-gray-500">
            {selesai === total && total > 0
            ? "Semua item sudah ditandai selesai."
            : `Masih ada ${total - selesai} item yang belum selesai.`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
            <button
            type="button"
            onClick={simpanChecklist}
            disabled={!bolehEdit || menyimpan || total === 0}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
            {menyimpan ? "Menyimpan..." : "Simpan Checklist"}
            </button>

            {bolehFinalisasi && (
            <button
                type="button"
                onClick={finalisasiPengadaan}
                disabled={memfinalisasi || menyimpan}
                className="rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {memfinalisasi
                ? "Memproses..."
                : "Pengadaan Siap Dikirim"}
            </button>
            )}
        </div>
        </div>
        </section>
      </div>
    </main>
  );
}
