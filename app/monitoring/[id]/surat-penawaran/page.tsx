
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type ItemPermintaan = {
  id: string;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_permintaan: number;
  jenis_item: string;
  referencePrice: string | null;
};

type ItemPenawaran = {
  id: string;
  request_item_id: string | null;
  nama_item: string;
  spesifikasi_item: string;
  jumlah_penawaran: number;
  jenis_item: string;
  harga_satuan: string | null;
  subtotal: string | null;
};

type SuratPenawaran = {
  id: string;
  nomor_surat: string;
  tanggal_surat: string;
  catatan: string | null;
  status: string;
  tanggal_dikirim: string | null;
  tanggal_diterima: string | null;
  items: ItemPenawaran[];
};

type DataPenawaran = {
  id: string;
  nomor_surat_pln: string;
  nama_unit: string;
  nama_pengadaan: string;
  status_permintaan: string;
  items_permintaan: ItemPermintaan[];
  surat_penawaran: SuratPenawaran | null;
};

function formatRupiah(value: number | string | null) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function formatTanggal(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function tanggalInput(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function SuratPenawaranPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [data, setData] = useState<DataPenawaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tanggalSurat, setTanggalSurat] = useState("");
  const [tanggalDikirim, setTanggalDikirim] = useState("");
  const [catatan, setCatatan] = useState("");
  const [harga, setHarga] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/permintaan/${id}/surat-penawaran`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengambil data.");
      }

      const detail: DataPenawaran = result.data;
      console.log(
      "Tanggal pengiriman dari database:", 
      detail.surat_penawaran?.tanggal_dikirim
      );

      setData(detail);

      if (detail.surat_penawaran) {
        const surat = detail.surat_penawaran;

        setTanggalSurat(tanggalInput(surat.tanggal_surat));
        setTanggalDikirim(tanggalInput(surat.tanggal_dikirim ?? ""));
        setCatatan(surat.catatan ?? "");

        const hargaAwal: Record<string, string> = {};

        surat.items.forEach((item) => {
          hargaAwal[item.id] = item.harga_satuan ?? "";
        });

        setHarga(hargaAwal);
      }
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

  const surat = data?.surat_penawaran ?? null;
  const isDraft = surat?.status === "Draft";
  const isEditable = isDraft;

  const totalKeseluruhan = useMemo(() => {
    if (!surat) return 0;

    return surat.items.reduce((total, item) => {
      const unitPrice = Number(harga[item.id] ?? 0);

      return (
        total +
        (Number.isFinite(unitPrice) ? unitPrice : 0) *
          item.jumlah_penawaran
      );
    }, 0);
  }, [surat, harga]);

  const semuaHargaTerisi = useMemo(() => {
    if (!surat || surat.items.length === 0) return false;

    return surat.items.every((item) => {
      const value = harga[item.id];

      return (
        value !== undefined &&
        value.trim() !== "" &&
        Number.isFinite(Number(value)) &&
        Number(value) > 0
      );
    });
  }, [surat, harga]);

  async function buatDraft() {
    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/permintaan/${id}/surat-penawaran`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal membuat draft.");
      }

      setSuccess(result.message);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal membuat draft."
      );
    } finally {
      setCreating(false);
    }
  }

  
async function simpanDraft() {
  if (!surat) return;

  try {
    setSaving(true);
    setError("");
    setSuccess("");

    const items = surat.items.map((item) => ({
      id: item.id,
      harga_satuan: harga[item.id]?.trim() || null,
    }));

    console.log("Tanggal pengiriman yang akan disimpan:", tanggalDikirim);
    const response = await fetch(
      `/api/permintaan/${id}/surat-penawaran`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggal_surat: tanggalSurat,
          tanggal_dikirim: tanggalDikirim || null,
          catatan,
          items,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal menyimpan draft.");
    }

    setSuccess("Draft surat penawaran berhasil disimpan.");
    await loadData();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Gagal menyimpan draft."
    );
  } finally {
    setSaving(false);
  }
}


  async function tandaiTerkirim() {
  if (!surat) return;

  if (!tanggalDikirim) {
    setError("Isi tanggal pengiriman surat terlebih dahulu.");
    return;
  }

  if (!semuaHargaTerisi) {
    setError("Lengkapi seluruh harga penawaran sebelum mengirim surat.");
    return;
  }

  const konfirmasi = window.confirm(
    "Apakah Anda yakin surat penawaran ini sudah dikirim? Setelah dikonfirmasi, draft tidak dapat diedit lagi."
  );

  if (!konfirmasi) return;

  try {
    setSending(true);
    setError("");
    setSuccess("");

    // Simpan perubahan draft terakhir sebelum mengunci surat.
    const saveResponse = await fetch(
      `/api/permintaan/${id}/surat-penawaran`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        tanggal_surat: tanggalSurat,
        tanggal_dikirim: tanggalDikirim || null,
        catatan,
        items: surat.items.map((item) => ({
          id: item.id,
          harga_satuan: harga[item.id]?.trim() || null,
        })),
      }),
      }
    );

    const saveResult = await saveResponse.json();

    if (!saveResponse.ok || !saveResult.success) {
      throw new Error(
        saveResult.message || "Gagal menyimpan draft terakhir."
      );
    }

    // Ubah status menjadi Surat Terkirim.
    const sendResponse = await fetch(
      `/api/permintaan/${id}/surat-penawaran`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tanggal_dikirim: tanggalDikirim,
        }),
      }
    );

    const sendResult = await sendResponse.json();

    if (!sendResponse.ok || !sendResult.success) {
      throw new Error(
        sendResult.message || "Gagal mengubah status surat."
      );
    }

    setSuccess("Surat penawaran berhasil ditandai terkirim.");
    await loadData();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat mengirim surat."
    );
  } finally {
    setSending(false);
  }
}

  function cetakSurat() {
  if (!surat) return;

  if (!semuaHargaTerisi) {
    setError("Lengkapi seluruh harga penawaran sebelum mencetak.");
    return;
  }

  // Setelah jendela cetak ditutup, kembali ke dashboard.
  window.onafterprint = () => {
    router.push("/dashboard");
  };

  window.addEventListener(
  "afterprint",
  () => {
    router.push("/monitoring");
  },
  { once: true }
);

window.print();
}

  if (loading) {
    return (
      <main className="p-8 text-center">
        Memuat data surat penawaran...
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-red-600">{error || "Data tidak ditemukan."}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded bg-gray-700 px-4 py-2 text-white"
        >
          Kembali
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold">
            Surat Penawaran Harga
          </h1>
          <p className="text-sm text-gray-500">
            Koperasi Konsumen Karyawan PLN Pelita
          </p>
        </div>

        <Link
          href="/monitoring"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Kembali ke Monitoring
        </Link>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 no-print">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700 no-print">
          {success}
        </div>
      )}

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Informasi Permintaan PLN</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nomor Surat PLN</p>
            <p className="font-medium">{data.nomor_surat_pln}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Unit / Divisi PLN</p>
            <p className="font-medium">{data.nama_unit}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Nama Pengadaan</p>
            <p className="font-medium">{data.nama_pengadaan}</p>
          </div>
        </div>
      </section>

      {!surat ? (
        <section className="rounded-lg border bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold">
            Surat Penawaran Belum Dibuat
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Sistem akan membuat nomor surat otomatis dengan format
            001/KOP-PLN-PELITA/XI/2026 ketika Anda menekan tombol berikut.
          </p>

          <button
            onClick={buatDraft}
            disabled={
              creating ||
              data.status_permintaan !== "Referensi Harga Selesai"
            }
            className="mt-5 rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {creating ? "Membuat Draft..." : "Buat Draft Penawaran"}
          </button>

          {data.status_permintaan !== "Referensi Harga Selesai" && (
            <p className="mt-3 text-sm text-red-600">
              Referensi harga harus diselesaikan terlebih dahulu.
            </p>
          )}
        </section>
      ) : (
        <>
          <section
            id="area-cetak"
            className="rounded-lg border bg-white p-5 shadow-sm md:p-8"
          >
            <div className="mb-6 border-b-2 border-black pb-4 text-center">
              <h2 className="text-xl font-bold uppercase">
                KOPERASI KONSUMEN KARYAWAN PLN PELITA
              </h2>
              <p className="mt-1 text-sm">
                SURAT PENAWARAN HARGA
              </p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-gray-600">
                  Nomor Surat Penawaran
                </label>
                <p className="font-bold">
                  {surat.nomor_surat}
                </p>
              </div>

              <div className="space-y-3">
                {/* Tanggal Surat */}
              <div>
                <p className="text-sm text-gray-600">
                  Tanggal Surat
                </p>

                <p className="font-medium">
                  {formatTanggal(tanggalSurat)}
                </p>
              </div>

                {/* Tanggal Pengiriman */}
                <div>
                  <p className="text-sm text-gray-600">
                    Tanggal Pengiriman
                  </p>

                  <p className="font-medium">
                    {tanggalDikirim
                      ? formatTanggal(tanggalDikirim)
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 space-y-2">
              <p>
                Kepada Yth.
              </p>
              <p className="font-semibold">
                PT PLN (Persero) - {data.nama_unit}
              </p>
              <p>
                Perihal: Penawaran Harga {data.nama_pengadaan}
              </p>
              <p className="pt-3">
                Dengan hormat,
              </p>
              <p>
                Menindaklanjuti permintaan penawaran dengan nomor surat{" "}
                <strong>{data.nomor_surat_pln}</strong>, bersama ini
                kami sampaikan penawaran harga untuk kebutuhan berikut:
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-center">No.</th>
                    <th className="border p-2 text-left">Nama Item</th>
                    <th className="border p-2 text-left">Spesifikasi</th>
                    <th className="border p-2 text-center">Jumlah</th>
                    <th className="border p-2 text-right">
                      Harga Satuan
                    </th>
                    <th className="border p-2 text-right">Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {surat.items.map((item, index) => {
                    const referenceItem =
                      data.items_permintaan.find(
                        (ref) => ref.id === item.request_item_id
                      );

                    const unitPrice = Number(harga[item.id] ?? 0);
                    const subtotal =
                      (Number.isFinite(unitPrice) ? unitPrice : 0) *
                      item.jumlah_penawaran;

                    return (
                      <tr key={item.id}>
                        <td className="border p-2 text-center">
                          {index + 1}
                        </td>

                        <td className="border p-2">
                          {item.nama_item}
                        </td>

                        <td className="border p-2">
                          {item.spesifikasi_item}
                        </td>

                        <td className="border p-2 text-center">
                          {item.jumlah_penawaran}
                        </td>

                        <td className="border p-2 text-right">
                          <div className="mb-1 text-xs text-gray-500 no-print">
                            Referensi:{" "}
                            {formatRupiah(referenceItem?.referencePrice ?? null)}
                          </div>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={harga[item.id] ?? ""}
                            disabled={!isEditable}
                            onChange={(event) =>
                              setHarga((previous) => ({
                                ...previous,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="w-36 rounded border p-1 text-right disabled:bg-gray-100 no-print"
                          />

                          <span className="hidden print:inline">
                            {formatRupiah(harga[item.id] ?? null)}
                          </span>
                        </td>

                        <td className="border p-2 text-right">
                          {formatRupiah(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      className="border p-3 text-right font-bold"
                    >
                      TOTAL KESELURUHAN
                    </td>
                    <td className="border p-3 text-right font-bold">
                      {formatRupiah(totalKeseluruhan)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6">
              <label className="mb-2 block font-medium">
                Catatan Penawaran
              </label>

              <textarea
                rows={4}
                value={catatan}
                disabled={!isEditable}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Masukkan catatan atau ketentuan penawaran..."
                className="w-full rounded border p-3 disabled:bg-gray-100 no-print"
              />

              <div className="hidden print:block whitespace-pre-wrap">
                {catatan || "-"}
              </div>
            </div>

            <div className="mt-8">
              <p>Demikian penawaran harga ini kami sampaikan.</p>
              <p className="mt-2">Hormat kami,</p>
              <p className="mt-16 font-bold">
                KOPERASI KONSUMEN KARYAWAN PLN PELITA
              </p>
            </div>
          </section>

          <section className="space-y-4 no-print">
            {isEditable && (
              <div className="grid max-w-2xl gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tanggal Surat
                  </label>

                  <input
                    type="date"
                    value={tanggalSurat}
                    onChange={(event) => setTanggalSurat(event.target.value)}
                    className="w-full rounded border p-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tanggal Pengiriman Surat
                  </label>

                  <input
                    type="date"
                    value={tanggalDikirim}
                    onChange={(event) => setTanggalDikirim(event.target.value)}
                    className="w-full rounded border p-2"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Isi tanggal ketika surat benar-benar dikirim kepada PLN.
                  </p>
                </div>
              </div>
            )}

            {surat.status === "Surat Terkirim" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Surat sudah dikirim pada tanggal{" "}
                <strong>{formatTanggal(surat.tanggal_dikirim ?? "")}</strong>.
                Draft sudah dikunci dan tidak dapat diedit.
              </div>
            )}

            {isEditable && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={simpanDraft}
                  disabled={saving || sending}
                  className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:bg-gray-400"
                >
                  {saving ? "Menyimpan..." : "Simpan Draft"}
                </button>

                <button
                  onClick={tandaiTerkirim}
                  disabled={sending || saving || !semuaHargaTerisi || !tanggalDikirim}
                  className="rounded-lg bg-orange-600 px-5 py-3 font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {sending ? "Memproses..." : "Tandai Surat Terkirim"}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={cetakSurat}
                disabled={!semuaHargaTerisi}
                className="rounded-lg bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:bg-gray-400"
              >
                Cetak Surat / Simpan PDF
              </button>

              <button
                onClick={loadData}
                className="rounded-lg border px-5 py-3 hover:bg-gray-50"
              >
                Muat Ulang
              </button>
            </div>
          </section>

          <p className="text-sm text-gray-500 no-print">
            Status surat: <strong>{surat.status}</strong>.
            Mencetak surat tidak otomatis mengubah status menjadi terkirim.
          </p>
        </>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm;
          }

          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #area-cetak,
          #area-cetak * {
            visibility: visible;
          }

          #area-cetak {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          input,
          textarea {
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
            color: black !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
