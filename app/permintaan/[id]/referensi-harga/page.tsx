"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Item = {
  id: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: string;
  referencePrice: string | null;
};

type Permintaan = {
  id: string;
  nomor_surat: string;
  nama_pengadaan: string;
  nama_unit: string;
  status: string;
  items: Item[];
};

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ReferensiHargaPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [permintaan, setPermintaan] = useState<Permintaan | null>(null);
  const [harga, setHarga] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/permintaan/${id}/referensi-harga`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal mengambil data permintaan."
          );
        }

        setPermintaan(result.data);

        const hargaAwal: Record<string, string> = {};

        result.data.items.forEach((item: Item) => {
          hargaAwal[item.id] = item.referencePrice
            ? item.referencePrice
            : "";
        });

        setHarga(hargaAwal);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil data permintaan."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const handleHargaChange = (itemId: string, value: string) => {
    const cleanValue = value.replace(/\D/g, "");

    setHarga((previous) => ({
      ...previous,
      [itemId]: cleanValue,
    }));

    setMessage("");
    setError("");
  };

  const getTotalItem = (item: Item) => {
    const hargaSatuan = Number(harga[item.id] || 0);

    return item.jumlah_permintaan * hargaSatuan;
  };

  const totalSemua = useMemo(() => {
    if (!permintaan) return 0;

    return permintaan.items.reduce((total, item) => {
      return total + getTotalItem(item);
    }, 0);
  }, [permintaan, harga]);

  const simpanData = async (action: "draft" | "complete") => {
    if (!permintaan) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (action === "complete") {
        const adaHargaKosong = permintaan.items.some(
          (item) => !harga[item.id] || Number(harga[item.id]) <= 0
        );

        if (adaHargaKosong) {
          setError(
            "Semua item harus memiliki referensi harga sebelum diselesaikan."
          );
          setSaving(false);
          return;
        }
      }

      const items = permintaan.items.map((item) => ({
        id: item.id,
        referencePrice: harga[item.id]
          ? harga[item.id]
          : null,
      }));

      const response = await fetch(
        `/api/permintaan/${id}/referensi-harga`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            items,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan referensi harga."
        );
      }

      setMessage(result.message);

      setPermintaan((previous) =>
        previous
          ? {
              ...previous,
              status: result.data.status,
            }
          : previous
      );

      if (action === "complete") {
        setTimeout(() => {
          router.push(`/permintaan/${id}`);
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan referensi harga."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Memuat data permintaan...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !permintaan) {
    return (
      <main className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/permintaan"
            className="mb-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Kembali ke Permintaan
          </Link>

          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!permintaan) return null;

  const sudahSelesai =
    permintaan.status === "Referensi Harga Selesai";

  return (
    <main className="min-h-screen bg-[#f3f7fc] px-5 py-8 text-[#102b50] sm:px-8">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #print-referensi-harga,
          #print-referensi-harga * {
            visibility: visible !important;
          }

          #print-referensi-harga {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="print-referensi-harga" className="mx-auto max-w-6xl">
        {/* Kembali */}
        <Link
          href={`/permintaan/${id}`}
          className="no-print mb-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Kembali ke Detail Permintaan
        </Link>

        {/* Header */}
        <div className="mb-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-2xl font-extrabold">
                Input Referensi Harga
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Masukkan referensi harga satuan untuk setiap item permintaan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold ${
                  sudahSelesai
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {permintaan.status}
              </span>

              <button
                type="button"
                onClick={() => window.print()}
                className="no-print rounded-xl bg-[#0754a5] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#064486]"
              >
                Cetak Referensi Harga
              </button>
            </div>
          </div>
        </div>

        {/* Informasi Permintaan */}
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 border-b border-slate-100 pb-4 font-extrabold">
            Informasi Permintaan
          </h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                Nomor Surat
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                {permintaan.nomor_surat}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400">
                Unit PLN
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                {permintaan.nama_unit}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400">
                Nama Pengadaan
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                {permintaan.nama_pengadaan}
              </p>
            </div>
          </div>
        </section>

        {/* Pesan */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Daftar Item */}
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-extrabold">
              Daftar Item Permintaan
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Harga referensi diinput langsung pada masing-masing item.
            </p>
          </div>

          {permintaan.items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mb-3 text-4xl">📦</div>

              <h3 className="font-bold text-slate-700">
                Belum Ada Item
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Permintaan ini belum memiliki item pengadaan.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[#f5f8fc] text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-4">No.</th>
                      <th className="px-5 py-4">Nama Item</th>
                      <th className="px-5 py-4">Spesifikasi</th>
                      <th className="px-5 py-4">Jumlah</th>
                      <th className="px-5 py-4">Jenis Item</th>
                      <th className="px-5 py-4">
                        Referensi Harga Satuan
                      </th>
                      <th className="px-5 py-4">Estimasi Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {permintaan.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-blue-50/30"
                      >
                        <td className="px-5 py-5 text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-5 font-semibold text-slate-700">
                          {item.nama_item}
                        </td>

                        <td className="max-w-[280px] px-5 py-5 text-slate-600">
                          <div className="whitespace-pre-line">
                            {item.spesifikasi_item}
                          </div>
                        </td>

                        <td className="px-5 py-5 font-semibold text-slate-700">
                          {item.jumlah_permintaan}
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {item.jenis_item}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex min-w-[210px] items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                            <span className="border-r border-slate-200 px-3 text-sm font-semibold text-slate-500">
                              Rp
                            </span>

                            <input
                              type="text"
                              inputMode="numeric"
                              value={harga[item.id] || ""}
                              disabled={sudahSelesai}
                              onChange={(event) =>
                                handleHargaChange(
                                  item.id,
                                  event.target.value
                                )
                              }
                              placeholder="0"
                              className="w-full rounded-r-lg px-3 py-3 text-sm font-semibold outline-none disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>
                        </td>

                        <td className="px-5 py-5 font-bold text-[#0754a5]">
                          {formatRupiah(getTotalItem(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="border-t border-slate-100 bg-[#f8fafc] px-6 py-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm text-slate-500">
                      Total Estimasi Harga Permintaan
                    </p>

                    <p className="mt-1 text-2xl font-extrabold text-[#0754a5]">
                      {formatRupiah(totalSemua)}
                    </p>
                  </div>

                  {!sudahSelesai && (
                    <div className="no-print flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => simpanData("draft")}
                        className="rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Menyimpan..." : "Simpan Draft"}
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => simpanData("complete")}
                        className="rounded-xl bg-[#0754a5] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#064486] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving
                          ? "Menyimpan..."
                          : "Selesaikan Referensi Harga"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}