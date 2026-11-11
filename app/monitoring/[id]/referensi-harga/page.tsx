"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type ReferenceItem = {
  id: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: string;
  referencePrice: string | null;
};

type RequestData = {
  id: string;
  nomor_surat: string;
  nama_pengadaan: string;
  nama_unit: string;
  status: string;
  items: ReferenceItem[];
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ReferensiHargaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [data, setData] = useState<RequestData | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isCompleted = data?.status === "Referensi Harga Selesai";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/permintaan/${id}/referensi-harga`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengambil data.");
      }

      const requestData: RequestData = result.data;
      setData(requestData);

      const initialPrices: Record<string, string> = {};

      requestData.items.forEach((item) => {
        initialPrices[item.id] = item.referencePrice ?? "";
      });

      setPrices(initialPrices);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalKeseluruhan = useMemo(() => {
    if (!data) return 0;

    return data.items.reduce((total, item) => {
      const price = Number(prices[item.id] || 0);
      return total + price * item.jumlah_permintaan;
    }, 0);
  }, [data, prices]);

  const jumlahHargaTerisi = useMemo(() => {
    if (!data) return 0;

    return data.items.filter((item) => {
      const price = Number(prices[item.id]);
      return (
        prices[item.id]?.trim() !== "" &&
        Number.isFinite(price) &&
        price > 0
      );
    }).length;
  }, [data, prices]);

  function handlePriceChange(itemId: string, value: string) {
    setPrices((previous) => ({
      ...previous,
      [itemId]: value,
    }));
  }

  async function handleSave(action: "draft" | "complete") {
    if (!data || saving) return;

    if (action === "complete") {
      if (jumlahHargaTerisi !== data.items.length) {
        setError("Semua item wajib diisi harga referensinya.");
        return;
      }

      const confirmed = window.confirm(
        "Selesaikan referensi harga? Setelah selesai, harga tidak dapat diedit lagi."
      );

      if (!confirmed) return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/permintaan/${id}/referensi-harga`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            items: data.items.map((item) => ({
              id: item.id,
              referencePrice:
                prices[item.id]?.trim() === ""
                  ? null
                  : prices[item.id].trim(),
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan referensi harga."
        );
      }

      await loadData();
      setSuccess(result.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-8 text-center shadow-sm">
          Memuat data referensi harga...
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-8">
          <p className="font-semibold text-red-600">
            {error || "Data permintaan tidak ditemukan."}
          </p>

          <Link
            href="/"
            className="font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Pengaturan cetak */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          #area-cetak,
          #area-cetak * {
            visibility: visible !important;
          }

          #area-cetak {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          #area-cetak input {
            border: none !important;
            background: transparent !important;
            padding-left: 0 !important;
            color: #111827 !important;
            box-shadow: none !important;
          }

          #area-cetak section,
          #area-cetak table {
            break-inside: avoid;
          }
        }
      `}</style>

      <div
        id="area-cetak"
        className="mx-auto max-w-7xl space-y-6"
      >
        {/* Header */}
        <div>
          <Link
            href="/"
            className="no-print font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Kembali ke Dashboard
          </Link>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Referensi Harga
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Input dan pengelolaan harga referensi barang pengadaan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-bold ${
                  isCompleted
                    ? "bg-green-100 text-green-700"
                    : data.status === "Proses Referensi Harga"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {data.status}
              </span>

              {/* Tombol Cetak */}
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow hover:bg-blue-800"
              >
                🖨 Cetak Referensi Harga
              </button>
            </div>
          </div>
        </div>

        {/* Informasi Permintaan */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Nomor Surat</p>
            <p className="mt-2 font-bold text-slate-800">
              {data.nomor_surat}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unit PLN</p>
            <p className="mt-2 font-bold text-slate-800">
              {data.nama_unit}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Nama Pengadaan</p>
            <p className="mt-2 font-bold text-slate-800">
              {data.nama_pengadaan}
            </p>
          </div>
        </section>

        {/* Pesan */}
        {error && (
          <div className="no-print rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="no-print rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Daftar Item */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-800">
                Daftar Item Pengadaan
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {data.items.length} item dalam permintaan ini
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              Harga terisi: {jumlahHargaTerisi}/{data.items.length}
            </span>
          </div>

          {data.items.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              Belum ada item dalam permintaan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">No.</th>
                    <th className="px-5 py-4">Nama Item</th>
                    <th className="px-5 py-4">Spesifikasi</th>
                    <th className="px-5 py-4">Jenis</th>
                    <th className="px-5 py-4 text-right">Jumlah</th>
                    <th className="px-5 py-4">Harga Satuan Referensi</th>
                    <th className="px-5 py-4 text-right">Subtotal</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item, index) => {
                    const price = Number(prices[item.id] || 0);
                    const subtotal =
                      price * item.jumlah_permintaan;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {item.nama_item}
                        </td>

                        <td className="max-w-xs px-5 py-4 text-slate-600">
                          {item.spesifikasi_item || "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {item.jenis_item}
                        </td>

                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {item.jumlah_permintaan}
                        </td>

                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isCompleted}
                            value={prices[item.id] ?? ""}
                            onChange={(event) =>
                              handlePriceChange(
                                item.id,
                                event.target.value
                              )
                            }
                            placeholder="Masukkan harga"
                            className="w-48 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-800">
                          {formatRupiah(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total dan tombol aksi */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 p-5">
            <div>
              <p className="text-sm text-slate-500">
                Total Keseluruhan Referensi Harga
              </p>

              <p className="mt-1 text-2xl font-extrabold text-blue-800">
                {formatRupiah(totalKeseluruhan)}
              </p>
            </div>

            <div className="no-print flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Kembali
              </button>

              {!isCompleted && (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSave("draft")}
                    className="rounded-lg border border-blue-700 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Draft"}
                  </button>

                  <button
                    type="button"
                    disabled={saving || data.items.length === 0}
                    onClick={() => handleSave("complete")}
                    className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Memproses..."
                      : "Selesaikan Referensi Harga"}
                  </button>
                </>
              )}

              {isCompleted && (
                <span className="rounded-lg bg-green-100 px-5 py-3 text-sm font-bold text-green-700">
                  Referensi Harga Telah Selesai
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}